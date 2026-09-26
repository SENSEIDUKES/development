/**
 * Reading Mode: how a story's chapters are written for the people reading
 * them. It is a story setting, chosen in the Story Seed and owned afterwards by
 * the story's owner; it applies only to chapters written from then on.
 *
 * The values are production's persisted Chapter Writing Style strings
 * (Light-Novels `src/lib/chapterWritingStyle.ts`) and must never be renamed.
 * Standard asks for nothing extra. Every other mode makes the HARNESS load
 * SEN's matching Accessibility skill into each chapter call. Reader display
 * options (fonts, spacing, color palettes) are Reader settings, never a
 * Reading Mode.
 */
export type ChapterWritingStyle = 'Standard' | 'Clear Reading' | 'Easy Read' | 'Literal Reading';

export const DEFAULT_CHAPTER_WRITING_STYLE: ChapterWritingStyle = 'Standard';

export const CHAPTER_WRITING_STYLE_OPTIONS = [
  'Standard',
  'Clear Reading',
  'Easy Read',
  'Literal Reading',
] as const satisfies readonly ChapterWritingStyle[];

/** One line per mode for the Story Settings controls. */
export const CHAPTER_WRITING_STYLE_DESCRIPTIONS: Record<ChapterWritingStyle, string> = {
  Standard: 'The story\'s usual prose.',
  'Clear Reading': 'Clear, dyslexia-friendly prose with the same depth.',
  'Easy Read': 'Especially direct language that is easy to understand.',
  'Literal Reading': 'Literal prose with clear speakers, actions and scene changes.',
};

export const isChapterWritingStyle = (value: unknown): value is ChapterWritingStyle =>
  CHAPTER_WRITING_STYLE_OPTIONS.includes(value as ChapterWritingStyle);

/** Any saved or host-supplied value; anything unrecognized, including absence, is Standard. */
export const normalizeChapterWritingStyle = (value: unknown): ChapterWritingStyle =>
  isChapterWritingStyle(value) ? value : DEFAULT_CHAPTER_WRITING_STYLE;
