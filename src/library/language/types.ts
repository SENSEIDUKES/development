import type { SenLanguageCode } from '@seihouse/sen/contracts';

export type NonEnglishSenLanguageCode = Exclude<SenLanguageCode, 'en'>;

export interface LanguageFormatters {
  daoXpEarned: (amount: string) => string;
  savedOnDevice: (time: string) => string;
  currentFamiliar: (name: string) => string;
  selectItem: (name: string) => string;
  toSpend: (amount: string) => string;
  dayStreak: (days: string) => string;
  sealedScrolls: (count: string) => string;
}

/**
 * The story words that keep their meaning however the interface's wording
 * changes, translated once per language: the novel traditions, the genre
 * paths, the Story Tag families and the Story Tags themselves. Keys are the
 * English labels exactly as the catalogue writes them; a story keeps storing
 * the English, so only what the reader sees changes.
 */
export interface StoryVocabulary {
  readonly traditions: Readonly<Record<string, string>>;
  readonly genres: Readonly<Record<string, string>>;
  readonly categories: Readonly<Record<string, string>>;
  readonly tags: Readonly<Record<string, string>>;
}

export interface LanguagePack {
  readonly code: NonEnglishSenLanguageCode;
  readonly strings: Readonly<Record<string, string>>;
  readonly formatters: LanguageFormatters;
}
