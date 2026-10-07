import { useEffect } from 'react';
import type { ReaderMixer } from '@seihouse/audio-player';
import { storySoundtrack } from '@seihouse/sen/reader-runtime';
import { LIBRARY_BASE_MEDIA } from '../host/media/libraryCatalog';

/** The pieces the app and the Reader play: SEN Soundscapes, Volume 1, as every chapter is written with them. */
export const APP_SOUNDSCAPES = LIBRARY_BASE_MEDIA.soundscapes.map(entry => entry.track);

/** The mood of the app's own music: the calmest pieces of SEN Soundscapes, Volume 1. */
export const APP_MUSIC_MOOD = 'ambient';

/**
 * The app's own music, from the soundscapes every chapter is written with:
 * calm pieces, one after another, on Home, Create and World Info, with no
 * model and nothing to wait for (a browser starts sound on the reader's first
 * tap). The Reader never plays it: it has its own music, and leaving it
 * returns here. Off (the reader's Menu
 * music setting) is silence on these pages; the Reader still plays its own.
 * The reader's mix (the master switch and the Soundscapes level, on the
 * header's music note and in Reader Settings › Audio) applies here too.
 */
export function useAppMusic(mixer: ReaderMixer, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const soundtrack = storySoundtrack(mixer);
    soundtrack.setBase({ mood: APP_MUSIC_MOOD, pieces: APP_SOUNDSCAPES });
    return () => soundtrack.setBase(undefined);
  }, [mixer, enabled]);
}
