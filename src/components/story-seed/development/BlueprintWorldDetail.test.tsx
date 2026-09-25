// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act, useEffect, useState } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlueprintDraftFromSeed, mirrorSeedIntoBlueprint, normalizeStorySeedInput, reconcileStorySeedBlueprint, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { createBlueprintMarkdown } from './blueprint/createBlueprintMarkdown';
import { BlueprintReview } from '@seihouse/library/story-seed';
import { createFilledStorySeedInput } from '../../../workshop/previews/story-seed/previewData';
import { resetMockState } from '../shared/stubs';

vi.mock('../../../audio/playback', () => ({
  useNarrativeAudio: () => ({
    currentSource: null, currentTrackId: null, isMuted: false, isPlaying: false, volume: 1,
    load: vi.fn(), pause: vi.fn(), play: vi.fn(), setVolume: vi.fn(), stop: vi.fn(),
    subscribeToTrackChange: vi.fn(() => () => undefined),
    subscribeToQueueEnd: vi.fn(() => () => undefined),
    toggleMute: vi.fn(),
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let latest: WorldBlueprint;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  resetMockState();
});

const Review = ({ details }: { details: Partial<WorldBlueprint> }) => {
  const initial = reconcileStorySeedBlueprint(createFilledStorySeedInput(), { ...createBlueprintDraftFromSeed(createFilledStorySeedInput()), ...details });
  const [seed, setSeed] = useState(initial.seed);
  const [blueprint, setBlueprint] = useState(initial.blueprint);
  // The host (CreationModal) keeps the Blueprint mirroring the Seed.
  useEffect(() => setBlueprint(previous => mirrorSeedIntoBlueprint(previous, normalizeStorySeedInput(seed))), [seed]);
  latest = blueprint;
  return (
    <LibraryPresentationProvider>
      <BlueprintReview seed={seed} updateSeed={setSeed} blueprint={blueprint} setBlueprint={setBlueprint}
        originalLanguage="en" onOriginalLanguageChange={vi.fn()} onBack={vi.fn()} onStartStory={vi.fn()} onExportSeed={vi.fn()} isGenerating={false} />
    </LibraryPresentationProvider>
  );
};

const area = (id: string) => container.querySelector<HTMLTextAreaElement>(`#${id}`);
const identity = () => createFilledStorySeedInput().world.optional.worldIdentity;
const earlierNote = (id: string) => container.querySelector(`[data-testid="${id}-earlier"]`);
const typeInto = (id: string, value: string) => act(() => {
  const input = area(id)!;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const markdown = () => createBlueprintMarkdown(latest, createFilledStorySeedInput().story.required, latest.mainCharacter!);

describe('Blueprint review world detail', () => {
  it('shows the generated detail under each author fact and saves edits to the Blueprint only', () => {
    act(() => root.render(<Review details={{
      worldOverviewDetail: 'Refined qi trades like coin.', worldOverviewDetailBasis: identity().worldType,
      societyStructureDetail: 'Elders sell promotions.', societyStructureDetailBasis: identity().societyStructure,
    }} />));
    expect(area('blueprint-world-overview')!.value).toBe(identity().worldType);
    expect(area('blueprint-world-overview-detail')!.value).toBe('Refined qi trades like coin.');
    expect(area('blueprint-world-order-detail')!.value).toBe('Elders sell promotions.');
    expect(area('blueprint-opening-location-detail')).toBeNull();
    expect(earlierNote('blueprint-world-overview-detail')).toBeNull();
    typeInto('blueprint-world-overview-detail', 'Refined qi trades like coin between sects.');
    expect(latest.worldOverviewDetail).toBe('Refined qi trades like coin between sects.');
    expect(latest.worldOverview).toBe(identity().worldType);
  });

  it('hides a detail while its fact is empty and brings it back with the same fact', () => {
    act(() => root.render(<Review details={{ worldOverviewDetail: 'Refined qi trades like coin.', worldOverviewDetailBasis: identity().worldType }} />));
    typeInto('blueprint-world-overview', '');
    expect(area('blueprint-world-overview-detail')).toBeNull();
    expect(latest.worldOverviewDetail).toBe('Refined qi trades like coin.');
    expect(markdown()).not.toContain('World Detail');
    typeInto('blueprint-world-overview', identity().worldType!);
    expect(area('blueprint-world-overview-detail')!.value).toBe('Refined qi trades like coin.');
    expect(earlierNote('blueprint-world-overview-detail')).toBeNull();
    expect(markdown()).toContain('**World Detail:** Refined qi trades like coin.');
  });

  it('marks a detail written for an earlier version of its fact until the author keeps or edits it', () => {
    act(() => root.render(<Review details={{ worldOverviewDetail: 'Refined qi trades like coin.', worldOverviewDetailBasis: identity().worldType }} />));
    typeInto('blueprint-world-overview', 'A neon megacity where corporations own every soul.');
    expect(area('blueprint-world-overview-detail')!.value).toBe('Refined qi trades like coin.');
    expect(earlierNote('blueprint-world-overview-detail')).not.toBeNull();
    expect(markdown()).not.toContain('World Detail');
    // Keeping it as it is reviews it against the new line.
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Keep World Detail as is"]')!.click());
    expect(earlierNote('blueprint-world-overview-detail')).toBeNull();
    expect(latest.worldOverviewDetailBasis).toBe('A neon megacity where corporations own every soul.');
    expect(markdown()).toContain('**World Detail:** Refined qi trades like coin.');
    // So does editing it.
    typeInto('blueprint-world-overview', 'A drowned archipelago of rival sword clans.');
    expect(earlierNote('blueprint-world-overview-detail')).not.toBeNull();
    typeInto('blueprint-world-overview-detail', 'Clan fleets duel for the last dry islands.');
    expect(earlierNote('blueprint-world-overview-detail')).toBeNull();
    expect(markdown()).toContain('**World Detail:** Clan fleets duel for the last dry islands.');
    // An emptied detail has nothing to mark, whatever the line says.
    typeInto('blueprint-world-overview-detail', '');
    typeInto('blueprint-world-overview', 'A floating tea-house city.');
    expect(area('blueprint-world-overview-detail')!.value).toBe('');
    expect(earlierNote('blueprint-world-overview-detail')).toBeNull();
  });

  it('shows no detail fields for a Blueprint without them', () => {
    act(() => root.render(<Review details={{}} />));
    expect(container.querySelector('[id$="-detail"]')).toBeNull();
  });
});
