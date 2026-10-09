// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { HomeWorld } from '../shared/homeContracts';
import { LightNovelsHome } from './LightNovelsHome';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const world = (id: string, title: string): HomeWorld => ({
  id, title, genre: 'Xianxia', createdAt: '2026-10-01', reads: 1, imageUrl: `/${id}.png`, chapterCount: 3,
  mcName: 'Ye Chen', powerStage: 'Foundation', synopsis: `${title} begins.`,
});

it('keeps Featured Ascension and cycles to each featured world as a Feature card', () => {
  const onOpenWorld = vi.fn();
  const featured = [world('lotus', 'The Last Lotus'), world('moons', 'Nine Moons')];
  // Inactive: the slides do not advance on their own and the hero's motion stays off.
  act(() => root.render(<LightNovelsHome active={false} worlds={featured} featuredWorlds={featured}
    onCreateStory={() => {}} onOpenWorld={onOpenWorld} />));

  const hero = () => container.querySelector('[data-home-featured] > [aria-hidden]') ;
  const dots = () => [...container.querySelectorAll<HTMLButtonElement>('.home-featured-dot')];
  expect(dots().map(dot => dot.getAttribute('aria-label'))).toEqual(['Featured Ascension', 'Featured: The Last Lotus', 'Featured: Nine Moons']);
  expect(dots()[0].getAttribute('aria-current')).toBe('true');
  expect(container.textContent).toContain('Featured Ascension');
  expect(container.querySelector('[data-world-card="feature"]')).toBeNull();

  act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next featured"]')!.click());
  expect(hero()).not.toBeNull();
  expect(container.querySelector('[data-world-card="feature"] h3')?.textContent).toBe('The Last Lotus');
  expect(dots()[1].getAttribute('aria-current')).toBe('true');

  act(() => dots()[2].click());
  expect(container.querySelector('[data-world-card="feature"] h3')?.textContent).toBe('Nine Moons');
  act(() => container.querySelector<HTMLButtonElement>('.world-card-banner-open')!.click());
  expect(onOpenWorld).toHaveBeenCalledWith('moons');

  // Next from the last slide returns to Featured Ascension.
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next featured"]')!.click());
  expect(container.querySelector('[data-world-card="feature"]')).toBeNull();
  expect(hero()).toBeNull();
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="Previous featured"]')!.click());
  expect(container.querySelector('[data-world-card="feature"] h3')?.textContent).toBe('Nine Moons');
});

it('leaves Featured Ascension alone without featured worlds', () => {
  act(() => root.render(<LightNovelsHome active={false} worlds={[]} onCreateStory={() => {}} onOpenWorld={() => {}} />));
  expect(container.textContent).toContain('Featured Ascension');
  expect(container.querySelector('.home-featured-controls')).toBeNull();
});

it('advances on its own while active, and holds while the reader points at it', () => {
  vi.useFakeTimers();
  // Motion is allowed here: the slides advance only when the reader has not asked for less motion.
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  try {
    const featured = [world('lotus', 'The Last Lotus')];
    act(() => root.render(<LightNovelsHome worlds={featured} featuredWorlds={featured} onCreateStory={() => {}} onOpenWorld={() => {}} />));
    act(() => { vi.advanceTimersByTime(8000); });
    expect(container.querySelector('[data-world-card="feature"] h3')?.textContent).toBe('The Last Lotus');
    const section = container.querySelector<HTMLElement>('[data-home-featured]')!;
    act(() => { section.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); });
    act(() => { vi.advanceTimersByTime(16000); });
    expect(container.querySelector('[data-world-card="feature"] h3')?.textContent).toBe('The Last Lotus');
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
