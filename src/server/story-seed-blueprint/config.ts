export type StorySeedBlueprintEnvironment = Record<string, string | undefined>;

const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";
const MODEL_ID_PATTERN = /^(?:google\/)?gemini-[a-z0-9][a-z0-9._-]*$/i;

const finiteNumber = (value: string | undefined, fallback: number): number => {
  const raw = value?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface ResolvedStorySeedBlueprintConfig {
  apiKey?: string;
  accessToken?: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export function resolveStorySeedBlueprintConfig(
  environment: StorySeedBlueprintEnvironment,
): ResolvedStorySeedBlueprintConfig {
  const rawKey = environment.GEMINI_API_KEY?.trim();
  const apiKey = rawKey && rawKey !== "MY_GEMINI_API_KEY" ? rawKey : undefined;
  const accessToken = environment.STORY_SEED_BLUEPRINT_ACCESS_TOKEN?.trim() || undefined;
  const model = environment.STORY_SEED_BLUEPRINT_MODEL?.trim()
    || environment.CHAPTER_GENERATION_DEFAULT_MODEL?.trim()
    || DEFAULT_MODEL;
  if (!MODEL_ID_PATTERN.test(model)) {
    throw new Error("STORY_SEED_BLUEPRINT_MODEL does not contain a valid Gemini text model.");
  }

  return {
    apiKey,
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
  configuredModel.replace(/^google\//, "");
