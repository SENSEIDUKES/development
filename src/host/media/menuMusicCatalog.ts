import type { SceneAudioTrack } from '@seihouse/sen/audio';
import catalog from './data/menu-music-v1.json';

/** The owner's 13 theme songs, in the original SPP order, at their verified permanent URLs. */
export const MENU_MUSIC_LABEL = catalog.pack.name;
export const MENU_MUSIC_PIECES: readonly SceneAudioTrack[] = Object.freeze(catalog.pieces.map(piece => ({
  id: `${catalog.pack.id}:${piece.sourcePath}`,
  label: piece.label,
  mood: 'menu', moods: ['menu'], tags: [], url: piece.url,
})));
