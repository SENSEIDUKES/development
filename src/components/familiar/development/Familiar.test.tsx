// @vitest-environment jsdom
import { act, Profiler, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyClientProvider, type EnergyClient, type EnergyAccountSnapshot } from '@seihouse/library/energy';
import { celestialGuardian, celestialGuardianOption } from '../../../host/familiar/celestialGuardian';
import { Familiar } from './Familiar';
import { FamiliarSprite } from './FamiliarSprite';
import { FamiliarSelection } from './FamiliarSelection';
import { FamiliarCompanion } from './FamiliarCompanion';
import { FamiliarRecall } from './FamiliarRecall';
import { FAMILIAR_MOBILE_QUERY } from './useFamiliarMobile';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let reduced = false;
let mobile = false;
let mediaListeners: Set<() => void>;
let frames: Map<number, FrameRequestCallback>;
const flushFrames = () => act(() => {
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0));
});
beforeEach(() => {
  reduced = false;
  mobile = false;
  mediaListeners = new Set();
  frames = new Map();
  let nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation((media: string) => ({ media, get matches() { return media === FAMILIAR_MOBILE_QUERY ? mobile : reduced; }, addEventListener: (_: string, callback: () => void) => mediaListeners.add(callback), removeEventListener: (_: string, callback: () => void) => mediaListeners.delete(callback) })) });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const imageLoaded = () => act(() => container.querySelector('img')!.dispatchEvent(new Event('load')));
const frame = () => container.querySelector('[data-familiar-frame]')?.getAttribute('data-familiar-frame');
const click = async (element: Element) => { await act(async () => (element as HTMLElement).click()); };
const open = async () => {
  await click(container.querySelector('button')!);
  await click(document.querySelector('[aria-label="Show Energy"]')!);
};
const snapshot = (balance: number): EnergyAccountSnapshot => ({ uid: 'test-account', balance, held: 3, available: balance - 3, prices: [], activity: [], developmentControls: { initialGrant: 500, defaultGrant: 100, maxGrant: 10000 }, updatedAt: '2026-09-20T00:00:00Z' });

describe('Familiar sprite playback', () => {
  it('uses exact supplied idle durations, skips unused cells, loops, pauses, and clears timers', () => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} />));
    imageLoaded();
    act(() => vi.advanceTimersByTime(279));
    expect(frame()).toBe('0');
    act(() => vi.advanceTimersByTime(1));
    expect(frame()).toBe('1');
    expect(container.querySelector('img')!.style.transform).toBe('translate(-12.5%, 0%)');
    for (const duration of [110, 110, 140, 140, 320]) act(() => vi.advanceTimersByTime(duration));
    expect(frame()).toBe('0');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} paused />));
    act(() => vi.advanceTimersByTime(2000));
    expect(frame()).toBe('0');
    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resets when switching clips and renders static neutral and look cells without timers', () => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="running-right" />));
    imageLoaded();
    act(() => vi.advanceTimersByTime(120));
    expect(frame()).toBe('1');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="neutral" />));
    imageLoaded();
    expect(frame()).toBe('0');
    expect(container.querySelector('img')!.style.transform).toBe('translate(-75%, 0%)');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="look-270" />));
    imageLoaded();
    expect(container.querySelector('img')!.style.transform).toBe('translate(-50%, -90.9090909090909%)');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('selects the supplied Codex activity clip when used as a standalone renderer', () => {
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} activity="ready" />));
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Celestial Guardian, Thoughtful review');
  });

  it('respects reduced motion and reports a missing image', () => {
    vi.useFakeTimers();
    reduced = true;
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} />));
    imageLoaded();
    act(() => vi.advanceTimersByTime(2000));
    expect(frame()).toBe('0');
    expect(vi.getTimerCount()).toBe(0);
    act(() => container.querySelector('img')!.dispatchEvent(new Event('error')));
    expect(container.textContent).toContain('Familiar artwork could not load.');
  });

  it('plays without React commits and stops offscreen, in the background, and after unmount', () => {
    vi.useFakeTimers();
    let intersect!: IntersectionObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect = disconnect; });
    const commit = vi.fn();
    act(() => root.render(<Profiler id="sprite" onRender={commit}><FamiliarSprite familiar={celestialGuardian} /></Profiler>));
    imageLoaded();
    expect(vi.getTimerCount()).toBe(0);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    const count = commit.mock.calls.length;
    act(() => vi.advanceTimersByTime(390));
    expect(frame()).toBe('2');
    expect(commit).toHaveBeenCalledTimes(count);
    act(() => intersect([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(vi.getTimerCount()).toBe(0);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(vi.getTimerCount()).toBe(0);
    act(() => root.render(null));
    expect(disconnect).toHaveBeenCalledOnce();
    expect(mediaListeners.size).toBe(0);
  });
});

describe('Familiar Energy interaction', () => {
  it('announces artwork status outside the image semantics and describes the trigger', () => {
    act(() => root.render(<Familiar familiar={celestialGuardian} />));
    const status = container.querySelector('[role="status"]')!;
    expect(status.closest('[role="img"]')).toBeNull();
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(container.querySelector('button')!.getAttribute('aria-describedby')).toContain(status.id);
    expect(status.textContent).toBe('Loading Familiar…');
    imageLoaded();
    expect(status.textContent).toBe('');
    act(() => container.querySelector('img')!.dispatchEvent(new Event('error')));
    expect(status.textContent).toBe('Familiar artwork could not load.');
  });

  it('reads on tap, distinguishes held Energy, refreshes on reopen, and never treats maxGrant as capacity', async () => {
    const client: EnergyClient = { getSnapshot: vi.fn().mockResolvedValueOnce(snapshot(73)).mockResolvedValue(snapshot(91)), grantDevelopment: vi.fn(), resetDevelopment: vi.fn() };
    await act(async () => root.render(<EnergyClientProvider client={client}><Familiar familiar={celestialGuardian} /></EnergyClientProvider>));
    expect(client.getSnapshot).not.toHaveBeenCalled();
    await open();
    expect(document.body.textContent).toContain('Current Energy73');
    expect(document.body.textContent).toContain('Available70');
    expect(document.body.textContent).toContain('MaximumNot configured');
    expect(document.body.textContent).not.toContain('10,000');
    await click(document.querySelector('[aria-label="Close Energy panel"]')!);
    await open();
    expect(document.body.textContent).toContain('Current Energy91');
    expect(client.getSnapshot).toHaveBeenCalledTimes(2);
    expect(client.grantDevelopment).not.toHaveBeenCalled();
    expect(client.resetDevelopment).not.toHaveBeenCalled();
  });

  it('shows loading then error without a made-up balance, and retries through the same client', async () => {
    let reject!: (error: Error) => void;
    const client: EnergyClient = { getSnapshot: vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValue(snapshot(0)), grantDevelopment: vi.fn(), resetDevelopment: vi.fn() };
    await act(async () => root.render(<EnergyClientProvider client={client}><Familiar familiar={celestialGuardian} /></EnergyClientProvider>));
    await open();
    expect(document.body.textContent).toContain('Loading Energy');
    await act(async () => reject(new Error('Connection interrupted')));
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Connection interrupted');
    expect(document.body.textContent).not.toContain('Current Energy');
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'Retry Energy')!);
    expect(document.body.textContent).toContain('Current Energy0');
  });

  it('has an honest unconnected state and dismisses on Escape', async () => {
    await act(async () => root.render(<Familiar familiar={celestialGuardian} />));
    await open();
    expect(document.body.textContent).toContain('Sign in to see your Energy.');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[aria-label="Show Energy"]')?.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('Familiar selection', () => {
  it('uses host availability and pending state, and never offers an unlock action', async () => {
    const select = vi.fn();
    await act(async () => root.render(<FamiliarSelection options={[{ ...celestialGuardianOption, available: false }]} onSelect={select} />));
    expect(container.querySelector('button')!.disabled).toBe(true);
    expect(container.querySelector('button')!.textContent).toBe('Locked');
    await click(container.querySelector('button')!);
    expect(select).not.toHaveBeenCalled();
    await act(async () => root.render(<FamiliarSelection options={[celestialGuardianOption]} pending onSelect={select} />));
    expect(container.querySelector('button')!.disabled).toBe(true);
    expect(container.textContent).toContain('Saving your Familiar');
  });

  it('falls back to the host still image when the requested hero is unavailable', async () => {
    await act(async () => root.render(<FamiliarSelection options={[celestialGuardianOption]} onSelect={vi.fn()} />));
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.heroUrl);
    act(() => img.dispatchEvent(new Event('error')));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.stillUrl);
    act(() => img.dispatchEvent(new Event('error')));
    expect(img.dataset.fallback).toBe('true');
  });
});

describe('Floating companion', () => {
  function ManagedCompanion() {
    const [minimized, setMinimized] = useState(false);
    return <>
      {minimized && <FamiliarRecall familiar={celestialGuardian} onRecall={() => setMinimized(false)} />}
      <FamiliarCompanion familiar={celestialGuardian} minimized={minimized} onMinimize={() => setMinimized(true)} />
    </>;
  }
  const pet = () => document.querySelector<HTMLButtonElement>('.familiar-companion button')!;
  const pointer = (type: string, x: number, y: number, pointerId = 1, pointerType = 'mouse') => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { clientX: x, clientY: y, pointerId, pointerType, button: 0, isPrimary: pointerId === 1 });
    act(() => pet().dispatchEvent(event));
    flushFrames();
  };
  const mouseClick = () => act(() => { pet().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })); });
  const location = () => {
    const style = document.querySelector<HTMLElement>('.familiar-companion')!.style;
    const [x, y] = style.transform.match(/-?[\d.]+/g)!.map(Number);
    return { x, y };
  };

  it.each(['mouse', 'touch'])('distinguishes %s drag from tap and only reads Energy after choosing the action', async pointerType => {
    const client: EnergyClient = { getSnapshot: vi.fn().mockResolvedValue(snapshot(81)), grantDevelopment: vi.fn(), resetDevelopment: vi.fn() };
    await act(async () => root.render(<EnergyClientProvider client={client}><FamiliarCompanion familiar={celestialGuardian} /></EnergyClientProvider>));
    pointer('pointerdown', 900, 600, 1, pointerType);
    pointer('pointermove', 100, 100, 2, pointerType);
    expect(document.querySelector('[data-dragging]')).toBeNull();
    pointer('pointermove', -2000, -2000, 1, pointerType);
    expect(location()).toEqual({ x: 12, y: 12 });
    pointer('pointerup', -2000, -2000, 1, pointerType);
    mouseClick();
    expect(client.getSnapshot).not.toHaveBeenCalled();
    pointer('pointerdown', 50, 50, 1, pointerType);
    pointer('pointermove', 52, 51, 1, pointerType);
    pointer('pointerup', 52, 51, 1, pointerType);
    await act(async () => mouseClick());
    expect(client.getSnapshot).not.toHaveBeenCalled();
    expect(pet().getAttribute('aria-expanded')).toBe('true');
    await click(document.querySelector('[aria-label="Show Energy"]')!);
    expect(client.getSnapshot).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain('Current Energy81');
  });

  it('cleans up cancelled gestures, supports keyboard movement, and reclamps after resizing', async () => {
    await act(async () => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    pointer('pointerdown', 900, 600);
    pointer('pointermove', 890, 580);
    pointer('pointercancel', 890, 580);
    mouseClick();
    expect(pet().getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-dragging]')).toBeNull();
    const before = location();
    act(() => pet().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(location().x).toBe(before.x - 16);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving left');
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 });
      act(() => window.dispatchEvent(new Event('resize')));
      flushFrames();
      expect(location().x).toBeLessThanOrEqual(204);
      expect(location().y).toBeLessThanOrEqual(300 - 12 - 104 * 208 / 192 + 0.001);
      await click(pet()); // Keyboard-style activation still works after a cancelled pointer.
      await click(document.querySelector('[aria-label="Show Energy"]')!);
      expect(document.body.textContent).toContain('Sign in to see your Energy');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    }
  });

  it('keeps hidden comparison panes from creating another floating companion', () => {
    const hidden = document.createElement('div');
    const boundaryRef = { current: hidden };
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} boundaryRef={boundaryRef} />));
    expect(document.querySelector('.familiar-companion')).toBeNull();
  });

  it('minimizes from the action tray, restores its position, and returns keyboard focus', async () => {
    await act(async () => root.render(<ManagedCompanion />));
    act(() => pet().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    const before = location();
    await click(pet());
    await click(document.querySelector('[aria-label="Minimize Familiar"]')!);
    expect(document.querySelector('.familiar-companion')).toBeNull();
    const recall = container.querySelector<HTMLButtonElement>('.familiar-recall')!;
    expect(document.activeElement).toBe(recall);
    await click(recall);
    expect(document.querySelector('.familiar-companion')).toBeNull();
    await click(document.querySelector('[aria-label="Expand Familiar"]')!);
    expect(location()).toEqual(before);
    expect(document.activeElement).toBe(pet());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('resizes live, preserves aspect ratio, and caps invalid host preferences', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={2} />));
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('208px');
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={0.6} />));
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('62.4px');
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={NaN} />));
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('104px');
    expect(container.querySelector('.familiar-companion')).toBeNull(); // The pet remains portalled to the page.
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} size={2} bottomInset={72} />));
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 4000, 4000);
    pointer('pointerup', 4000, 4000);
    expect(location().y + 208 * (208 / 192) + 48).toBeLessThanOrEqual(window.innerHeight - 72 - 12 + 0.001);
  });

  it('reveals actions on mouse hover, dismisses them outside, and preserves touch access', async () => {
    await act(async () => root.render(<FamiliarCompanion familiar={celestialGuardian} activity="running" />));
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(true);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Working with timepiece');
    pointer('pointerover', 100, 100);
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(false);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Waving');
    await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(true);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Working with timepiece');
    await click(document.querySelector('[aria-label="Show Familiar actions"]')!);
    expect(document.querySelector<HTMLElement>('.familiar-actions')!.hidden).toBe(false);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Waving');
  });

  it('does not let a keyboard movement reset interrupt a pointer drag', () => {
    vi.useFakeTimers();
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    act(() => pet().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving left');
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 640, 500);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving right');
    act(() => vi.advanceTimersByTime(280));
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving right');
  });

  it.each([
    ['running', 'Working with timepiece'],
    ['needs-input', 'Waiting for input'],
    ['ready', 'Thoughtful review'],
    ['blocked', 'Disappointed'],
  ] as const)('uses the supplied Codex %s activity clip', (activity, label) => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} activity={activity} />));
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe(`Celestial Guardian, ${label}`);
  });

  it('uses the supplied side-running animation for horizontal drag direction and restores activity on release', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} activity="running" />));
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 640, 500);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving right');
    pointer('pointermove', 500, 500);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Moving left');
    pointer('pointerup', 500, 500);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Working with timepiece');
  });

  it('does not substitute an unrelated task animation for a vertical drag', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    pointer('pointerdown', 600, 500);
    pointer('pointermove', 600, 440);
    expect(document.querySelector('.familiar-companion [role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Idle');
  });
});

describe('Header Familiar actions', () => {
  it('reads the same Energy account without restoring the floating pet until Expand is chosen', async () => {
    const onRecall = vi.fn();
    const client: EnergyClient = { getSnapshot: vi.fn().mockResolvedValue(snapshot(64)), grantDevelopment: vi.fn(), resetDevelopment: vi.fn() };
    await act(async () => root.render(<EnergyClientProvider client={client}><FamiliarRecall familiar={celestialGuardian} onRecall={onRecall} /></EnergyClientProvider>));
    await click(container.querySelector('.familiar-recall')!);
    expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Celestial Guardian, Waving');
    expect(onRecall).not.toHaveBeenCalled();
    expect(client.getSnapshot).not.toHaveBeenCalled();
    await click(document.querySelector('[aria-label="Show Energy"]')!);
    expect(document.body.textContent).toContain('Current Energy64');
    expect(onRecall).not.toHaveBeenCalled();
    await click(document.querySelector('[aria-label="Close Energy panel"]')!);
    await click(document.querySelector('[aria-label="Expand Familiar"]')!);
    expect(onRecall).toHaveBeenCalledOnce();
    expect(client.getSnapshot).toHaveBeenCalledOnce();
  });
});

describe('Mobile sizing and inactive work', () => {
  it('maps mobile 10–100 to 0.6–1.5, defaults/resets to 50, and preserves desktop preferences on resize', async () => {
    mobile = true;
    const change = vi.fn();
    const render = (size?: number) => act(() => root.render(<>
      <FamiliarSelection options={[celestialGuardianOption]} selectedId={celestialGuardian.id} size={size} onSizeChange={change} onSelect={vi.fn()} />
      <FamiliarCompanion familiar={celestialGuardian} size={size} />
    </>));
    render();
    const slider = container.querySelector('input')!;
    expect([slider.min, slider.max, slider.value]).toEqual(['10', '100', '50']);
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('104px');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    for (const [value, expected] of [['10', 0.6], ['100', 1.5]] as const) {
      act(() => { setter.call(slider, value); slider.dispatchEvent(new Event('input', { bubbles: true })); });
      expect(change).toHaveBeenLastCalledWith(expected);
    }
    render(2);
    expect(slider.value).toBe('100');
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('156px');
    await click(container.querySelector('.familiar-size-slider button')!);
    expect(change).toHaveBeenLastCalledWith(1);
    change.mockClear();
    act(() => { mobile = false; mediaListeners.forEach(update => update()); });
    expect([slider.min, slider.max, slider.value]).toEqual(['60', '200', '200']);
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.width).toBe('208px');
    expect(change).not.toHaveBeenCalled();
  });

  it('batches scroll measurements and detaches geometry work while minimized', () => {
    const boundary = document.createElement('div');
    const measure = vi.spyOn(boundary, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 1000, bottom: 800 } as DOMRect);
    const boundaryRef = { current: boundary };
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} boundaryRef={boundaryRef} />));
    measure.mockClear();
    for (let n = 0; n < 20; n++) act(() => window.dispatchEvent(new Event('scroll')));
    expect(measure).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    flushFrames();
    expect(measure).toHaveBeenCalledOnce();
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} boundaryRef={boundaryRef} minimized />));
    measure.mockClear();
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(frames.size).toBe(0);
    expect(measure).not.toHaveBeenCalled();
  });

  it('coalesces drag samples, flushes the final position on release, and cancels queued work on unmount', () => {
    act(() => root.render(<FamiliarCompanion familiar={celestialGuardian} />));
    const pet = document.querySelector('.familiar-companion button')!;
    const pointer = (type: string, x: number) => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { pointerId: 1, button: 0, clientX: x, clientY: 500, isPrimary: true });
      act(() => pet.dispatchEvent(event));
    };
    pointer('pointerdown', 900);
    const before = document.querySelector<HTMLElement>('.familiar-companion')!.style.transform;
    for (let x = 890; x >= 700; x -= 10) pointer('pointermove', x);
    expect(frames.size).toBe(1);
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.transform).toBe(before);
    pointer('pointerup', 700);
    expect(frames.size).toBe(0);
    expect(document.querySelector<HTMLElement>('.familiar-companion')!.style.transform).not.toBe(before);
    pointer('pointerdown', 700);
    pointer('pointermove', 650);
    expect(frames.size).toBe(1);
    act(() => root.render(null));
    expect(frames.size).toBe(0);
  });

  it('releases the animated hero when offscreen and resumes the supplied GIF on return', () => {
    let intersect!: IntersectionObserverCallback;
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect() {} });
    act(() => root.render(<FamiliarSelection options={[celestialGuardianOption]} onSelect={vi.fn()} />));
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.stillUrl);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.heroUrl);
    act(() => intersect([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.stillUrl);
    act(() => intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(img.getAttribute('src')).toBe(celestialGuardianOption.heroUrl);
  });
});
