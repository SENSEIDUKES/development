import { useEffect } from 'react';
import type { ReaderMixer } from '@seihouse/audio-player';
import { storySoundtrack } from '@seihouse/sen/reader-runtime';
import { LIBRARY_BASE_MEDIA } from '../host/media/libraryCatalog';

/** The mood of the app's own music: the calmest pieces of SEN Soundscapes, Volume 1. */
export const APP_MUSIC_MOOD = 'ambient';

/**
 * The app's own music, from the soundscapes every chapter is written with:
 * calm pieces, one after another, on Home, Create, World Info and while a
 * chapter is being written, with no model and nothing to wait for (a browser
 * starts sound on the reader's first tap). In the Reader, an open chapter's
 * own scene takes over; leaving the Reader returns here. The reader's mix
 * (the master switch and the Soundscapes level in Reader Settings › Audio)
 * applies here too.
 */
export function useAppMusic(mixer: ReaderMixer) {
  useEffect(() => {
    const soundtrack = storySoundtrack(mixer);
    soundtrack.setBase({ mood: APP_MUSIC_MOOD, pieces: LIBRARY_BASE_MEDIA.soundscapes.map(entry => entry.track) });
    return () => soundtrack.setBase(undefined);
  }, [mixer]);
}
