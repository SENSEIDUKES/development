import {
  ARC_ROADMAP_EXTENSION_OPERATION,
  type ArcRoadmapExtensionPayload,
  type BlueprintGenerationPayload,
  type StorySeedInput,
  type WorldBlueprint,
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
  extendArcRoadmap,
  generateWorldBlueprint,
  type WorldBlueprintModelProvider,
} from "./generate";
import { missingKeyMessage } from "../model-router/catalog";

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

/** One endpoint, two operations: a whole Blueprint, or only the arcs an author is adding to one. */
type BlueprintHttpOperation =
  | { operation: "generate"; payload: BlueprintGenerationPayload }
  | { operation: typeof ARC_ROADMAP_EXTENSION_OPERATION; payload: ArcRoadmapExtensionPayload };

const parseRequest = (body: unknown): BlueprintHttpOperation => {
  const parsed = typeof body === "string" ? JSON.parse(body) : body;
  if (!isRecord(parsed) || !isRecord(parsed.storySeed)) {
    throw new Error("The Blueprint request must contain the complete finalized Story Seed.");
  }
  const storySeed = parsed.storySeed as unknown as StorySeedInput;
  if (parsed.operation === ARC_ROADMAP_EXTENSION_OPERATION) {
    if (!isRecord(parsed.blueprint)) throw new Error("An arc request must contain the reviewed World Blueprint.");
    return {
      operation: ARC_ROADMAP_EXTENSION_OPERATION,
      payload: {
        operation: ARC_ROADMAP_EXTENSION_OPERATION,
        storySeed,
        blueprint: parsed.blueprint as unknown as WorldBlueprint,
        arcCount: parsed.arcCount as number,
      },
    };
  }
  if (parsed.operation !== undefined) throw new Error("Unknown Blueprint operation.");
  return {
    operation: "generate",
    payload: { storySeed, ...(parsed.arcCount === undefined ? {} : { arcCount: parsed.arcCount as number }) },
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
  if (!config.apiKey) {
    return errorResponse(503, missingKeyMessage(config.model));
  }

  let parsed: BlueprintHttpOperation;
  try {
    parsed = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON request.";
    return errorResponse(400, message === "Unexpected end of JSON input"
      ? "The Blueprint request body is empty."
      : message);
  }

  try {
    const provider = dependencies.providerFactory
      ? dependencies.providerFactory(config.apiKey, config.model)
      : createWorldBlueprintProvider({ ...config, apiKey: config.apiKey });
    const body = parsed.operation === ARC_ROADMAP_EXTENSION_OPERATION
      ? { addedArcPlans: await extendArcRoadmap(parsed.payload, config, provider) }
      : await generateWorldBlueprint(parsed.payload, config, provider);
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
    // An output limit or an incomplete roadmap is reported as it is, never
    // hidden behind a generic retry message or shortened to fit.
    if (error instanceof BlueprintOutputLimitError || error instanceof BlueprintRoadmapError) {
      return errorResponse(502, message);
    }
    if (message.includes("output token limit")) {
      return errorResponse(502, new BlueprintOutputLimitError(config?.maxOutputTokens ?? 0).message);
    }
    return errorResponse(502, parsed.operation === ARC_ROADMAP_EXTENSION_OPERATION
      ? "The new arcs could not be planned. Nothing was changed; please retry."
      : "Gemini could not produce a complete World Blueprint. No Story Seed data was changed; please retry.");
  }
}
