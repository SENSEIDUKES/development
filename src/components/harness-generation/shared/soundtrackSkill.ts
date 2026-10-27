import { AUDIO_ENERGIES, AUDIO_TENSIONS, AUDIO_TONES } from '../../../audio/audioTags';
import type { SoundtrackVocabulary } from '../../../audio/soundtrackVocabulary';

/**
 * How a chapter's opening sound is chosen, in SENSEI's words: the music and
 * the atmosphere, once each, at the very start. The tag names a category and
 * its tags, never a recording: "Rain | high", and the HARNESS chooses a rain
 * bed of high energy, as it chooses the pieces of music. So no list of
 * recordings is ever read, and the list never grows with the library. The
 * categories and the tag words are appended below it at
 * assembly. Where tags may go is said once for every tag kind by the HARNESS
 * tag rules.
 */
export const SEN_SOUNDTRACK_INSTRUCTIONS = `Open the first paragraph with its music and atmosphere, once each:
[[soundscape: Category | Tone | Tension | Energy]] [[atmosphere: Category | Energy]]
Music fits the whole chapter; atmosphere is where most of it happens.
Use only the categories below.`;

/** The story's soundtrack categories as the tagger sees them: one example made from the first of each, the categories, then the tag words. */
export const presentSoundtrackVocabulary = (vocabulary: SoundtrackVocabulary) => [
  ...(vocabulary.music?.length && vocabulary.atmospheres?.length
    ? [`Example: [[soundscape: ${vocabulary.music[0]} | bright | calm | medium]] [[atmosphere: ${vocabulary.atmospheres[0]} | low]]`]
    : []),
  ...(vocabulary.music?.length ? [`MUSIC: ${vocabulary.music.join(', ')}`] : []),
  ...(vocabulary.atmospheres?.length ? [`ATMOSPHERE: ${vocabulary.atmospheres.join(', ')}`] : []),
  `Tone: ${AUDIO_TONES.join(', ')}. Tension: ${AUDIO_TENSIONS.join(', ')}. Energy: ${AUDIO_ENERGIES.join(', ')}.`,
].join('\n');
