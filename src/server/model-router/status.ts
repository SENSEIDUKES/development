import {
  CHAPTER_MODELS,
  DEFAULT_TTS_MODEL,
  GENERATION_CONSUMERS,
  type GenerationConsumer,
  IMAGE_MODELS,
  MODEL_PROVIDERS,
  providerKey,
  resolveChapterModelRoute,
  TTS_MODELS,
  type ModelCapability,
  type ModelReasoning,
  type ModelEnvironment,
  type ModelProviderId,
  type ModelStage,
  type RoutedModel,
} from './catalog';

export interface ModelRouterProviderStatus {
  id: ModelProviderId;
  label: string;
  keyVariable: string;
  configured: boolean;
}

export interface ModelRouterModelStatus {
  id: string;
  label: string;
  provider: ModelProviderId;
  stage: ModelStage;
  /** Its provider key is configured, so a surface could call it now. */
  available: boolean;
  isDefault: boolean;
  /** Tunable reasoning levels, when the model has them. */
  reasoning?: ModelReasoning;
}

export interface ModelRouterCapabilityStatus {
  id: ModelCapability;
  label: string;
  description: string;
  /** Features that currently generate through this capability (from `GENERATION_CONSUMERS`). */
  consumers: Array<Pick<GenerationConsumer, 'name' | 'modelChoice'>>;
  defaultModel?: string;
  providers: ModelRouterProviderStatus[];
  models: ModelRouterModelStatus[];
}

export interface ModelRouterStatus {
  capabilities: ModelRouterCapabilityStatus[];
}

const consumersFor = (capability: ModelCapability) => GENERATION_CONSUMERS
  .filter(consumer => consumer.capability === capability)
  .map(({ name, modelChoice }) => ({ name, modelChoice }));

const providerStatus = (environment: ModelEnvironment, ids: ModelProviderId[]): ModelRouterProviderStatus[] =>
  ids.map(id => ({ id, label: MODEL_PROVIDERS[id].label, keyVariable: MODEL_PROVIDERS[id].keyVariable, configured: Boolean(providerKey(environment, id)) }));

const modelStatus = (
  environment: ModelEnvironment,
  models: readonly RoutedModel[],
  defaultModel?: string,
): ModelRouterModelStatus[] => models.map(model => ({
  ...model,
  available: Boolean(providerKey(environment, model.provider)),
  isDefault: model.id === defaultModel,
}));

/** Read-only view of the Model Router for the Workshop. Never includes a key value. */
export function modelRouterStatus(environment: ModelEnvironment): ModelRouterStatus {
  const chapters = resolveChapterModelRoute(environment, 'HARNESS_GENERATION_MODELS', 'HARNESS_GENERATION_DEFAULT_MODEL');
  const chapterModels: RoutedModel[] = [
    ...CHAPTER_MODELS,
    // Pinned or OPENROUTER_MODELS extras that are not in the catalog.
    ...chapters.models
      .filter(model => !CHAPTER_MODELS.some(known => known.id === model.id))
      .map(model => ({
        ...model,
        provider: model.id.startsWith('openrouter/') ? 'openrouter' as const : 'gemini' as const,
        stage: 'current' as const,
      })),
  ];
  const ttsDefault = environment.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_TTS_MODEL;
  const ttsModels: RoutedModel[] = TTS_MODELS.some(model => model.id === ttsDefault)
    ? [...TTS_MODELS]
    : [...TTS_MODELS, { id: ttsDefault, label: ttsDefault, provider: 'elevenlabs', stage: 'current' }];

  return {
    capabilities: [
      {
        id: 'chapters',
        label: 'Chapters',
        description: 'Text models that write chapters, Story Seed Blueprints, and reader translations.',
        consumers: consumersFor('chapters'),
        defaultModel: chapters.defaultModel,
        providers: providerStatus(environment, ['gemini', 'openrouter']),
        models: modelStatus(environment, chapterModels, chapters.defaultModel),
      },
      {
        id: 'images',
        label: 'Images',
        description: 'Image models for covers, portraits, and scene art.',
        consumers: consumersFor('images'),
        providers: providerStatus(environment, ['gemini', 'openrouter']),
        models: modelStatus(environment, IMAGE_MODELS),
      },
      {
        id: 'tts',
        label: 'TTS',
        description: 'Text-to-speech models that voice characters and Codex quotes.',
        consumers: consumersFor('tts'),
        defaultModel: ttsDefault,
        providers: providerStatus(environment, ['elevenlabs']),
        models: modelStatus(environment, ttsModels, ttsDefault),
      },
    ],
  };
}
