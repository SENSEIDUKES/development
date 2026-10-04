import type { HarnessChapterMetrics, HarnessWarning } from '../../../narrative/generation';
import { wordRanges } from '../../../narrative/words';

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
/**
 * The range the HARNESS rolls each chapter's exact paragraph count from. One
 * range for every story for now; story styles come later.
 *
 * Fixed at 50 for now: while the owner tests, every chapter asks for the same
 * count, so how exactly the writer reaches it can be compared chapter to
 * chapter. The range to return to afterwards is 40 to 80.
 */
export const HARNESS_CHAPTER_PARAGRAPH_RANGE: { readonly min: number; readonly max: number } = { min: 50, max: 50 };
/**
 * Below this share of the chapter's minimum words a reply is a failed write,
 * not a short chapter: the writer stopped, or wrote about the task instead of
 * the story, long before a chapter. It is never saved, and the reader tries
 * again. A reply at or above it is kept, and flagged when short.
 */
export const HARNESS_FAILED_WRITE_SHARE = 0.25;
/** Below this a one-paragraph reply is a legitimately short body, not a structural failure. */
export const HARNESS_SINGLE_PARAGRAPH_REVIEW_WORDS = 150;
/** Upper bound: one runaway list cannot displace the chapter. */
export const HARNESS_MAX_CHAPTER_PARAGRAPHS = 600;

const CJK_CHARACTER = '[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff66-\\uff9f]';
/** Scripts that put no space between words (Thai, Lao, Khmer, Burmese): their words are found by the language's own rules. */
const UNSPACED_SCRIPT = /[\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const UNSPACED_RUN = /[\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]+/gu;

/**
 * Whitespace-delimited words, one count per CJK character, and the words of
 * scripts written without spaces (`wordRanges`), so a chapter written in the
 * story's original language measures honestly against the scale target
 * instead of reading as a handful of words.
 */
export const countHarnessWords = (text: string): number => {
  const ideographs = text.match(new RegExp(CJK_CHARACTER, 'gu'))?.length ?? 0;
  const unspaced = UNSPACED_SCRIPT.test(text)
    ? wordRanges(text).filter(word => UNSPACED_SCRIPT.test(text.slice(word.start, word.end))).length
    : 0;
  const words = text.replace(new RegExp(CJK_CHARACTER, 'gu'), ' ').replace(UNSPACED_RUN, ' ').trim().split(/\s+/u).filter(Boolean).length;
  return ideographs + unspaced + words;
};

/**
 * The one id of a chapter's paragraph: `c{chapter}-p{n}`, counted from 1. The
 * Reader's blocks and every Sound Cue anchor use it.
 */
export const harnessParagraphBlockId = (chapterNumber: number, index: number) => `c${chapterNumber}-p${index + 1}`;

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

/**
 * The exact paragraph count for one chapter: a roll within
 * `HARNESS_CHAPTER_PARAGRAPH_RANGE`, seeded by the story and chapter number, so
 * chapters vary in length while the same chapter always gets the same number.
 */
export const harnessChapterParagraphTarget = (
  storyId: string,
  chapterNumber: number,
  { min, max }: { readonly min: number; readonly max: number } = HARNESS_CHAPTER_PARAGRAPH_RANGE,
): number => {
  let hash = 2166136261;
  for (const character of `${storyId}\u001f${chapterNumber}`) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return min + ((hash >>> 0) % (max - min + 1));
};

export const harnessChapterBody = (paragraphs: readonly string[], paragraphTarget?: number): HarnessChapterBody => {
  const prose = paragraphs.join('\n\n');
  const wordCount = countHarnessWords(prose);
  return {
    paragraphs: [...paragraphs],
    prose,
    metrics: {
      wordCount,
      paragraphCount: paragraphs.length,
      meetsScaleTarget: wordCount >= HARNESS_CHAPTER_TARGET_MIN_WORDS,
      ...(paragraphTarget ? { paragraphTarget } : {}),
    },
  };
};

/**
 * Why a reply is a failed write rather than a chapter, when it is one: fewer
 * words than `HARNESS_FAILED_WRITE_SHARE` of the minimum the attempt asked for.
 */
export const harnessFailedWrite = (metrics: Pick<HarnessChapterMetrics, 'wordCount'>, minWords: number): string | undefined =>
  metrics.wordCount < Math.ceil(minWords * HARNESS_FAILED_WRITE_SHARE)
    ? `The writer stopped after ${metrics.wordCount.toLocaleString('en-US')} ${metrics.wordCount === 1 ? 'word' : 'words'}, far short of the ${minWords.toLocaleString('en-US')} a chapter needs.`
    : undefined;

/**
 * Quality diagnostics. Short or unstructured output is preserved and always
 * inspectable; only a failed write (`harnessFailedWrite`) is not a chapter.
 */
export const harnessChapterBodyWarnings = (metrics: HarnessChapterMetrics): HarnessWarning[] => {
  const warnings: HarnessWarning[] = [];
  if (metrics.paragraphCount === 1 && metrics.wordCount >= HARNESS_SINGLE_PARAGRAPH_REVIEW_WORDS) {
    warnings.push({
      code: 'chapter_structure_quality',
      message: `The provider returned ${metrics.wordCount.toLocaleString()} words as a single paragraph. The chapter is preserved exactly as written, but it carries no internal structure for dialogue, System Panels, or media to address.`,
    });
  }
  if (metrics.paragraphTarget && metrics.paragraphCount !== metrics.paragraphTarget) {
    warnings.push({
      code: 'chapter_paragraphs_off_target',
      message: `The chapter has ${metrics.paragraphCount.toLocaleString()} paragraphs; the HARNESS asked for exactly ${metrics.paragraphTarget.toLocaleString()}. It is preserved as written.`,
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
