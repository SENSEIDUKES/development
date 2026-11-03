// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorldCardFeatureCarousel, type WorldCardFeatureSlide } from './WorldCardFeatureCarousel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.useFakeTimers();
  // Motion allowed: the carousel only moves on its own when the reader has not asked for less.
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const slides: WorldCardFeatureSlide[] = ['Lotus', 'Moons', 'Oath'].map(title => ({
  id: title, label: title, render: onScreen => <p data-on-screen={String(onScreen)}>{title}</p>,
}));
const shown = () => container.querySelector('.world-card-carousel-slide:not([hidden]) p')?.textContent;
const segments = () => [...container.querySelectorAll<HTMLButtonElement>('.world-card-carousel-segment')];

it('moves sideways on its own, one slide at a time, with a story bar', () => {
  act(() => root.render(<WorldCardFeatureCarousel slides={slides} slideMs={1000} />));
  expect(shown()).toBe('Lotus');
  expect(container.querySelector('p')?.getAttribute('data-on-screen')).toBe('true');
  expect(segments().map(segment => segment.getAttribute('data-state'))).toEqual(['current', 'next', 'next']);
  act(() => { vi.advanceTimersByTime(1000); });
  expect(shown()).toBe('Moons');
  expect(segments().map(segment => segment.getAttribute('data-state'))).toEqual(['done', 'current', 'next']);
  act(() => segments()[2].click());
  expect(shown()).toBe('Oath');
});

it('holds the slide while a finger rests on it, then gives it only the time it had left', () => {
  act(() => root.render(<WorldCardFeatureCarousel slides={slides} slideMs={1000} />));
  const section = container.querySelector<HTMLElement>('.world-card-carousel')!;
  act(() => { vi.advanceTimersByTime(600); });
  act(() => { section.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 100, clientY: 100 })); });
  expect(section.getAttribute('data-moving')).toBe('false');
  act(() => { vi.advanceTimersByTime(5000); });
  expect(shown()).toBe('Lotus');
  act(() => { section.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 100, clientY: 100 })); });
  act(() => { vi.advanceTimersByTime(399); });
  expect(shown()).toBe('Lotus');
  act(() => { vi.advanceTimersByTime(1); });
  expect(shown()).toBe('Moons');
});

it('stays still with one slide, and while the page is inactive', () => {
  act(() => root.render(<WorldCardFeatureCarousel slides={slides.slice(0, 1)} slideMs={1000} />));
  expect(segments()).toHaveLength(0);
  expect(container.querySelector('.world-card-carousel-step')).toBeNull();
  act(() => root.render(<WorldCardFeatureCarousel slides={slides} slideMs={1000} active={false} />));
  act(() => { vi.advanceTimersByTime(5000); });
  expect(shown()).toBe('Lotus');
  expect(container.querySelector('p')?.getAttribute('data-on-screen')).toBe('false');
});
