// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyClientProvider, type EnergyClient, type EnergyAccountSnapshot } from '@seihouse/library/energy';
import { celestialGuardian, celestialGuardianOption } from '../../../host/familiar/celestialGuardian';
import { Familiar } from './Familiar';
import { FamiliarSprite } from './FamiliarSprite';
import { FamiliarSelection } from './FamiliarSelection';
import { FamiliarCompanion } from './FamiliarCompanion';
import { FamiliarRecall } from './FamiliarRecall';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation((media: string) => ({ media, matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
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
const open = () => click(container.querySelector('button')!);
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
    expect(container.querySelector('img')!.style.left).toBe('-100%');
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
    expect(container.querySelector('img')!.style.left).toBe('-600%');
    act(() => root.render(<FamiliarSprite familiar={celestialGuardian} animation="look-270" />));
    imageLoaded();
    expect(container.querySelector('img')!.style.top).toBe('-1000%');
    expect(container.querySelector('img')!.style.left).toBe('-400%');
    expect(vi.getTimerCount()).toBe(0);
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
    expect(container.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
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
  };
  const mouseClick = () => act(() => { pet().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })); });
  const location = () => {
    const style = document.querySelector<HTMLElement>('.familiar-companion')!.style;
    return { x: Number.parseFloat(style.left), y: Number.parseFloat(style.top) };
  };

  it.each(['mouse', 'touch'])('distinguishes %s drag from tap and only reads Energy on tap', async pointerType => {
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
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 });
      act(() => window.dispatchEvent(new Event('resize')));
      expect(location().x).toBeLessThanOrEqual(204);
      expect(location().y).toBeLessThanOrEqual(300 - 12 - 104 * 208 / 192 + 0.001);
      await click(pet()); // Keyboard-style activation still works after a cancelled pointer.
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

  it('minimizes from the panel, restores its position, and returns keyboard focus', async () => {
    await act(async () => root.render(<ManagedCompanion />));
    act(() => pet().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    const before = location();
    await click(pet());
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'Minimize Familiar')!);
    expect(document.querySelector('.familiar-companion')).toBeNull();
    const recall = container.querySelector<HTMLButtonElement>('.familiar-recall')!;
    expect(document.activeElement).toBe(recall);
    await click(recall);
    expect(location()).toEqual(before);
    expect(document.activeElement).toBe(pet());
    expect(pet().getAttribute('aria-expanded')).toBe('false');
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
    expect(location().y + 208 * (208 / 192)).toBeLessThanOrEqual(window.innerHeight - 72 - 12 + 0.001);
  });
});
