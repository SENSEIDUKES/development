/**
 * Copied from `SENSEIDUKES/Light-Novels` `src/lib/chapterWritingStyle.ts`,
 * trimmed to the two exports the settings panel reads. The prompt-instruction
 * helpers (`getChapterWritingStyleInstruction`,
 * `appendChapterWritingStyleInstruction`) belong to chapter generation, not to
 * the profile surface, and are excluded.
 *
 * The option strings are persisted values — do not rename them.
 */

import type { ChapterWritingStyle } from '../shared/types';

export const DEFAULT_CHAPTER_WRITING_STYLE: ChapterWritingStyle = "Standard";

export const CHAPTER_WRITING_STYLE_OPTIONS = [
  "Standard",
  "Clear Reading",
  "Easy Read",
  "Literal Reading",
] as const satisfies readonly ChapterWritingStyle[];

export const normalizeChapterWritingStyle = (value: unknown): ChapterWritingStyle =>
  CHAPTER_WRITING_STYLE_OPTIONS.includes(value as ChapterWritingStyle)
    ? (value as ChapterWritingStyle)
    : DEFAULT_CHAPTER_WRITING_STYLE;
