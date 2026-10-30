import type { SenLanguageCode } from '@seihouse/sen/contracts';
import type { LoreRenderings } from './loreCatalogue';
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

/** How each term is written in a language, from the master glossary. Hebrew has no glossary column yet. */
const RENDERING_LOADERS = {
  "en": () => import('./lore-glossary/renderings/en.json'),
  "es": () => import('./lore-glossary/renderings/es.json'),
  "zh-CN": () => import('./lore-glossary/renderings/zh-CN.json'),
  "zh-TW": () => import('./lore-glossary/renderings/zh-TW.json'),
  "ja": () => import('./lore-glossary/renderings/ja.json'),
  "ko": () => import('./lore-glossary/renderings/ko.json'),
  "vi": () => import('./lore-glossary/renderings/vi.json'),
  "id": () => import('./lore-glossary/renderings/id.json'),
  "th": () => import('./lore-glossary/renderings/th.json'),
  "tl": () => import('./lore-glossary/renderings/tl.json'),
  "ms": () => import('./lore-glossary/renderings/ms.json'),
  "ar": () => import('./lore-glossary/renderings/ar.json'),
  "fa": () => import('./lore-glossary/renderings/fa.json'),
  "ur": () => import('./lore-glossary/renderings/ur.json'),
  "pt-BR": () => import('./lore-glossary/renderings/pt-BR.json'),
  "es-ES": () => import('./lore-glossary/renderings/es-ES.json'),
  "pt-PT": () => import('./lore-glossary/renderings/pt-PT.json'),
  "de": () => import('./lore-glossary/renderings/de.json'),
  "fr": () => import('./lore-glossary/renderings/fr.json'),
  "ru": () => import('./lore-glossary/renderings/ru.json'),
  "hi": () => import('./lore-glossary/renderings/hi.json'),
  "sw": () => import('./lore-glossary/renderings/sw.json'),
  "pl": () => import('./lore-glossary/renderings/pl.json'),
  "tr": () => import('./lore-glossary/renderings/tr.json'),
  "ig": () => import('./lore-glossary/renderings/ig.json'),
  "yo": () => import('./lore-glossary/renderings/yo.json'),
  "am": () => import('./lore-glossary/renderings/am.json'),
  "ha": () => import('./lore-glossary/renderings/ha.json'),
  "so": () => import('./lore-glossary/renderings/so.json'),
  "he": async () => ({ default: {} }),
} satisfies Record<SenLanguageCode, () => Promise<{ default: Record<string, string[]> }>>;

export async function loadLoreRenderings(language: SenLanguageCode): Promise<LoreRenderings> {
  const { default: renderings } = await RENDERING_LOADERS[language]();
  return renderings as unknown as LoreRenderings;
}
