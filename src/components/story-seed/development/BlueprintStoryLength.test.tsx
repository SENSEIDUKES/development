// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act, useState } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlueprintDraftFromSeed, reconcileStorySeedBlueprint, type BlueprintGenerationPayload, type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { BlueprintReview, CreationModal } from '@seihouse/library/story-seed';
import { LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, listStorySeeds, resetStorySeedRepository } from '../../../workshop/previews/story-seed/storySeedStorage';
import { createFilledStorySeedInput, createMockArcLookahead, createMockArcOne, createMockBlueprint, createMockStorySeedRecord } from '../../../workshop/previews/story-seed/previewData';
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
  return reconcileStorySeedBlueprint(seed, { ...createBlueprintDraftFromSeed(seed), arcPlans: [createMockArcOne(undefined, arcCount)], arcLookahead: createMockArcLookahead(arcCount), estimatedArcs: arcCount });
};

let latestBlueprint: WorldBlueprint | undefined;
const Review = ({ initial, onRegenerateBlueprint }: {
  initial: { seed: StorySeedInput; blueprint: WorldBlueprint };
  onRegenerateBlueprint?: (arcCount: number) => Promise<void>;
}) => {
  const [seed, setSeed] = useState(initial.seed);
  const [blueprint, setBlueprint] = useState(initial.blueprint);
  latestBlueprint = blueprint;
  return (
    <LibraryPresentationProvider>
      <BlueprintReview seed={seed} updateSeed={setSeed} blueprint={blueprint} setBlueprint={setBlueprint}
        originalLanguage="en" onBack={vi.fn()} onStartStory={vi.fn()} onExportSeed={vi.fn()}
        isGenerating={false} onRegenerateBlueprint={onRegenerateBlueprint} />
    </LibraryPresentationProvider>
  );
};

describe('Blueprint review: Arc 1 and the story length', () => {
  it('shows only Arc 1, never the hidden look-ahead, and says later arcs are planned when they begin', () => {
    act(() => root.render(<Review initial={reviewed(3)} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    const section = container.querySelector('[data-testid="blueprint-arc-goals"]')!;
    expect(section.textContent).toContain('Arc 1 of 3 arcs of 100 chapters');
    expect(section.textContent).toContain('Each later arc is planned when it begins');
    expect(buttonNamed('Edit Arc 1 goals')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Edit Arc 2 goals|Arc 2 ·/);
    for (const entry of createMockArcLookahead(3)) expect(container.textContent).not.toContain(entry.direction);
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
  });

  it('saves a new length without a model call, keeping only look-ahead the length still has', () => {
    const onRegenerateBlueprint = vi.fn(async () => undefined);
    act(() => root.render(<Review initial={reviewed(3)} onRegenerateBlueprint={onRegenerateBlueprint} />));
    expect(arcCountInput().value).toBe('3');
    setArcCount('12');
    expect(help()).toContain('Saving the length changes no goals. Arc 12, the final arc, will arrive at the Destined Ending.');
    act(() => buttonNamed('Save length')!.click());
    expect(latestBlueprint?.estimatedArcs).toBe(12);
    expect(latestBlueprint?.arcPlans).toHaveLength(1);
    setArcCount('2');
    act(() => buttonNamed('Save length')!.click());
    expect(latestBlueprint?.estimatedArcs).toBe(2);
    expect(latestBlueprint?.arcLookahead?.map(entry => entry.arcNumber)).toEqual([2]);
    expect(onRegenerateBlueprint).not.toHaveBeenCalled();
    setArcCount('0');
    expect(help()).toContain('Choose a whole number of arcs from 1 to 100.');
  });

  it('re-plans Arc 1 only by regenerating when the length crosses the one-arc line', () => {
    act(() => root.render(<Review initial={reviewed(1)} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    expect(container.textContent).toContain('Arc 1 · the whole story, reaches the Destined Ending');
    setArcCount('3');
    expect(buttonNamed('Save length')).toBeUndefined();
    expect(help()).toContain('Arc 1 was planned as the whole story');
    expect(buttonNamed('Regenerate with 3 arcs')!.disabled).toBe(false);
  });

  it('asks before replacing the whole Blueprint, holds the review while it regenerates, and reports a failure where it happened', async () => {
    let finish: () => void = () => undefined;
    const onRegenerateBlueprint = vi.fn(() => new Promise<void>((resolve, reject) => { finish = () => reject(new Error('The model is resting.')); void resolve; }));
    act(() => root.render(<Review initial={reviewed(3)} onRegenerateBlueprint={onRegenerateBlueprint} />));
    setArcCount('5');
    act(() => buttonNamed('Regenerate with 5 arcs')!.click());
    expect(container.querySelector('[data-testid="blueprint-regenerate-confirm"]')!.textContent).toContain('a fresh one for 5 arcs');
    await act(async () => { buttonNamed('Replace Blueprint')!.click(); });
    expect(onRegenerateBlueprint).toHaveBeenCalledWith(5);
    expect(buttonNamed('Manifest Story')!.disabled).toBe(true);
    await act(async () => { finish(); });
    await flush();
    expect(container.querySelector('[data-testid="blueprint-arc-action-error"]')!.textContent).toBe('The model is resting.');
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
  });
});

describe('Story Seed creation: regenerating at a chosen length', () => {
  const renderModal = (props: { onGenerateBlueprint?: (payload: BlueprintGenerationPayload) => Promise<WorldBlueprint> }) => act(() => root.render(
    <LibraryPresentationProvider>
      <CreationModal onNavigateHome={vi.fn()} onStartStory={vi.fn()} onGenerateBlueprint={props.onGenerateBlueprint ?? vi.fn()}
        isGenerating={false} error={null} accountDefaultLanguage="en" />
    </LibraryPresentationProvider>,
  ));
  const openBankedBlueprint = async () => {
    await act(async () => { buttonNamed('Story Bank')!.click(); });
    await flush();
    await act(async () => { buttonNamed('Blueprint')!.click(); });
    await flush();
  };

  it('regenerates Arc 1 for a chosen length from the reviewed Seed and saves it', async () => {
    resetStorySeedRepository([createMockStorySeedRecord({ id: 'seed-regenerate', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID })]);
    const onGenerateBlueprint = vi.fn(async (payload: BlueprintGenerationPayload) => ({
      ...createMockBlueprint(), estimatedArcs: payload.arcCount!, arcPlans: [createMockArcOne(payload.storySeed.story.optional.activeArcGoal, payload.arcCount!)], arcLookahead: createMockArcLookahead(payload.arcCount!),
    }));
    renderModal({ onGenerateBlueprint });
    await openBankedBlueprint();

    setArcCount('1');
    act(() => buttonNamed('Regenerate with 1 arc')!.click());
    await act(async () => { buttonNamed('Replace Blueprint')!.click(); });
    await flush();

    expect(onGenerateBlueprint).toHaveBeenCalledTimes(1);
    expect(onGenerateBlueprint.mock.calls[0][0].arcCount).toBe(1);
    expect(arcCountInput().value).toBe('1');
    const [saved] = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(saved.blueprint?.arcPlans).toHaveLength(1);
    expect(saved.blueprint?.estimatedArcs).toBe(1);
    expect(saved.blueprint?.arcLookahead).toBeUndefined();
    expect(container.textContent).toContain('Arc 1 · the whole story, reaches the Destined Ending');
  });
});
