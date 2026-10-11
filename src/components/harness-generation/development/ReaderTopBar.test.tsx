// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReaderTopBar } from './ReaderTopBar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
const render = (pinned = false, place = 'Chapter 1') => act(() => root.render(<main>
  <ReaderTopBar storyTitle="Story" place={place} onBack={() => {}} onOpenSettings={() => {}} pinned={pinned} />
</main>));
const hidden = () => container.querySelector('header')!.getAttribute('data-scroll-hidden') === 'true';
const scroll = (y: number) => act(() => { vi.stubGlobal('scrollY', y); window.dispatchEvent(new Event('scroll')); });
beforeEach(() => {
  vi.stubGlobal('scrollY', 0);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('hides on intentional downward scroll, reveals on upward scroll, focus, chapter change, and near the top', () => {
  render();
  vi.spyOn(container.querySelector('main')!, 'getBoundingClientRect').mockImplementation(() => ({ top: -window.scrollY } as DOMRect));
  scroll(70); expect(hidden()).toBe(false);
  scroll(100); expect(hidden()).toBe(true);
  scroll(97); expect(hidden()).toBe(true);
  scroll(92); expect(hidden()).toBe(false);
  scroll(120); expect(hidden()).toBe(true);
  act(() => container.querySelector('button')!.focus()); expect(hidden()).toBe(false);
  scroll(160); expect(hidden()).toBe(true);
  render(false, 'Chapter 2'); expect(hidden()).toBe(false);
  scroll(200); expect(hidden()).toBe(true);
  render(true, 'Chapter 2');
  scroll(250); expect(hidden()).toBe(false);
  render(false, 'Chapter 2');
  scroll(300); expect(hidden()).toBe(true);
  scroll(0); expect(hidden()).toBe(false);
});

it('follows the actual nested Reader scroller without reacting to other page scrolling', () => {
  container.style.overflowY = 'auto';
  Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 2000 });
  Object.defineProperty(container, 'clientHeight', { configurable: true, value: 400 });
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
  render();
  vi.spyOn(container.querySelector('main')!, 'getBoundingClientRect').mockImplementation(() => ({ top: 100 - container.scrollTop } as DOMRect));
  scroll(300); expect(hidden()).toBe(false);
  act(() => { container.scrollTop = 120; container.dispatchEvent(new Event('scroll')); });
  expect(hidden()).toBe(true);
  act(() => { container.scrollTop = 110; container.dispatchEvent(new Event('scroll')); });
  expect(hidden()).toBe(false);
  act(() => { container.scrollTop = 1800; container.dispatchEvent(new Event('scroll')); });
  expect(hidden()).toBe(true);
  // Safari's elastic bounce back to the actual bottom is not an upward intention.
  act(() => { container.scrollTop = 1600; container.dispatchEvent(new Event('scroll')); });
  expect(hidden()).toBe(true);
});
