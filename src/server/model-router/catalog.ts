import {
  providerKey as sharedProviderKey,
  resolveChapterModelRoute as sharedResolveChapterModelRoute,
  type ModelEnvironment,
  type ModelProviderId,
  type ModelCapability,
} from '@seihouse/library/model-router-server';

export { LOCAL_LM_STUDIO_MODEL, isLocalModelDevelopment, CHAPTER_MODELS, IMAGE_MODELS, TTS_MODELS, LIVE_MODELS, AUDIO_MODELS, VIDEO_MODELS, THREE_D_MODELS, DEFAULT_CHAPTER_MODEL, DEFAULT_IMAGE_MODEL, DEFAULT_TTS_MODEL, DEFAULT_LIVE_MODEL, lowestReasoningLevel, providerModelName, resolveReasoningLevel, textModelProvider, textModelLabel } from '@seihouse/library/model-router-server';
export const isMissingKeyMessage = (message: string) => /(?:GEMINI_API_KEY|OPENROUTER_API_KEY|OpenRouter-Dev|MINIMAX_API_KEY|Minimax|ANTHROPIC_API_KEY|claude_sen) is not configured/.test(message);
import { MODEL_PROVIDERS as sharedProviders } from '@seihouse/library/model-router-server';
export const MODEL_PROVIDERS = {
  ...sharedProviders,
  minimax: { ...sharedProviders.minimax, keyVariable: 'Minimax', keyVariables: ['Minimax', 'MINIMAX_API_KEY'] },
  anthropic: { ...sharedProviders.anthropic, keyVariable: 'claude_sen', keyVariables: ['claude_sen', 'ANTHROPIC_API_KEY'] },
  openrouter: { ...sharedProviders.openrouter, keyVariable: 'OpenRouter-Dev', keyVariables: ['OpenRouter-Dev', 'OPENROUTER_API_KEY'] },
};
import { requireTextModelKey as sharedRequireTextModelKey, textModelProvider } from '@seihouse/library/model-router-server';
import type { ChapterModelRoute } from '@seihouse/library/model-router-server';
export const missingKeyMessage = (model: string) => textModelProvider(model) === 'lmstudio'
  ? 'Local (LM Studio) is only available in local development.'
  : `${MODEL_PROVIDERS[textModelProvider(model) ?? 'gemini'].keyVariable} is not configured on the Development server.`;
export const requireTextModelKey = (model: string, keys: ChapterModelRoute['keys']) => {
  try { return sharedRequireTextModelKey(model, keys); }
  catch { throw new Error(missingKeyMessage(model)); }
};
export type { ModelCapability, ModelEnvironment, ModelProviderId, TextProviderId, ModelStage, ModelReasoning, RoutedModel, ChapterModelRoute, ReasoningLevel } from '@seihouse/library/model-router-server';
export { REASONING_LEVELS } from '@seihouse/library/model-router-server';

const environmentForRouter = (environment: ModelEnvironment): ModelEnvironment => ({
  ...environment,
  MINIMAX_API_KEY: environment.Minimax?.trim() || environment.MINIMAX_API_KEY,
  ANTHROPIC_API_KEY: environment.claude_sen?.trim() || environment.ANTHROPIC_API_KEY,
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

// HARNESS registers chapter writing and arc planning through one shared entry; memory extraction is retired.
// The Holdings fixer's small check after each chapter has its own entry, with the chapter's model; so does writing a look on demand (Look Describer).
export const GENERATION_CONSUMERS: readonly GenerationConsumer[] = [
  { name: 'Harness Generation', capability: 'chapters', entry: 'src/server/harness-generation/execute.ts', modelChoice: 'router' },
  { name: 'Holdings Fixer', capability: 'chapters', entry: 'src/server/harness-generation/holdingsFixer.ts', modelChoice: 'router' },
  { name: 'Look Describer', capability: 'chapters', entry: 'src/server/harness-generation/lookDescriber.ts', modelChoice: 'router' },
  { name: 'Chapter Tagger', capability: 'chapters', entry: 'src/server/harness-generation/tagger.ts', modelChoice: 'router' },
  { name: 'Story Seed Blueprint', capability: 'chapters', entry: 'src/server/story-seed-blueprint/http.ts', modelChoice: 'router' },
  { name: 'Story Spark', capability: 'chapters', entry: 'src/server/story-spark/http.ts', modelChoice: 'server-default' },
  { name: 'Reader Translation', capability: 'chapters', entry: 'src/server/reader-translation/http.ts', modelChoice: 'server-default' },
  { name: 'Codex Voice Quote', capability: 'tts', entry: 'src/server/audio/codexVoiceQuote.ts', modelChoice: 'server-default' },
  { name: 'Familiar Live Talk', capability: 'live', entry: 'src/server/familiar-live/http.ts', modelChoice: 'router' },
  { name: 'Story Cover', capability: 'images', entry: 'src/server/story-cover/http.ts', modelChoice: 'router' },
  { name: 'Codex Picture', capability: 'images', entry: 'src/server/story-cover/codexPicture.ts', modelChoice: 'router' },
  { name: 'Image Lab', capability: 'images', entry: 'src/server/image-lab/http.ts', modelChoice: 'router' },
  { name: 'Profile Picture', capability: 'images', entry: 'src/server/profile-picture/http.ts', modelChoice: 'router' },
];

export const PROVIDER_ADAPTERS: readonly string[] = [
  'src/library/model-router/geminiThinking.ts',
  'src/library/model-router/openRouter.ts',
  'src/library/model-router/server.ts',
  'src/library/model-router/minimax.ts',
  'src/library/model-router/anthropic.ts',
  'src/library/model-router/types.ts',
  'src/server/harness-generation/provider.ts',
  'src/server/story-seed-blueprint/generate.ts',
  'src/server/audio/codexVoiceQuote.ts',
  // The browser end of Familiar Live Talk: it opens the conversation the server's token allows.
  'src/host/familiar/live.ts',
  // Familiar Live Talk on OpenAI GPT-Live: the server exchanges the browser's connection offer.
  'src/server/familiar-live/openai.ts',
  // Familiar Live Talk on ElevenLabs Realtime: the server mints the client secret; the browser talks.
  'src/server/familiar-live/elevenlabs.ts',
  'src/host/familiar/realtimeLive.ts',
];
