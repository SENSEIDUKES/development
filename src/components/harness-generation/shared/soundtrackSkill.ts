import { AUDIO_ENERGIES, AUDIO_TENSIONS, AUDIO_TONES } from '../../../audio/audioTags';
import type { SoundtrackVocabulary } from '../../../audio/soundtrackVocabulary';
import type { HarnessSkillManifest } from '../../../narrative/generation';

/**
 * How the writer chooses a chapter's opening sound, in SENSEI's words: the
 * music and the atmosphere, once each, at the very start. The writer names a
 * category and its tags, never a recording: "Rain | high", and the HARNESS
 * chooses a rain bed of high energy, as it chooses the pieces of music. So the
 * writer never sees a list of recordings, and the list never grows with the
 * library. The categories and the tag words are appended below it at
 * assembly. Where tags may go is said once for every tag kind by the HARNESS
 * tag rules.
 */
export const SEN_SOUNDTRACK_INSTRUCTIONS = `Open the first paragraph with its music and atmosphere, once each:
[[soundscape: Category | Tone | Tension | Energy]] [[atmosphere: Category | Energy]]
Music fits the whole chapter; atmosphere is where most of it happens.
Use only the categories below.`;

/** SEN's bundled Soundtrack skill. It occupies the Soundtrack slot, which the story's Media Loadout manages. */
export const SEN_SOUNDTRACK_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-soundtrack',
  version: '3.1.0',
  name: 'SEN Soundtrack',
  description: 'Chooses the music and the atmosphere a chapter opens with, once each, at its start, by category and SEN audio tags; the HARNESS chooses the recordings.',
  slot: 'soundtrack',
  applications: ['generation'],
  instructions: SEN_SOUNDTRACK_INSTRUCTIONS,
  author: 'SEIHouse',
};

/** The story's soundtrack categories as the writer sees them: one example made from the first of each, the categories, then the tag words. */
export const presentSoundtrackVocabulary = (vocabulary: SoundtrackVocabulary) => [
  ...(vocabulary.music?.length && vocabulary.atmospheres?.length
    ? [`Example: [[soundscape: ${vocabulary.music[0]} | bright | calm | medium]] [[atmosphere: ${vocabulary.atmospheres[0]} | low]]`]
    : []),
  ...(vocabulary.music?.length ? [`MUSIC: ${vocabulary.music.join(', ')}`] : []),
  ...(vocabulary.atmospheres?.length ? [`ATMOSPHERE: ${vocabulary.atmospheres.join(', ')}`] : []),
  `Tone: ${AUDIO_TONES.join(', ')}. Tension: ${AUDIO_TENSIONS.join(', ')}. Energy: ${AUDIO_ENERGIES.join(', ')}.`,
].join('\n');
