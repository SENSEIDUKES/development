// @vitest-environment jsdom
import { act, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlueprintDraftFromSeed, normalizeWorldBlueprint, createEmptyStorySeedInput, createStorySeedExport, parseStorySeedJson, normalizeStorySeedInput, buildBlueprintGenerationPayload, buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata, type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
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
const Editor = ({ seed: input, view }: { seed: StorySeedInput; view: 'arc' | 'world' | 'blueprint' }) => {
  const [seed, setSeed] = useState(input);
  const [bp, setBlueprint] = useState(() => createBlueprintDraftFromSeed(input));
  current = seed; blueprint = bp;
  if (view === 'blueprint') return <BlueprintReview seed={seed} updateSeed={setSeed} blueprint={bp} setBlueprint={setBlueprint} originalLanguage="ja" onOriginalLanguageChange={vi.fn()} onBack={vi.fn()} onStartStory={vi.fn()} onExportSeed={vi.fn()} isGenerating={false} />;
  return view === 'arc' ? <ArcWorkspace seed={seed} updateSeed={setSeed} /> : <WorldIdentityWorkspace seed={seed} updateSeed={setSeed} />;
};
const render = (seed: StorySeedInput, view: 'arc' | 'world' | 'blueprint' = 'arc') => act(() => root.render(<Editor key={view} seed={seed} view={view} />));
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
    const nodes = ['label[for="destined-ending-input"]', '#arc-hard-pins-title', 'label[for="active-arc-goal-input"]', '#arc-fun-settings-title'].map(selector => container.querySelector(selector)!);
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
    render(current, 'blueprint');
    fill('hard-pin-2', 'Rebuild the temple.');
    fill('active-arc-goal-input', 'Open the mountain gate.');
    expect(blueprint.hardPins).toEqual(current.story.optional.hardPins);
    expect(blueprint.arcPlan?.goals).toEqual([current.story.optional.activeArcGoal]);
    expect(blueprint.funSettings?.faceSlap).toBe('high');
    const saved = await workshopStorySeedStorage.create('arc-test', current, blueprint, 'ja');
    const loaded = (await workshopStorySeedStorage.list('arc-test'))[0];
    expect(loaded.seed).toEqual(normalizeStorySeedInput(current));
    const [imported] = parseStorySeedJson(JSON.stringify(createStorySeedExport(loaded.seed, loaded.blueprint, 'ja')));
    const payload = buildInitialStoryGenerationPayload(imported.seed, createStoryAdministrativeMetadata({ storyId: 'story', creatorId: 'arc-test', sourceSeedId: saved.id, originalLanguage: 'ja' }), imported.blueprint!, 1);
    expect(payload.storySeed.story.optional.hardPins).toHaveLength(3);
    expect(payload.blueprint.arcPlan?.goals).toEqual([{ id: 'arc-1-initial', text: 'Open the mountain gate.', chapters: 100 }]);
    expect(payload.storySeed.story.optional.makeItWorkInstruction).toContain('mountain walks');
    expect(payload.storySeed.world.optional.worldFoundations.mainOpposition).toBe('The gate keeper.');
    fill('active-arc-goal-input', '');
    const manifest = [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Manifest Story');
    expect(manifest?.disabled).toBe(true);
    expect(() => buildInitialStoryGenerationPayload(current, payload.administrative, blueprint, 1)).toThrow('Review one Active Arc Goal');
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
  it('writes Blueprint review edits of Seed-owned values through to the Seed that HARNESS reads', () => {
    const seed = initial();
    Object.assign(seed.world.optional.worldIdentity, { worldType: 'Old world', startingLocation: 'Old gate', societyStructure: 'Old order' });
    seed.world.optional.worldFoundations.mainCharacter = { name: 'Old Name', personality: 'Old temper' };
    render(seed, 'blueprint');
    fill('blueprint-world-overview', 'Reviewed world');
    fill('blueprint-opening-location', 'Reviewed gate');
    fill('blueprint-world-order', 'Reviewed order');
    fill('blueprint-power-outline', 'Reviewed ladder');
    fill('blueprint-mc-name', 'Reviewed Name');
    fill('blueprint-mc-personality', 'Reviewed temper');
    expect(current.world.optional.worldIdentity).toMatchObject({ worldType: 'Reviewed world', startingLocation: 'Reviewed gate', societyStructure: 'Reviewed order' });
    expect(current.world.optional.worldFoundations.mainCharacter).toMatchObject({ name: 'Reviewed Name', personality: 'Reviewed temper' });
    expect(blueprint).toMatchObject({ worldOverview: 'Reviewed world', startingLocation: 'Reviewed gate', societyStructure: 'Reviewed order', powerSystemOutline: 'Reviewed ladder' });
    // Power System Outline is review prose; authored power details stay in their own Seed fields.
    expect(current.world.optional.worldFoundations.powerSystem).toBeUndefined();
    const reloaded = normalizeWorldBlueprint(blueprint, current);
    expect(reloaded).toMatchObject({ worldOverview: 'Reviewed world', startingLocation: 'Reviewed gate', mainCharacter: { name: 'Reviewed Name', personality: 'Reviewed temper' } });
  });
});
