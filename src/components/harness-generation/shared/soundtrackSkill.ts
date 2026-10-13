import type { SoundtrackVocabulary } from '../../../audio/soundtrackVocabulary';
import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How the writer chooses a chapter's opening sound, in the tiny SEN language.
 * The music (the soundscape) and the atmosphere are two separate sounds, as
 * Sound Cues are a third, so each has its own tag: one soundscape tag names
 * the mood of the music and one atmosphere tag names the place's sound, both
 * at the very start of the chapter. Never a second of either, so a passing
 * fight never brings on war music; a change partway through is the reader's
 * to make in Create mode. It never chooses a recording: the HARNESS keeps the
 * first tag of each kind and the Reader plays pieces of that mood and a bed
 * of that atmosphere. The instruction names no words itself: the story's own
 * moods and atmospheres, appended below it at assembly, are the whole
 * vocabulary. Where tags may go is said once for every tag kind by the
 * HARNESS tag rules.
 */
export const SEN_SOUNDTRACK_INSTRUCTIONS = `JOB: Choose the music and the atmosphere the chapter opens with. They are two separate sounds, each with its own tag.
FORMAT: [[soundscape: Music Mood]] [[atmosphere: Atmosphere]], each once, together at the very start of the chapter's first paragraph.
- Music Mood: the feeling of the chapter as a whole, from MUSIC MOODS below. A brief fight does not make a chapter fighting or war.
- Atmosphere: the sound of the place where most of the chapter happens, from ATMOSPHERES below.
REQUIRED: Exactly one soundscape tag and one atmosphere tag in the chapter, one word each.
FORBIDDEN: A second soundscape or atmosphere tag, for a new scene or a passing moment. Both words in one tag. Words not on the lists.
CHECK BEFORE YOU RETURN: The first paragraph starts with the chapter's only soundscape tag and only atmosphere tag, each word from its list.`;

/** SEN's bundled Soundtrack skill. It occupies the Soundtrack slot, which the story's Media Loadout manages. */
export const SEN_SOUNDTRACK_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-soundtrack',
  version: '2.0.0',
  name: 'SEN Soundtrack',
  description: 'Chooses the music mood and the atmosphere a chapter opens with, each with its own tag, once, at its start, from the story\'s soundscapes and atmospheres.',
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
    ? [`EXAMPLE (choose your own for each chapter): [[soundscape: ${vocabulary.moods[0]}]] [[atmosphere: ${vocabulary.atmospheres[0]}]]`]
    : []),
  ...(vocabulary.moods.length ? [`MUSIC MOODS: ${vocabulary.moods.join(', ')}`] : []),
  ...(vocabulary.atmospheres.length ? [`ATMOSPHERES: ${vocabulary.atmospheres.join(', ')}`] : []),
].join('\n');
