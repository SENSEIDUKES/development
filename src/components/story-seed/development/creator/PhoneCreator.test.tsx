// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorySeedRepository } from '../../../../workshop/previews/story-seed/storySeedStorage';
import { CreationModal } from '@seihouse/library/story-seed';
import { creatorPositions, positionLabel } from './creatorSteps';

vi.mock('../../../../audio/playback', () => {
  const playback = () => ({
    currentSource: null, currentTrackId: null, isMuted: false, isPlaying: false, volume: 1,
    load: vi.fn(), pause: vi.fn(), play: vi.fn(), setVolume: vi.fn(), stop: vi.fn(),
    subscribeToTrackChange: vi.fn(() => () => undefined), subscribeToQueueEnd: vi.fn(() => () => undefined), toggleMute: vi.fn(),
  });
  return { useNarrativeAudio: playback, useOptionalNarrativeAudio: playback };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

/** A 390px phone: every max-width query up to the laptop matches. */
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: /max-width/.test(query), media: query,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
    })),
  });
  resetStorySeedRepository();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

const renderCreator = () => act(() => root.render(
  <LibraryPresentationProvider>
    <CreationModal onNavigateHome={vi.fn()} onStartStory={vi.fn()} onGenerateBlueprint={vi.fn()} isGenerating={false} error={null} />
  </LibraryPresentationProvider>,
));
const part = (id: string) => container.querySelector<HTMLElement>(`[data-seed-part="${id}"]`)!;
const next = () => container.querySelector<HTMLButtonElement>('.seed-creator-footer-next')!;
const back = () => container.querySelector<HTMLButtonElement>('.seed-creator-footer-back')!;

describe('Story Seed on a phone', () => {
  it('walks Origin and Arc part by part, then each page, and never on a wider screen', () => {
    expect(creatorPositions(true).slice(0, 8).map(positionLabel))
      .toEqual(['Style', 'Synopsis', 'Fate', 'Tags', 'Ending', 'Hard Pins', 'Fun Settings', 'World Identity']);
    expect(creatorPositions(false).slice(0, 3).map(positionLabel)).toEqual(['Origin', 'ARC', 'World Identity']);
  });

  it('gives the questions the room: no page heading, Save Draft beside the story card', () => {
    renderCreator();
    expect(container.querySelector('[data-story-seed-page-heading]')).toBeNull();
    expect(container.querySelector('[data-story-seed-action-row]')).toBeNull();
    // The page keeps its name for screen readers.
    expect(Array.from(container.querySelectorAll('h1')).map(heading => heading.textContent)).toEqual(['Story Seed']);
    expect(container.querySelector('.seed-creator-card-slot button[aria-label="Save Draft"]')).not.toBeNull();
  });

  it('shows one part of Origin at a time, keeping every part mounted', () => {
    renderCreator();
    expect(container.querySelector('nav[aria-label="Origin parts"] [aria-current="page"]')?.textContent).toBe('Style');
    expect(part('style').hidden).toBe(false);
    expect(part('synopsis').hidden).toBe(true);
    // A hidden part keeps its fields.
    expect(container.querySelector('#core-premise-input')).not.toBeNull();
    expect(next().getAttribute('aria-label')).toBe('Next: Synopsis');
    act(() => next().click());
    expect(part('style').hidden).toBe(true);
    expect(part('synopsis').hidden).toBe(false);
    act(() => next().click());
    act(() => next().click());
    act(() => next().click());
    // From Origin's last part, Next opens ARC on its first part; Back returns to Tags.
    expect(container.querySelector('nav[aria-label="ARC parts"] [aria-current="page"]')?.textContent).toBe('Ending');
    act(() => back().click());
    expect(part('tags').hidden).toBe(false);
  });

  it('shows the cast as Codex cards that open their fields in a sheet', () => {
    renderCreator();
    act(() => container.querySelector<HTMLButtonElement>('[data-seed-creator-strip] button[data-step="world"]')!.click());
    act(() => container.querySelector<HTMLButtonElement>('.seed-creator-kind[data-kind="characters"]')!.click());
    const cards = container.querySelector('[data-testid="seed-cast-cards"]')!;
    expect(cards.querySelector('button[aria-label="Main character: Unnamed"]')).not.toBeNull();
    act(() => cards.querySelector<HTMLButtonElement>('.bp-card-add')!.click());
    expect(document.querySelector('[data-blueprint-sheet]')).not.toBeNull();
  });
});
