/** A word's place in a text: UTF-16 offsets, start inclusive and end exclusive. */
export interface WordRange { start: number; end: number }

/** Letters and numbers, with inner apostrophes (Wei's, don't); used where no segmenter exists. */
const WORD_FALLBACK = /[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}\p{N}_]+)*/gu;

/**
 * The words of a text by its language's own rules, so scripts written without
 * spaces work too. Spaces, punctuation and quotation marks are never words.
 */
export function wordRanges(text: string, locale?: string): WordRange[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(locale, { granularity: 'word' }).segment(text))
      .filter(part => part.isWordLike)
      .map(part => ({ start: part.index, end: part.index + part.segment.length }));
  }
  return Array.from(text.matchAll(WORD_FALLBACK), match => ({ start: match.index, end: match.index + match[0].length }));
}

/**
 * The whole words a range touches: a start or end inside a word moves out to
 * the word's edge, and spaces or punctuation at either end fall away
 * ("rew his swo" → "drew his sword", "“Get up!”" → "Get up"). Undefined when
 * the range touches no word.
 */
export function wholeWordRange(text: string, start: number, end: number, locale?: string): WordRange | undefined {
  const touched = wordRanges(text, locale).filter(word => word.start < end && word.end > start);
  return touched.length ? { start: touched[0].start, end: touched[touched.length - 1].end } : undefined;
}

/** The word under one offset, e.g. where a pointer rests; undefined between words. */
export function wordAt(text: string, offset: number, locale?: string): WordRange | undefined {
  return wordRanges(text, locale).find(word => word.start <= offset && offset < word.end);
}

/** How many words lie within a range. */
export function countWords(text: string, start = 0, end = text.length, locale?: string): number {
  return wordRanges(text, locale).filter(word => word.start >= start && word.end <= end).length;
}

/** True where a word may begin or end: never between two letters of one word. */
export function isWordBoundary(text: string, offset: number, locale?: string): boolean {
  return !wordRanges(text, locale).some(word => word.start < offset && offset < word.end);
}
