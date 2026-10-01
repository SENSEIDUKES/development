/**
 * The SEN language registry — the single authoritative list of languages SEN
 * supports and the one normalization path shared by Profile, Story Seed,
 * HARNESS, and Reader Chamber.
 *
 * A language is identified by its stable code wherever it is stored, passed
 * between systems, or compared. Labels are presentation only and must never be
 * persisted or used as a lookup key; `direction` is the single source of text
 * direction for reader surfaces.
 */

export type SenLanguageCode =
  | 'en'
  | 'es'
  | 'zh-CN'
  | 'zh-TW'
  | 'ja'
  | 'ko'
  | 'vi'
  | 'id'
  | 'th'
  | 'tl'
  | 'ms';

export type SenTextDirection = 'ltr' | 'rtl';

export interface SenLanguage {
  code: SenLanguageCode;
  label: string;
  direction: SenTextDirection;
}

/** English is the explicit fallback whenever no language has been resolved. */
export const DEFAULT_SEN_LANGUAGE_CODE: SenLanguageCode = 'en';

export const SEN_LANGUAGES: readonly SenLanguage[] = [
  { code: 'en', label: 'English', direction: 'ltr' },
  { code: 'es', label: 'Spanish', direction: 'ltr' },
  { code: 'zh-CN', label: 'Simplified Chinese (简体中文)', direction: 'ltr' },
  { code: 'zh-TW', label: 'Traditional Chinese (繁體中文)', direction: 'ltr' },
  { code: 'ja', label: 'Japanese (日本語)', direction: 'ltr' },
  { code: 'ko', label: 'Korean (한국어)', direction: 'ltr' },
  { code: 'vi', label: 'Vietnamese (Tiếng Việt)', direction: 'ltr' },
  { code: 'id', label: 'Indonesian (Bahasa Indonesia)', direction: 'ltr' },
  { code: 'th', label: 'Thai (ภาษาไทย)', direction: 'ltr' },
  { code: 'tl', label: 'Tagalog (Filipino)', direction: 'ltr' },
  { code: 'ms', label: 'Malay (Bahasa Melayu)', direction: 'ltr' },
] as const;

const LANGUAGES_BY_CODE = new Map<string, SenLanguage>(
  SEN_LANGUAGES.map(language => [language.code, language]),
);

export const isSenLanguageCode = (value: unknown): value is SenLanguageCode =>
  typeof value === 'string' && LANGUAGES_BY_CODE.has(value);

/**
 * Resolves any host-supplied value to a supported code. Unsupported input
 * resolves to the fallback rather than propagating an unknown language into
 * story identity or a reader surface.
 */
export const normalizeSenLanguageCode = (
  value: unknown,
  fallback: SenLanguageCode = DEFAULT_SEN_LANGUAGE_CODE,
): SenLanguageCode => (isSenLanguageCode(value) ? value : fallback);

export const getSenLanguage = (code: SenLanguageCode): SenLanguage =>
  LANGUAGES_BY_CODE.get(code) ?? LANGUAGES_BY_CODE.get(DEFAULT_SEN_LANGUAGE_CODE)!;

export const getSenLanguageLabel = (code: SenLanguageCode): string => getSenLanguage(code).label;

export const getSenTextDirection = (code: string): SenTextDirection =>
  LANGUAGES_BY_CODE.get(code)?.direction ?? 'ltr';

/**
 * The speech-voice language tags (BCP 47) that can read a SEN language, best
 * first. Devices name voices inconsistently: Android may say `in` for
 * Indonesian or `fil` for Tagalog, and Chinese voices may carry a script
 * (`zh-Hant`) or a Mandarin tag (`cmn-…`) instead of a region. Traditional
 * Chinese ends with Hong Kong's voice, which still reads the same characters.
 */
const SPEECH_LANGUAGE_TAGS: Readonly<Record<SenLanguageCode, readonly string[]>> = {
  en: ['en'],
  es: ['es'],
  'zh-CN': ['zh-CN', 'zh-Hans', 'cmn-Hans', 'cmn-CN', 'zh-SG'],
  'zh-TW': ['zh-TW', 'zh-Hant', 'cmn-Hant', 'cmn-TW', 'zh-HK'],
  ja: ['ja'],
  ko: ['ko'],
  vi: ['vi'],
  id: ['id', 'in'],
  th: ['th'],
  tl: ['fil', 'tl'],
  ms: ['ms'],
};

export const senSpeechLanguageTags = (code: SenLanguageCode): readonly string[] =>
  SPEECH_LANGUAGE_TAGS[code] ?? SPEECH_LANGUAGE_TAGS[DEFAULT_SEN_LANGUAGE_CODE];

/**
 * The account-level reading language a reader surface displays when the story
 * itself has not been overridden: Default Reading Language, then Interface
 * Language, then English.
 */
export const resolveReadingLanguageCode = (account: {
  defaultReadingLanguage?: unknown;
  interfaceLanguage?: unknown;
}): SenLanguageCode => {
  if (isSenLanguageCode(account.defaultReadingLanguage)) return account.defaultReadingLanguage;
  if (isSenLanguageCode(account.interfaceLanguage)) return account.interfaceLanguage;
  return DEFAULT_SEN_LANGUAGE_CODE;
};
