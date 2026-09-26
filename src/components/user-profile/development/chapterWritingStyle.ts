/**
 * The Reading Mode values the settings panel offers. SEN owns them
 * (`src/narrative/readingMode.ts`, carried from `SENSEIDUKES/Light-Novels`
 * `src/lib/chapterWritingStyle.ts`); the profile stores only the account's
 * default. The option strings are persisted values: do not rename them.
 */
export {
  CHAPTER_WRITING_STYLE_OPTIONS,
  DEFAULT_CHAPTER_WRITING_STYLE,
  normalizeChapterWritingStyle,
} from '@seihouse/sen/contracts';
