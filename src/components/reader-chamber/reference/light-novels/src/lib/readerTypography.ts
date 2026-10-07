import type { ReaderPreferences } from '../types';

export const DEFAULT_READER_TYPOGRAPHY = {
  lineHeightScale: 1.62,
  paragraphSpacingScale: 1.15,
  letterSpacing: 0,
  wordSpacing: 0,
  readingWidth: 62,
  textAlignment: 'start',
} as const;

const LEGACY_LINE_HEIGHT: Record<ReaderPreferences['lineHeight'], number> = {
  snug: 1.55,
  normal: 1.6,
  relaxed: 1.65,
  loose: 1.7,
};

const LEGACY_PARAGRAPH_SPACING: Record<ReaderPreferences['paragraphSpacing'], number> = {
  normal: 1.15,
  wide: 1.5,
  double: 2,
};

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

/**
 * Normalizes saved reader settings so old stories gain the new book-like
 * defaults without requiring a data migration.
 */
export function getReaderTypography(preferences?: Partial<ReaderPreferences> | null) {
  const prefs = preferences ?? {};
  const legacyLineHeight = prefs.lineHeight ? LEGACY_LINE_HEIGHT[prefs.lineHeight] : undefined;
  const legacyParagraphSpacing = prefs.paragraphSpacing
    ? LEGACY_PARAGRAPH_SPACING[prefs.paragraphSpacing]
    : undefined;

  return {
    lineHeightScale: clamp(
      prefs.lineHeightScale ?? legacyLineHeight,
      1.45,
      1.9,
      DEFAULT_READER_TYPOGRAPHY.lineHeightScale,
    ),
    paragraphSpacingScale: clamp(
      prefs.paragraphSpacingScale ?? legacyParagraphSpacing,
      0.5,
      2.5,
      DEFAULT_READER_TYPOGRAPHY.paragraphSpacingScale,
    ),
    letterSpacing: clamp(prefs.letterSpacing, -0.03, 0.08, DEFAULT_READER_TYPOGRAPHY.letterSpacing),
    wordSpacing: clamp(prefs.wordSpacing, -0.04, 0.08, DEFAULT_READER_TYPOGRAPHY.wordSpacing),
    readingWidth: clamp(prefs.readingWidth, 44, 76, DEFAULT_READER_TYPOGRAPHY.readingWidth),
    textAlignment: prefs.textAlignment === 'justify' ? 'justify' : DEFAULT_READER_TYPOGRAPHY.textAlignment,
  };
}

const RTL_LANGUAGES = new Set(['ar', 'arc', 'dv', 'fa', 'ha', 'he', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi']);

export function getReadingDirection(language: string): 'ltr' | 'rtl' {
  return RTL_LANGUAGES.has(language.toLowerCase().split('-')[0]) ? 'rtl' : 'ltr';
}
