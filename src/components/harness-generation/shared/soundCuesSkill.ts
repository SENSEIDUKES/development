import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { SoundWord } from '../../../audio/soundWords';
import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How the writer adds Sound Cues, in the tiny SEN language: a sound tag wraps
 * the words where a sound happens and names it. It never chooses a recording,
 * file or placement rule; the HARNESS does that from the story's sound words.
 * The instruction names no sounds itself: the story's sound words, appended
 * below it at assembly one per line, are the whole vocabulary. Its numbers
 * are SOUND_CUE_RULES. Where tags may go, and that the
 * prose reads complete without them, is said once for every tag kind by the
 * HARNESS tag rules.
 */
export const SEN_SOUND_CUES_INSTRUCTIONS = `When your sentence describes a sound below happening, wrap up to ${SOUND_CUE_RULES.maxWords} of its words:
[[sound: Sound Word | the words | Energy]]  Energy: low, medium or high.
At most ${SOUND_CUE_RULES.maxPerChapter} a chapter. Never add or change a sentence to fit a sound.`;

/** SEN's bundled Sound Cues skill. It occupies the Sound Cues slot, which the story's Media Loadout manages. */
export const SEN_SOUND_CUES_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-sound-cues',
  version: '2.5.0',
  name: 'SEN Sound Cues',
  description: 'Tags the words where a sound happens and names it from the story\'s sound words; the HARNESS places the cue and picks the recording.',
  slot: 'soundCues',
  applications: ['generation'],
  instructions: SEN_SOUND_CUES_INSTRUCTIONS,
  author: 'SEIHouse',
};

/**
 * The story's sound words as the writer sees them: one example tag made from
 * the first word, with a placeholder where the words go so no phrase can be
 * copied into the prose (given phrases, the writer once copied them instead
 * of tagging what its prose already said), then every word on one line. The
 * list is the whole vocabulary.
 */
export const presentSoundVocabulary = (words: readonly SoundWord[]) => words.length
  ? [
      `Example: [[sound: ${words[0].word} | the words where it happens | high]]`,
      `SOUND WORDS: ${words.map(sound => sound.word).join(', ')}`,
    ].join('\n')
  : '';
