import { createReaderMixer, DEFAULT_READER_MIXER_PREFERENCES, type ReaderMixer, type ReaderMixerPreferencesInput } from '@seihouse/audio-player';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { DEFAULT_ATMOSPHERE_ID, SEN_ATMOSPHERES } from '../media/atmosphereCatalog';

/** The reader's mix (levels, switches and atmosphere), one per device, never per story. */
export const READER_MIXER_PREFERENCE_KEY = 'audio-mixer';

/**
 * A host's one reader mixer: the SEIHouse audio player's Soundscapes,
 * Atmosphere, Sound Cues and Voice layers, with the SEN Atmospheres catalog
 * and the reader's saved mix. Created once, outside React, so a page's
 * Reader, its Audio settings and the ghost note all share it.
 */
export function createHostReaderMixer(storage: ReaderPreferenceStorage): ReaderMixer {
  let saved: ReaderMixerPreferencesInput | null = null;
  try {
    const raw = storage.read(READER_MIXER_PREFERENCE_KEY);
    // The mixer normalizes whatever it is given: missing or invalid fields use the defaults.
    saved = raw ? JSON.parse(raw) as ReaderMixerPreferencesInput : null;
  } catch {
    // A damaged save starts from the default mix; the next change replaces it.
  }
  return createReaderMixer({
    atmospheres: SEN_ATMOSPHERES,
    defaultPreferences: { ...DEFAULT_READER_MIXER_PREFERENCES, atmosphereId: DEFAULT_ATMOSPHERE_ID },
    initialPreferences: saved,
    onPreferencesChange: preferences => storage.write(READER_MIXER_PREFERENCE_KEY, JSON.stringify(preferences)),
  });
}
