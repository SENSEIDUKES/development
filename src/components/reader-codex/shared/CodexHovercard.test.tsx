// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMockState } from '../../reader-chamber/shared/stubs';
import { CodexHovercard } from './CodexHovercard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('CodexHovercard image eligibility', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetMockState();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const openHovercard = () => {
    const trigger = container.querySelector<HTMLElement>('[role="button"]');
    expect(trigger).toBeTruthy();
    act(() => trigger!.click());
  };

  it('does not expose a Manifest image action for an informational Faction', () => {
    act(() => root.render(
      <CodexHovercard
        term="Ninth House"
        type="faction"
        entry={{
          id: 'faction-ninth-house',
          name: 'Ninth House',
          description: 'An oathbound judicial faction.',
          alignment: 'Neutral',
          status: 'Active',
        }}
      >
        Ninth House
      </CodexHovercard>,
    ));
    openHovercard();

    expect(document.body.textContent).toContain('An oathbound judicial faction.');
    expect(document.body.querySelector('button[aria-label*="Manifest portrait"]')).toBeFalsy();
  });

  it('keeps the existing Manifest action for an eligible visual Codex entry', () => {
    act(() => root.render(
      <CodexHovercard
        term="Oath Seal"
        type="artifact"
        entry={{
          id: 'artifact-oath-seal',
          name: 'Oath Seal',
          description: 'A seal that binds spoken vows.',
          tier: 'Rare',
        }}
      >
        Oath Seal
      </CodexHovercard>,
    ));
    openHovercard();

    expect(document.body.querySelector('button[aria-label="Manifest portrait for Oath Seal"]')).toBeTruthy();
  });

  it('centers the open card inside mobile and tablet safe-area bounds with scrollable content', () => {
    act(() => root.render(
      <CodexHovercard
        term="Aster"
        type="character"
        entry={{
          id: 'character-aster',
          name: 'Aster',
          description: 'A long-lived witness whose complete history remains readable on short screens.',
          role: 'Main Character',
          imageUrl: '/aster-portrait.png',
        }}
      >
        Aster
      </CodexHovercard>,
    ));
    openHovercard();

    const layer = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard-layer"]');
    const card = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard"]');
    const image = card?.querySelector<HTMLImageElement>('img[alt="Aster"]');

    expect(layer?.className).toContain('items-center');
    expect(layer?.className).toContain('justify-center');
    expect(layer?.style.top).toContain('safe-area-inset-top');
    expect(layer?.style.right).toContain('safe-area-inset-right');
    expect(layer?.style.bottom).toContain('safe-area-inset-bottom');
    expect(layer?.style.left).toContain('safe-area-inset-left');
    expect(card?.className).toContain('max-w-full');
    expect(card?.className).toContain('overflow-y-auto');
    expect(card?.className).toContain('overscroll-contain');
    expect(card?.style.maxHeight).toBe('100%');
    expect(image?.className).toContain('object-contain');
    expect(image?.className).not.toContain('object-cover');
  });

  it('keeps desktop cards contextual while clamping them to the visible viewport', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    act(() => root.render(
      <CodexHovercard
        term="Rain Court"
        type="location"
        entry={{
          id: 'location-rain-court',
          name: 'Rain Court',
          description: 'A court beneath the storm.',
          realm: 'Mortal Realm',
          safetyLevel: 'Guarded',
        }}
      >
        Rain Court
      </CodexHovercard>,
    ));

    const trigger = container.querySelector<HTMLElement>('[role="button"]');
    vi.spyOn(trigger!, 'getBoundingClientRect').mockReturnValue({
      x: 1190,
      y: 700,
      width: 80,
      height: 24,
      top: 700,
      right: 1270,
      bottom: 724,
      left: 1190,
      toJSON: () => ({}),
    });
    openHovercard();

    const layer = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard-layer"]');
    const card = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard"]');
    Object.defineProperty(card, 'offsetWidth', { configurable: true, value: 256 });
    Object.defineProperty(card, 'offsetHeight', { configurable: true, value: 300 });
    act(() => window.dispatchEvent(new Event('resize')));

    expect(layer?.className).not.toContain('items-center');
    expect(layer?.style.visibility).toBe('visible');
    expect(Number.parseFloat(layer?.style.left ?? '')).toBe(window.innerWidth - 16 - 256);
    expect(Number.parseFloat(layer?.style.top ?? '')).toBe(700 - 8 - 300);
  });
});
