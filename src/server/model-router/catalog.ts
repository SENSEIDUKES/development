/**
 * Universal Model Router catalog.
 *
 * The single server-side owner of which generation models exist, which provider
 * serves each one, and which credential it needs. Models are grouped by
 * capability (chapters, images, TTS) so every generation surface reads the same
 * list instead of pinning its own model string.
 *
 * Model ids carry their route:
 * - `google/gemini-…` (or bare `gemini-…`) → Google Gemini API (`GEMINI_API_KEY`)
 * - `openrouter/<vendor>/<model>` → OpenRouter (`OpenRouter-Dev`, or `OPENROUTER_API_KEY`)
 * - `eleven_…` → ElevenLabs (`ELEVENLABS_API_KEY`)
 */

export type ModelEnvironment = Record<string, string | undefined>;
export type ModelCapability = 'chapters' | 'images' | 'tts';
export type ModelProviderId = 'gemini' | 'openrouter' | 'elevenlabs';
export type ModelStage = 'current' | 'preview' | 'legacy';

export interface RoutedModel {
  id: string;
  label: string;
  provider: ModelProviderId;
  stage: ModelStage;
}

/**
 * `keyVariable` is the name shown in messages and the Router; `keyVariables`
 * lists every environment name accepted, in priority order.
 */
export const MODEL_PROVIDERS: Record<ModelProviderId, { label: string; keyVariable: string; keyVariables: readonly string[] }> = {
  gemini: { label: 'Google Gemini', keyVariable: 'GEMINI_API_KEY', keyVariables: ['GEMINI_API_KEY'] },
  // The Vercel variable is named `OpenRouter-Dev`; the conventional name also works.
  openrouter: { label: 'OpenRouter', keyVariable: 'OpenRouter-Dev', keyVariables: ['OpenRouter-Dev', 'OPENROUTER_API_KEY'] },
  elevenlabs: { label: 'ElevenLabs', keyVariable: 'ELEVENLABS_API_KEY', keyVariables: ['ELEVENLABS_API_KEY'] },
};

const OPENROUTER_PREFIX = 'openrouter/';
const GEMINI_TEXT_PATTERN = /^(?:google\/)?gemini-[a-z0-9][a-z0-9._-]*$/i;
const OPENROUTER_PATTERN = /^openrouter\/[a-z0-9][a-z0-9._-]*\/[a-z0-9~][a-z0-9._:-]*$/i;

/** Text models for chapter generation, newest first within each provider. */
export const CHAPTER_MODELS: readonly RoutedModel[] = [
  { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash', provider: 'gemini', stage: 'current' },
  { id: 'google/gemini-3.7-flash', label: 'Gemini 3.7 Flash', provider: 'gemini', stage: 'current' },
  { id: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash', provider: 'gemini', stage: 'current' },
  { id: 'google/gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', provider: 'gemini', stage: 'current' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', provider: 'gemini', stage: 'preview' },
  { id: 'google/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', provider: 'gemini', stage: 'current' },
  { id: 'openrouter/openai/gpt-6-luna', label: 'GPT-6 Luna · OpenRouter', provider: 'openrouter', stage: 'current' },
  { id: 'openrouter/openai/gpt-6-luna-pro', label: 'GPT-6 Luna Pro · OpenRouter', provider: 'openrouter', stage: 'current' },
];

/**
 * The model chapter surfaces select when nothing else is configured. It stays
 * on the long-running model so adding newer models never silently changes
 * cost or voice; pick a newer one in the model selector or set
 * `*_DEFAULT_MODEL`.
 */
export const DEFAULT_CHAPTER_MODEL = 'google/gemini-3.1-flash-lite';

/** Image models. Catalogued for the Router; no DEV surface calls them yet. */
export const IMAGE_MODELS: readonly RoutedModel[] = [
  { id: 'google/gemini-3.1-flash-image', label: 'Nano Banana 2 (Gemini 3.1 Flash Image)', provider: 'gemini', stage: 'current' },
  { id: 'google/gemini-3-pro-image', label: 'Nano Banana Pro (Gemini 3 Pro Image)', provider: 'gemini', stage: 'current' },
  { id: 'google/gemini-3.1-flash-lite-image', label: 'Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)', provider: 'gemini', stage: 'current' },
  { id: 'openrouter/openai/gpt-5.4-image-2', label: 'GPT-5.4 Image 2 · OpenRouter', provider: 'openrouter', stage: 'current' },
];

/** Text-to-speech models served by ElevenLabs. */
export const TTS_MODELS: readonly RoutedModel[] = [
  { id: 'eleven_v3', label: 'Eleven v3', provider: 'elevenlabs', stage: 'current' },
  { id: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2', provider: 'elevenlabs', stage: 'current' },
  { id: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5', provider: 'elevenlabs', stage: 'current' },
];

export const DEFAULT_TTS_MODEL = 'eleven_multilingual_v2';

export const providerKey = (environment: ModelEnvironment, provider: ModelProviderId): string | undefined => {
  for (const name of MODEL_PROVIDERS[provider].keyVariables) {
    const raw = environment[name]?.trim();
    if (raw && raw !== 'MY_GEMINI_API_KEY') return raw;
  }
  return undefined;
};

/** Which provider serves a chapter-capable text model id, or undefined when the id is not routable. */
export const textModelProvider = (model: string): 'gemini' | 'openrouter' | undefined => {
  if (GEMINI_TEXT_PATTERN.test(model)) return 'gemini';
  if (OPENROUTER_PATTERN.test(model)) return 'openrouter';
  return undefined;
};

/** The provider-facing model name: `google/gemini-3.8-flash` → `gemini-3.8-flash`, `openrouter/openai/gpt-6-luna` → `openai/gpt-6-luna`. */
export const providerModelName = (model: string): string =>
  model.startsWith(OPENROUTER_PREFIX) ? model.slice(OPENROUTER_PREFIX.length) : model.replace(/^google\//, '');

const titleCase = (value: string) => value
  .split('-')
  .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
  .join(' ');

export const textModelLabel = (model: string): string => {
  const known = CHAPTER_MODELS.find(option => option.id === model);
  if (known) return known.label;
  const name = providerModelName(model);
  return model.startsWith(OPENROUTER_PREFIX)
    ? `${titleCase(name.split('/').pop() ?? name)} · OpenRouter`
    : titleCase(name);
};

const csv = (value: string | undefined) => value
  ?.split(',')
  .map(item => item.trim())
  .filter(Boolean) ?? [];

/** Accept `openai/gpt-6-luna` or `openrouter/openai/gpt-6-luna` in `OPENROUTER_MODELS`. */
const asOpenRouterId = (model: string) => model.startsWith(OPENROUTER_PREFIX) ? model : `${OPENROUTER_PREFIX}${model}`;

export interface ChapterModelRoute {
  models: Array<{ id: string; label: string }>;
  defaultModel: string;
  keys: Partial<Record<'gemini' | 'openrouter', string>>;
}

/**
 * Resolve the chapter-model list for one surface.
 *
 * `listVariable` (for example `HARNESS_GENERATION_MODELS`) pins models ahead of
 * the catalog; `OPENROUTER_MODELS` adds any extra OpenRouter model to test.
 * Catalog OpenRouter models appear once the OpenRouter key exists, so the
 * selector never offers a route that cannot run.
 */
export const resolveChapterModelRoute = (
  environment: ModelEnvironment,
  listVariable: string,
  defaultVariable: string,
): ChapterModelRoute => {
  const keys = {
    gemini: providerKey(environment, 'gemini'),
    openrouter: providerKey(environment, 'openrouter'),
  };
  const pinned = csv(environment[listVariable]);
  const extras = csv(environment.OPENROUTER_MODELS).map(asOpenRouterId);
  const catalog = CHAPTER_MODELS
    .filter(model => model.provider !== 'openrouter' || keys.openrouter)
    .map(model => model.id);
  const ids = [...new Set([...pinned, ...extras, ...catalog])].filter(model => textModelProvider(model));
  if (!ids.length) throw new Error(`${listVariable} does not contain a valid chapter model.`);
  const requested = environment[defaultVariable]?.trim();
  const defaultModel = requested && ids.includes(requested)
    ? requested
    : pinned.find(model => ids.includes(model)) ?? DEFAULT_CHAPTER_MODEL;
  return {
    models: ids.map(id => ({ id, label: textModelLabel(id) })),
    defaultModel: ids.includes(defaultModel) ? defaultModel : ids[0],
    keys,
  };
};

export const missingKeyMessage = (model: string): string => {
  const provider = textModelProvider(model) ?? 'gemini';
  return `${MODEL_PROVIDERS[provider].keyVariable} is not configured on the Development server.`;
};

/** The credential for a text model's provider, or a clear configuration error. */
export const requireTextModelKey = (model: string, keys: ChapterModelRoute['keys']): string => {
  const provider = textModelProvider(model);
  const key = provider ? keys[provider] : undefined;
  if (!key) throw new Error(missingKeyMessage(model));
  return key;
};

export const isMissingKeyMessage = (message: string): boolean =>
  /(?:GEMINI_API_KEY|OPENROUTER_API_KEY|OpenRouter-Dev) is not configured/.test(message);

/**
 * Every Workshop feature that calls a generation model, and where it calls it.
 *
 * This is the source of the Model Router's "Used by" section. When you add a
 * feature that generates text, images, or speech, register it here in the
 * same change; `generationConsumers.test.ts` scans the repository and fails
 * on any model call site that is not listed here or in `PROVIDER_ADAPTERS`.
 *
 * `modelChoice` says whether the feature follows the model picked in the
 * Router gear (`router`) or always uses the server default (`server-default`).
 */
export interface GenerationConsumer {
  name: string;
  capability: ModelCapability;
  /** Repository path of the server file that makes the model call. */
  entry: string;
  modelChoice: 'router' | 'server-default';
}

export const GENERATION_CONSUMERS: readonly GenerationConsumer[] = [
  { name: 'Harness Generation', capability: 'chapters', entry: 'src/server/harness-generation/execute.ts', modelChoice: 'router' },
  { name: 'Chapter Generation', capability: 'chapters', entry: 'src/server/chapter-generation/execute.ts', modelChoice: 'router' },
  { name: 'Story Seed Blueprint', capability: 'chapters', entry: 'src/server/story-seed-blueprint/http.ts', modelChoice: 'server-default' },
  { name: 'Reader Translation', capability: 'chapters', entry: 'src/server/reader-translation/http.ts', modelChoice: 'server-default' },
  { name: 'Codex Voice Quote', capability: 'tts', entry: 'src/server/audio/codexVoiceQuote.ts', modelChoice: 'server-default' },
];

/** Files that talk to a provider on behalf of the consumers above. */
export const PROVIDER_ADAPTERS: readonly string[] = [
  'src/server/harness-generation/provider.ts',
  'src/server/chapter-generation/provider.ts',
  'src/server/story-seed-blueprint/generate.ts',
  'src/server/audio/codexVoiceQuote.ts',
];
