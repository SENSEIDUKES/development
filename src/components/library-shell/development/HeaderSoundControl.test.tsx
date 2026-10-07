// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReaderMixerProvider, type ReaderMixer } from '@seihouse/audio-player';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';
import { installAudioMediaStubs } from '../../../test-utils/renderWithDevAudio';
import { HeaderSoundControl } from './HeaderSoundControl';
import { WorkspaceHeader } from './WorkspaceHeader';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memory = (): ReaderPreferenceStorage & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return { values, read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
};

/** A pointer event as React reads it: jsdom has no PointerEvent. */
const pointer = (target: Element, type: string, pointerType: 'mouse' | 'touch') => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
};
const wait = (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });

let container: HTMLDivElement;
let root: Root;
let mixer: ReaderMixer;
let storage: ReturnType<typeof memory>;
const render = (node: React.ReactNode, withMixer = true) => act(() => root.render(withMixer ? <ReaderMixerProvider mixer={mixer}>{node}</ReaderMixerProvider> : node));
const note = () => container.querySelector<HTMLButtonElement>('.header-sound-control button')!;
const slider = () => container.querySelector<HTMLInputElement>('.header-sound-control input[type="range"]');
const control = () => container.querySelector<HTMLElement>('.header-sound-control')!;

beforeEach(() => {
  installAudioMediaStubs();
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  storage = memory();
  mixer = createHostReaderMixer(storage);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  mixer.dispose();
  vi.unstubAllGlobals();
});

describe('The header\'s sound control', () => {
  it('mutes and unmutes all sound with a tap, kept in the reader\'s saved mix', async () => {
    render(<HeaderSoundControl />);
    expect(note().getAttribute('aria-label')).toBe('Mute sound');
    await act(async () => { note().click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(false);
    expect(note().getAttribute('aria-label')).toBe('Unmute sound');
    await wait(350);
    expect(JSON.parse(storage.values.get('audio-mixer')!)).toMatchObject({ masterEnabled: false });
    await act(async () => { note().click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(true);
    // A tap never opens the volume.
    expect(slider()).toBeNull();
  });

  it('opens the Music volume on hover, sets the music\'s level from it, and closes when the mouse leaves', async () => {
    render(<HeaderSoundControl />);
    act(() => pointer(control(), 'pointerover', 'mouse'));
    expect(slider()).not.toBeNull();
    expect(slider()!.getAttribute('aria-label') ?? container.querySelector('label')!.textContent).toContain('Music volume');
    expect(Number(slider()!.value)).toBe(Math.round(mixer.getState().preferences.layers.soundscapes.level * 100));

    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(slider(), '60');
      slider()!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(mixer.getState().preferences.layers.soundscapes.level).toBeCloseTo(0.6);
    // Only the music: the master switch and the other layers are untouched.
    expect(mixer.getState().preferences.masterEnabled).toBe(true);
    await wait(350);
    expect(JSON.parse(storage.values.get('audio-mixer')!).layers.soundscapes.level).toBeCloseTo(0.6);

    act(() => pointer(control(), 'pointerout', 'mouse'));
    expect(slider()).not.toBeNull(); // a moment's grace to reach it
    await wait(300);
    expect(slider()).toBeNull();
  });

  it('opens on a held finger without muting, and closes on a tap outside or Escape', async () => {
    render(<HeaderSoundControl />);
    // A touch never opens it by passing over.
    act(() => pointer(control(), 'pointerover', 'touch'));
    expect(slider()).toBeNull();
    act(() => pointer(note(), 'pointerdown', 'touch'));
    await wait(550);
    expect(slider()).not.toBeNull();
    // Lifting the finger is not a tap.
    act(() => pointer(note(), 'pointerup', 'touch'));
    await act(async () => { note().click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(true);
    expect(slider()).not.toBeNull();

    act(() => pointer(document.body, 'pointerdown', 'touch'));
    expect(slider()).toBeNull();

    // From the keyboard: ArrowUp opens it, Escape closes it.
    act(() => { note().focus(); note().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); });
    expect(slider()).not.toBeNull();
    act(() => { slider()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(slider()).toBeNull();
  });

  it('shows nothing without a reader mixer, and sits before Help and Search in the header', () => {
    render(<HeaderSoundControl />, false);
    expect(container.querySelector('.header-sound-control')).toBeNull();
    render(<WorkspaceHeader title="NovelExpanded" sound={<HeaderSoundControl />} />);
    const labels = Array.from(container.querySelectorAll('header button')).map(button => button.getAttribute('aria-label'));
    expect(labels).toEqual(['Mute sound', 'Help', 'Search']);
  });
});
