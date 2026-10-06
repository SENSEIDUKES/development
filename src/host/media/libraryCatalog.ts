import libraryCuesData from '../../audio/data/library-cues.v1.json';
import librarySoundsData from '../../audio/data/library-sounds.v1.json';
import { parseAudioCues, validateSoundWords } from '@seihouse/sen/audio';
export const loadLibraryCues = () => parseAudioCues(libraryCuesData);
/** The default library's sound words: each word its recordings answer, with an example of what a writer wraps. */
export const LIBRARY_SOUND_WORDS = validateSoundWords(librarySoundsData);
export { TRACK_LIBRARY } from './soundscapeCatalog';
import { SEN_SOUNDSCAPES, SEN_SOUNDSCAPES_PROVENANCE } from './soundscapeCatalog';
import type { FrozenNarrativeMedia } from '@seihouse/sen/audio';

/**
 * Concrete, host-authorized default catalog. No premium records or account
 * truth live in SEN. Its soundscapes are SEN Soundscapes, Volume 1.
 */
export const LIBRARY_BASE_MEDIA: FrozenNarrativeMedia = {
  capturedAt: '2026-10-06T00:00:00.000Z',
  soundscapes: SEN_SOUNDSCAPES.map(track => ({ track: structuredClone(track), provenance: { ...SEN_SOUNDSCAPES_PROVENANCE } })),
  soundCues: loadLibraryCues().cues.map(cue => ({ cue, provenance: { catalogId: 'library-default-cues', version: '1' } })),
  sounds: LIBRARY_SOUND_WORDS,
};
