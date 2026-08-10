import type { BlueprintGenerationPayload } from "../../components/story-seed/shared/storySeedSchema";
import { hasValidBearerToken } from "../shared/bearerToken";
import {
  resolveStorySeedBlueprintConfig,
  type StorySeedBlueprintEnvironment,
} from "./config";
import {
  generateWorldBlueprint,
  GeminiWorldBlueprintProvider,
  type WorldBlueprintModelProvider,
} from "./generate";

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

const parseRequest = (body: unknown): BlueprintGenerationPayload => {
  const parsed = typeof body === "string" ? JSON.parse(body) : body;
  if (!isRecord(parsed) || !isRecord(parsed.storySeed)) {
    throw new Error("The Blueprint request must contain the complete finalized Story Seed.");
  }
  return { storySeed: parsed.storySeed as unknown as BlueprintGenerationPayload["storySeed"] };
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
        provider: "gemini",
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
    return errorResponse(503, "GEMINI_API_KEY is not configured on the Development server.");
  }

  let payload: BlueprintGenerationPayload;
  try {
    payload = parseRequest(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON request.";
    return errorResponse(400, message === "Unexpected end of JSON input"
      ? "The Blueprint request body is empty."
      : message);
  }

  try {
    const provider = dependencies.providerFactory
      ? dependencies.providerFactory(config.apiKey, config.model)
      : new GeminiWorldBlueprintProvider(config.apiKey, config.model);
    const blueprint = await generateWorldBlueprint(payload, config, provider);
    return {
      status: 200,
      body: blueprint,
      headers: { "Cache-Control": "no-store" },
    };
  } catch (error) {
    dependencies.onError?.(error);
    const message = error instanceof Error ? error.message : "Unknown Blueprint generation failure";
    if (["Style is required", "Genre is required", "Premise is required", "Story Tags are required"]
      .some(fragment => message.includes(fragment))) {
      return errorResponse(400, message);
    }
    return errorResponse(
      502,
      "Gemini could not produce a complete World Blueprint. No Story Seed data was changed; please retry.",
    );
  }
}
