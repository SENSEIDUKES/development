import type {
  ChapterGenerationErrorResponse,
  ManifestChapterRequest,
  SafeChapterGenerationFailure,
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
  type DialogueArtifactResolver,
  type ChapterProviderFactory,
} from "./execute";
import { verifyChapterContinuation } from "./continuationSecurity";
import { hasValidBearerToken } from "../shared/bearerToken";

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
  dialogueArtifactResolver?: DialogueArtifactResolver;
  onStageChange?: (stage: ChapterUsageStage) => void;
  onError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const errorResponse = (
  status: number,
  error: string,
  usage?: ChapterTokenUsageSummary,
  failure?: SafeChapterGenerationFailure,
): ChapterGenerationHttpResponse => ({
  status,
  body: {
    error,
    ...(failure ? { failure } : {}),
    ...(usage && usage.calls.length > 0 ? { usage } : {}),
  } satisfies ChapterGenerationErrorResponse,
});

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
    if (!hasValidBearerToken(request, config.accessToken)) {
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
      dialogueArtifactResolver: dependencies.dialogueArtifactResolver,
      onDialogueAudioError: dependencies.onError,
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
    if (error instanceof ChapterGenerationExecutionError) {
      return errorResponse(502, error.message, error.usage, error.failure);
    }
    return errorResponse(
      502,
      "The model could not complete the chapter pipeline. No chapter or story data was saved; review the server log and retry.",
    );
  }
}
