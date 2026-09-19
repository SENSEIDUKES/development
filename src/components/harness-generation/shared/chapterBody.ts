import type { HarnessChapterMetrics, HarnessWarning } from '../../../narrative/generation';

/**
 * The HARNESS-owned chapter body.
 *
 * The Generation Model Call returns one authoritative `paragraphs` array. The
 * HARNESS preserves each paragraph's text exactly, derives the readable prose
 * from it, measures the chapter, and hands the ordered paragraphs to block
 * construction. Paragraph boundaries are transport structure, so a lost blank
 * line can no longer collapse a chapter into a single block.
 */

/** The HARNESS chapter-scale target. It is not a CAPA skill and not canonical Story Information. */
export const HARNESS_CHAPTER_TARGET_MIN_WORDS = 1_800;
export const HARNESS_CHAPTER_TARGET_MAX_WORDS = 2_500;
/** Below this a one-paragraph reply is a legitimately short body, not a structural failure. */
export const HARNESS_SINGLE_PARAGRAPH_REVIEW_WORDS = 150;
/** Upper bound: one runaway list cannot displace the chapter. */
export const HARNESS_MAX_CHAPTER_PARAGRAPHS = 600;

const CJK_CHARACTER = '[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff66-\\uff9f]';

/**
 * Whitespace-delimited words plus one count per CJK character, so a chapter
 * written in the story's original language measures honestly against the
 * scale target instead of reading as a handful of words.
 */
export const countHarnessWords = (text: string): number => {
  const ideographs = text.match(new RegExp(CJK_CHARACTER, 'gu'))?.length ?? 0;
  const words = text.replace(new RegExp(CJK_CHARACTER, 'gu'), ' ').trim().split(/\s+/u).filter(Boolean).length;
  return ideographs + words;
};

/** Recovery only: blank-line paragraph boundaries inside one string. */
export const splitHarnessProseParagraphs = (prose: string): string[] => prose
  .replace(/\r\n?/g, '\n')
  .split(/\n[ \t]*\n+/)
  .map(paragraph => paragraph.trim())
  .filter(Boolean);

/**
 * Reads the authoritative model-authored body. Paragraph text is preserved
 * exactly; only surrounding whitespace is trimmed and empty entries dropped. A
 * provider that packs several paragraphs into one entry still yields ordered
 * blocks rather than one collapsed chapter.
 */
export const normalizeHarnessParagraphs = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const paragraphs: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    for (const paragraph of splitHarnessProseParagraphs(item)) {
      paragraphs.push(paragraph);
      if (paragraphs.length >= HARNESS_MAX_CHAPTER_PARAGRAPHS) return paragraphs;
    }
  }
  return paragraphs.length ? paragraphs : undefined;
};

export interface HarnessChapterBody {
  paragraphs: string[];
  /** Derived by joining accepted paragraphs with blank lines. Never rewritten. */
  prose: string;
  metrics: HarnessChapterMetrics;
}

export const harnessChapterBody = (paragraphs: readonly string[]): HarnessChapterBody => {
  const prose = paragraphs.join('\n\n');
  const wordCount = countHarnessWords(prose);
  return {
    paragraphs: [...paragraphs],
    prose,
    metrics: {
      wordCount,
      paragraphCount: paragraphs.length,
      meetsScaleTarget: wordCount >= HARNESS_CHAPTER_TARGET_MIN_WORDS,
    },
  };
};

/**
 * Quality diagnostics. Short or unstructured output is always preserved and
 * always inspectable; it is never rejected and its prose is never discarded.
 */
export const harnessChapterBodyWarnings = (metrics: HarnessChapterMetrics): HarnessWarning[] => {
  const warnings: HarnessWarning[] = [];
  if (metrics.paragraphCount === 1 && metrics.wordCount >= HARNESS_SINGLE_PARAGRAPH_REVIEW_WORDS) {
    warnings.push({
      code: 'chapter_structure_quality',
      message: `The provider returned ${metrics.wordCount.toLocaleString()} words as a single paragraph. The chapter is preserved exactly as written, but it carries no internal structure for dialogue, System Panels, or media to address.`,
    });
  }
  if (!metrics.meetsScaleTarget) {
    warnings.push({
      code: 'chapter_scale_below_target',
      message: `The chapter is ${metrics.wordCount.toLocaleString()} words, below the ${HARNESS_CHAPTER_TARGET_MIN_WORDS.toLocaleString()}-word chapter-scale target. The prose and the raw provider response are preserved for inspection.`,
    });
  }
  return warnings;
};
