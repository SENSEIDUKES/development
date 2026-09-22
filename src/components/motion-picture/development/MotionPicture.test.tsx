// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionPicture } from './MotionPicture';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

const STILL = '/card-workshop/test-images/ye_chen_portrait.png';
const CLIP = 'https://media.example.test/clip.mp4';

beforeEach(() => {
  // jsdom implements no playback, so the element's own play/pause are stubbed.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const picture = () => container.querySelector<HTMLElement>('.motion-picture')!;
const control = () => container.querySelector<HTMLButtonElement>('.motion-picture-control');
const clip = () => container.querySelector<HTMLVideoElement>('.motion-picture-clip');
const still = () => container.querySelector<HTMLImageElement>('.motion-picture-still')!;
const click = (element: Element) => act(() => (element as HTMLElement).click());

describe('Motion Picture', () => {
  it('rests on the still and offers no control until a clip is supplied', () => {
    act(() => root.render(<MotionPicture stillUrl={STILL} alt="Ye Chen" />));
    expect(still().getAttribute('src')).toBe(STILL);
    expect(control()).toBeNull();
    expect(clip()).toBeNull();
    expect(container.querySelector('.motion-picture-aura')).toBeNull();

    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" />));
    expect(control()).not.toBeNull();
    expect(picture().dataset.playing).toBeUndefined();
  });

  it('plays the clip on demand, keeps the still mounted beneath it, and hands it back when the clip ends', () => {
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" />));
    click(control()!);
    expect(picture().dataset.playing).toBe('true');
    expect(clip()!.getAttribute('src')).toBe(CLIP);
    expect(still()).not.toBeNull();
    expect(control()!.getAttribute('aria-pressed')).toBe('true');

    act(() => clip()!.dispatchEvent(new Event('ended')));
    expect(picture().dataset.playing).toBeUndefined();
    expect(control()!.getAttribute('aria-pressed')).toBe('false');
  });

  it('holds the last frame instead of returning when the host asks it to', () => {
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" hold />));
    click(control()!);
    act(() => clip()!.dispatchEvent(new Event('ended')));
    expect(picture().dataset.playing).toBe('true');
  });

  it('lets the host own and remember the choice', () => {
    const onPlayingChange = vi.fn();
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" playing={false} onPlayingChange={onPlayingChange} />));
    click(control()!);
    expect(onPlayingChange).toHaveBeenCalledWith(true);
    // The host still decides: nothing plays until it says so.
    expect(picture().dataset.playing).toBeUndefined();

    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" playing onPlayingChange={onPlayingChange} />));
    expect(picture().dataset.playing).toBe('true');
  });

  it('falls back to the still and withdraws the control when the clip cannot load', () => {
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" />));
    click(control()!);
    act(() => clip()!.dispatchEvent(new Event('error')));
    expect(control()).toBeNull();
    expect(clip()).toBeNull();
    expect(still().getAttribute('src')).toBe(STILL);

    // A different clip is a fresh chance rather than a permanently disabled surface.
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl="https://media.example.test/other.mp4" alt="Ye Chen" />));
    expect(control()).not.toBeNull();
  });

  it('names the control for the artwork it belongs to, in both states', () => {
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Celestial Guardian" />));
    expect(control()!.getAttribute('aria-label')).toBe('Play motion for Celestial Guardian');
    click(control()!);
    expect(control()!.getAttribute('aria-label')).toBe('Stop motion for Celestial Guardian');
    expect(clip()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('leaves a freshly mounted clip to load before seeking it', () => {
    // Seeking a clip that has loaded nothing cancels its own source selection,
    // which showed up as an unplayable clip rather than an obvious error.
    const seeks: number[] = [];
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      configurable: true,
      get: () => 0,
      set(value: number) { seeks.push(value); },
    });
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" />));
    click(control()!);
    expect(clip()!.getAttribute('preload')).toBeNull();
    expect(seeks).toEqual([]);
  });

  it('drops the aura, and its sampling, when a host frames the artwork itself', () => {
    act(() => root.render(<MotionPicture stillUrl={STILL} videoUrl={CLIP} alt="Ye Chen" glow={false} />));
    expect(container.querySelector('.motion-picture-aura')).toBeNull();
    expect(picture().style.getPropertyValue('--motion-picture-glow')).toBe('');
  });
});
