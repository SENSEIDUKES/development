import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { MarkReading, SoundTag } from '../../../narrative/marks';
import { wordRanges, type WordRange } from '../../../narrative/words';

/**
 * The safety net for a sound tag the writer put beside its sentence instead of
 * around words in it. Such a tag's words were written only for the tag: left in
 * place they read as a broken line ("his pick scraped salt crystal", alone and
 * in lower case) or repeat the sentence before them. Those words are removed,
 * and the sound moves onto nearby words that clearly say the same thing (two
 * of its words, or its only one). When no words do, the sound is dropped: a
 * sound the prose never describes has no place to play, and guessing one put
 * cues on unrelated words ("stepping into the open as"). Tags wrapping words
 * inside a sentence are never touched, and nothing else in the prose changes.
 */

type Reading = Pick<MarkReading, 'text' | 'sounds' | 'speakers' | 'wordTags' | 'marks'>;

/** Sentence-ending punctuation, with any closing quotes or brackets after it. */
const SENTENCE_END = /[.!?。！？…‽][\s"'”’»」』)\]）]*$/u;
/** Text that begins a new sentence: not a lower-case letter, and not punctuation that carries the sentence on. */
const SENTENCE_START = /^\s+[^\p{Ll}\s,.;:!?…—–\-)）、。，]/u;
const LOWER_CASE_START = /^[^\p{L}]*\p{Ll}/u;
const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'at', 'his', 'her', 'its', 'their', 'was', 'were', 'with', 'from', 'into', 'as', 'by', 'it', 'he', 'she', 'they']);

/**
 * Whether a sound tag's words stand outside any sentence: alone in their
 * paragraph without ending as a sentence does, or between two sentences,
 * starting in lower case and ending without punctuation.
 */
export function isStraySoundTag(text: string, tag: Pick<SoundTag, 'start' | 'end'>): boolean {
  const words = text.slice(tag.start, tag.end);
  if (!words.trim() || SENTENCE_END.test(words)) return false;
  const before = text.slice(0, tag.start).trimEnd();
  const after = text.slice(tag.end);
  const alone = !before && !after.trim();
  if (alone) return true;
  const startsAfterSentence = !before || SENTENCE_END.test(before);
  const endsBeforeSentence = !after.trim() || SENTENCE_START.test(after);
  return startsAfterSentence && endsBeforeSentence && LOWER_CASE_START.test(words);
}

/** Removes `[start, end)` from a reading's text and moves every tag after it back. */
const removeRange = (reading: Reading, start: number, end: number): Reading => {
  const length = end - start;
  const at = (offset: number) => (offset >= end ? offset - length : Math.min(offset, start));
  return {
    ...reading,
    text: reading.text.slice(0, start) + reading.text.slice(end),
    sounds: reading.sounds.map(tag => ({ ...tag, start: at(tag.start), end: at(tag.end) })),
    speakers: reading.speakers.map(tag => ({ ...tag, offset: at(tag.offset) })),
    wordTags: reading.wordTags.map(tag => ({ ...tag, offset: at(tag.offset) })),
    marks: reading.marks.map(mark => ({ ...mark, start: at(mark.start), end: at(mark.end) })),
  };
};

/** A paragraph never begins with a stray full stop or comma, as one does when a tag stood in for its first words. */
const LEADING_STRAY_PUNCTUATION = /^[.,;:](?!\.)\s*/;

/** Removes punctuation a tag left at the start of a paragraph (". Below his feet"). */
export function trimLeadingStrayPunctuation<T extends Reading>(reading: T): T {
  const stray = reading.text.match(LEADING_STRAY_PUNCTUATION);
  return stray ? { ...reading, ...removeRange(reading, 0, stray[0].length) } : reading;
}

interface Orphan { sound: SoundTag; words: string; paragraph: number; offset: number }

const contentWords = (text: string, locale?: string) => new Set(
  wordRanges(text, locale).map(word => text.slice(word.start, word.end).toLocaleLowerCase(locale))
    .filter(word => word.length > 2 && !STOP_WORDS.has(word)),
);

/** Whether a range shares any text with a sound already placed in its paragraph. */
const overlapsSound = (range: WordRange, taken: readonly SoundTag[]) => taken.some(tag => range.start < tag.end && range.end > tag.start);

/** The words of `text` that best say what the orphan's words said: at most the cue's word limit, first to last match. */
const bestEcho = (text: string, words: Set<string>, taken: readonly SoundTag[], locale?: string) => {
  const ranges = wordRanges(text, locale);
  const keys = ranges.map(range => text.slice(range.start, range.end).toLocaleLowerCase(locale));
  let best: { score: number; range: WordRange } | undefined;
  for (let first = 0; first < ranges.length; first += 1) {
    if (!words.has(keys[first])) continue;
    const seen = new Set<string>([keys[first]]);
    let last = first;
    for (let next = first + 1; next < Math.min(ranges.length, first + SOUND_CUE_RULES.maxWords); next += 1) {
      if (words.has(keys[next])) { seen.add(keys[next]); last = next; }
    }
    const range = { start: ranges[first].start, end: ranges[last].end };
    if (overlapsSound(range, taken)) continue;
    if (!best || seen.size > best.score) best = { score: seen.size, range };
  }
  return best;
};

/** How many of a stray tag's words nearby prose must repeat before its sound moves there: two, or its only one. */
const requiredEcho = (words: Set<string>) => Math.min(2, words.size);

/**
 * Settles every stray sound tag in a chapter's paragraphs, read in order.
 * Returns the paragraphs with each stray tag's words removed and its sound
 * moved, how many stray tags had their words removed, and how many of their
 * sounds found words to move to without overlapping another sound. A
 * paragraph left empty is kept empty here; the caller drops it as it drops
 * any paragraph that held only tags.
 */
export function settleStraySoundTags<T extends Reading>(readings: readonly T[], locale?: string): { readings: T[]; moved: number; removed: number } {
  const settled: T[] = [];
  const orphans: Orphan[] = [];
  readings.forEach((original, paragraph) => {
    let reading: T = original;
    const strays = reading.sounds.filter(tag => isStraySoundTag(reading.text, tag)).sort((left, right) => right.start - left.start);
    for (const stray of strays) {
      const current = reading.sounds.find(tag => tag.sound === stray.sound && tag.start === stray.start && tag.end === stray.end)!;
      const words = reading.text.slice(current.start, current.end);
      // Take the space before the words, or after them at the paragraph's start, so no double space is left.
      let start = current.start;
      let end = current.end;
      while (start > 0 && /\s/u.test(reading.text[start - 1])) start -= 1;
      if (start === 0) while (end < reading.text.length && /\s/u.test(reading.text[end])) end += 1;
      const without = { ...reading, sounds: reading.sounds.filter(tag => tag !== current) };
      reading = { ...reading, ...removeRange(without, start, end) };
      orphans.push({ sound: current, words, paragraph, offset: start });
    }
    const trimmed = trimLeadingStrayPunctuation(reading);
    // Punctuation trimmed from the paragraph's start moves this paragraph's orphans back with the text.
    const shift = reading.text.length - trimmed.text.length;
    if (shift) for (const orphan of orphans) if (orphan.paragraph === paragraph) orphan.offset = Math.max(0, orphan.offset - shift);
    settled.push(trimmed);
  });
  if (!orphans.length) return { readings: settled, moved: 0, removed: 0 };

  let moved = 0;

  /** The nearest paragraph with prose before or after one, past any left empty. */
  const nearestWithText = (from: number, step: -1 | 1) => {
    for (let index = from + step; index >= 0 && index < settled.length; index += step) if (settled[index].text) return index;
    return undefined;
  };

  for (const orphan of orphans) {
    const echoes = contentWords(orphan.words, locale);
    const previous = nearestWithText(orphan.paragraph, -1);
    const following = nearestWithText(orphan.paragraph, 1);
    const own = settled[orphan.paragraph].text ? orphan.paragraph : undefined;
    const near = [own, previous, following].filter((index): index is number => index !== undefined);
    // Only words nearby that say what the stray words said: in this paragraph, the one before, or the one after.
    let target: { paragraph: number; range: WordRange } | undefined;
    let score = requiredEcho(echoes) - 1;
    if (score < 0) continue;
    for (const index of near) {
      const echo = bestEcho(settled[index].text, echoes, settled[index].sounds, locale);
      if (echo && echo.score > score) { score = echo.score; target = { paragraph: index, range: echo.range }; }
    }
    // Nothing nearby says it: the sound is dropped rather than put on words that never made it.
    if (!target) continue;
    moved += 1;
    const reading = settled[target.paragraph];
    settled[target.paragraph] = {
      ...reading,
      sounds: [...reading.sounds, { ...orphan.sound, ...target.range }].sort((left, right) => left.start - right.start),
    };
  }
  return { readings: settled, moved, removed: orphans.length };
}
