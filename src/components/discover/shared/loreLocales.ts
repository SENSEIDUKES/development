import type { SenLanguageCode } from '@seihouse/sen/contracts';
import { ENGLISH_LORE, type LoreLocale, type LoreTermCopy } from './loreEnglish';
import { LORE_INTERFACE_COPY } from './loreInterfaceCopy';

/** Language codes come from SEN. Only the selected term pack is downloaded. */
const LOADERS = {
  "es": () => import('./lore-locales/es'),
  "zh-CN": () => import('./lore-locales/zh-CN'),
  "zh-TW": () => import('./lore-locales/zh-TW'),
  "ja": () => import('./lore-locales/ja'),
  "ko": () => import('./lore-locales/ko'),
  "vi": () => import('./lore-locales/vi'),
  "id": () => import('./lore-locales/id'),
  "th": () => import('./lore-locales/th'),
  "tl": () => import('./lore-locales/tl'),
  "ms": () => import('./lore-locales/ms'),
  "ar": () => import('./lore-locales/ar'),
  "he": () => import('./lore-locales/he'),
  "fa": () => import('./lore-locales/fa'),
  "ur": () => import('./lore-locales/ur'),
  "pt-BR": () => import('./lore-locales/pt'),
  "es-ES": () => import('./lore-locales/es'),
  "pt-PT": () => import('./lore-locales/pt'),
  "de": () => import('./lore-locales/de'),
  "fr": () => import('./lore-locales/fr'),
  "ru": () => import('./lore-locales/ru'),
  "hi": () => import('./lore-locales/hi'),
  "sw": () => import('./lore-locales/sw'),
  "pl": () => import('./lore-locales/pl'),
  "tr": () => import('./lore-locales/tr'),
  "ig": () => import('./lore-locales/ig'),
  "yo": () => import('./lore-locales/yo'),
  "am": () => import('./lore-locales/am'),
  "ha": () => import('./lore-locales/ha'),
  "so": () => import('./lore-locales/so'),
} satisfies Record<Exclude<SenLanguageCode, 'en'>, () => Promise<{ default: LoreTermCopy }>>;

export async function loadLoreLocale(language: SenLanguageCode): Promise<LoreLocale> {
  if (language === 'en') return ENGLISH_LORE;
  const copyCode = language === 'es-ES' ? 'es' : language === 'pt-BR' || language === 'pt-PT' ? 'pt' : language;
  const { default: terms } = await LOADERS[language]();
  return { ...LORE_INTERFACE_COPY[copyCode], terms };
}
