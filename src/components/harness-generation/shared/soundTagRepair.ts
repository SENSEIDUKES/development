import { splitSentences } from '../../text-highlight-engine/shared/manuscript';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { MarkReading, SoundTag } from '../../../narrative/marks';
import { wordRanges, type WordRange } from '../../../narrative/words';

/**
 * The safety net for a sound tag the writer put beside its sentence instead of
 * around words in it. Such a tag's words were written only for the tag: left in
 * place they read as a broken line ("his pick scraped salt crystal", alone and
 * in lower case) or repeat the sentence before them. Those words are removed,
 * and the sound moves onto the nearby words that say the same thing, or, when
 * none do, onto the nearest sentence. Tags wrapping words inside a sentence are
 * never touched, and nothing else in the prose changes.
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
    if (taken.some(tag => range.start < tag.end && range.end > tag.start)) continue;
    if (!best || seen.size > best.score) best = { score: seen.size, range };
  }
  return best;
};

/** The first words of a sentence, up to the cue's word limit. */
const sentenceWords = (text: string, sentence: { start: number; end: number }, locale?: string): WordRange | undefined => {
  const words = wordRanges(text.slice(sentence.start, sentence.end), locale).slice(0, SOUND_CUE_RULES.maxWords);
  return words.length ? { start: sentence.start + words[0].start, end: sentence.start + words.at(-1)!.end } : undefined;
};

/**
 * Settles every stray sound tag in a chapter's paragraphs, read in order.
 * Returns the paragraphs with each stray tag's words removed and its sound
 * moved, how many stray tags had their words removed, and how many of their
 * sounds found a sentence to move to (a chapter with no other prose has none). A paragraph left empty is kept empty here;
 * the caller drops it as it drops any paragraph that held only tags.
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
    settled.push(trimLeadingStrayPunctuation(reading));
  });
  if (!orphans.length) return { readings: settled, moved: 0, removed: 0 };

  let moved = 0;

  for (const orphan of orphans) {
    const echoes = contentWords(orphan.words, locale);
    const near = [orphan.paragraph, orphan.paragraph - 1, orphan.paragraph + 1]
      .filter(index => index >= 0 && index < settled.length && settled[index].text);
    // First choice: words nearby that say what the stray words said, in this paragraph, then the one before, then after.
    let target: { paragraph: number; range: WordRange } | undefined;
    let score = 0;
    for (const index of near) {
      const echo = bestEcho(settled[index].text, echoes, settled[index].sounds, locale);
      if (echo && echo.score > score) { score = echo.score; target = { paragraph: index, range: echo.range }; }
    }
    // Otherwise the sentence nearest before it: in its own paragraph, else the paragraph before, else after.
    if (!target) {
      const own = settled[orphan.paragraph].text;
      const ownSentences = own ? splitSentences(own, locale) : [];
      const before = ownSentences.filter(sentence => sentence.end <= orphan.offset).at(-1);
      const previous = near.find(index => index < orphan.paragraph);
      const following = near.find(index => index > orphan.paragraph);
      const pick = before ? { paragraph: orphan.paragraph, sentence: before }
        : previous !== undefined ? { paragraph: previous, sentence: splitSentences(settled[previous].text, locale).at(-1) }
          : ownSentences[0] ? { paragraph: orphan.paragraph, sentence: ownSentences[0] }
            : following !== undefined ? { paragraph: following, sentence: splitSentences(settled[following].text, locale)[0] }
              : undefined;
      const range = pick?.sentence && sentenceWords(settled[pick.paragraph].text, pick.sentence, locale);
      if (pick && range) target = { paragraph: pick.paragraph, range };
    }
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
