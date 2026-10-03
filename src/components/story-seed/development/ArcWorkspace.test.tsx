// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlueprintDraftFromSeed, mirrorSeedIntoBlueprint, reconcileStorySeedBlueprint, createEmptyStorySeedInput, createStorySeedExport, parseStorySeedJson, normalizeStorySeedInput, buildBlueprintGenerationPayload, buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata, type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { workshopStorySeedStorage, resetWorkshopStorySeedStorage } from '../shared/workshopStorySeedStorage';
import { ArcWorkspace } from './workspaces/ArcWorkspace';
import { WorldIdentityWorkspace } from './workspaces/WorldIdentityWorkspace';
import { BlueprintReview } from './BlueprintReview';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let current: StorySeedInput;
let blueprint: WorldBlueprint;
const initial = () => {
  const seed = createEmptyStorySeedInput();
  seed.story.required = { premise: 'A traveler returns.', genre: 'Fantasy', style: 'japanese', storyTags: ['exile'] };
  return seed;
};
const Editor = ({ seed: input, view, initialBlueprint }: { seed: StorySeedInput; view: 'arc' | 'world' | 'blueprint'; initialBlueprint?: WorldBlueprint }) => {
  const [seed, setSeed] = useState(input);
  const [bp, setBlueprint] = useState(() => initialBlueprint ?? createBlueprintDraftFromSeed(input));
  // The host (CreationModal) keeps the Blueprint mirroring the Seed.
  useEffect(() => setBlueprint(previous => mirrorSeedIntoBlueprint(previous, normalizeStorySeedInput(seed))), [seed]);
  current = seed; blueprint = bp;
  if (view === 'blueprint') return <BlueprintReview seed={seed} updateSeed={setSeed} blueprint={bp} setBlueprint={setBlueprint} originalLanguage="ja" onBack={vi.fn()} onStartStory={vi.fn()} onExportSeed={vi.fn()} isGenerating={false} />;
  return view === 'arc' ? <ArcWorkspace seed={seed} updateSeed={setSeed} /> : <WorldIdentityWorkspace seed={seed} updateSeed={setSeed} />;
};
const render = (seed: StorySeedInput, view: 'arc' | 'world' | 'blueprint' = 'arc', initialBlueprint?: WorldBlueprint) => act(() => root.render(<Editor key={initialBlueprint ? `${view}-generated` : view} seed={seed} view={view} initialBlueprint={initialBlueprint} />));
const button = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text);
const roadmap = [
  { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the mountain gate.', chapters: 18 }, { id: 'arc-1-trial', text: 'Pass the trial.', chapters: 12 }] },
  { arcNumber: 2, goals: [{ id: 'arc-2-valley', text: 'Free the valley.', chapters: 30 }] },
];
const fill = (id: string, value: string) => act(() => {
  const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  resetWorkshopStorySeedStorage();
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetWorkshopStorySeedStorage(); });

describe('Story Seed Arc and World ownership', () => {
  it('renders the approved order, three optional pins, and one goal without a full plan editor', () => {
    render(initial());
    const nodes = ['label[for="destined-ending-input"]', 'label[for="story-length-input"]', '#arc-hard-pins-title', 'label[for="active-arc-goal-input"]', '#arc-fun-settings-title'].map(selector => container.querySelector(selector)!);
    nodes.forEach(node => expect(node).not.toBeNull());
    nodes.slice(1).forEach((node, i) => expect(nodes[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
    expect(container.querySelectorAll('input[id^="hard-pin-"]')).toHaveLength(3);
    expect(container.querySelectorAll('#active-arc-goal-input')).toHaveLength(1);
    expect(container.textContent).not.toMatch(/Story Sauce|Story Direction|First Major Conflict|Main Opposition|Make It Work|Edit Arc Plan|Add Goal/);
    fill('hard-pin-3', 'Keep the master alive.');
    expect(current.story.optional.hardPins).toEqual([{ text: 'Keep the master alive.' }]);
    fill('hard-pin-3', '');
    expect(current.story.optional.hardPins).toEqual([]);
  });

  it('preserves edits through World, Blueprint review, persistence, export/import, and story creation', async () => {
    render(initial());
    fill('destined-ending-input', 'Free the valley.');
    ['Protect the master.', 'Restore the temple.', 'Keep the vow.'].forEach((text, i) => fill(`hard-pin-${i + 1}`, text));
    fill('active-arc-goal-input', 'Reach the mountain gate.');
    act(() => container.querySelector<HTMLButtonElement>('#arc-face-slap-high')!.click());
    render(current, 'world');
    fill('make-it-work-instruction-input', 'The mountain walks. Make it believable.');
    fill('main-opposition-input', 'The gate keeper.');
    // A draft without a generated Arc 1 cannot begin a story.
    render(current, 'blueprint');
    expect(button('Manifest Story')?.disabled).toBe(true);
    expect(container.textContent).toContain('Generate the Blueprint to plan Arc 1');
    expect(container.querySelector('#active-arc-goal-input')).toBeNull();
    // A generated Blueprint for a two-arc story plans Arc 1: review and edit it before the story begins.
    render(current, 'blueprint', reconcileStorySeedBlueprint(current, { ...createBlueprintDraftFromSeed(current), arcPlans: [roadmap[0]], estimatedArcs: 2 }).blueprint);
    expect(container.textContent).not.toContain('Arc 2');
    fill('hard-pin-2', 'Rebuild the temple.');
    act(() => button('Edit Arc 1 goals')!.click());
    const openingGoal = container.querySelector<HTMLInputElement>('[data-testid="blueprint-arc-goals"] fieldset input')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(openingGoal, 'Open the mountain gate.');
      openingGoal.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { button('Save goals')!.click(); });
    expect(blueprint.hardPins).toEqual(current.story.optional.hardPins);
    // Arc 1's opening goal writes through to the Seed; its allocation and its other goals stay saved.
    expect(current.story.optional.activeArcGoal).toEqual({ id: 'arc-1-gate', text: 'Open the mountain gate.', chapters: 30 });
    expect(blueprint.arcPlans).toEqual([{ arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Open the mountain gate.', chapters: 18 }, roadmap[0].goals[1]] }]);
    expect(blueprint.funSettings?.faceSlap).toBe('high');
    expect(button('Manifest Story')?.disabled).toBe(false);
    const saved = await workshopStorySeedStorage.create('arc-test', current, blueprint, 'ja');
    const loaded = (await workshopStorySeedStorage.list('arc-test'))[0];
    expect(loaded.seed).toEqual(normalizeStorySeedInput(current));
    const [imported] = parseStorySeedJson(JSON.stringify(createStorySeedExport(loaded.seed, loaded.blueprint, 'ja')));
    const payload = buildInitialStoryGenerationPayload(imported.seed, createStoryAdministrativeMetadata({ storyId: 'story', creatorId: 'arc-test', sourceSeedId: saved.id, originalLanguage: 'ja' }), imported.blueprint!, 1);
    expect(payload.storySeed.story.optional.hardPins).toHaveLength(3);
    expect(payload.blueprint.arcPlans).toEqual(blueprint.arcPlans);
    expect(payload.storySeed.story.optional.makeItWorkInstruction).toContain('mountain walks');
    expect(payload.storySeed.world.optional.worldFoundations.mainOpposition).toBe('The gate keeper.');
  });

  it('rejects a fourth pin and strips obsolete inputs before Blueprint generation', () => {
    const seed = initial();
    seed.story.optional.hardPins = Array.from({ length: 4 }, (_, i) => ({ text: `Promise ${i}` }));
    expect(() => buildBlueprintGenerationPayload(seed)).toThrow('at most 3');
    seed.story.optional.hardPins = [];
    const polluted = structuredClone(seed) as any;
    polluted.story.optional.additionalStoryDirection = 'REMOVED_DIRECTION';
    polluted.story.optional.plotAndTropeSettings = { firstMajorConflict: 'REMOVED_CONFLICT' };
    polluted.story.optional.arcPlan = { goals: [{ text: 'REMOVED_FUTURE_GOAL' }] };
    const payload = buildBlueprintGenerationPayload(polluted);
    expect(JSON.stringify(payload)).not.toMatch(/REMOVED_|additionalStoryDirection|plotAndTropeSettings|arcPlan/);
    expect(payload.storySeed.story.optional).toHaveProperty('funSettings');
  });
  it('saves every Blueprint review edit of a Seed-owned value to the Seed that HARNESS reads', () => {
    const seed = initial();
    Object.assign(seed.world.optional.worldIdentity, { worldType: 'Old world', startingLocation: 'Old gate', societyStructure: 'Old order' });
    seed.world.optional.worldFoundations.mainCharacter = { name: 'Old Name', personality: 'Old temper', startingWeakness: 'Old weakness' };
    seed.world.optional.worldFoundations.additionalCharacters = [{ id: 'char-1', name: 'Elder Qin', role: 'Protector' }];
    seed.world.optional.worldFoundations.factions = [{ id: 'faction-1', name: 'Azure Sect', description: 'Old profile' }];
    render(seed, 'blueprint');
    fill('blueprint-world-overview', 'Reviewed world');
    fill('blueprint-opening-location', 'Reviewed gate');
    fill('blueprint-world-order', 'Reviewed order');
    fill('blueprint-power-outline', 'Reviewed ladder');
    fill('a11y-control-kytc0oh', 'Reviewed power style');
    fill('a11y-control-7b2mqtu', 'Reviewed Name');
    fill('mc-age-input', '19');
    fill('mc-appearance-input', 'Ash-grey eyes');
    fill('mc-personality-input', 'Reviewed temper');
    fill('mc-starting-weakness-input', 'Reviewed weakness');
    fill('blueprint-mc-profile', 'Reviewed background prose');
    fill('char-role-char-1', 'Betrayer');
    fill('faction-description-faction-1', 'Reviewed faction profile');
    // Typing keeps inner spaces: the review edits the Seed's raw value.
    fill('blueprint-opening-location', 'Reviewed gate ');
    expect(container.querySelector<HTMLTextAreaElement>('#blueprint-opening-location')!.value).toBe('Reviewed gate ');
    fill('blueprint-opening-location', 'Reviewed gate');

    const foundations = current.world.optional.worldFoundations;
    expect(current.world.optional.worldIdentity).toMatchObject({ worldType: 'Reviewed world', startingLocation: 'Reviewed gate', societyStructure: 'Reviewed order' });
    expect(foundations.mainCharacter).toMatchObject({ name: 'Reviewed Name', age: '19', appearance: 'Ash-grey eyes', personality: 'Reviewed temper', startingWeakness: 'Reviewed weakness' });
    expect(foundations.powerSystem).toEqual({ flavor: 'Reviewed power style' });
    expect(foundations.additionalCharacters?.[0]).toMatchObject({ name: 'Elder Qin', role: 'Betrayer' });
    expect(foundations.factions?.[0]).toMatchObject({ name: 'Azure Sect', description: 'Reviewed faction profile' });
    // The Blueprint mirrors the Seed and keeps only its own prose.
    expect(blueprint).toMatchObject({
      worldOverview: 'Reviewed world', startingLocation: 'Reviewed gate', societyStructure: 'Reviewed order', powerSystemOutline: 'Reviewed ladder',
      mainCharacter: { name: 'Reviewed Name', age: '19', appearance: 'Ash-grey eyes', personality: 'Reviewed temper', backgroundProfile: 'Reviewed background prose' },
    });
    expect(blueprint.initialCharacters).toEqual(['Elder Qin — role: Betrayer']);
    expect(blueprint.majorFactions).toEqual(['Azure Sect — profile: Reviewed faction profile']);
    // Saving or reloading the pair never brings an old value back.
    const reloaded = reconcileStorySeedBlueprint(current, blueprint);
    expect(reloaded.seed).toEqual(normalizeStorySeedInput(current));
    expect(reloaded.blueprint.mainCharacter?.backgroundProfile).toBe('Reviewed background prose');
  });

  it('keeps a character removed in the Seed removed from the Blueprint and the saved pair', () => {
    const seed = initial();
    seed.world.optional.worldFoundations.additionalCharacters = [{ id: 'char-1', name: 'Elder Qin' }, { id: 'char-2', name: 'Han Li' }];
    render(seed, 'blueprint');
    act(() => [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Remove')!.click());
    expect(current.world.optional.worldFoundations.additionalCharacters?.map(entry => entry.name)).toEqual(['Han Li']);
    expect(blueprint.initialCharacters).toEqual(['Han Li']);
    expect(reconcileStorySeedBlueprint(current, blueprint).seed.world.optional.worldFoundations.additionalCharacters?.map(entry => entry.name))
      .toEqual(['Han Li']);
  });
});

describe('Story Length on the ARC page', () => {
  const lengthText = () => container.querySelector('[data-testid="story-length-summary"]')?.textContent ?? '';

  it('saves a whole number of arcs to the Seed, keeps the last length while the text is not one, and clears to let the Blueprint suggest one', () => {
    render(initial());
    expect(current.story.optional.arcCount).toBeUndefined();
    fill('story-length-input', '11');
    expect(current.story.optional.arcCount).toBe(11);
    expect(lengthText()).toBe('11 arcs · 330 chapters. Arc 11, the final arc, reaches the Destined Ending.');
    for (const notALength of ['0', '101', '2.5']) {
      fill('story-length-input', notALength);
      expect(current.story.optional.arcCount).toBe(11);
      expect(container.textContent).toContain('Choose a whole number of arcs from 1 to 100.');
    }
    fill('story-length-input', '1');
    expect(lengthText()).toBe('1 arc · 30 chapters. Arc 1 is the whole story and reaches the Destined Ending.');
    fill('story-length-input', '');
    expect(current.story.optional).not.toHaveProperty('arcCount');
    expect(lengthText()).toBe('');
  });

  it('is the length the Blueprint is generated for and follows, travels with exports, and is never filled from a Blueprint', () => {
    render(initial());
    fill('story-length-input', '12');
    // The Blueprint request carries the length in the Seed itself.
    expect(buildBlueprintGenerationPayload(current).storySeed.story.optional.arcCount).toBe(12);
    // A Blueprint, generated or older, takes the Seed's length.
    expect(blueprint.estimatedArcs).toBe(12);
    const generated = reconcileStorySeedBlueprint(current, { ...createBlueprintDraftFromSeed(current), arcPlans: [roadmap[0]], estimatedArcs: 5 });
    expect(generated.blueprint.estimatedArcs).toBe(12);
    const [restored] = parseStorySeedJson(JSON.stringify(createStorySeedExport(generated.seed, generated.blueprint)));
    expect(restored.seed.story.optional.arcCount).toBe(12);
    // A blank Story Length stays blank: the Blueprint keeps its own suggestion.
    const blank = reconcileStorySeedBlueprint(initial(), { ...createBlueprintDraftFromSeed(initial()), arcPlans: [roadmap[0]], estimatedArcs: 7 });
    expect(blank.seed.story.optional.arcCount).toBeUndefined();
    expect(blank.blueprint.estimatedArcs).toBe(7);
  });

  it('is edited beside Arc 1\'s goals in the Blueprint review, never twice', () => {
    const seed = { ...initial(), story: { ...initial().story, optional: { ...initial().story.optional, arcCount: 6 } } };
    render(seed, 'blueprint', reconcileStorySeedBlueprint(seed, { ...createBlueprintDraftFromSeed(seed), arcPlans: [roadmap[0]] }).blueprint);
    expect(container.querySelector('#story-length-input')).toBeNull();
    expect(container.querySelector<HTMLInputElement>('#blueprint-arc-count-input')!.value).toBe('6');
  });
});
