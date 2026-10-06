import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { SoundWord } from '../../../audio/soundWords';
import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How the writer adds Sound Cues, in the tiny SEN language: a sound tag wraps
 * the words where a sound happens and names it. It never chooses a recording,
 * file or placement rule; the HARNESS does that from the story's sound words.
 * The instruction names no sounds itself: the story's sound words, appended
 * below it at assembly with an example made from the first, are the whole
 * vocabulary. Its numbers are SOUND_CUE_RULES. Where tags may go, and that the
 * prose reads complete without them, is said once for every tag kind by the
 * HARNESS tag rules.
 */
export const SEN_SOUND_CUES_INSTRUCTIONS = `JOB: Mark the words where a listed sound happens, so the sound plays there.
FORMAT: [[sound: Sound Word | Words | Energy]], in place of those words inside your sentence.
- Sound Word: from the list below.
- Words: the few words of your own sentence where it happens, at most ${SOUND_CUE_RULES.maxWords}. The tag wraps them where they stand; they stay in the sentence.
- Energy: how strong the sound is: low, medium or high.
REQUIRED: Only sounds that happen in the scene. At most ${SOUND_CUE_RULES.maxPerChapter} per chapter.
FORBIDDEN: Any sound word not on the list. A tag on its own line or between sentences. Words written only for the tag, or repeating the sentence.
CHECK BEFORE YOU RETURN: Every sound tag sits inside a sentence around words of that sentence, with a listed sound word, at most ${SOUND_CUE_RULES.maxWords} words and an energy.`;

/** SEN's bundled Sound Cues skill. It occupies the Sound Cues slot, which the story's Media Loadout manages. */
export const SEN_SOUND_CUES_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-sound-cues',
  version: '2.1.0',
  name: 'SEN Sound Cues',
  description: 'Tags the words where a sound happens and names it from the story\'s sound words; the HARNESS places the cue and picks the recording.',
  slot: 'soundCues',
  applications: ['generation'],
  instructions: SEN_SOUND_CUES_INSTRUCTIONS,
  author: 'SEIHouse',
};

/**
 * The story's sound words as the writer sees them: one example tag made from
 * the first word, then every word with example words of the moment it fits
 * and, when it needs telling apart, its meaning. The list is the whole
 * vocabulary; the examples show the kind of words to tag, never text to copy.
 */
export const presentSoundVocabulary = (words: readonly SoundWord[]) => words.length
  ? [
      `EXAMPLE: [[sound: ${words[0].word} | ${words[0].example} | medium]]`,
      'SOUND WORDS (each with example words; write your own):',
      ...words.map(sound => `${sound.word}: ${sound.example}${sound.meaning ? ` (${sound.meaning})` : ''}`),
    ].join('\n')
  : '';
