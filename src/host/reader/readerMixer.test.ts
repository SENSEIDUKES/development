// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { installAudioMediaStubs } from '../../test-utils/renderWithDevAudio';
import { DEFAULT_ATMOSPHERE_ID, SEN_ATMOSPHERES } from '../media/atmosphereCatalog';
import { createHostReaderMixer, READER_MIXER_PREFERENCE_KEY } from './readerMixer';

const memory = (initial?: string) => {
  const values = new Map<string, string>(initial === undefined ? [] : [[READER_MIXER_PREFERENCE_KEY, initial]]);
  const storage: ReaderPreferenceStorage = { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
  return { values, storage };
};

describe('The host reader mixer', () => {
  beforeEach(() => {
    installAudioMediaStubs();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('starts a new reader on the default mix with gentle rain, from the SEN Atmospheres catalog', () => {
    const mixer = createHostReaderMixer(memory().storage);
    const state = mixer.getState();
    expect(state.preferences.atmosphereId).toBe(DEFAULT_ATMOSPHERE_ID);
    expect(state.preferences.masterEnabled).toBe(true);
    expect(state.atmosphereOptions.map(option => option.id)).toEqual(SEN_ATMOSPHERES.map(option => option.id));
    mixer.dispose();
  });

  it('keeps the reader\'s mix on the device and brings it back', () => {
    const { values, storage } = memory();
    const first = createHostReaderMixer(storage);
    const waves = SEN_ATMOSPHERES.find(option => option.group === 'Waves')!;
    first.setAtmosphere(waves.id);
    first.setMasterEnabled(false);
    vi.advanceTimersByTime(400);
    expect(JSON.parse(values.get(READER_MIXER_PREFERENCE_KEY)!)).toMatchObject({ atmosphereId: waves.id, masterEnabled: false });
    first.dispose();

    const again = createHostReaderMixer(storage).getState().preferences;
    expect(again).toMatchObject({ atmosphereId: waves.id, masterEnabled: false });
  });

  it('starts from the default mix when the saved mix is damaged', () => {
    const mixer = createHostReaderMixer(memory('{not json').storage);
    expect(mixer.getState().preferences).toMatchObject({ atmosphereId: DEFAULT_ATMOSPHERE_ID, masterEnabled: true });
    mixer.dispose();
  });
});
