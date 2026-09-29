import type { SoundWord } from '../../../audio/soundWords';
import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How the writer adds Sound Cues, in the tiny SEN language: it wraps the words
 * where a sound happens and names the sound. It never chooses a recording,
 * file or placement rule; the HARNESS does that from the story's sound words.
 * The instruction names no sounds itself: the story's example list, appended
 * below it at assembly, both teaches the pattern and is the whole vocabulary.
 * Its numbers are SOUND_CUE_RULES (1–5 words, at most 10); a test keeps them equal.
 */
export const SEN_SOUND_CUES_INSTRUCTIONS = `Sound Cues

When something in the prose makes a sound worth hearing — an action or event — wrap the one to five words of your sentence where it happens as [[n|words]], numbering marks 1, 2, 3… through the chapter. Add one soundCues entry per mark: {"mark": n, "sound": the sound word, "energy": low, medium or high}. Only sounds that actually happen; at most ten. Marks go only inside paragraphs, never nested, never in the title, recap or evidence; the words inside a mark stay in the story's language.`;

/** SEN's bundled Sound Cues skill. It occupies the Sound Cues slot, which the story's Media Loadout manages. */
export const SEN_SOUND_CUES_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-sound-cues',
  version: '1.0.0',
  name: 'SEN Sound Cues',
  description: 'Marks the words where a sound happens and names it from the story\'s sound words; the HARNESS places the cue and picks the recording.',
  slot: 'soundCues',
  applications: ['generation'],
  instructions: SEN_SOUND_CUES_INSTRUCTIONS,
  author: 'SEIHouse',
};

/**
 * The story's sound words as the writer sees them: examples of how to mark,
 * one line per word, which are also the only sound words it may use.
 */
export const presentSoundVocabulary = (words: readonly SoundWord[]) => [
  'The examples below show how to do it. Each one pairs the kind of words to wrap with the sound word to name. They are not text for the chapter: write your own prose, mark it the same way, and use only these sound words.',
  ...words.map(sound => `[[n|${sound.example}]] → ${sound.word}${sound.meaning ? ` (${sound.meaning})` : ''}`),
].join('\n');
