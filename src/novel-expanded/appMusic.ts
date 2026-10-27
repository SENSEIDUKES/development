import { useEffect, useMemo } from 'react';
import type { ReaderMixer } from '@seihouse/audio-player';
import { storySoundtrack } from '@seihouse/sen/reader-runtime';
import { LIBRARY_BASE_MEDIA } from '../host/media/libraryCatalog';
import { MENU_MUSIC_PIECES } from '../host/media/menuMusicCatalog';

/** The Reader's pieces: SEN Soundscapes, Volume 1, as every chapter is written with them. */
export const APP_SOUNDSCAPES = LIBRARY_BASE_MEDIA.soundscapes.map(entry => entry.track);

/** The menu playlist includes every theme song regardless of its narrative tags. */
export const APP_MUSIC_MOOD = 'menu';

/**
 * The app's theme songs, or the reader's selected music pack:
 * songs, one after another, on the menus, with no
 * model and nothing to wait for (a browser starts sound on the reader's first
 * tap). The Reader never plays it: it has its own music, and leaving it
 * returns here. Off (the reader's Menu
 * music setting) is silence on these pages; the Reader still plays its own.
 * The reader's mix (the master switch and the Soundscapes level, on the
 * header's music note and in Reader Settings › Audio) applies here too.
 */
export function useAppMusic(mixer: ReaderMixer, enabled = true, menuPieces: Readonly<typeof APP_SOUNDSCAPES> = MENU_MUSIC_PIECES) {
  // Narrative moods do not exclude songs from an explicitly chosen menu pack.
  const pieces = useMemo(() => menuPieces.map(piece => ({ ...piece, mood: APP_MUSIC_MOOD, moods: [APP_MUSIC_MOOD] })), [menuPieces]);
  useEffect(() => {
    if (!enabled) return undefined;
    const soundtrack = storySoundtrack(mixer);
    soundtrack.setBase({ mood: APP_MUSIC_MOOD, pieces });
    return () => soundtrack.setBase(undefined);
  }, [mixer, enabled, pieces]);
}
