// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReaderMixer } from '@seihouse/audio-player';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { installAudioMediaStubs } from '../../test-utils/renderWithDevAudio';
import { DEFAULT_ATMOSPHERE_ID, SEN_ATMOSPHERES } from '../media/atmosphereCatalog';
import { createHostReaderMixer, hostReaderMixerOptions, keepPlayingWhileAway, READER_MIXER_PREFERENCE_KEY } from './readerMixer';

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

  it('loops atmospheres as their files are made, with no overlap at the loop point', () => {
    expect(hostReaderMixerOptions(memory().storage).loopCrossfadeMs).toBe(0);
  });

  it('plays each piece of music once, whole, with a short fade over its ending, so the next piece can follow', () => {
    expect(hostReaderMixerOptions(memory().storage)).toMatchObject({ soundscapeMaxPlays: 1, soundscapeRestFadeMs: 3_000 });
  });

  it('starts from the default mix when the saved mix is damaged', () => {
    const mixer = createHostReaderMixer(memory('{not json').storage);
    expect(mixer.getState().preferences).toMatchObject({ atmosphereId: DEFAULT_ATMOSPHERE_ID, masterEnabled: true });
    mixer.dispose();
  });
});

describe('Leaving the page never stops the sound', () => {
  let visibility: DocumentVisibilityState = 'visible';
  const setPage = (state: DocumentVisibilityState) => {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  const piece = { id: 'piece', title: 'Piece', artist: '', sources: [{ url: 'https://media.test/piece.mp3' }] };
  const TEN_MINUTES = 10 * 60_000;

  beforeEach(() => {
    installAudioMediaStubs();
    vi.useFakeTimers();
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  });
  afterEach(() => {
    delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
    vi.useRealTimers();
  });

  it('keeps the music playing while the page is hidden, where the player would pause it by default', () => {
    expect(hostReaderMixerOptions(memory().storage).pauseWhenHidden).toBe(false);
    const mixer = createHostReaderMixer(memory().storage);
    const pausing = createReaderMixer({ atmospheres: SEN_ATMOSPHERES });
    for (const each of [mixer, pausing]) each.playSoundscape(piece);

    setPage('hidden');
    expect(mixer.getState().pageHidden).toBe(false);
    expect(mixer.getState().layers.soundscapes.status).not.toBe('paused');
    // The player's own default, for contrast: hidden pauses it.
    expect(pausing.getState().pageHidden).toBe(true);
    expect(pausing.getState().layers.soundscapes.status).toBe('paused');
    mixer.dispose();
    pausing.dispose();
  });

  it('does not count time away as idleness; the idle pause counts only time on the page', () => {
    const mixer = createHostReaderMixer(memory().storage);
    mixer.playSoundscape(piece);

    // Away (a text, another app) for longer than the idle pause: the music plays on.
    setPage('hidden');
    vi.advanceTimersByTime(TEN_MINUTES * 3);
    expect(mixer.getState().idle).toBe(false);

    // Back on the page, the idle pause counts from the return.
    setPage('visible');
    vi.advanceTimersByTime(TEN_MINUTES - 1_000);
    expect(mixer.getState().idle).toBe(false);
    vi.advanceTimersByTime(2_000);
    expect(mixer.getState().idle).toBe(true);
    mixer.dispose();
  });

  it('on return, plays on whatever the browser or the phone paused while the page was away', () => {
    const mixer = createHostReaderMixer(memory().storage);
    const unlock = vi.spyOn(mixer, 'unlock');
    setPage('hidden');
    expect(unlock).not.toHaveBeenCalled();
    setPage('visible');
    expect(unlock).toHaveBeenCalledTimes(1);

    // A mixer that is gone stops listening.
    mixer.dispose();
    setPage('hidden');
    setPage('visible');
    expect(unlock).toHaveBeenCalledTimes(1);
  });

  it('stops following the page when asked', () => {
    const mixer = createReaderMixer({ atmospheres: SEN_ATMOSPHERES, pauseWhenHidden: false });
    const unlock = vi.spyOn(mixer, 'unlock');
    const stop = keepPlayingWhileAway(mixer);
    stop();
    setPage('hidden');
    setPage('visible');
    expect(unlock).not.toHaveBeenCalled();
    mixer.dispose();
  });
});
