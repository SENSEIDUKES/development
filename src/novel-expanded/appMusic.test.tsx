// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { ReaderMixer, ReaderMixerState, ReaderMixerLayerStatus } from '@seihouse/audio-player';
import { storySoundtrack } from '@seihouse/sen/reader-runtime';
import { useAppMusic, type APP_SOUNDSCAPES } from './appMusic';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const track = (id: string, mood: string): (typeof APP_SOUNDSCAPES)[number] => ({ id, label: id, mood, moods: [mood], tags: [], url: `https://media.example.org/${id}.mp3` });

it('plays every menu mood through the soundtrack and lets the Reader keep control while menu music is off', async () => {
  let status: ReaderMixerLayerStatus = 'idle';
  const listeners = new Set<(state: ReaderMixerState) => void>();
  const state = () => ({ layers: { soundscapes: { status } } }) as ReaderMixerState;
  const set = (next: ReaderMixerLayerStatus) => { status = next; listeners.forEach(listener => listener(state())); };
  const mixer = {
    getState: state,
    subscribe: (listener: (state: ReaderMixerState) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    playSoundscape: vi.fn(() => set('loading')),
    stopSoundscape: vi.fn(() => set('idle')),
  } as unknown as ReaderMixer;
  const pieces = [track('english', 'ambient'), track('urdu', 'adventure')];
  function Music({ enabled }: { enabled: boolean }) { useAppMusic(mixer, enabled, pieces); return null; }
  const root = createRoot(document.createElement('div'));
  const soundtrack = storySoundtrack(mixer);
  try {
    await act(async () => root.render(<Music enabled />));
    const first = soundtrack.piece()!.id;
    expect(['english', 'urdu']).toContain(first);
    // Autoplay permission keeps the requested song queued instead of skipping it.
    await act(async () => set('blocked'));
    expect(soundtrack.piece()?.id).toBe(first);
    // Ending one song advances to the other even though its original mood differs.
    await act(async () => { set('playing'); set('resting'); });
    expect(soundtrack.piece()?.id).toBe(first === 'english' ? 'urdu' : 'english');
    let release: () => void = () => undefined;
    await act(async () => { release = soundtrack.hold({ mood: 'mystical', pieces: [track('reader', 'mystical')] }); });
    expect(soundtrack.piece()?.id).toBe('reader');
    await act(async () => root.render(<Music enabled={false} />));
    expect(soundtrack.piece()?.id).toBe('reader');
    await act(async () => release());
    expect(soundtrack.piece()).toBeUndefined();
    await act(async () => root.render(<Music enabled />));
    expect(['english', 'urdu']).toContain(soundtrack.piece()?.id);
    // An unreadable recording skips to another song through the existing mixer lifecycle.
    const beforeFailure = soundtrack.piece()?.id;
    await act(async () => set('failed'));
    expect(soundtrack.piece()?.id).not.toBe(beforeFailure);
    expect(['english', 'urdu']).toContain(soundtrack.piece()?.id);
  } finally { act(() => root.unmount()); }
});
