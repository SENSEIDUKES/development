import libraryCuesData from '../../audio/data/library-cues.v1.json';
import librarySoundsData from '../../audio/data/library-sounds.v1.json';
import { parseAudioCues, validateSoundWords } from '@seihouse/sen/audio';
export const loadLibraryCues = () => parseAudioCues(libraryCuesData);
/** The default library's sound words: each word its recordings answer, with an example of what a writer wraps. */
export const LIBRARY_SOUND_WORDS = validateSoundWords(librarySoundsData);
export { TRACK_LIBRARY } from './soundscapeCatalog';
import { TRACK_LIBRARY } from './soundscapeCatalog';
import type { FrozenNarrativeMedia } from '@seihouse/sen/audio';

/** Concrete, host-authorized default catalog. No premium records or account truth live in SEN. */
export const LIBRARY_BASE_MEDIA: FrozenNarrativeMedia = {
  capturedAt: '2026-09-18T00:00:00.000Z',
  soundscapes: TRACK_LIBRARY.map(track => ({ track, provenance: { catalogId: 'library-default-soundscapes', version: '1' } })),
  soundCues: loadLibraryCues().cues.map(cue => ({ cue, provenance: { catalogId: 'library-default-cues', version: '1' } })),
  sounds: LIBRARY_SOUND_WORDS,
};
