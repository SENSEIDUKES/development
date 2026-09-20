// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { createBlueprintDraftFromSeed, createEmptyStorySeedInput, createStorySeedExport, parseStorySeedJson, type StorySeedInput } from '@seihouse/sen/story-seed';
import { workshopStorySeedStorage, resetWorkshopStorySeedStorage } from '../shared/workshopStorySeedStorage';
import { OriginWorkspace } from './workspaces/OriginWorkspace';
import { StorySeedSettings } from './StorySeedSettings';
import { BlueprintCollectionSections } from './blueprint/BlueprintCollectionSections';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let current: StorySeedInput;

const Editor = ({ initial }: { initial: StorySeedInput }) => {
  const [seed, setSeed] = useState(initial);
  current = seed;
  return <LibraryPresentationProvider><OriginWorkspace seed={seed} updateSeed={setSeed} /></LibraryPresentationProvider>;
};
const render = (seed: StorySeedInput) => act(() => root.render(<Editor key={JSON.stringify(seed)} initial={seed} />));
const click = (selector: string) => act(() => container.querySelector<HTMLButtonElement>(selector)!.click());

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  resetWorkshopStorySeedStorage();
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetWorkshopStorySeedStorage(); });

describe('Origin hierarchy and canonical Fate controls', () => {
  it('renders Style, Genre, Title, Synopsis, Pressure, Survival, Tags in one reading and keyboard order', () => {
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
    click('[aria-label="Fate Visibility"] [role="radio"]:nth-child(2)');
    const blueprint = createBlueprintDraftFromSeed(current);
    blueprint.majorMysteries = ['Who sealed the western gate?'];
    blueprint.unresolvedPlotThreads = ['Find the missing key.'];
    const saved = await workshopStorySeedStorage.create('origin-test', current, blueprint, 'en');
    const reloaded = (await workshopStorySeedStorage.list('origin-test'))[0];
    render(reloaded.seed);
    expect(container.querySelector('[role="switch"][aria-label="Survival"]')?.getAttribute('aria-checked')).toBe('true');
    expect(current.story.optional.fateSurvival).toEqual({ enabled: true, visibility: 'partial', pressure: 'heaven' });
    click('[role="switch"][aria-label="Survival"]');
    const updated = await workshopStorySeedStorage.update('origin-test', saved, current, undefined, 'en');
    const [artifact] = parseStorySeedJson(JSON.stringify(createStorySeedExport(updated.seed, updated.blueprint, 'en')));
    const [imported] = await workshopStorySeedStorage.importMany('origin-import', [artifact]);
    expect(imported.blueprint?.majorMysteries).toEqual(blueprint.majorMysteries);
    expect(imported.blueprint?.unresolvedPlotThreads).toEqual(blueprint.unresolvedPlotThreads);
    render(imported.seed);
    expect(current.story.optional.fateSurvival).toEqual({ enabled: false, visibility: 'partial', pressure: 'heaven' });
    click('[role="switch"][aria-label="Survival"]');
    expect(current.story.optional.fateSurvival.enabled).toBe(true);
    expect(current.story.optional.fateSurvival.pressure).toBe('heaven');
  });

  it('labels saved Blueprint mysteries as inactive Fate Survival context while retaining editable entries', () => {
    act(() => root.render(<LibraryPresentationProvider><BlueprintCollectionSections survivalEnabled={false}
      majorMysteries={['The sealed gate']} unresolvedPlotThreads={['The missing key']} setBlueprint={vi.fn()} /></LibraryPresentationProvider>));
    expect(container.textContent).toContain('Survival is off.');
    expect(container.textContent).toContain('excluded from chapter generation');
    expect(container.querySelector<HTMLTextAreaElement>('#blueprint-major-mysteries')?.value).toBe('The sealed gate');
    expect(container.querySelector<HTMLTextAreaElement>('#blueprint-unresolved-threads')?.value).toBe('The missing key');
  });
});
