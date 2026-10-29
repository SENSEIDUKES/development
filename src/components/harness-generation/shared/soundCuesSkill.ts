import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { SoundWord } from '../../../audio/soundWords';

/**
 * How Sound Cues are added, in the tiny SEN language: a sound tag on the
 * words where a sound happens, naming it. It never chooses a recording,
 * file or placement rule; the HARNESS does that from the story's sound words.
 * The instruction names no sounds itself: the story's sound words, appended
 * below it at assembly, are the whole vocabulary. Its numbers are
 * SOUND_CUE_RULES. What a note is, and where tags may go, is said once for
 * every tag kind by the HARNESS tag rules.
 */
export const SEN_SOUND_CUES_INSTRUCTIONS = `When a sentence describes a sound below happening, tag up to ${SOUND_CUE_RULES.maxWords} of its own words, where they stand:
[[sound: Sound Word | Energy]]  Energy: low, medium or high.
The words are the sentence's own, copied exactly: never words of your own, and never a whole sentence.
At most ${SOUND_CUE_RULES.maxPerChapter} a chapter.`;

/**
 * The story's sound words as the tagger sees them: one example note made from
 * the first word, with a placeholder where the words go (the words are always
 * the paragraph's own, never a phrase from here), then every word on one line.
 * The list is the whole vocabulary.
 */
export const presentSoundVocabulary = (words: readonly SoundWord[]) => words.length
  ? [
      `Example: {"paragraph": 7, "words": "the sentence's own words for the sound", "tag": "[[sound: ${words[0].word} | high]]"}`,
      `SOUND WORDS: ${words.map(sound => sound.word).join(', ')}`,
    ].join('\n')
  : '';
