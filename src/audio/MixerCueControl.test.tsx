// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { ReaderMixerProvider, type ReaderMixer, type ReaderMixerState } from '@seihouse/audio-player';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SoundCueAttachment } from '@seihouse/sen/audio';
import { InlineAudio, MixerCueControl, SOUND_CUE_ENERGY_VOLUME } from '@seihouse/sen/inline-audio';
import { createRoot } from '../test-utils/createReaderRoot';
import { DevAudioPlaybackProvider } from './DevAudioPlayback';
import { installAudioMediaStubs } from '../test-utils/renderWithDevAudio';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BEAST_URL = 'https://celestialaudio.seihouse.org/DEFAULT/Beasts/Growl/Tiger_Growl_1.mp3';
const WORDS = 'Vermilion Debt Fox growled';

const cueWith = (energy?: 'low' | 'medium' | 'high'): SoundCueAttachment => ({
  id: 'sound-cue:block-a:0-26',
  kind: 'sound-cue',
  anchor: { level: 'span', blockId: 'block-a', startOffset: 0, endOffset: WORDS.length, selectedText: WORDS },
  payload: {
    origin: 'harness', sound: 'beast growl', ...(energy ? { energy } : {}),
    cue: { publicUrl: BEAST_URL, provenance: { catalogId: 'test-cues', version: '1' }, category: 'beasts' },
  },
});

/** Just the part of the reader mixer a Sound Cue touches, with its state under the test's control. */
function createFakeMixer({ plays = true }: { plays?: boolean } = {}) {
  const listeners = new Set<(state: ReaderMixerState) => void>();
  let state = {
    activeCues: 0,
    preferences: { masterEnabled: true, layers: { cues: { enabled: true, level: 0.75 } } },
    layers: { cues: { status: 'idle', current: null, failure: null } },
  } as unknown as ReaderMixerState;
  const mixer = {
    playCue: vi.fn(() => plays),
    getState: () => state,
    subscribe: vi.fn((listener: (next: ReaderMixerState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  } as unknown as ReaderMixer;
  const update = (patch: (current: ReaderMixerState) => ReaderMixerState) => {
    state = patch(state);
    act(() => listeners.forEach(listener => listener(state)));
  };
  return { mixer, update, listeners };
}

let container: HTMLDivElement;
let root: Root;
let mounted: boolean;

beforeEach(() => {
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mounted = false;
});

afterEach(() => {
  if (mounted) act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const render = (node: React.ReactNode) => {
  act(() => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>));
  mounted = true;
};
const button = () => container.querySelector<HTMLButtonElement>('button[data-action-type="world-cue"]')!;
const status = () => container.querySelector('[aria-live="polite"]')?.textContent ?? '';

describe('MixerCueControl', () => {
  it('plays over the soundtrack at the moment\'s Energy, and settles when nothing is sounding', () => {
    const { mixer, update, listeners } = createFakeMixer();
    render(<MixerCueControl cue={cueWith('high')} mixer={mixer} />);
    act(() => button().click());
    expect(mixer.playCue).toHaveBeenCalledWith(BEAST_URL, { volume: SOUND_CUE_ENERGY_VOLUME.high });
    expect(button().dataset.state).toBe('playing');
    expect(button().getAttribute('aria-label')).toBe(`Replay beast growl for ${WORDS}`);
    expect(status()).toBe(`Playing beast growl for ${WORDS}.`);

    update(state => ({ ...state, activeCues: 1 }));
    expect(button().dataset.state).toBe('playing');
    update(state => ({ ...state, activeCues: 0 }));
    expect(button().dataset.state).toBe('idle');
    // It stops following the mixer once the cue has finished.
    expect(listeners.size).toBe(0);
  });

  it('plays a cue with no Energy as medium, and low quieter still', () => {
    const { mixer } = createFakeMixer();
    render(<><MixerCueControl cue={cueWith()} mixer={mixer} /></>);
    act(() => button().click());
    expect(mixer.playCue).toHaveBeenLastCalledWith(BEAST_URL, { volume: 0.8 });
    render(<MixerCueControl cue={cueWith('low')} mixer={mixer} />);
    act(() => button().click());
    expect(mixer.playCue).toHaveBeenLastCalledWith(BEAST_URL, { volume: 0.6 });
  });

  it('shows the mixer\'s failure for this cue', () => {
    const { mixer, update } = createFakeMixer();
    render(<MixerCueControl cue={cueWith('medium')} mixer={mixer} />);
    act(() => button().click());
    // Another cue failing is not this one's failure.
    update(state => ({ ...state, activeCues: 1, layers: { ...state.layers, cues: { ...state.layers.cues, status: 'failed', current: 'https://example.com/other.mp3', failure: 'Other failed' } } }));
    expect(button().dataset.state).toBe('playing');
    update(state => ({ ...state, activeCues: 0, layers: { ...state.layers, cues: { ...state.layers.cues, status: 'failed', current: BEAST_URL, failure: 'This sound couldn’t play' } } }));
    expect(button().dataset.state).toBe('error');
    expect(status()).toBe('This sound couldn’t play');
  });

  it('says why a tap made no sound: story audio muted, or Sound Cues off', () => {
    const muted = createFakeMixer({ plays: false });
    muted.update(state => ({ ...state, preferences: { ...state.preferences, masterEnabled: false } }));
    render(<MixerCueControl cue={cueWith()} mixer={muted.mixer} />);
    act(() => button().click());
    expect(button().dataset.state).toBe('error');
    expect(status()).toBe('Story audio is muted. Tap the note to turn it on.');

    const off = createFakeMixer({ plays: false });
    off.update(state => ({ ...state, preferences: { ...state.preferences, layers: { cues: { enabled: false, level: 0.75 } } } } as unknown as ReaderMixerState));
    render(<MixerCueControl cue={cueWith()} mixer={off.mixer} />);
    act(() => button().click());
    expect(status()).toBe('Sound Cues are off in Audio settings.');
  });
});

describe('InlineAudio with a host mixer', () => {
  it('prefers the reader mixer over the single-channel player', () => {
    const { mixer } = createFakeMixer();
    render(
      <DevAudioPlaybackProvider>
        <ReaderMixerProvider mixer={mixer}>
          <InlineAudio cue={cueWith('high')} />
        </ReaderMixerProvider>
      </DevAudioPlaybackProvider>,
    );
    act(() => button().click());
    expect(mixer.playCue).toHaveBeenCalledWith(BEAST_URL, { volume: 1 });
  });
});
