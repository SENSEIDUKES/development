import { normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';
import type { LanguageFormatters, LanguagePack, NonEnglishSenLanguageCode } from './types';

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

const loadedPacks = new Map<NonEnglishSenLanguageCode, CompiledLanguagePack>();
const inFlightPacks = new Map<NonEnglishSenLanguageCode, Promise<CompiledLanguagePack>>();

function compileLanguagePack(pack: LanguagePack): CompiledLanguagePack {
  const lowercaseLookup = new Map<string, string>();
  for (const [key, value] of Object.entries(pack.strings)) {
    lowercaseLookup.set(key.toLowerCase(), value);
  }
  return {
    code: pack.code,
    strings: pack.strings,
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

  const loader = LOCALE_LOADERS[code];
  const request = loader()
    .then(mod => {
      const compiled = compileLanguagePack(mod.default);
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
