// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useReaderDocumentScrollbar } from './useReaderDocumentScrollbar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.useRealTimers());

it('shows only for document scrolling, renews its idle delay, and cleans up on exit', async () => {
  vi.useFakeTimers();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const html = document.documentElement;
  function Reader() { useReaderDocumentScrollbar(); return <div />; }
  try {
    await act(async () => root.render(<Reader />));
    expect(html.hasAttribute('data-reader-scrollbar')).toBe(true);
    container.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(html.hasAttribute('data-reader-scrolling')).toBe(false);
    document.dispatchEvent(new Event('scroll'));
    expect(html.hasAttribute('data-reader-scrolling')).toBe(true);
    vi.advanceTimersByTime(800);
    document.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(800);
    expect(html.hasAttribute('data-reader-scrolling')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(html.hasAttribute('data-reader-scrolling')).toBe(false);
    document.dispatchEvent(new Event('scroll'));
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
  expect(html.hasAttribute('data-reader-scrollbar')).toBe(false);
  expect(html.hasAttribute('data-reader-scrolling')).toBe(false);
  document.dispatchEvent(new Event('scroll'));
  expect(html.hasAttribute('data-reader-scrolling')).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
