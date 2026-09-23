import {
  DEFAULT_CHAPTER_MODEL,
  providerKey,
  providerModelName,
  textModelProvider,
} from "../model-router/catalog";

export type StorySeedBlueprintEnvironment = Record<string, string | undefined>;

const finiteNumber = (value: string | undefined, fallback: number): number => {
  const raw = value?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface ResolvedStorySeedBlueprintConfig {
  /** The key for the configured model's provider (Gemini or OpenRouter). */
  apiKey?: string;
  provider: "gemini" | "openrouter";
  accessToken?: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export function resolveStorySeedBlueprintConfig(
  environment: StorySeedBlueprintEnvironment,
): ResolvedStorySeedBlueprintConfig {
  const accessToken = environment.STORY_SEED_BLUEPRINT_ACCESS_TOKEN?.trim() || undefined;
  const model = environment.STORY_SEED_BLUEPRINT_MODEL?.trim()
    || environment.CHAPTER_GENERATION_DEFAULT_MODEL?.trim()
    || DEFAULT_CHAPTER_MODEL;
  const provider = textModelProvider(model);
  if (!provider) {
    throw new Error("STORY_SEED_BLUEPRINT_MODEL does not contain a valid text model.");
  }

  return {
    apiKey: providerKey(environment, provider),
    provider,
    accessToken,
    model,
    temperature: Math.min(2, Math.max(0, finiteNumber(
      environment.STORY_SEED_BLUEPRINT_TEMPERATURE ?? environment.AI_TEMPERATURE,
      1,
    ))),
    maxOutputTokens: Math.min(32_768, Math.max(4_096, Math.floor(finiteNumber(
      environment.STORY_SEED_BLUEPRINT_MAX_OUTPUT_TOKENS ?? environment.AI_MAX_TOKENS,
      8_192,
    )))),
    timeoutMs: Math.min(120_000, Math.max(10_000, Math.floor(finiteNumber(
      environment.STORY_SEED_BLUEPRINT_TIMEOUT_MS,
      90_000,
    )))),
  };
}

export const geminiBlueprintModelId = (configuredModel: string): string =>
  providerModelName(configuredModel);
