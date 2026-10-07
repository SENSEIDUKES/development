// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionReaderHost } from './ProductionReaderHost';
import { installProductionApiGuard } from './productionApiGuard';
import { useAppStore } from '../light-novels/src/store/useAppStore';

/** Browser features jsdom lacks that production's Reader touches while mounting. */
beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  Object.assign(window, {
    IntersectionObserver: Observer,
    ResizeObserver: Observer,
    matchMedia: (query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }),
    scrollTo: () => {},
  });
  Element.prototype.scrollIntoView = () => {};
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => {};
  HTMLMediaElement.prototype.load = () => {};
});

describe('ProductionReaderHost', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mounts production’s Reader screen: its top bar, the chapter and Alter Fate', async () => {
    await act(async () => {
      root.render(<ProductionReaderHost scenario={{ chapter: 1 }} />);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Ashes of the Ninth Meridian');
    expect(text).toContain('Lore Glossary');
    expect(text).toContain('Codex');
    expect(text).toContain('The Oath of Embers');
    expect(text).toContain('Volume I: The Ember Oath • Chapter 1');
    expect(container.querySelector('[aria-label="Alter Fate (Branch)"]')).not.toBeNull();
    // The chapter body arrives the way production loads it, through storage.
    expect(text).toContain('wept rust-red rain');
  });

  it('runs production’s keyboard shortcuts, and offers a way back from screens it does not include', async () => {
    await act(async () => {
      root.render(<ProductionReaderHost scenario={{ chapter: 1 }} />);
    });
    await act(async () => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    });
    // Production's page transition lets the Reader finish leaving first.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
    });
    expect(container.textContent).toContain('Only the Reader was brought into the Workshop');
    const back = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Back to the Reader');
    await act(async () => {
      back?.click();
      await new Promise((resolve) => setTimeout(resolve, 800));
    });
    expect(container.textContent).toContain('The Oath of Embers');
  });

  it('opens the steering screen for chapter -1', async () => {
    await act(async () => {
      root.render(<ProductionReaderHost scenario={{ chapter: -1 }} />);
    });
    expect(useAppStore.getState().selectedChapterNum).toBe(-1);
    expect(container.textContent).toContain('Quest Director Panel');
  });
});

describe('installProductionApiGuard', () => {
  it('answers production AI routes locally and leaves other requests alone', async () => {
    vi.useFakeTimers();
    const passthrough = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    const original = window.fetch;
    window.fetch = passthrough as unknown as typeof window.fetch;
    const uninstall = installProductionApiGuard();
    try {
      const directions = window.fetch('/api/generate-next-directions', { method: 'POST', body: '{}' });
      const translation = window.fetch('/api/translate-chapter', { method: 'POST', body: '{}' });
      const portrait = window.fetch('/api/generate-card-image', { method: 'POST', body: JSON.stringify({ type: 'character' }) });
      await vi.advanceTimersByTimeAsync(1000);
      expect((await (await directions).json()).directions).toHaveLength(4);
      expect((await translation).status).toBe(503);
      expect((await (await portrait).json()).imageUrl).toMatch(/^\/card-workshop\//);
      expect((await window.fetch('/api/foundation/media-assets/x')).status).toBe(503);
      expect(passthrough).not.toHaveBeenCalled();

      await window.fetch('/api/harness-generation');
      expect(passthrough).toHaveBeenCalledTimes(1);
    } finally {
      uninstall();
      window.fetch = original;
      vi.useRealTimers();
    }
  });
});
