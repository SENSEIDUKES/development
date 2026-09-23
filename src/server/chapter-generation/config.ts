import type {
  ChapterGenerationModelOption,
  ChapterGenerationServerInfo,
} from "../../components/chapter-generation/shared/liveChapterGeneration";

import {
  providerKey,
  providerModelName,
  resolveChapterModelRoute,
  textModelProvider,
  type ChapterModelRoute,
} from "../model-router/catalog";

export type ChapterGenerationEnvironment = Record<string, string | undefined>;

export interface ResolvedChapterGenerationConfig {
  /** Gemini key, kept for callers that only speak Gemini. */
  apiKey?: string;
  /** Every provider credential the Model Router can route to. */
  keys: ChapterModelRoute["keys"];
  /** Seals disposable continuation state; any configured provider key serves. */
  continuationSecret?: string;
  provider: "gemini" | "openrouter";
  reasoningEffort?: string;
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
  const route = resolveChapterModelRoute(
    environment,
    "CHAPTER_GENERATION_MODELS",
    "CHAPTER_GENERATION_DEFAULT_MODEL",
  );

  return {
    apiKey: route.keys.gemini,
    keys: route.keys,
    continuationSecret: route.keys.gemini ?? providerKey(environment, "openrouter"),
    provider: textModelProvider(route.defaultModel) ?? "gemini",
    reasoningEffort: environment.OPENROUTER_REASONING_EFFORT?.trim() || undefined,
    models: route.models,
    defaultModel: route.defaultModel,
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
    configured: Boolean(config.keys.gemini || config.keys.openrouter),
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
  providerModelName(configuredModel);
