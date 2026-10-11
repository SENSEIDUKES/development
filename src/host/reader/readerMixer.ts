import { createReaderMixer, DEFAULT_READER_MIXER_PREFERENCES, type ReaderMixer, type ReaderMixerOptions, type ReaderMixerPreferencesInput } from '@seihouse/audio-player';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { DEFAULT_ATMOSPHERE_ID, SEN_ATMOSPHERES } from '../media/atmosphereCatalog';

/** The reader's mix (levels, switches and atmosphere), one per device, never per story. */
export const READER_MIXER_PREFERENCE_KEY = 'audio-mixer';

/**
 * Marks a device whose saved mix has had sound turned on once. An earlier audio
 * player shipped with Master off, and the mix is saved whole on any change, so
 * devices from then kept "off" as if the reader had chosen it. The first visit
 * after this marker arrived turns Master, its level and the music back on; from
 * then on the reader's own choices are kept as saved.
 */
export const READER_AUDIO_ON_KEY = 'audio-mixer-on-v1';

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

/**
 * A new reader's mix, the owner's chosen balance: all on, Master and Sound Cues
 * full, Soundscapes at a quarter under a 60% Atmosphere of gentle rain.
 */
export const HOST_DEFAULT_MIX = {
  ...DEFAULT_READER_MIXER_PREFERENCES,
  masterEnabled: true,
  masterMuted: false,
  masterLevel: 1,
  layers: {
    ...DEFAULT_READER_MIXER_PREFERENCES.layers,
    soundscapes: { enabled: true, level: 0.25 },
    atmosphere: { enabled: true, level: 0.6 },
    cues: { enabled: true, level: 1 },
  },
  atmosphereId: DEFAULT_ATMOSPHERE_ID,
};

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
  if (!storage.read(READER_AUDIO_ON_KEY)) {
    if (saved) {
      const layers = saved.layers ?? {};
      saved = {
        ...saved,
        masterEnabled: true,
        masterMuted: false,
        ...(saved.masterLevel === 0 ? { masterLevel: saved.masterRestoreLevel || 1 } : {}),
        layers: { ...layers, soundscapes: { ...layers.soundscapes, enabled: true }, atmosphere: { ...layers.atmosphere, enabled: true } },
      };
      storage.write(READER_MIXER_PREFERENCE_KEY, JSON.stringify(saved));
    }
    storage.write(READER_AUDIO_ON_KEY, '1');
  }
  return {
    atmospheres: SEN_ATMOSPHERES,
    loopCrossfadeMs: HOST_LOOP_CROSSFADE_MS,
    soundscapeMaxPlays: HOST_SOUNDSCAPE_PLAYS,
    soundscapeRestFadeMs: HOST_SOUNDSCAPE_END_FADE_MS,
    // Leaving the page never stops the sound (see keepPlayingWhileAway).
    pauseWhenHidden: false,
    defaultPreferences: HOST_DEFAULT_MIX,
    initialPreferences: saved,
    onPreferencesChange: preferences => storage.write(READER_MIXER_PREFERENCE_KEY, JSON.stringify(preferences)),
  };
}
