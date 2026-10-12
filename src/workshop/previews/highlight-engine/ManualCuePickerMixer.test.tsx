// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderMixerProvider, type ReaderMixer, type ReaderMixerState } from '@seihouse/audio-player';
import { createMediaCatalog } from '@seihouse/sen/audio';
import { ManualCuePicker } from '@seihouse/sen/highlight-engine';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: Root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const block = { id: 'c1-p1', text: 'The iron gate split down the middle.' };
const selection = { blockId: 'c1-p1', startOffset: 4, endOffset: 13, selectedText: 'iron gate' };

/** The Reader's mixer, as the app supplies it: there is no single-channel player beside it. */
const mixerWith = (played: boolean) => {
  let listener: ((state: ReaderMixerState) => void) | undefined;
  const mixer = {
    playCue: vi.fn(() => played),
    subscribe: vi.fn((next: (state: ReaderMixerState) => void) => { listener = next; return () => { listener = undefined; }; }),
  } as unknown as ReaderMixer;
  return { mixer, fail: () => listener?.({ layers: { cues: { status: 'failed' } } } as unknown as ReaderMixerState) };
};

describe('Sound Cue previews in the Reader', () => {
  it('play through the reader mixer, as the placed cue will, with no other player', async () => {
    const { mixer, fail } = mixerWith(true);
    await act(async () => root.render(<ReaderMixerProvider mixer={mixer}>
      <ManualCuePicker block={block} selection={selection} catalog={createMediaCatalog(LIBRARY_BASE_MEDIA)} onPlace={() => undefined} onRemove={() => undefined} onClose={() => undefined} />
    </ReaderMixerProvider>));
    const preview = [...host.querySelectorAll('button')].find(button => button.textContent === 'Preview')!;
    await act(async () => preview.click());
    expect(mixer.playCue).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    // A recording that cannot load says so in the picker, before it is placed.
    await act(async () => fail());
    expect(host.querySelector('[role="alert"]')!.textContent).toBe('Audio preview is unavailable.');
  });

  it('say so when the mixer will not play it (story audio muted, Sound Cues off)', async () => {
    const { mixer } = mixerWith(false);
    await act(async () => root.render(<ReaderMixerProvider mixer={mixer}>
      <ManualCuePicker block={block} selection={selection} catalog={createMediaCatalog(LIBRARY_BASE_MEDIA)} onPlace={() => undefined} onRemove={() => undefined} onClose={() => undefined} />
    </ReaderMixerProvider>));
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Preview')!.click());
    expect(host.querySelector('[role="alert"]')!.textContent).toBe('Audio preview is unavailable.');
  });
});
