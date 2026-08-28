// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMockState } from '../../reader-chamber/shared/stubs';
import { getColorCodeValue } from '../../reader-chamber/shared/colorCodes';
import { CodexHovercard } from './CodexHovercard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Development CodexHovercard spectral glass', () => {
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
    vi.restoreAllMocks();
  });

  /** Clicks the highlighted term to open the hovercard portal. */
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

  it('keeps the Manifest action as a circular seal with the awakening caption', async () => {
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

    const button = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Manifest portrait for Oath Seal"]',
    );
    expect(button).toBeTruthy();
    expect(button!.className).toContain('rounded-full');
    expect(document.body.textContent).toContain('Portrait');

    // Until a portrait exists the glass carries the entity's Manifest backdrop.
    const backdrop = document.body.querySelector<HTMLImageElement>('img[data-slot="manifest-backdrop"]');
    expect(backdrop?.getAttribute('src')).toContain('/manifest-backdrops/');
    expect(backdrop?.getAttribute('alt')).toBe('');
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true');

    const dragonClass = Array.from(
      button?.querySelectorAll<HTMLSpanElement>('span[aria-hidden="true"]') ?? [],
    ).find(element => element.className.includes('[filter:drop-shadow('))?.className;
    expect(dragonClass).toContain('[filter:drop-shadow(');
    expect(dragonClass).toContain('group-hover/seal:[filter:drop-shadow(');
    expect(dragonClass).toContain('group-active/seal:[filter:drop-shadow(');

    await act(async () => {
      button!.click();
    });

    expect(document.body.querySelector('img[alt="Oath Seal"]')).toBeTruthy();
    expect(document.body.querySelector('img[data-slot="manifest-backdrop"]')).toBeFalsy();
  });

  it('glows with the entity ambient accent and carries the mote field', () => {
    act(() => root.render(
      <CodexHovercard
        term="Aster"
        type="character"
        entry={{
          id: 'character-aster',
          name: 'Aster',
          description: 'A quiet Rain Court courier.',
          role: 'Archive courier',
          relationshipToMC: 'ally',
        }}
      >
        Aster
      </CodexHovercard>,
    ));
    openHovercard();

    const card = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard"]');
    expect(card?.getAttribute('data-color-code')).toBe('ally');
    expect(card?.style.getPropertyValue('--codex-card-accent')).toBe(getColorCodeValue('ally'));
    expect(card?.className).toContain('rounded-[1.35rem]');
    expect(card?.className).toContain('backdrop-blur-md');

    const ambience = card?.querySelector<HTMLElement>('[data-slot="codex-card-ambience"]');
    expect(ambience).toBeTruthy();
    expect(ambience?.querySelectorAll('.animate-codex-mote').length).toBeGreaterThan(0);
  });

  it('uses the Reader-owned main-character identity instead of empty Workshop store state', () => {
    act(() => root.render(
      <CodexHovercard
        term="Rin"
        type="character"
        entry={{
          id: 'character-rin',
          name: 'Rin',
          description: 'The oath-reader at the center of this generated story.',
          portraitKind: 'non-human',
        }}
        activeStory={{ mcName: 'Rin', assignedRevealBackdrops: {} }}
      >
        Rin
      </CodexHovercard>,
    ));

    const anchor = container.querySelector<HTMLElement>('[data-slot="codex-hovercard-anchor"]');
    const trigger = container.querySelector<HTMLElement>('[role="button"]');
    expect(anchor?.getAttribute('data-color-code')).toBe('mainCharacter');
    expect(trigger?.style.color).toBe(getColorCodeValue('mainCharacter'));
  });

  it('updates the Reader Codex link and hovercard when a character changes ally → enemy → ally', () => {
    const entry = {
      id: 'character-dynamic-aster',
      name: 'Aster',
      description: 'A rain-court witness.',
      relationshipToMC: 'ally',
    };
    const renderHovercard = () => {
      act(() => root.render(
        <CodexHovercard term="Aster" type="character" entry={entry}>
          Aster
        </CodexHovercard>,
      ));
    };

    renderHovercard();
    let anchor = container.querySelector<HTMLElement>('[data-slot="codex-hovercard-anchor"]');
    let trigger = container.querySelector<HTMLElement>('[role="button"]');
    expect(anchor?.getAttribute('data-color-code')).toBe('ally');
    expect(trigger?.style.color).toBe(getColorCodeValue('ally'));

    entry.relationshipToMC = 'enemy';
    renderHovercard();
    anchor = container.querySelector<HTMLElement>('[data-slot="codex-hovercard-anchor"]');
    trigger = container.querySelector<HTMLElement>('[role="button"]');
    expect(anchor?.getAttribute('data-color-code')).toBe('enemy');
    expect(trigger?.style.color).toBe(getColorCodeValue('enemy'));

    openHovercard();
    expect(document.body.querySelector('[data-slot="codex-hovercard"]')?.getAttribute('data-color-code')).toBe('enemy');

    entry.relationshipToMC = 'ally';
    renderHovercard();
    expect(container.querySelector('[data-slot="codex-hovercard-anchor"]')?.getAttribute('data-color-code')).toBe('ally');
  });

  it('docks at the mobile viewport edge with the scroll region inside the glass shell', () => {
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
    const content = card?.querySelector<HTMLElement>('[data-slot="codex-hovercard-content"]');
    const image = card?.querySelector<HTMLImageElement>('img[alt="Aster"]');

    expect(layer?.className).toContain('items-start');
    expect(layer?.className).toContain('justify-end');
    expect(layer?.style.paddingBlock).toBe('min(5.5rem, 15dvh)');
    expect(card?.className).toContain('w-56');
    expect(card?.className).toContain('sm:w-64');
    expect(card?.className).toContain('overflow-hidden');
    expect(content?.className).toContain('overflow-y-auto');
    expect(content?.className).toContain('overscroll-contain');
    expect(content?.style.maxHeight).toBe('min(42dvh, 100%)');
    expect(image?.className).toContain('block');
    expect(image?.className).toContain('h-auto');
    expect(image?.className).toContain('object-contain');
  });

  it('moves keyboard focus into the portal and returns it to the trigger on Escape', () => {
    act(() => root.render(
      <CodexHovercard
        term="Aster"
        type="character"
        entry={{
          id: 'character-aster',
          name: 'Aster',
          description: 'A long-lived witness.',
          role: 'Main Character',
        }}
      >
        Aster
      </CodexHovercard>,
    ));

    const trigger = container.querySelector<HTMLElement>('[role="button"]');
    act(() => trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    const card = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard"]');

    expect(document.activeElement).toBe(card);
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

    expect(document.activeElement).toBe(trigger);
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps desktop cards contextual while clamping them to the visible viewport', () => {
    let scheduledPositionUpdate: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      scheduledPositionUpdate = callback;
      return 1;
    });
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

    // Pin the jsdom viewport so the assertions intentionally exercise the
    // above-trigger fallback branch: 724 + 8 + 300 exceeds the 768 - 16 safe
    // bottom, and the trigger's 1190 left edge pushes the card against the
    // right gutter.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

    const layer = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard-layer"]');
    const card = document.body.querySelector<HTMLElement>('[data-slot="codex-hovercard"]');
    Object.defineProperty(card, 'offsetWidth', { configurable: true, value: 256 });
    Object.defineProperty(card, 'offsetHeight', { configurable: true, value: 300 });
    act(() => window.dispatchEvent(new Event('resize')));
    act(() => scheduledPositionUpdate?.(0));

    expect(layer?.className).not.toContain('items-start');
    expect(layer?.style.visibility).toBe('visible');
    expect(Number.parseFloat(layer?.style.left ?? '')).toBe(window.innerWidth - 16 - 256);
    expect(Number.parseFloat(layer?.style.top ?? '')).toBe(700 - 8 - 300);
  });
});
