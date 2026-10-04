import {
  type BlueprintGenerationPayload,
  type StorySeedInput,
} from '@seihouse/sen/story-seed';
import { hasValidBearerToken } from "../shared/bearerToken";
import {
  resolveStorySeedBlueprintConfig,
  type StorySeedBlueprintEnvironment,
} from "./config";
import {
  BlueprintOutputLimitError,
  BlueprintRequestError,
  BlueprintRoadmapError,
  createWorldBlueprintProvider,
  generateWorldBlueprint,
  type WorldBlueprintModelProvider,
} from "./generate";
import { missingKeyMessage, providerKey, resolveChapterModelRoute, resolveReasoningLevel, textModelProvider } from "../model-router/catalog";

export interface StorySeedBlueprintHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface StorySeedBlueprintHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface StorySeedBlueprintHttpDependencies {
  environment: StorySeedBlueprintEnvironment;
  providerFactory?: (apiKey: string, model: string) => WorldBlueprintModelProvider;
  onError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const errorResponse = (status: number, error: string): StorySeedBlueprintHttpResponse => ({
  status,
  body: { error },
  headers: { "Cache-Control": "no-store" },
});

/** A Blueprint request: the Seed, and the chapter model the reader chose, with its reasoning level. */
interface BlueprintHttpPayload extends BlueprintGenerationPayload {
  model?: string;
  reasoningLevel?: unknown;
}

/**
 * One operation: a whole Blueprint, which plans Arc 1 for a story of the
 * Seed's Story Length, or a realistic length when the Seed leaves it blank.
 */
const parseRequest = (body: unknown): BlueprintHttpPayload => {
  const parsed = typeof body === "string" ? JSON.parse(body) : body;
  if (!isRecord(parsed) || !isRecord(parsed.storySeed)) {
    throw new Error("The Blueprint request must contain the complete finalized Story Seed.");
  }
  const storySeed = parsed.storySeed as unknown as StorySeedInput;
  // Arcs are planned when each begins, so no request adds arcs to a Blueprint.
  if (parsed.operation !== undefined) throw new Error("Unknown Blueprint operation.");
  // The length travels in the Seed alone, so a request can never carry two.
  if (parsed.arcCount !== undefined) throw new Error("The story length is the Story Seed's own Story Length (story.optional.arcCount).");
  if (parsed.model !== undefined && typeof parsed.model !== "string") throw new Error("Choose a configured chapter model.");
  return {
    storySeed,
    ...(parsed.model !== undefined ? { model: parsed.model as string } : {}),
    ...(parsed.reasoningLevel !== undefined ? { reasoningLevel: parsed.reasoningLevel } : {}),
  };
};

export async function handleStorySeedBlueprintHttp(
  request: StorySeedBlueprintHttpRequest,
  dependencies: StorySeedBlueprintHttpDependencies,
): Promise<StorySeedBlueprintHttpResponse> {
  const method = request.method?.toUpperCase() ?? "GET";
  let config;
  try {
    config = resolveStorySeedBlueprintConfig(dependencies.environment);
  } catch (error) {
    dependencies.onError?.(error);
    return errorResponse(503, "World Blueprint model configuration is invalid.");
  }

  if (method === "GET") {
    return {
      status: 200,
      body: {
        provider: config.provider,
        configured: Boolean(config.apiKey && config.accessToken),
        model: config.model,
      },
      headers: { "Cache-Control": "no-store" },
    };
  }
  if (method !== "POST") {
    return {
      ...errorResponse(405, "Method not allowed."),
      headers: { Allow: "GET, POST", "Cache-Control": "no-store" },
    };
  }
  if (!config.accessToken) {
    return errorResponse(503, "STORY_SEED_BLUEPRINT_ACCESS_TOKEN is not configured on the Development server.");
  }
  if (!hasValidBearerToken(request, config.accessToken)) {
    return errorResponse(401, "A valid Development Story Seed access token is required.");
  }
  let parsed: BlueprintHttpPayload;
  try {
    parsed = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON request.";
    return errorResponse(400, message === "Unexpected end of JSON input"
      ? "The Blueprint request body is empty."
      : message);
  }

  // The Blueprint is written by the chapter model the reader chose in the
  // Model Router, from the same list chapters are; a request without one
  // keeps the server's Blueprint model.
  let model = config.model;
  let apiKey = config.apiKey;
  if (parsed.model === undefined && !apiKey) return errorResponse(503, missingKeyMessage(model));
  if (parsed.model !== undefined) {
    const route = resolveChapterModelRoute(dependencies.environment, "HARNESS_GENERATION_MODELS", "HARNESS_GENERATION_DEFAULT_MODEL");
    if (!route.models.some(option => option.id === parsed.model)) {
      return errorResponse(400, `Model '${parsed.model}' is not configured for chapter generation.`);
    }
    model = parsed.model;
    const key = providerKey(dependencies.environment, textModelProvider(model)!);
    if (!key) return errorResponse(503, missingKeyMessage(model));
    apiKey = key;
  }
  const chosen = { ...config, model, provider: textModelProvider(model)!, apiKey: apiKey! };

  try {
    const provider = dependencies.providerFactory
      ? dependencies.providerFactory(chosen.apiKey, model)
      : createWorldBlueprintProvider(chosen);
    const body = await generateWorldBlueprint({ storySeed: parsed.storySeed }, chosen, provider, resolveReasoningLevel(model, parsed.reasoningLevel));
    return {
      status: 200,
      body,
      headers: { "Cache-Control": "no-store" },
    };
  } catch (error) {
    dependencies.onError?.(error);
    const message = error instanceof Error ? error.message : "Unknown Blueprint generation failure";
    if (error instanceof BlueprintRequestError
      || ["Style is required", "Genre is required", "Premise is required", "Story Tags are required"]
        .some(fragment => message.includes(fragment))) {
      return errorResponse(400, message);
    }
    // An output limit or an unusable Arc 1 is reported as it is, never hidden
    // behind a generic retry message or shortened to fit.
    if (error instanceof BlueprintOutputLimitError || error instanceof BlueprintRoadmapError) {
      return errorResponse(502, message);
    }
    if (message.includes("output token limit")) {
      return errorResponse(502, new BlueprintOutputLimitError(config?.maxOutputTokens ?? 0).message);
    }
    return errorResponse(502, "The model could not produce a complete World Blueprint. No Story Seed data was changed; please retry.");
  }
}
