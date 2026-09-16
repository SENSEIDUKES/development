/**
 * The Reader's per-story reading-language choice.
 *
 * Reading language is a reversible display preference, never story canon. The
 * canonical chapter always remains the story's Original Language; this only
 * decides which language the Reader is currently *showing*.
 *
 * Three choices, and the difference between them matters when the account
 * default changes: only stories left on Account Default follow it. A story set
 * to Original or to a specific language keeps what its reader chose.
 */

import {
  DEFAULT_SEN_LANGUAGE_CODE,
  isSenLanguageCode,
  resolveReadingLanguageCode,
  type SenLanguageCode,
} from '../../../lib/language';

export type ReaderLanguageMode = 'original' | 'account' | 'specific';

export interface ReaderLanguageChoice {
  mode: ReaderLanguageMode;
  /** Required by `specific`; meaningless for the other two modes. */
  language?: SenLanguageCode;
}

/** A story with no saved choice reads in its own Original Language. */
export const DEFAULT_READER_LANGUAGE_CHOICE: ReaderLanguageChoice = { mode: 'original' };

export interface ReaderAccountLanguages {
  defaultReadingLanguage?: unknown;
  interfaceLanguage?: unknown;
}

export interface ResolvedReaderLanguage {
  /** The language the Reader will actually display. */
  language: SenLanguageCode;
  mode: ReaderLanguageMode;
  /** False whenever the canonical chapter is already in `language`. */
  translationRequired: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Reads an untrusted saved choice. A `specific` choice without a supported
 * code is not a usable override, so it falls back to Original rather than to
 * an arbitrary language.
 */
export const normalizeReaderLanguageChoice = (value: unknown): ReaderLanguageChoice => {
  if (!isRecord(value)) return DEFAULT_READER_LANGUAGE_CHOICE;
  if (value.mode === 'account') return { mode: 'account' };
  if (value.mode === 'specific' && isSenLanguageCode(value.language)) {
    return { mode: 'specific', language: value.language };
  }
  return DEFAULT_READER_LANGUAGE_CHOICE;
};

/**
 * Resolves the choice against the story's Original Language and the account.
 * Account Default keeps the established order: Default Reading Language, then
 * Interface Language, then English.
 */
export const resolveReaderLanguage = (
  choice: ReaderLanguageChoice,
  context: { originalLanguage: unknown; account?: ReaderAccountLanguages },
): ResolvedReaderLanguage => {
  const originalLanguage = isSenLanguageCode(context.originalLanguage)
    ? context.originalLanguage
    : DEFAULT_SEN_LANGUAGE_CODE;
  const normalized = normalizeReaderLanguageChoice(choice);
  const language = normalized.mode === 'account'
    ? resolveReadingLanguageCode(context.account ?? {})
    : normalized.mode === 'specific' && normalized.language
      ? normalized.language
      : originalLanguage;
  return {
    language,
    mode: normalized.mode,
    // A resolved language equal to the canonical one is shown immediately and
    // never sent for translation, whichever mode produced it.
    translationRequired: language !== originalLanguage,
  };
};
