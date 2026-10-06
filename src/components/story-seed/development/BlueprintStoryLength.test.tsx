// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act, useEffect, useState } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlueprintDraftFromSeed, finalizeGeneratedWorldBlueprint, mirrorSeedIntoBlueprint, normalizeStorySeedInput, reconcileStorySeedBlueprint, type BlueprintGenerationPayload, type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { BlueprintReview, CreationModal } from '@seihouse/library/story-seed';
import { LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, listStorySeeds, resetStorySeedRepository } from '../../../workshop/previews/story-seed/storySeedStorage';
import { createFilledStorySeedInput, createMockArcLookahead, createMockArcOne, createMockBlueprint, createMockSeedSlotAnswer, createMockStorySeedRecord } from '../../../workshop/previews/story-seed/previewData';
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

/** A reviewed pair whose Seed's Story Length was then changed on the ARC page. */
const withStoryLength = ({ seed, blueprint }: { seed: StorySeedInput; blueprint: WorldBlueprint }, arcCount: number) => {
  const changed = { ...seed, story: { ...seed.story, optional: { ...seed.story.optional, arcCount } } };
  return { seed: changed, blueprint: mirrorSeedIntoBlueprint(blueprint, changed) };
};

let latestBlueprint: WorldBlueprint | undefined;
let latestSeed: StorySeedInput | undefined;
const Review = ({ initial, onRegenerateBlueprint }: {
  initial: { seed: StorySeedInput; blueprint: WorldBlueprint };
  onRegenerateBlueprint?: (arcCount: number) => Promise<void>;
}) => {
  const [seed, setSeed] = useState(initial.seed);
  const [blueprint, setBlueprint] = useState(initial.blueprint);
  // Like Story Seed creation: the Blueprint mirrors every Seed edit.
  useEffect(() => setBlueprint(previous => mirrorSeedIntoBlueprint(previous, normalizeStorySeedInput(seed))), [seed]);
  latestBlueprint = blueprint;
  latestSeed = seed;
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
    act(() => root.render(<Review initial={reviewed(12)} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    const section = container.querySelector('[data-testid="blueprint-arc-goals"]')!;
    expect(section.textContent).toContain('Arc 1 of 12 arcs of 30 chapters');
    expect(section.textContent).toContain('Each later arc is planned when it begins');
    expect(buttonNamed('Edit Arc 1 goals')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Edit Arc 2 goals|Arc 2 ·/);
    for (const entry of createMockArcLookahead(12)) expect(container.textContent).not.toContain(entry.direction);
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
  });

  it('saves a new length as it is typed, with no save step and no model call, and drops the look-ahead written for the old length', () => {
    const onRegenerateBlueprint = vi.fn(async () => undefined);
    act(() => root.render(<Review initial={reviewed(12)} onRegenerateBlueprint={onRegenerateBlueprint} />));
    expect(arcCountInput().value).toBe('12');
    expect(latestBlueprint?.arcLookahead?.map(entry => entry.arcNumber)).toEqual([2, 3]);
    expect(buttonNamed('Save length')).toBeUndefined();
    setArcCount('20');
    // The length is the Seed's Story Length; the Blueprint follows it at once.
    expect(latestSeed?.story.optional.arcCount).toBe(20);
    expect(latestBlueprint?.estimatedArcs).toBe(20);
    expect(latestBlueprint?.arcPlans).toHaveLength(1);
    expect(help()).toContain('The length saves as you type and changes no goals. Arc 20, the final arc, will arrive at the Destined Ending.');
    // The hidden look-ahead was written for 12 arcs: the next arcs are planned from where the story is.
    expect(latestBlueprint?.arcLookahead).toBeUndefined();
    setArcCount('10');
    expect(latestBlueprint?.estimatedArcs).toBe(10);
    expect(latestBlueprint?.arcLookahead).toBeUndefined();
    expect(onRegenerateBlueprint).not.toHaveBeenCalled();
    // 10 to 40 arcs (300 to 1,200 chapters); anything else is never saved.
    for (const notALength of ['0', '9', '41', '']) {
      setArcCount(notALength);
      expect(help()).toContain('Choose a whole number of arcs from 10 to 40.');
      expect(latestSeed?.story.optional.arcCount).toBe(10);
    }
  });

  it('keeps the look-ahead when the length is typed back unchanged', () => {
    act(() => root.render(<Review initial={reviewed(12)} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    const before = latestSeed?.story.optional.arcCount;
    setArcCount('1');
    setArcCount('12');
    expect(latestSeed?.story.optional.arcCount).toBe(before);
    expect(latestBlueprint?.estimatedArcs).toBe(12);
    expect(latestBlueprint?.arcLookahead?.map(entry => entry.arcNumber)).toEqual([2, 3]);
  });

  it('re-plans an older one-arc Arc 1 only by regenerating, at a length from 10 to 40', () => {
    act(() => root.render(<Review initial={reviewed(1)} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    expect(container.textContent).toContain('Arc 1 · the whole story, reaches the Destined Ending');
    const before = latestSeed?.story.optional.arcCount;
    setArcCount('12');
    // Across the one-arc line the length is not saved: Arc 1 must be re-planned first.
    expect(latestSeed?.story.optional.arcCount).toBe(before);
    expect(latestBlueprint?.estimatedArcs).toBe(1);
    expect(help()).toContain('Arc 1 was planned as the whole story');
    expect(buttonNamed('Regenerate with 12 arcs')!.disabled).toBe(false);
  });

  it('opens a Blueprint saved with fewer than 10 arcs, names the fix, and saves a length from 10 to 40 without a model call', () => {
    const onRegenerateBlueprint = vi.fn(async () => undefined);
    act(() => root.render(<Review initial={reviewed(3)} onRegenerateBlueprint={onRegenerateBlueprint} />));
    expect(arcCountInput().value).toBe('3');
    expect(container.querySelector('[data-testid="blueprint-arc-problem"]')!.textContent).toBe('Story Length must be a whole number of arcs from 10 to 40.');
    expect(buttonNamed('Manifest Story')!.disabled).toBe(true);
    expect(help()).toContain('Choose a whole number of arcs from 10 to 40.');
    // Arc 1 was planned as the opening, so a longer length needs no new plan.
    setArcCount('10');
    expect(latestSeed?.story.optional.arcCount).toBe(10);
    expect(latestBlueprint?.arcPlans).toHaveLength(1);
    expect(container.querySelector('[data-testid="blueprint-arc-problem"]')).toBeNull();
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
    expect(onRegenerateBlueprint).not.toHaveBeenCalled();
  });

  it('a whole-story Arc 1 asks the same when the length grows past one arc', () => {
    act(() => root.render(<Review initial={withStoryLength(reviewed(1), 11)} onRegenerateBlueprint={vi.fn(async () => undefined)} />));
    expect(container.querySelector('[data-testid="blueprint-arc-problem"]')!.textContent).toContain('Arc 1 was planned as the whole story');
    expect(container.textContent).toContain('Arc 1 · the whole story, reaches the Destined Ending');
    expect(buttonNamed('Regenerate with 11 arcs')).toBeTruthy();
    expect(buttonNamed('Manifest Story')!.disabled).toBe(true);
  });

  it('asks before replacing the whole Blueprint, holds the review while it regenerates, and reports a failure where it happened', async () => {
    let finish: () => void = () => undefined;
    const onRegenerateBlueprint = vi.fn(() => new Promise<void>((resolve, reject) => { finish = () => reject(new Error('The model is resting.')); void resolve; }));
    act(() => root.render(<Review initial={reviewed(12)} onRegenerateBlueprint={onRegenerateBlueprint} />));
    setArcCount('15');
    act(() => buttonNamed('Regenerate whole Blueprint')!.click());
    expect(container.querySelector('[data-testid="blueprint-regenerate-confirm"]')!.textContent).toContain('a fresh one for 15 arcs');
    await act(async () => { buttonNamed('Replace Blueprint')!.click(); });
    expect(onRegenerateBlueprint).toHaveBeenCalledWith(15);
    expect(buttonNamed('Manifest Story')!.disabled).toBe(true);
    await act(async () => { finish(); });
    await flush();
    expect(container.querySelector('[data-testid="blueprint-arc-action-error"]')!.textContent).toBe('The model is resting.');
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
  });
});

describe('Story Seed creation: regenerating at a chosen length', () => {
  const renderModal = (props: { onGenerateBlueprint?: (payload: BlueprintGenerationPayload) => Promise<WorldBlueprint>; onStartStory?: () => Promise<void> }) => act(() => root.render(
    <LibraryPresentationProvider>
      <CreationModal onNavigateHome={vi.fn()} onStartStory={props.onStartStory ?? vi.fn()} onGenerateBlueprint={props.onGenerateBlueprint ?? vi.fn()}
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
    const onGenerateBlueprint = vi.fn(async (payload: BlueprintGenerationPayload) => {
      const arcCount = payload.storySeed.story.optional.arcCount!;
      return finalizeGeneratedWorldBlueprint({
        ...createMockBlueprint(), estimatedArcs: arcCount, arcPlans: [createMockArcOne(payload.storySeed.story.optional.activeArcGoal, arcCount)], arcLookahead: createMockArcLookahead(arcCount),
      }, payload.storySeed);
    });
    renderModal({ onGenerateBlueprint });
    await openBankedBlueprint();

    setArcCount('20');
    act(() => buttonNamed('Regenerate whole Blueprint')!.click());
    await act(async () => { buttonNamed('Replace Blueprint')!.click(); });
    await flush();

    expect(onGenerateBlueprint).toHaveBeenCalledTimes(1);
    // The chosen length travels in the Seed, and becomes its Story Length.
    expect(onGenerateBlueprint.mock.calls[0][0]).not.toHaveProperty('arcCount');
    expect(onGenerateBlueprint.mock.calls[0][0].storySeed.story.optional.arcCount).toBe(20);
    expect(arcCountInput().value).toBe('20');
    const [saved] = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    expect(saved.seed.story.optional.arcCount).toBe(20);
    expect(saved.blueprint?.arcPlans).toHaveLength(1);
    expect(saved.blueprint?.estimatedArcs).toBe(20);
    expect(saved.blueprint?.arcOneScope).toBe('opening');
    expect(saved.blueprint?.arcLookahead?.map(entry => entry.arcNumber)).toEqual([2, 3]);
    expect(container.textContent).toContain('Arc 1 of 20 arcs of 30 chapters');
  });

  it('fills the Seed\'s blank slots from the Blueprint answer, so the review shows them filled and the saved record keeps them', async () => {
    resetStorySeedRepository([createMockStorySeedRecord({ id: 'seed-slots', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID })]);
    const onGenerateBlueprint = vi.fn(async (payload: BlueprintGenerationPayload) => finalizeGeneratedWorldBlueprint({
      ...createMockBlueprint(), ...createMockSeedSlotAnswer(), estimatedArcs: 3, arcPlans: [createMockArcOne(payload.storySeed.story.optional.activeArcGoal)],
    }, payload.storySeed));
    renderModal({ onGenerateBlueprint });
    await openBankedBlueprint();
    act(() => buttonNamed('Regenerate whole Blueprint')!.click());
    await act(async () => { buttonNamed('Replace Blueprint')!.click(); });
    await flush();

    const value = (id: string) => container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)?.value;
    expect(value('mc-main-flaw-input')).toBe('Cannot trust anyone who has not died beside him');
    expect(value('mc-moral-alignment-input')).toBe('Pragmatic protector');
    // The creator's own words stay theirs.
    expect(value('mc-starting-identity-input')).toBe('Crippled young master, secretly the reincarnated Ninth Prince');
    expect(value('char-skin-preview-character-1')).toBe('Weathered bronze');
    const [saved] = await listStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    const foundations = saved.seed.world.optional.worldFoundations;
    expect(foundations.mainCharacter?.mainFlaw).toBe('Cannot trust anyone who has not died beside him');
    // A card the earlier Blueprint added (name and role only) gets its blanks filled too.
    expect(foundations.additionalCharacters?.find(card => card.name === 'Junior Sister Han')).toMatchObject({ role: 'Ally', age: 'Seventeen', eyeColor: 'Amber' });
    expect(foundations.powerSystem?.knownRanks).toContain('Foundation Establishment');
    expect(saved.blueprint).not.toHaveProperty('generatedSeedSlots');
  });

  it('opens the review with the reason instead of starting a banked story whose Story Length is shorter than 10 arcs', async () => {
    const record = createMockStorySeedRecord({ id: 'seed-length-changed', userId: LOCAL_WORKSHOP_STORY_SEED_OWNER_ID });
    // A Seed saved before the range, with a Story Length of 4 arcs.
    const seed = { ...record.seed, story: { ...record.seed.story, optional: { ...record.seed.story.optional, arcCount: 4 } } };
    resetStorySeedRepository([{ ...record, seed }]);
    const onStartStory = vi.fn(async () => undefined);
    renderModal({ onStartStory });
    await act(async () => { buttonNamed('Story Bank')!.click(); });
    await flush();
    await act(async () => { buttonNamed('Manifest Novel')!.click(); });
    await flush();

    expect(onStartStory).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('Story Length must be a whole number of arcs from 10 to 40.');
    expect(arcCountInput().value).toBe('4');
    expect(buttonNamed('Manifest Story')!.disabled).toBe(true);
    // Choosing a length in range lets the story begin, with no model call.
    setArcCount('10');
    expect(buttonNamed('Manifest Story')!.disabled).toBe(false);
  });
});
