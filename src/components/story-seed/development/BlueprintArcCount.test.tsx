// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act, useState } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ArcPlan } from '@seihouse/sen/arc-goals';
import { createBlueprintDraftFromSeed, reconcileStorySeedBlueprint, type ArcRoadmapExtensionPayload, type BlueprintGenerationPayload, type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { BlueprintReview, CreationModal } from '@seihouse/library/story-seed';
import { LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, listStorySeeds, resetStorySeedRepository } from '../../../workshop/previews/story-seed/storySeedStorage';
import { createFilledStorySeedInput, createMockAddedArcs, createMockArcRoadmap, createMockBlueprint, createMockStorySeedRecord } from '../../../workshop/previews/story-seed/previewData';
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

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
  resetStorySeedRepository();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  resetMockState();
  resetStorySeedRepository();
  vi.restoreAllMocks();
});

const buttonNamed = (name: string) => Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
  .find(button => button.textContent?.trim() === name);
const arcCountInput = () => container.querySelector<HTMLInputElement>('#blueprint-arc-count-input')!;
const setArcCount = (value: string) => act(() => {
  const input = arcCountInput();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const help = () => container.querySelector('[data-testid="blueprint-arc-count-help"]')?.textContent ?? '';
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });

const reviewed = (arcCount: number): { seed: StorySeedInput; blueprint: WorldBlueprint } => {
  const seed = createFilledStorySeedInput();
  return reconcileStorySeedBlueprint(seed, { ...createBlueprintDraftFromSeed(seed), arcPlans: createMockArcRoadmap(arcCount), estimatedArcs: arcCount });
};

const Review = ({ initial, onAddArcs, onRegenerateBlueprint }: {
  initial: { seed: StorySeedInput; blueprint: WorldBlueprint };
  onAddArcs?: (arcCount: number) => Promise<void>;
  onRegenerateBlueprint?: (arcCount: number) => Promise<void>;
}) => {
  const [seed, setSeed] = useState(initial.seed);
  const [blueprint, setBlueprint] = useState(initial.blueprint);
  return (
    <LibraryPresentationProvider>
      <BlueprintReview seed={seed} updateSeed={setSeed} blueprint={blueprint} setBlueprint={setBlueprint}
        originalLanguage="en" onBack={vi.fn()} onStartStory={vi.fn()} onExportSeed={vi.fn()}
        isGenerating={false} onAddArcs={onAddArcs} onRegenerateBlueprint={onRegenerateBlueprint} />
    </LibraryPresentationProvider>
  );
};

describe('Blueprint review arc count', () => {
  it('makes the arc count editable and offers Add arcs only for a longer roadmap', () => {
    const onAddArcs = vi.fn(async () => undefined);
    act(() => root.render(<Review initial={reviewed(3)} onAddArcs={onAddArcs} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    expect(arcCountInput().value).toBe('3');
    expect(arcCountInput().disabled).toBe(false);
    expect(buttonNamed('Regenerate whole Blueprint')).toBeDefined();
    expect(container.textContent).not.toContain('Generate the Blueprint again to plan a different length');

    setArcCount('5');
    expect(help()).toContain('plans only the new arcs. They go in before your final arc');
    act(() => buttonNamed('Add 2 arcs')!.click());
    expect(onAddArcs).toHaveBeenCalledWith(5);

    setArcCount('2');
    expect(buttonNamed('Add -1 arcs')).toBeUndefined();
    expect(buttonNamed('Regenerate with 2 arcs')).toBeDefined();
    expect(help()).toContain('Planning fewer arcs means regenerating the whole Blueprint');

    setArcCount('0');
    expect(help()).toContain('whole number of arcs from 1 to 100');
    expect(buttonNamed('Regenerate whole Blueprint')!.disabled).toBe(true);
  });

  it('holds the review while new arcs are planned and reports a failure where it happened', async () => {
    let finish!: (error?: Error) => void;
    const onAddArcs = vi.fn(() => new Promise<void>((resolve, reject) => { finish = error => (error ? reject(error) : resolve()); }));
    act(() => root.render(<Review initial={reviewed(3)} onAddArcs={onAddArcs} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    setArcCount('4');
    act(() => buttonNamed('Add 1 arc')!.click());
    expect(buttonNamed('Planning new arcs…')).toBeDefined();
    expect(buttonNamed('Manifest Story')!.disabled).toBe(true);
    expect(buttonNamed('Edit Arc 1 goals')).toBeUndefined();
    expect(arcCountInput().disabled).toBe(true);
    await act(async () => { finish(new Error('The model planned 0 of the 1 new arcs. Nothing was added; try again.')); });
    expect(container.querySelector('[role="alert"][data-testid="blueprint-arc-action-error"]')?.textContent)
      .toBe('The model planned 0 of the 1 new arcs. Nothing was added; try again.');
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
    expect(buttonNamed('Edit Arc 1 goals')).toBeDefined();
  });

  it('asks before replacing the whole Blueprint, and regenerates at the chosen count', async () => {
    const onRegenerateBlueprint = vi.fn(async () => undefined);
    act(() => root.render(<Review initial={reviewed(3)} onAddArcs={vi.fn(async () => undefined)} onRegenerateBlueprint={onRegenerateBlueprint} />));
    setArcCount('6');
    act(() => buttonNamed('Regenerate with 6 arcs')!.click());
    expect(container.querySelector('[data-testid="blueprint-regenerate-confirm"]')?.textContent)
      .toContain('Every arc’s goals and your edits to the Blueprint’s own notes are replaced'.replace(/’/g, "'"));
    act(() => buttonNamed('Keep this Blueprint')!.click());
    expect(onRegenerateBlueprint).not.toHaveBeenCalled();
    act(() => buttonNamed('Regenerate with 6 arcs')!.click());
    await act(async () => { buttonNamed('Replace Blueprint')!.click(); });
    expect(onRegenerateBlueprint).toHaveBeenCalledWith(6);
  });

  it('explains why a one-arc roadmap can only be lengthened by regenerating', () => {
    act(() => root.render(<Review initial={reviewed(1)} onAddArcs={vi.fn(async () => undefined)} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    setArcCount('3');
    expect(buttonNamed('Add 2 arcs')!.disabled).toBe(true);
    expect(help()).toContain('plans the whole story as one arc');
    expect(buttonNamed('Regenerate with 3 arcs')!.disabled).toBe(false);
  });
});

describe('Story Seed creation: adding arcs and regenerating', () => {
  const renderModal = (props: {
    onGenerateBlueprint?: (payload: BlueprintGenerationPayload) => Promise<WorldBlueprint>;
    onExtendArcRoadmap?: (payload: ArcRoadmapExtensionPayload) => Promise<ArcPlan[]>;
  }) => act(() => root.render(
    <LibraryPresentationProvider>
      <CreationModal onNavigateHome={vi.fn()} onStartStory={vi.fn()} onGenerateBlueprint={props.onGenerateBlueprint ?? vi.fn()}
        onExtendArcRoadmap={props.onExtendArcRoadmap} isGenerating={false} error={null} accountDefaultLanguage="en" />
    </LibraryPresentationProvider>,
  ));
  const openBankedBlueprint = async () => {
    await act(async () => { buttonNamed('Story Bank')!.click(); });
    await flush();
    await act(async () => { buttonNamed('Blueprint')!.click(); });
    await flush();
  };

  it('plans only the new arcs, inserts them before the final arc, and saves the longer Blueprint', async () => {
    resetStorySeedRepository([createMockStorySeedRecord({ id: 'seed-arcs', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID })]);
    const onExtendArcRoadmap = vi.fn(async (payload: ArcRoadmapExtensionPayload) => createMockAddedArcs(3, payload.arcCount - 3));
    renderModal({ onExtendArcRoadmap });
    await openBankedBlueprint();
    const finalArcBefore = createMockBlueprint().arcPlans![2];

    setArcCount('5');
    await act(async () => { buttonNamed('Add 2 arcs')!.click(); });
    await flush();

    const payload = onExtendArcRoadmap.mock.calls[0][0];
    expect(payload).toMatchObject({ operation: 'extend-arc-roadmap', arcCount: 5 });
    expect(payload.blueprint.arcPlans).toHaveLength(3);
    expect(arcCountInput().value).toBe('5');
    expect(container.textContent).toContain('5 arcs of 100 chapters');
    const [saved] = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(saved.blueprint?.estimatedArcs).toBe(5);
    expect(saved.blueprint?.arcPlans?.map(plan => plan.arcNumber)).toEqual([1, 2, 3, 4, 5]);
    // The saved arcs keep their goals; the old final arc is still last, unchanged.
    expect(saved.blueprint?.arcPlans?.[1]).toEqual(createMockBlueprint().arcPlans![1]);
    expect(saved.blueprint?.arcPlans?.[2].goals[0].text).toBe('Hold the alliance together through the trials of Arc 3');
    expect(saved.blueprint?.arcPlans?.[4]).toEqual({ ...finalArcBefore, arcNumber: 5 });
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
  });

  it('regenerates the whole Blueprint at the chosen arc count from the reviewed Seed', async () => {
    resetStorySeedRepository([createMockStorySeedRecord({ id: 'seed-regenerate', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID })]);
    const onGenerateBlueprint = vi.fn(async (payload: BlueprintGenerationPayload) => ({
      ...createMockBlueprint(), estimatedArcs: payload.arcCount!, arcPlans: createMockArcRoadmap(payload.arcCount!, payload.storySeed.story.optional.activeArcGoal),
    }));
    renderModal({ onGenerateBlueprint, onExtendArcRoadmap: vi.fn() });
    await openBankedBlueprint();

    setArcCount('2');
    act(() => buttonNamed('Regenerate with 2 arcs')!.click());
    await act(async () => { buttonNamed('Replace Blueprint')!.click(); });
    await flush();

    expect(onGenerateBlueprint).toHaveBeenCalledTimes(1);
    expect(onGenerateBlueprint.mock.calls[0][0].arcCount).toBe(2);
    expect(arcCountInput().value).toBe('2');
    const [saved] = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(saved.blueprint?.arcPlans).toHaveLength(2);
    expect(container.textContent).toContain('2 arcs of 100 chapters');
    expect(container.textContent).toContain('Arc 2 · final arc, reaches the Destined Ending');
  });
});
