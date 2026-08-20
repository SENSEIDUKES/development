import { handleChapterGenerationHttp } from "./http";
import type { ChapterGenerationStreamEvent } from "../../components/chapter-generation/shared/liveChapterGeneration";
import { ChapterGenerationExecutionError } from "./execute";
import {
  createPublicGenerationGuard,
  type PublicGenerationGuardResult,
} from "../shared/publicGenerationGuard";

export const maxDuration = 300;

// One five-chapter run consumes five requests; leave one retry in the same
// window without leaving the live Gemini endpoint unbounded.
const guardChapterGeneration = createPublicGenerationGuard({
  key: "chapter-generation",
  limit: 6,
  windowMs: 30 * 60 * 1_000,
});

interface RequestLike {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: unknown): void;
  write(value: string): void;
  end(): void;
}

const acceptsStream = (request: RequestLike): boolean => {
  const accept = Object.entries(request.headers ?? {})
    .find(([name]) => name.toLowerCase() === "accept")?.[1];
  const value = Array.isArray(accept) ? accept[0] : accept;
  return value?.includes("application/x-ndjson") ?? false;
};

const logChapterGenerationError = (error: unknown) => {
  if (error instanceof ChapterGenerationExecutionError) {
    console.error("[chapter-generation] pipeline failure", {
      chapterNumber: error.failure.chapterNumber,
      stage: error.failure.stage,
      category: error.failure.category,
      safeReason: error.failure.reason,
      validationIssues: error.failure.validationIssues ?? [],
      completedUsage: error.usage,
      cause: error.cause instanceof Error ? error.cause.message : error.cause,
      stack: error.cause instanceof Error ? error.cause.stack : error.stack,
    });
    return;
  }
  console.error("[chapter-generation] request failure", error);
};

export default async function chapterGenerationHandler(
  request: RequestLike,
  response: ResponseLike,
) {
  const streaming = acceptsStream(request) && request.method?.toUpperCase() === "POST";
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === "POST"
    ? guardChapterGeneration(request)
    : { allowed: true };
  let streamStarted = false;
  const writeEvent = (event: ChapterGenerationStreamEvent) => {
    if (!streamStarted) {
      response.status(200);
      response.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      streamStarted = true;
    }
    response.write(`${JSON.stringify(event)}\n`);
  };
  const result = !admission.allowed
    ? {
        status: admission.status ?? 403,
        body: { error: admission.error ?? "This Development action is unavailable." },
        headers: {
          "Cache-Control": "no-store",
          ...(admission.retryAfterSeconds ? { "Retry-After": String(admission.retryAfterSeconds) } : {}),
        },
      }
    : await handleChapterGenerationHttp(
        { method: request.method, body: request.body, headers: request.headers },
        {
          environment: process.env,
          onError: logChapterGenerationError,
          ...(streaming ? { onStageChange: stage => writeEvent({ type: "stage", stage }) } : {}),
        },
      );
  if (streaming) {
    if (!streamStarted) {
      response.status(result.status);
      response.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      streamStarted = true;
    }
    writeEvent({
      type: "result",
      status: result.status,
      body: result.body as Extract<ChapterGenerationStreamEvent, { type: "result" }>["body"],
    });
    response.end();
    return;
  }
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(name, value);
  }
  response.status(result.status).json(result.body);
}
