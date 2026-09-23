import { type HarnessGenerationServerInfo } from '@seihouse/sen/harness-generation';
import {
  providerModelName,
  resolveChapterModelRoute,
  textModelProvider,
  type ChapterModelRoute,
} from '../model-router/catalog';

export type HarnessGenerationEnvironment = Record<string, string | undefined>;

const finiteNumber = (value: string | undefined, fallback: number): number => {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface ResolvedHarnessGenerationConfig {
  /** Gemini key, kept for callers that only speak Gemini. */
  apiKey?: string;
  /** Every provider credential the Model Router can route to. */
  keys: ChapterModelRoute['keys'];
  provider: 'gemini' | 'openrouter';
  reasoningEffort?: string;
  models: Array<{ id: string; label: string }>;
  defaultModel: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export const resolveHarnessGenerationConfig = (
  environment: HarnessGenerationEnvironment,
): ResolvedHarnessGenerationConfig => {
  const route = resolveChapterModelRoute(environment, 'HARNESS_GENERATION_MODELS', 'HARNESS_GENERATION_DEFAULT_MODEL');
  return {
    apiKey: route.keys.gemini,
    keys: route.keys,
    provider: textModelProvider(route.defaultModel) ?? 'gemini',
    reasoningEffort: environment.OPENROUTER_REASONING_EFFORT?.trim() || undefined,
    models: route.models,
    defaultModel: route.defaultModel,
    temperature: Math.max(0, Math.min(2, finiteNumber(
      environment.HARNESS_GENERATION_TEMPERATURE ?? environment.AI_TEMPERATURE,
      0.9,
    ))),
    maxOutputTokens: Math.max(1_024, Math.floor(finiteNumber(
      environment.HARNESS_GENERATION_MAX_OUTPUT_TOKENS ?? environment.AI_MAX_TOKENS,
      16_384,
    ))),
    timeoutMs: Math.max(10_000, Math.min(180_000, Math.floor(finiteNumber(
      environment.HARNESS_GENERATION_TIMEOUT_MS,
      120_000,
    )))),
  };
};

export const harnessGenerationServerInfo = (
  environment: HarnessGenerationEnvironment,
): HarnessGenerationServerInfo => {
  const config = resolveHarnessGenerationConfig(environment);
  return {
    provider: config.provider,
    configured: Boolean(config.keys.gemini || config.keys.openrouter),
    models: config.models,
    defaultModel: config.defaultModel,
  };
};

export const resolveConfiguredHarnessModel = (
  requested: unknown,
  config: ResolvedHarnessGenerationConfig,
): string => {
  if (typeof requested !== 'string' || !requested.trim()) {
    throw new Error('Choose a configured Harness Generation model.');
  }
  const model = requested.trim();
  if (!config.models.some(option => option.id === model)) {
    throw new Error(`Model '${model}' is not configured for Harness Generation.`);
  }
  return model;
};

export const geminiHarnessModelId = (model: string) => providerModelName(model);
