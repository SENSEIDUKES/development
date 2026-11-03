// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listStorySeeds, LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, resetStorySeedRepository } from '../../../../workshop/previews/story-seed/storySeedStorage';
import { CreationModal } from '@seihouse/library/story-seed';
import { createMockStorySeedRecord } from '../../../../workshop/previews/story-seed/previewData';
import { workshopStorySeedStorage } from '../../shared/workshopStorySeedStorage';
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

const renderCreator = (initialSeedId?: string, isGenerating = false) => act(() => root.render(
  <LibraryPresentationProvider>
    <CreationModal initialSeedId={initialSeedId} onNavigateHome={vi.fn()} onStartStory={vi.fn()} onGenerateBlueprint={vi.fn()} isGenerating={isGenerating} error={null} />
  </LibraryPresentationProvider>,
));
const part = (id: string) => container.querySelector<HTMLElement>(`[data-seed-part="${id}"]`)!;
const next = () => container.querySelector<HTMLButtonElement>('.seed-creator-footer-next')!;
const back = () => container.querySelector<HTMLButtonElement>('.seed-creator-footer-back')!;

describe('Story Seed on a phone', () => {
  it('walks Origin and Arc part by part, then each page, and never on a wider screen', () => {
    expect(creatorPositions(true).slice(0, 8).map(positionLabel))
      .toEqual(['Style', 'Fun Settings', 'Synopsis', 'Fate', 'Tags', 'World Identity', 'Characters', 'Factions']);
    expect(creatorPositions(false).slice(0, 3).map(positionLabel)).toEqual(['Origin', 'World Identity', 'Characters']);
  });

  it('gives the questions the room and places Back, Next and More in one bar', () => {
    renderCreator();
    expect(container.querySelector('[data-story-seed-page-heading]')).toBeNull();
    expect(container.querySelector('[data-story-seed-action-row]')).toBeNull();
    // The page keeps its name for screen readers.
    expect(Array.from(container.querySelectorAll('h1')).map(heading => heading.textContent)).toEqual(['Story Seed']);
    expect(container.querySelector('.seed-creator-card-slot')).toBeNull();
    const bar = container.querySelector('.library-workspace-navigation')!;
    expect(bar.querySelectorAll('button')).toHaveLength(5);
    expect(bar.contains(next())).toBe(false);
    expect(bar.contains(back())).toBe(false);
    expect(bar.querySelector('.library-workspace-navigation button')).not.toBeNull();
  });

  it('shows one part of Origin at a time, keeping every part mounted', () => {
    renderCreator();
    expect(container.querySelector('nav[aria-label="Origin parts"] [aria-current="page"]')?.textContent).toBe('Style');
    expect(part('style').hidden).toBe(false);
    expect(part('synopsis').hidden).toBe(true);
    // A hidden part keeps its fields.
    expect(container.querySelector('#core-premise-input')).not.toBeNull();
    expect(next().getAttribute('aria-label')).toBe('Next: Fun Settings');
    act(() => next().click());
    expect(part('style').hidden).toBe(true);
    expect(part('fun').hidden).toBe(false);
    act(() => next().click());
    expect(part('synopsis').hidden).toBe(false);
    act(() => next().click());
    act(() => next().click());
    act(() => next().click());
    // From Origin's last part, Next opens World; Back returns to Tags.
    expect(container.querySelector('nav[aria-label="World kinds"] [aria-current="page"]')?.textContent).toBe('World Identity');
    act(() => back().click());
    expect(part('tags').hidden).toBe(false);
  });

  it('confirms defaults with Next, keeps checks while active, and leaves jumped tabs unchecked', () => {
    renderCreator();
    const tab = (id: string) => container.querySelector<HTMLButtonElement>(`[data-part="${id}"]`)!;
    expect(tab('fun').getAttribute('data-filled')).toBe('false');
    act(() => tab('fun').click());
    expect(tab('fun').getAttribute('data-filled')).toBe('false');
    act(() => next().click());
    act(() => tab('fun').click());
    expect(tab('fun').querySelector('[aria-label="complete"]')).not.toBeNull();
    expect(tab('fate').getAttribute('data-filled')).toBe('false');
    act(() => tab('fate').click());
    act(() => container.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Survival"]')!.click());
    act(() => container.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Survival"]')!.click());
    expect(tab('fate').querySelector('[aria-label="complete"]')).not.toBeNull();
  });

  it('saves confirmations through More and restores them when the draft is reopened', async () => {
    renderCreator();
    act(() => next().click());
    act(() => next().click());
    act(() => container.querySelector<HTMLButtonElement>('.library-workspace-navigation button')!.click());
    const save = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="navigation-footer"] button')).find(button => button.textContent?.trim() === 'Save Draft')!;
    expect(save).toBeTruthy();
    await act(async () => { save.click(); });
    const [record] = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(record.editorProgress?.confirmedTabs).toContain('origin.fun');
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => { renderCreator(record.id); });
    expect(container.querySelector('[data-part="fun"] [aria-label="complete"]')).not.toBeNull();
    expect(container.querySelector('[data-part="fate"] [aria-label="complete"]')).toBeNull();
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

  it('keeps Save Draft natively disabled while generating', () => {
    renderCreator(undefined, true);
    act(() => container.querySelector<HTMLButtonElement>('.library-workspace-navigation button')!.click());
    const save = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="navigation-footer"] button')).find(button => button.textContent?.trim() === 'Save Draft')!;
    expect(save.disabled).toBe(true);
  });

  it('never writes the previous seed confirmations when starting another seed straight from the bank', async () => {
    await import('../StorySeedSecondary');
    const first = createMockStorySeedRecord({ id: 'seed-a', title: 'Seed A', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, editorProgress: { confirmedTabs: ['origin.fun'] } });
    const second = createMockStorySeedRecord({ id: 'seed-b', title: 'Seed B', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, editorProgress: { confirmedTabs: ['origin.fate'] } });
    resetStorySeedRepository([first, second]);
    await act(async () => { renderCreator(first.id); });
    act(() => container.querySelector<HTMLButtonElement>('.library-workspace-navigation button')!.click());
    const bank = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="navigation-footer"] button')).find(button => button.textContent?.trim() === 'Story Bank')!;
    await act(async () => { bank.click(); });
    const card = Array.from(container.querySelectorAll('.story-bank-card')).find(card => card.querySelector('h3')?.textContent?.trim() === 'Seed B')!;
    expect(card).toBeTruthy();
    const update = vi.spyOn(workshopStorySeedStorage, 'update');
    const manifest = Array.from(card.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === 'Manifest Novel')!;
    await act(async () => { manifest.click(); });
    expect(update).toHaveBeenCalled();
    expect(update.mock.calls[0][1].id).toBe('seed-b');
    expect(update.mock.calls[0][5]).toEqual({ confirmedTabs: ['origin.fate'] });
  });
});
