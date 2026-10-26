import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { SoundWord } from '../../../audio/soundWords';

/**
 * How Sound Cues are added, in the tiny SEN language: a sound tag wraps the
 * words where a sound happens and names it. It never chooses a recording,
 * file or placement rule; the HARNESS does that from the story's sound words.
 * The instruction names no sounds itself: the story's sound words, appended
 * below it at assembly one per line, are the whole vocabulary. Its numbers
 * are SOUND_CUE_RULES. Where tags may go, and that the
 * prose reads complete without them, is said once for every tag kind by the
 * HARNESS tag rules.
 */
export const SEN_SOUND_CUES_INSTRUCTIONS = `When your sentence describes a sound below happening, wrap up to ${SOUND_CUE_RULES.maxWords} of its own words, where they stand:
[[sound: Sound Word | the words | Energy]]  Energy: low, medium or high.
The words stay part of your sentence: never put a tag between sentences or write words only for it.
At most ${SOUND_CUE_RULES.maxPerChapter} a chapter. Never add or change a sentence to fit a sound.`;

/**
 * The story's sound words as the tagger sees them: one example tag made from
 * the first word, with a placeholder where the words go so no phrase can be
 * copied into the prose (given phrases, a model once copied them instead
 * of tagging what its prose already said), then every word on one line. The
 * list is the whole vocabulary.
 */
export const presentSoundVocabulary = (words: readonly SoundWord[]) => words.length
  ? [
      `Example: Far off, [[sound: ${words[0].word} | the words of your own sentence | high]] and the yard fell still.`,
      `SOUND WORDS: ${words.map(sound => sound.word).join(', ')}`,
    ].join('\n')
  : '';
