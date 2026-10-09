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

it('keeps the Carve New Destiny slide and cycles to each featured world, under one fixed Featured name', () => {
  const onOpenWorld = vi.fn();
  const featured = [world('lotus', 'The Last Lotus'), world('moons', 'Nine Moons')];
  // Inactive: the slides do not advance on their own and the hero's motion stays off.
  act(() => root.render(<LightNovelsHome active={false} worlds={featured} featuredWorlds={featured}
    onCreateStory={() => {}} onOpenWorld={onOpenWorld} />));

  const hero = () => container.querySelector('[data-home-featured] > [aria-hidden]') ;
  const dots = () => [...container.querySelectorAll<HTMLButtonElement>('.home-featured-dot')];
  expect(dots().map(dot => dot.getAttribute('aria-label'))).toEqual(['Defying the Heavens', 'The Last Lotus', 'Nine Moons']);
  expect(dots()[0].getAttribute('aria-current')).toBe('true');
  expect(container.querySelector('.home-featured-label')?.textContent).toBe('Featured');
  expect(container.textContent).not.toContain('Featured Ascension');
  expect(container.textContent).toContain('Carve New Destiny');
  expect(container.querySelector('[data-world-card="feature"]')).toBeNull();

  act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next featured"]')!.click());
  expect(hero()).not.toBeNull();
  expect(container.querySelector('[data-world-card="feature"] h3')?.textContent).toBe('The Last Lotus');
  expect(dots()[1].getAttribute('aria-current')).toBe('true');
  // The name stays where it was; the card does not repeat it.
  expect(container.querySelector('.home-featured-label')?.textContent).toBe('Featured');
  expect(container.querySelector('.world-card-banner-eyebrow')).toBeNull();

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

it('leaves the Carve New Destiny slide alone without featured worlds', () => {
  act(() => root.render(<LightNovelsHome active={false} worlds={[]} onCreateStory={() => {}} onOpenWorld={() => {}} />));
  expect(container.querySelector('.home-featured-label')?.textContent).toBe('Featured');
  expect(container.querySelector('.home-featured-dot')).toBeNull();
  expect(container.querySelector('.home-featured-step')).toBeNull();
});

it('turns with a sideways swipe, and the swipe does not open the card', () => {
  const onOpenWorld = vi.fn();
  const featured = [world('lotus', 'The Last Lotus')];
  act(() => root.render(<LightNovelsHome active={false} worlds={featured} featuredWorlds={featured} onCreateStory={() => {}} onOpenWorld={onOpenWorld} />));
  const section = container.querySelector<HTMLElement>('[data-home-featured]')!;
  const swipe = (from: number, to: number, target: Element = section, dy = 0) => act(() => {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: from, clientY: 100 }));
    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: to, clientY: 100 + dy }));
  });
  swipe(300, 120);
  expect(container.querySelector('[data-world-card="feature"] h3')?.textContent).toBe('The Last Lotus');
  // A swipe that ends on the card turns back and does not open it.
  const open = container.querySelector<HTMLButtonElement>('.world-card-banner-open')!;
  swipe(100, 300, open);
  act(() => open.click());
  expect(onOpenWorld).not.toHaveBeenCalled();
  expect(container.querySelector('[data-world-card="feature"]')).toBeNull();
  // A mostly vertical drag is the page scrolling, and a short one is a tap.
  swipe(300, 240, section, 200);
  swipe(300, 280);
  expect(container.querySelector('[data-world-card="feature"]')).toBeNull();
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
