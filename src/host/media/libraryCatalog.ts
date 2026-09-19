import libraryCuesData from '../../audio/data/library-cues.v1.json';
import { parseAudioCues } from '@seihouse/sen/audio';
export const loadLibraryCues = () => parseAudioCues(libraryCuesData);
export { TRACK_LIBRARY } from './soundscapeCatalog';
import { TRACK_LIBRARY } from './soundscapeCatalog';
import type { FrozenNarrativeMedia } from '@seihouse/sen/audio';

/** Concrete, host-authorized default catalog. No premium records or account truth live in SEN. */
export const LIBRARY_BASE_MEDIA: FrozenNarrativeMedia = {
  capturedAt: '2026-09-18T00:00:00.000Z',
  soundscapes: TRACK_LIBRARY.map(track => ({ track, provenance: { catalogId: 'library-default-soundscapes', version: '1' } })),
  soundCues: loadLibraryCues().cues.map(cue => ({ cue, provenance: { catalogId: 'library-default-cues', version: '1' } })),
};
