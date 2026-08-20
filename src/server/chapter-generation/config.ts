import type {
  ChapterGenerationModelOption,
  ChapterGenerationServerInfo,
} from "../../components/chapter-generation/shared/liveChapterGeneration";

export type ChapterGenerationEnvironment = Record<string, string | undefined>;

const DEFAULT_MODELS = [
  "google/gemini-3.1-flash-lite",
] as const;

const MODEL_ID_PATTERN = /^(?:google\/)?gemini-[a-z0-9][a-z0-9._-]*$/i;

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

const configuredModels = (environment: ChapterGenerationEnvironment): string[] => {
  const fromEnvironment = environment.CHAPTER_GENERATION_MODELS
    ?.split(",")
    .map(model => model.trim())
    .filter(Boolean) ?? [];
  const candidates = fromEnvironment.length > 0 ? fromEnvironment : [...DEFAULT_MODELS];
  const models = unique(candidates.filter(model => MODEL_ID_PATTERN.test(model)));
  if (models.length === 0) {
    throw new Error("CHAPTER_GENERATION_MODELS does not contain a valid Gemini text model.");
  }
  return models;
};

const modelLabel = (model: string): string => model
  .replace(/^google\//, "")
  .split("-")
  .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
  .join(" ");

export interface ResolvedChapterGenerationConfig {
  apiKey?: string;
  provider: "gemini";
  models: ChapterGenerationModelOption[];
  defaultModel: string;
  temperature: number;
  maxOutputTokens: number;
  stageTimeoutMs: number;
}

const finiteNumber = (value: string | undefined, fallback: number): number => {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function resolveChapterGenerationConfig(
  environment: ChapterGenerationEnvironment,
): ResolvedChapterGenerationConfig {
  const modelIds = configuredModels(environment);
  const requestedDefault = environment.CHAPTER_GENERATION_DEFAULT_MODEL?.trim();
  const defaultModel = requestedDefault && modelIds.includes(requestedDefault)
    ? requestedDefault
    : modelIds[0];
  const rawKey = environment.GEMINI_API_KEY?.trim();
  const apiKey = rawKey && rawKey !== "MY_GEMINI_API_KEY" ? rawKey : undefined;

  return {
    apiKey,
    provider: "gemini",
    models: modelIds.map(id => ({ id, label: modelLabel(id) })),
    defaultModel,
    temperature: Math.min(2, Math.max(0, finiteNumber(
      environment.CHAPTER_GENERATION_TEMPERATURE ?? environment.AI_TEMPERATURE,
      1,
    ))),
    maxOutputTokens: Math.max(2_048, Math.floor(finiteNumber(
      environment.CHAPTER_GENERATION_MAX_OUTPUT_TOKENS ?? environment.AI_MAX_TOKENS,
      16_384,
    ))),
    stageTimeoutMs: Math.min(120_000, Math.max(10_000, Math.floor(finiteNumber(
      environment.CHAPTER_GENERATION_STAGE_TIMEOUT_MS,
      90_000,
    )))),
  };
}

export function chapterGenerationServerInfo(
  environment: ChapterGenerationEnvironment,
): ChapterGenerationServerInfo {
  const config = resolveChapterGenerationConfig(environment);
  return {
    provider: config.provider,
    configured: Boolean(config.apiKey),
    models: config.models,
    defaultModel: config.defaultModel,
  };
}

export function resolveConfiguredChapterModel(
  requestedModel: unknown,
  config: ResolvedChapterGenerationConfig,
): string {
  if (typeof requestedModel !== "string" || !requestedModel.trim()) {
    throw new Error("Choose a configured chapter-generation model.");
  }
  const model = requestedModel.trim();
  if (!config.models.some(option => option.id === model)) {
    throw new Error(`Model '${model}' is not configured for Chapter Generation.`);
  }
  return model;
}

export const geminiApiModelId = (configuredModel: string): string =>
  configuredModel.replace(/^google\//, "");
