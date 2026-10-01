import {
  providerKey as sharedProviderKey,
  resolveChapterModelRoute as sharedResolveChapterModelRoute,
  type ModelEnvironment,
  type ModelProviderId,
  type ModelCapability,
} from '@seihouse/library/model-router-server';

export { CHAPTER_MODELS, IMAGE_MODELS, TTS_MODELS, AUDIO_MODELS, VIDEO_MODELS, THREE_D_MODELS, DEFAULT_CHAPTER_MODEL, DEFAULT_TTS_MODEL, providerModelName, resolveReasoningLevel, textModelProvider, textModelLabel } from '@seihouse/library/model-router-server';
export const isMissingKeyMessage = (message: string) => /(?:GEMINI_API_KEY|OPENROUTER_API_KEY|OpenRouter-Dev) is not configured/.test(message);
import { MODEL_PROVIDERS as sharedProviders } from '@seihouse/library/model-router-server';
export const MODEL_PROVIDERS = {
  ...sharedProviders,
  openrouter: { ...sharedProviders.openrouter, keyVariable: 'OpenRouter-Dev', keyVariables: ['OpenRouter-Dev', 'OPENROUTER_API_KEY'] },
};
import { requireTextModelKey as sharedRequireTextModelKey, textModelProvider } from '@seihouse/library/model-router-server';
import type { ChapterModelRoute } from '@seihouse/library/model-router-server';
export const missingKeyMessage = (model: string) => `${textModelProvider(model) === 'openrouter' ? 'OpenRouter-Dev' : 'GEMINI_API_KEY'} is not configured on the Development server.`;
export const requireTextModelKey = (model: string, keys: ChapterModelRoute['keys']) => {
  try { return sharedRequireTextModelKey(model, keys); }
  catch { throw new Error(missingKeyMessage(model)); }
};
export type { ModelCapability, ModelEnvironment, ModelProviderId, ModelStage, ModelReasoning, RoutedModel, ChapterModelRoute, ReasoningLevel } from '@seihouse/library/model-router-server';
export { REASONING_LEVELS } from '@seihouse/library/model-router-server';

const environmentForRouter = (environment: ModelEnvironment): ModelEnvironment => ({
  ...environment,
  OPENROUTER_API_KEY: environment['OpenRouter-Dev']?.trim() || environment.OPENROUTER_API_KEY,
});

export const providerKey = (environment: ModelEnvironment, provider: ModelProviderId) =>
  sharedProviderKey(environmentForRouter(environment), provider);

export const resolveChapterModelRoute = (
  environment: ModelEnvironment,
  listVariable: string,
  defaultVariable: string,
) => sharedResolveChapterModelRoute(environmentForRouter(environment), listVariable, defaultVariable);

export interface GenerationConsumer {
  name: string;
  capability: ModelCapability;
  entry: string;
  modelChoice: 'router' | 'server-default';
}

export const GENERATION_CONSUMERS: readonly GenerationConsumer[] = [
  { name: 'Harness Generation', capability: 'chapters', entry: 'src/server/harness-generation/execute.ts', modelChoice: 'router' },
  { name: 'Story Seed Blueprint', capability: 'chapters', entry: 'src/server/story-seed-blueprint/http.ts', modelChoice: 'server-default' },
  { name: 'Reader Translation', capability: 'chapters', entry: 'src/server/reader-translation/http.ts', modelChoice: 'server-default' },
  { name: 'Codex Voice Quote', capability: 'tts', entry: 'src/server/audio/codexVoiceQuote.ts', modelChoice: 'server-default' },
];

export const PROVIDER_ADAPTERS: readonly string[] = [
  'src/library/model-router/geminiThinking.ts',
  'src/library/model-router/openRouter.ts',
  'src/library/model-router/server.ts',
  'src/server/harness-generation/provider.ts',
  'src/server/story-seed-blueprint/generate.ts',
  'src/server/audio/codexVoiceQuote.ts',
];
