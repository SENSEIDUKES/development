import type { SoundtrackVocabulary } from '../../../audio/soundtrackVocabulary';
import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How the writer chooses a chapter's soundtrack, in the tiny SEN language: one
 * soundtrack tag at the very start of the chapter names the mood of its music
 * and its atmosphere, and they play for the whole chapter. One tag, never
 * another, so a passing fight never brings on war music. It never chooses a
 * recording: the HARNESS keeps the first tag and the Reader plays pieces of
 * that mood and a bed of that atmosphere. The instruction names no words
 * itself: the story's own moods and atmospheres, appended below it at
 * assembly, are the whole vocabulary. Where tags may go is said once for
 * every tag kind by the HARNESS tag rules.
 */
export const SEN_SOUNDTRACK_INSTRUCTIONS = `JOB: Choose the music and atmosphere the whole chapter is read with.
FORMAT: [[soundtrack: Music Mood | Atmosphere]], once, at the very start of the chapter's first paragraph.
- Music Mood: the feeling of the chapter as a whole, from MUSIC MOODS below. A brief fight does not make a chapter fighting or war.
- Atmosphere: the sound of the place where most of the chapter happens, from ATMOSPHERES below.
REQUIRED: Exactly one soundtrack tag in the chapter.
FORBIDDEN: A second soundtrack tag, for a new scene or a passing moment. Words not on the lists.
CHECK BEFORE YOU RETURN: The first paragraph starts with the chapter's only soundtrack tag, both of its words from the lists.`;

/** SEN's bundled Soundtrack skill. It occupies the Soundtrack slot, which the story's Media Loadout manages. */
export const SEN_SOUNDTRACK_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-soundtrack',
  version: '1.0.0',
  name: 'SEN Soundtrack',
  description: 'Chooses the music mood and atmosphere a chapter is read with, once, at its start, from the story\'s soundscapes and atmospheres.',
  slot: 'soundtrack',
  applications: ['generation'],
  instructions: SEN_SOUNDTRACK_INSTRUCTIONS,
  author: 'SEIHouse',
};

/**
 * The story's soundtrack words as the writer sees them: one example tag, then
 * every music mood and every atmosphere. The lists are the whole vocabulary.
 */
export const presentSoundtrackVocabulary = (vocabulary: SoundtrackVocabulary) => [
  ...(vocabulary.moods.length && vocabulary.atmospheres.length
    ? [`EXAMPLE (choose your own for each chapter): [[soundtrack: ${vocabulary.moods[0]} | ${vocabulary.atmospheres[0]}]]`]
    : []),
  ...(vocabulary.moods.length ? [`MUSIC MOODS: ${vocabulary.moods.join(', ')}`] : []),
  ...(vocabulary.atmospheres.length ? [`ATMOSPHERES: ${vocabulary.atmospheres.join(', ')}`] : []),
].join('\n');
