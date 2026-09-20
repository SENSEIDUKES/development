// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyClientProvider, type EnergyClient, type EnergyAccountSnapshot } from '@seihouse/library/energy';
import { celestialGuardian, celestialGuardianOption } from '../../../host/familiar/celestialGuardian';
import { Familiar } from './Familiar';
import { FamiliarSprite } from './FamiliarSprite';
import { FamiliarSelection } from './FamiliarSelection';

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
