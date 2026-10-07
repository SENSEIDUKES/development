import { createReaderMixer, DEFAULT_READER_MIXER_PREFERENCES, type ReaderMixer, type ReaderMixerOptions, type ReaderMixerPreferencesInput } from '@seihouse/audio-player';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { DEFAULT_ATMOSPHERE_ID, SEN_ATMOSPHERES } from '../media/atmosphereCatalog';

/** The reader's mix (levels, switches and atmosphere), one per device, never per story. */
export const READER_MIXER_PREFERENCE_KEY = 'audio-mixer';

/**
 * A host's one reader mixer: the SEIHouse audio player's Soundscapes,
 * Atmosphere, Sound Cues and Voice layers, with the SEN Atmospheres catalog
 * and the reader's saved mix. Created once, outside React, so a page's
 * Reader, its Audio settings and the ghost note all share it. Leaving the
 * page never stops it (see {@link keepPlayingWhileAway}).
 */
export function createHostReaderMixer(storage: ReaderPreferenceStorage): ReaderMixer {
  const mixer = createReaderMixer(hostReaderMixerOptions(storage));
  keepPlayingWhileAway(mixer);
  return mixer;
}

/**
 * Leaving the page (another tab, another app to send a text, a locked phone)
 * never stops the sound. The player does not pause while the page is hidden
 * (`pauseWhenHidden: false` in {@link hostReaderMixerOptions}); time away is
 * not idleness, so the player's idle pause counts only time on the page; and
 * on return, sound the browser or the phone paused meanwhile plays on. The
 * sleep timer and the reader's own mute still stop it. Returns the stop.
 */
export function keepPlayingWhileAway(mixer: ReaderMixer): () => void {
  if (typeof document === 'undefined') return () => undefined;
  let releaseActivity: (() => void) | undefined;
  const stop = () => {
    document.removeEventListener('visibilitychange', follow);
    releaseActivity?.();
    releaseActivity = undefined;
  };
  function follow() {
    if (mixer.isDisposed()) { stop(); return; }
    if (document.visibilityState === 'hidden') {
      releaseActivity ??= mixer.retainActivity();
      return;
    }
    releaseActivity?.();
    releaseActivity = undefined;
    mixer.unlock();
  }
  document.addEventListener('visibilitychange', follow);
  if (document.visibilityState === 'hidden') follow();
  return stop;
}

/**
 * Loops play as the files are made: no overlap at the loop point. The owner's
 * atmospheres are exported to loop, with any silence trimmed in the files; the
 * player's short overlap was audible as a dip at every loop.
 */
export const HOST_LOOP_CROSSFADE_MS = 0;

/**
 * SEN Soundscapes are composed pieces with their own opening and ending: each
 * plays once and the soundtrack moves to the next piece of its mood, with a
 * short fade over the last seconds so an ending is heard, not cut.
 */
export const HOST_SOUNDSCAPE_PLAYS = 1;
export const HOST_SOUNDSCAPE_END_FADE_MS = 3_000;

/** The host mixer's settings: the SEN Atmospheres catalog, the reader's saved mix, loops as the files are made, and pieces of music played whole. */
export function hostReaderMixerOptions(storage: ReaderPreferenceStorage): ReaderMixerOptions {
  let saved: ReaderMixerPreferencesInput | null = null;
  try {
    const raw = storage.read(READER_MIXER_PREFERENCE_KEY);
    // The mixer normalizes whatever it is given: missing or invalid fields use the defaults.
    saved = raw ? JSON.parse(raw) as ReaderMixerPreferencesInput : null;
  } catch {
    // A damaged save starts from the default mix; the next change replaces it.
  }
  return {
    atmospheres: SEN_ATMOSPHERES,
    loopCrossfadeMs: HOST_LOOP_CROSSFADE_MS,
    soundscapeMaxPlays: HOST_SOUNDSCAPE_PLAYS,
    soundscapeRestFadeMs: HOST_SOUNDSCAPE_END_FADE_MS,
    // Leaving the page never stops the sound (see keepPlayingWhileAway).
    pauseWhenHidden: false,
    defaultPreferences: { ...DEFAULT_READER_MIXER_PREFERENCES, atmosphereId: DEFAULT_ATMOSPHERE_ID },
    initialPreferences: saved,
    onPreferencesChange: preferences => storage.write(READER_MIXER_PREFERENCE_KEY, JSON.stringify(preferences)),
  };
}
