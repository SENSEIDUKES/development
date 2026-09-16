// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedSoundscape } from '../../../../audio/mediaPacks';
import { AudioMenu } from './AudioMenu';

const playback = vi.hoisted(() => ({
  replace: vi.fn(), stop: vi.fn(), currentTrackId: null as string | null, hasError: false,
}));

vi.mock('../../../../audio/DevAudioPlayback', () => ({
  useDevAudioPlayback: () => playback,
}));

vi.mock('../../shared/stubs', () => ({
  useAudioMix: () => ({
    mix: {
      master: { enabled: true, volume: 1 },
      music: { enabled: true, volume: 1 },
      atmosphere: { enabled: true, volume: 1 },
      cues: { enabled: true, volume: 1 },
    },
    setChannel: vi.fn(),
  }),
  vibrate: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resolved: ResolvedSoundscape = {
  id: 'soundscape:block-1:PACK_TRACK',
  blockId: 'block-1',
  intent: { blockId: 'block-1', mood: 'storm-path', semanticTags: ['rain'] },
  resource: {
    track: { id: 'PACK_TRACK', mood: 'storm-path', moods: ['storm-path'], tags: ['rain'], url: 'https://fixtures.r2.dev/pack-track.mp3', isPremium: false },
    provenance: {
      kind: 'media-pack', id: 'test.pack', version: '1.0.0', type: 'soundscape',
      source: { path: 'catalogs/pack.json', digest: 'a'.repeat(64) },
    },
  },
};

describe('Reader Audio Menu resolved soundscapes', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    playback.replace.mockReset();
    playback.stop.mockReset();
    playback.currentTrackId = null;
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('does not autoplay and plays the committed authorized resource only after user activation', () => {
    act(() => root.render(<AudioMenu soundscapes={[resolved]} />));
    expect(playback.replace).not.toHaveBeenCalled();
    const play = [...container.querySelectorAll('button')].find(button => button.textContent?.includes('Play soundscape'));
    expect(play).toBeTruthy();
    act(() => play!.click());
    expect(playback.replace).toHaveBeenCalledWith({
      id: 'reader-soundscape:PACK_TRACK',
      source: 'https://fixtures.r2.dev/pack-track.mp3',
      title: 'Pack Track',
      artist: 'SEN Soundscape',
    });
  });
});
