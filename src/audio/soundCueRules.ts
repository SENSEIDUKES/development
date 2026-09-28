import { countWords, wholeWordRange } from '../narrative/words';

/**
 * What a placed Sound Cue may be on the page, however it was made: one to five
 * whole words naming an action or event worth a sound ("drew his sword"), and
 * no more than ten in a chapter. These describe the finished attachment. A
 * person placing a cue meets them as they select; model direction meets them
 * where it is resolved into an attachment. They are not a description of what
 * a model must write.
 *
 * Soundscapes (not built yet) follow different rules: they are set by a
 * passage, never by words, and a chapter has at most two.
 */
export const SOUND_CUE_RULES = { maxWords: 5, maxPerChapter: 10 } as const;

export type SoundCueWordIssue = 'no-words' | 'partial-word' | 'too-many-words';

/**
 * Why a range of text cannot hold a Sound Cue, or nothing when it can. A cue
 * sits exactly on whole words: `partial-word` means it starts or ends inside a
 * word (or on a space or punctuation mark), `too-many-words` that it holds
 * more than five.
 */
export function soundCueWordIssue(text: string, start: number, end: number, locale?: string): SoundCueWordIssue | undefined {
  const whole = wholeWordRange(text, start, end, locale);
  if (!whole) return 'no-words';
  if (whole.start !== start || whole.end !== end) return 'partial-word';
  if (countWords(text, start, end, locale) > SOUND_CUE_RULES.maxWords) return 'too-many-words';
  return undefined;
}
