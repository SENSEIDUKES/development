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

describe('Blueprint review world detail', () => {
  it('shows the generated detail under each author fact and saves edits to the Blueprint only', () => {
    act(() => root.render(<Review details={{ worldOverviewDetail: 'Refined qi trades like coin.', societyStructureDetail: 'Elders sell promotions.' }} />));
    expect(area('blueprint-world-overview')!.value).toBe(createFilledStorySeedInput().world.optional.worldIdentity.worldType);
    expect(area('blueprint-world-overview-detail')!.value).toBe('Refined qi trades like coin.');
    expect(area('blueprint-world-order-detail')!.value).toBe('Elders sell promotions.');
    expect(area('blueprint-opening-location-detail')).toBeNull();
    act(() => {
      const input = area('blueprint-world-overview-detail')!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Refined qi trades like coin between sects.');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(latest.worldOverviewDetail).toBe('Refined qi trades like coin between sects.');
    expect(latest.worldOverview).toBe(createFilledStorySeedInput().world.optional.worldIdentity.worldType);
  });

  it('hides a detail while its fact is empty and brings it back with the fact', () => {
    act(() => root.render(<Review details={{ worldOverviewDetail: 'Refined qi trades like coin.' }} />));
    const type = (value: string) => act(() => {
      const input = area('blueprint-world-overview')!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    type('');
    expect(area('blueprint-world-overview-detail')).toBeNull();
    expect(latest.worldOverviewDetail).toBe('Refined qi trades like coin.');
    const origin = createFilledStorySeedInput().story.required;
    expect(createBlueprintMarkdown(latest, origin, latest.mainCharacter!)).not.toContain('World Detail');
    type('A restored world.');
    expect(area('blueprint-world-overview-detail')!.value).toBe('Refined qi trades like coin.');
    expect(createBlueprintMarkdown(latest, origin, latest.mainCharacter!)).toContain('**World Detail:** Refined qi trades like coin.');
  });

  it('shows no detail fields for a Blueprint without them', () => {
    act(() => root.render(<Review details={{}} />));
    expect(container.querySelector('[id$="-detail"]')).toBeNull();
  });
});
