import { timingSafeEqual } from "node:crypto";
import type {
  ChapterGenerationErrorResponse,
  ManifestChapterRequest,
} from "../../components/chapter-generation/shared/liveChapterGeneration";
import type { ChapterTokenUsageSummary } from "../../components/chapter-generation/shared/pipeline/usage";
import type { ChapterUsageStage } from "../../components/chapter-generation/shared/pipeline/usage";
import {
  chapterGenerationServerInfo,
  resolveChapterGenerationConfig,
  type ChapterGenerationEnvironment,
} from "./config";
import {
  ChapterGenerationExecutionError,
  executeChapterGeneration,
  type ChapterProviderFactory,
} from "./execute";
import { verifyChapterContinuation } from "./continuationSecurity";

export interface ChapterGenerationHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ChapterGenerationHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ChapterGenerationHttpDependencies {
  environment: ChapterGenerationEnvironment;
  providerFactory?: ChapterProviderFactory;
  onStageChange?: (stage: ChapterUsageStage) => void;
  onError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const errorResponse = (
  status: number,
  error: string,
  usage?: ChapterTokenUsageSummary,
): ChapterGenerationHttpResponse => ({
  status,
  body: {
    error,
    ...(usage && usage.calls.length > 0 ? { usage } : {}),
  } satisfies ChapterGenerationErrorResponse,
});

const requestHeader = (
  request: ChapterGenerationHttpRequest,
  name: string,
): string | undefined => {
  const entry = Object.entries(request.headers ?? {})
    .find(([headerName]) => headerName.toLowerCase() === name.toLowerCase());
  const value = entry?.[1];
  return Array.isArray(value) ? value[0] : value;
};

const hasValidAccessToken = (
  request: ChapterGenerationHttpRequest,
  expectedToken: string,
): boolean => {
  const authorization = requestHeader(request, "authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return false;
  const actual = Buffer.from(match[1]);
  const expected = Buffer.from(expectedToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const parseRequest = (body: unknown): ManifestChapterRequest => {
  const parsed = typeof body === "string" ? JSON.parse(body) : body;
  if (!isRecord(parsed)) throw new Error("The chapter-generation request must be a JSON object.");
  if (!isRecord(parsed.artifact) || !isRecord(parsed.artifact.seed)) {
    throw new Error("Select or upload a valid Story Seed artifact.");
  }
  if (parsed.continuation !== undefined && !isRecord(parsed.continuation)) {
    throw new Error("Chapter continuation must be a JSON object.");
  }
  return {
    artifact: {
      seed: parsed.artifact.seed as unknown as ManifestChapterRequest["artifact"]["seed"],
      ...(isRecord(parsed.artifact.blueprint)
        ? { blueprint: parsed.artifact.blueprint as unknown as ManifestChapterRequest["artifact"]["blueprint"] }
        : {}),
    },
    model: typeof parsed.model === "string" ? parsed.model : "",
    ...(typeof parsed.temporaryInstruction === "string"
      ? { temporaryInstruction: parsed.temporaryInstruction }
      : {}),
    ...(isRecord(parsed.continuation)
      ? { continuation: parsed.continuation as unknown as NonNullable<ManifestChapterRequest["continuation"]> }
      : {}),
  };
};

const isConfigurationError = (message: string) =>
  message.includes("GEMINI_API_KEY is not configured")
  || message.includes("CHAPTER_GENERATION_ACCESS_TOKEN is not configured")
  || message.includes("CHAPTER_GENERATION_MODELS");

const isRequestError = (message: string) => [
  "Choose a configured",
  "is not configured for Chapter Generation",
  "Select a finalized Story Seed",
  "finalized World Blueprint",
  "Story Seed",
  "temporary testing instruction",
  "Style is required",
  "Genre is required",
  "Premise is required",
  "Story Tags are required",
  "Chapter continuation",
].some(fragment => message.includes(fragment));

export async function handleChapterGenerationHttp(
  request: ChapterGenerationHttpRequest,
  dependencies: ChapterGenerationHttpDependencies,
): Promise<ChapterGenerationHttpResponse> {
  const method = request.method?.toUpperCase() ?? "GET";
  if (method === "GET") {
    try {
      return {
        status: 200,
        body: chapterGenerationServerInfo(dependencies.environment),
        headers: { "Cache-Control": "no-store" },
      };
    } catch (error) {
      dependencies.onError?.(error);
      return errorResponse(500, "Chapter Generation model configuration is invalid.");
    }
  }
  if (method !== "POST") {
    return {
      ...errorResponse(405, "Method not allowed."),
      headers: { Allow: "GET, POST" },
    };
  }

  let parsedRequest: ManifestChapterRequest;
  try {
    parsedRequest = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON request.";
    return errorResponse(400, message === "Unexpected end of JSON input"
      ? "The chapter-generation request body is empty."
      : message);
  }

  try {
    const config = resolveChapterGenerationConfig(dependencies.environment);
    if (!config.accessToken) {
      throw new Error("CHAPTER_GENERATION_ACCESS_TOKEN is not configured on the Development server.");
    }
    if (!hasValidAccessToken(request, config.accessToken)) {
      return errorResponse(401, "A valid Development chapter-generation access token is required.");
    }
    if (!config.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the Development server.");
    }
    const verifiedContinuation = parsedRequest.continuation
      ? verifyChapterContinuation({
          continuation: parsedRequest.continuation,
          artifact: parsedRequest.artifact,
          secret: config.apiKey,
        })
      : undefined;
    const result = await executeChapterGeneration(parsedRequest, config, {
      providerFactory: dependencies.providerFactory,
      onStageChange: dependencies.onStageChange,
      verifiedContinuation,
    });
    return {
      status: 200,
      body: result,
      headers: { "Cache-Control": "no-store" },
    };
  } catch (error) {
    dependencies.onError?.(error);
    const message = error instanceof Error ? error.message : "Unknown generation failure";
    if (isConfigurationError(message)) return errorResponse(503, message);
    if (isRequestError(message)) return errorResponse(400, message);
    const usage = error instanceof ChapterGenerationExecutionError
      ? error.usage
      : undefined;
    return errorResponse(
      502,
      "The model could not complete the chapter pipeline. No chapter or story data was saved; review the server log and retry.",
      usage,
    );
  }
}
