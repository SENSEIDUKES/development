// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { createBlueprintDraftFromSeed, createEmptyStorySeedInput, createStorySeedExport, parseStorySeedJson, type StorySeedInput } from '@seihouse/sen/story-seed';
import { workshopStorySeedStorage, resetWorkshopStorySeedStorage } from '../shared/workshopStorySeedStorage';
import { OriginWorkspace } from './workspaces/OriginWorkspace';
import { FunSettingsPanel } from './workspaces/FunSettingsPanel';
import { StorySeedSettings } from './StorySeedSettings';
import { CastScreen } from './blueprint/CastScreen';
import { WorldCardGrid } from './blueprint/WorldCardGrid';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let current: StorySeedInput;

const Editor = ({ initial, fun }: { initial: StorySeedInput; fun?: boolean }) => {
  const [seed, setSeed] = useState(initial);
  current = seed;
  return <LibraryPresentationProvider>{fun
    ? <FunSettingsPanel seed={seed} updateSeed={setSeed} />
    : <OriginWorkspace seed={seed} updateSeed={setSeed} />}</LibraryPresentationProvider>;
};
const render = (seed: StorySeedInput, fun = false) => act(() => root.render(<Editor key={JSON.stringify(seed)} initial={seed} fun={fun} />));
const click = (selector: string) => act(() => container.querySelector<HTMLButtonElement>(selector)!.click());

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  resetWorkshopStorySeedStorage();
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetWorkshopStorySeedStorage(); });

describe('Origin hierarchy and canonical Fate controls', () => {
  it('keeps Style, Genre, Title, Synopsis, Fate and Tags in order, with Fun Settings on the Arc page instead', () => {
    render(createEmptyStorySeedInput());
    const selectors = ['#origin-style-title', '#origin-genre-title', 'label[for="origin-story-title-input"]', 'label[for="core-premise-input"]', '[role="radiogroup"][aria-label="Pressure"]', '[role="switch"][aria-label="Survival"]', '#origin-tags-title'];
    const nodes = selectors.map(selector => container.querySelector(selector)!);
    nodes.forEach(node => expect(node).not.toBeNull());
    nodes.slice(1).forEach((node, index) => expect(nodes[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
    expect(nodes[2].textContent).toContain('Title');
    expect(nodes[3].textContent).toContain('Synopsis');
    expect(nodes[6].textContent).toBe('Tags');
    expect(container.textContent).not.toMatch(/Story Title|Core Premise|Survival Pressure/);
    expect(container.querySelectorAll('[role="switch"][aria-label="Survival"]')).toHaveLength(1);
    // Fun Settings sit on the ARC page (SENSEI, 2026-11-06).
    expect(container.querySelector('#origin-fun-settings-title')).toBeNull();
    act(() => root.render(<StorySeedSettings seed={current} updateSeed={vi.fn()} />));
    expect(container.querySelector('[aria-label="Survival"], [aria-label="Pressure"]')).toBeNull();
  });

  it('edits, saves, reloads, exports and imports controls without deleting disabled Survival data', async () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { style: 'chinese', genre: 'Xianxia', premise: 'A traveler returns to a fallen sect.', storyTags: [] };
    render(seed);
    click('[aria-label="Pressure"] [role="radio"]');
    expect(current.story.optional.fateSurvival).toMatchObject({ enabled: false, pressure: 'heaven' });
    click('[role="switch"][aria-label="Survival"]');
    // The retired Fate Visibility choice is gone; Survival is only its switch.
    expect(container.querySelector('[aria-label="Fate Visibility"]')).toBeNull();
    expect(container.textContent).toContain('You direct every chapter yourself');
    const blueprint = createBlueprintDraftFromSeed(current);
    // An older Blueprint's Survival mystery proposals are not read back.
    Object.assign(blueprint, { majorMysteries: ['Who sealed the western gate?'], unresolvedPlotThreads: ['Find the missing key.'] });
    const saved = await workshopStorySeedStorage.create('origin-test', current, blueprint, 'en');
    const reloaded = (await workshopStorySeedStorage.list('origin-test'))[0];
    render(reloaded.seed);
    expect(container.querySelector('[role="switch"][aria-label="Survival"]')?.getAttribute('aria-checked')).toBe('true');
    expect(current.story.optional.fateSurvival).toEqual({ enabled: true, pressure: 'heaven' });
    click('[role="switch"][aria-label="Survival"]');
    const updated = await workshopStorySeedStorage.update('origin-test', saved, current, undefined, 'en');
    const [artifact] = parseStorySeedJson(JSON.stringify(createStorySeedExport(updated.seed, updated.blueprint, 'en')));
    const [imported] = await workshopStorySeedStorage.importMany('origin-import', [artifact]);
    expect(imported.blueprint).not.toHaveProperty('majorMysteries');
    expect(imported.blueprint).not.toHaveProperty('unresolvedPlotThreads');
    render(imported.seed);
    expect(current.story.optional.fateSurvival).toEqual({ enabled: false, pressure: 'heaven' });
    click('[role="switch"][aria-label="Survival"]');
    expect(current.story.optional.fateSurvival.enabled).toBe(true);
    expect(current.story.optional.fateSurvival.pressure).toBe('heaven');
  });

  it('edits Fun Settings with stepper and keyboard controls and restores their defaults alone', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.optional.fateSurvival.enabled = true;
    render(seed, true);
    expect(container.textContent).toContain('Classic webnovel rhythm.');
    expect(container.textContent).not.toContain('Rare and meaningful.');
    expect(Array.from(container.querySelectorAll('[id$="-label"]'), node => node.textContent)).toEqual(['Face Slap', 'Plot Armor', 'Recognition', 'Tension', 'Maturity']);
    click('#origin-face-slap-decrease');
    expect(current.story.optional.funSettings.faceSlap).toBe('low');
    expect(container.querySelector('#origin-face-slap-value')?.textContent).toBe('Low');
    const stepper = container.querySelector('[aria-label="Face Slap level"]')!;
    act(() => stepper.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })));
    expect(current.story.optional.funSettings.faceSlap).toBe('high');
    expect(container.querySelector<HTMLButtonElement>('#origin-face-slap-increase')?.disabled).toBe(true);
    const restore = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Restore defaults')!;
    act(() => restore.click());
    expect(current.story.optional.funSettings).toEqual({ faceSlap: 'medium', plotArmor: 'medium', recognition: 'medium', tension: 'medium', maturity: 'medium' });
    expect(current.story.optional.fateSurvival.enabled).toBe(true);
  });

  it('shows side characters and factions without the retired Fate Survival mystery panel', () => {
    act(() => root.render(<LibraryPresentationProvider>
      <CastScreen seed={createEmptyStorySeedInput()} updateSeed={vi.fn()} backgroundProfile="" onBackgroundProfileChange={vi.fn()} />
      <WorldCardGrid seed={createEmptyStorySeedInput()} updateSeed={vi.fn()} />
    </LibraryPresentationProvider>));
    expect(container.textContent).toContain('Character Stats');
    expect(container.textContent).toContain('Factions');
    expect(container.textContent).not.toContain('Fate Survival');
    expect(container.querySelector('#blueprint-major-mysteries')).toBeNull();
    expect(container.querySelector('#blueprint-unresolved-threads')).toBeNull();
  });
});
