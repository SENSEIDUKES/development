import { normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';
import type { LanguageFormatters, LanguagePack, NonEnglishSenLanguageCode, StoryVocabulary } from './types';

export interface CompiledLanguagePack {
  readonly code: NonEnglishSenLanguageCode;
  readonly strings: Readonly<Record<string, string>>;
  readonly lowercaseLookup: ReadonlyMap<string, string>;
  readonly formatters: LanguageFormatters;
}

const LOCALE_LOADERS: Readonly<Record<NonEnglishSenLanguageCode, () => Promise<{ default: LanguagePack }>>> = {
  es: () => import('./locales/es'),
  'zh-CN': () => import('./locales/zh-CN'),
  'zh-TW': () => import('./locales/zh-TW'),
  ja: () => import('./locales/ja'),
  ko: () => import('./locales/ko'),
  vi: () => import('./locales/vi'),
  id: () => import('./locales/id'),
  th: () => import('./locales/th'),
  tl: () => import('./locales/tl'),
  ms: () => import('./locales/ms'),
  ar: () => import('./locales/ar'),
  he: () => import('./locales/he'),
  fa: () => import('./locales/fa'),
  ur: () => import('./locales/ur'),
  'pt-BR': () => import('./locales/pt-BR'),
  'es-ES': () => import('./locales/es-ES'),
  'pt-PT': () => import('./locales/pt-PT'),
  de: () => import('./locales/de'),
  fr: () => import('./locales/fr'),
  ru: () => import('./locales/ru'),
  hi: () => import('./locales/hi'),
  sw: () => import('./locales/sw'),
  pl: () => import('./locales/pl'),
  tr: () => import('./locales/tr'),
  ig: () => import('./locales/ig'),
  yo: () => import('./locales/yo'),
  am: () => import('./locales/am'),
  ha: () => import('./locales/ha'),
  so: () => import('./locales/so'),
};

/** Each language's story vocabulary (`types.ts`), loaded with its pack. */
const VOCABULARY_LOADERS: Readonly<Record<NonEnglishSenLanguageCode, () => Promise<{ default: StoryVocabulary }>>> = {
  es: () => import('./vocabulary/es'),
  'zh-CN': () => import('./vocabulary/zh-CN'),
  'zh-TW': () => import('./vocabulary/zh-TW'),
  ja: () => import('./vocabulary/ja'),
  ko: () => import('./vocabulary/ko'),
  vi: () => import('./vocabulary/vi'),
  id: () => import('./vocabulary/id'),
  th: () => import('./vocabulary/th'),
  tl: () => import('./vocabulary/tl'),
  ms: () => import('./vocabulary/ms'),
  ar: () => import('./vocabulary/ar'),
  he: () => import('./vocabulary/he'),
  fa: () => import('./vocabulary/fa'),
  ur: () => import('./vocabulary/ur'),
  'pt-BR': () => import('./vocabulary/pt-BR'),
  'es-ES': () => import('./vocabulary/es-ES'),
  'pt-PT': () => import('./vocabulary/pt-PT'),
  de: () => import('./vocabulary/de'),
  fr: () => import('./vocabulary/fr'),
  ru: () => import('./vocabulary/ru'),
  hi: () => import('./vocabulary/hi'),
  sw: () => import('./vocabulary/sw'),
  pl: () => import('./vocabulary/pl'),
  tr: () => import('./vocabulary/tr'),
  ig: () => import('./vocabulary/ig'),
  yo: () => import('./vocabulary/yo'),
  am: () => import('./vocabulary/am'),
  ha: () => import('./vocabulary/ha'),
  so: () => import('./vocabulary/so'),
};

const loadedPacks = new Map<NonEnglishSenLanguageCode, CompiledLanguagePack>();
const inFlightPacks = new Map<NonEnglishSenLanguageCode, Promise<CompiledLanguagePack>>();

function compileLanguagePack(pack: LanguagePack, vocabulary: StoryVocabulary): CompiledLanguagePack {
  // The interface's own phrases win where a story word and a phrase share their English.
  const strings = { ...vocabulary.traditions, ...vocabulary.genres, ...vocabulary.categories, ...vocabulary.tags, ...pack.strings };
  const lowercaseLookup = new Map<string, string>();
  for (const [key, value] of Object.entries(strings)) {
    lowercaseLookup.set(key.toLowerCase(), value);
  }
  return {
    code: pack.code,
    strings,
    lowercaseLookup,
    formatters: pack.formatters,
  };
}

export function getLoadedLanguagePack(language?: SenLanguageCode): CompiledLanguagePack | undefined {
  const code = normalizeSenLanguageCode(language);
  if (code === 'en') return undefined;
  return loadedPacks.get(code);
}

export async function loadLanguagePack(language?: SenLanguageCode): Promise<CompiledLanguagePack | null> {
  const code = normalizeSenLanguageCode(language);
  if (code === 'en') return null;

  const existing = loadedPacks.get(code);
  if (existing) return existing;

  const pending = inFlightPacks.get(code);
  if (pending) return pending;

  const request = Promise.all([LOCALE_LOADERS[code](), VOCABULARY_LOADERS[code]()])
    .then(([mod, vocabulary]) => {
      const compiled = compileLanguagePack(mod.default, vocabulary.default);
      loadedPacks.set(code, compiled);
      inFlightPacks.delete(code);
      return compiled;
    })
    .catch(err => {
      inFlightPacks.delete(code);
      throw err;
    });

  inFlightPacks.set(code, request);
  return request;
}

export async function loadAllLanguagePacks(): Promise<void> {
  const codes = Object.keys(LOCALE_LOADERS) as NonEnglishSenLanguageCode[];
  await Promise.all(codes.map(code => loadLanguagePack(code)));
}
