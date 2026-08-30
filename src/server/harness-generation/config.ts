import type { HarnessGenerationServerInfo } from '../../components/harness-generation/shared/types';

export type HarnessGenerationEnvironment = Record<string, string | undefined>;

const DEFAULT_MODELS = ['google/gemini-3.1-flash-lite'] as const;
const MODEL_ID_PATTERN = /^(?:google\/)?gemini-[a-z0-9][a-z0-9._-]*$/i;

const finiteNumber = (value: string | undefined, fallback: number): number => {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const labelForModel = (model: string) => model
  .replace(/^google\//, '')
  .split('-')
  .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
  .join(' ');

export interface ResolvedHarnessGenerationConfig {
  apiKey?: string;
  provider: 'gemini';
  models: Array<{ id: string; label: string }>;
  defaultModel: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export const resolveHarnessGenerationConfig = (
  environment: HarnessGenerationEnvironment,
): ResolvedHarnessGenerationConfig => {
  const configured = environment.HARNESS_GENERATION_MODELS
    ?.split(',')
    .map(value => value.trim())
    .filter((value): value is string => Boolean(value)) ?? [];
  const candidates = configured.length ? configured : [...DEFAULT_MODELS];
  const modelIds = [...new Set(candidates.filter(model => MODEL_ID_PATTERN.test(model)))];
  if (!modelIds.length) {
    throw new Error('HARNESS_GENERATION_MODELS does not contain a valid Gemini text model.');
  }
  const requestedDefault = environment.HARNESS_GENERATION_DEFAULT_MODEL?.trim();
  const defaultModel = requestedDefault && modelIds.includes(requestedDefault)
    ? requestedDefault
    : modelIds[0];
  const rawKey = environment.GEMINI_API_KEY?.trim();
  return {
    apiKey: rawKey && rawKey !== 'MY_GEMINI_API_KEY' ? rawKey : undefined,
    provider: 'gemini',
    models: modelIds.map(id => ({ id, label: labelForModel(id) })),
    defaultModel,
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
    configured: Boolean(config.apiKey),
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

export const geminiHarnessModelId = (model: string) => model.replace(/^google\//, '');
