import type {
  ChapterGenerationErrorResponse,
  ManifestChapterRequest,
} from "../../components/chapter-generation/shared/liveChapterGeneration";
import {
  chapterGenerationServerInfo,
  resolveChapterGenerationConfig,
  type ChapterGenerationEnvironment,
} from "./config";
import {
  executeChapterGeneration,
  type ChapterProviderFactory,
} from "./execute";

export interface ChapterGenerationHttpRequest {
  method?: string;
  body?: unknown;
}

export interface ChapterGenerationHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ChapterGenerationHttpDependencies {
  environment: ChapterGenerationEnvironment;
  providerFactory?: ChapterProviderFactory;
  onError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const errorResponse = (status: number, error: string): ChapterGenerationHttpResponse => ({
  status,
  body: { error } satisfies ChapterGenerationErrorResponse,
});

const parseRequest = (body: unknown): ManifestChapterRequest => {
  const parsed = typeof body === "string" ? JSON.parse(body) : body;
  if (!isRecord(parsed)) throw new Error("The chapter-generation request must be a JSON object.");
  if (!isRecord(parsed.artifact) || !isRecord(parsed.artifact.seed)) {
    throw new Error("Select or upload a valid Story Seed artifact.");
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
  };
};

const isConfigurationError = (message: string) =>
  message.includes("GEMINI_API_KEY is not configured")
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
    const result = await executeChapterGeneration(parsedRequest, config, {
      providerFactory: dependencies.providerFactory,
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
    return errorResponse(
      502,
      "The model could not complete the chapter pipeline. No chapter or story data was saved; review the server log and retry.",
    );
  }
}
