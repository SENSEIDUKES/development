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

export interface LanguagePack {
  readonly code: NonEnglishSenLanguageCode;
  readonly strings: Readonly<Record<string, string>>;
  readonly formatters: LanguageFormatters;
}
