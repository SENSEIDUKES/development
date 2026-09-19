import libraryCuesData from '../../audio/data/library-cues.v1.json';
import { parseAudioCues } from '@seihouse/sen/audio';
export const loadLibraryCues = () => parseAudioCues(libraryCuesData);
export { TRACK_LIBRARY } from './soundscapeCatalog';
