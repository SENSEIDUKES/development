// @vitest-environment jsdom
import { act, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlueprintDraftFromSeed, createEmptyStorySeedInput, type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { BlueprintReview } from './BlueprintReview';
import { CastScreen } from './blueprint/CastScreen';
import { WorldCardGrid } from './blueprint/WorldCardGrid';
import { NovelBlueprintEditor } from './NovelBlueprintEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let current: StorySeedInput;

const seedWithCast = () => {
  const seed = createEmptyStorySeedInput();
  seed.story.required = { premise: 'A traveler returns.', genre: 'Fantasy', style: 'japanese', storyTags: ['exile'] };
  seed.world.optional.worldFoundations.mainCharacter = { name: 'Ye Chen', startingIdentity: 'Exiled heir' };
  seed.world.optional.worldFoundations.additionalCharacters = [{ id: 'char-1', name: 'Elder Qin', role: 'Protector' }];
  seed.world.optional.worldFoundations.things = [{ id: 'thing-1', name: 'Jade Token', holder: 'Ye Chen' }];
  return seed;
};

const Review = ({ seed: input }: { seed: StorySeedInput }) => {
  const [seed, setSeed] = useState(input);
  const [blueprint, setBlueprint] = useState<WorldBlueprint>(() => createBlueprintDraftFromSeed(input));
  current = seed;
  return <BlueprintReview seed={seed} updateSeed={setSeed} blueprint={blueprint} setBlueprint={setBlueprint} originalLanguage="en"
    onBack={vi.fn()} onStartStory={vi.fn()} onExportSeed={vi.fn()} isGenerating={false} />;
};

const press = (selector: string) => act(() => document.querySelector<HTMLButtonElement>(selector)!.click());
const tab = (name: string) => document.querySelector<HTMLButtonElement>(`[role="tab"]#blueprint-tab-${name}`)!;
const panel = (name: string) => document.querySelector<HTMLElement>(`#blueprint-panel-${name}`)!;
const fill = (id: string, value: string) => act(() => {
  const input = document.querySelector<HTMLInputElement>(`#${id}`)!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const stat = (id: string) => container.querySelector(`[data-testid="blueprint-cast-stats"] [data-stat="${id}"] dd`)?.textContent;

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('World Blueprint as a character screen', () => {
  it('opens on Story and shows one page at a time, keeping every page mounted', () => {
    act(() => root.render(<Review seed={seedWithCast()} />));
    expect(tab('story').getAttribute('aria-selected')).toBe('true');
    expect(panel('story').hidden).toBe(false);
    expect(panel('cast').hidden).toBe(true);
    // A hidden page keeps its fields, so nothing is lost moving between pages.
    expect(container.querySelector('#blueprint-arc-count-input')).not.toBeNull();
    act(() => tab('world').click());
    expect(tab('world').getAttribute('aria-selected')).toBe('true');
    expect(panel('world').hidden).toBe(false);
    expect(panel('story').hidden).toBe(true);
    expect(container.querySelector('[data-blueprint-footer]')?.textContent).toContain('Create Story');
  });

  it('shows the chosen character, and edits made in its sheet save to the Seed', () => {
    act(() => root.render(<Review seed={seedWithCast()} />));
    expect(stat('startingIdentity')).toBe('Exiled heir');
    expect(stat('age')).toBe('Fate Will Decide');
    press('[data-testid="blueprint-cast"] button[aria-label="Elder Qin"]');
    expect(stat('role')).toBe('Protector');
    press('[data-testid="blueprint-cast-edit"]');
    fill('char-role-char-1', 'Betrayer');
    expect(current.world.optional.worldFoundations.additionalCharacters?.[0].role).toBe('Betrayer');
    expect(stat('role')).toBe('Betrayer');
  });

  it('shows world cards as tiles that open their fields', () => {
    act(() => root.render(<Review seed={seedWithCast()} />));
    const tile = container.querySelector<HTMLButtonElement>('[data-testid="blueprint-things"] button[aria-label="Thing: Jade Token"]')!;
    expect(tile.textContent).toContain('Ye Chen');
    act(() => tile.click());
    fill('thing-name-thing-1', 'Cracked Jade Token');
    expect(current.world.optional.worldFoundations.things?.[0].name).toBe('Cracked Jade Token');
  });

  it('gives a faction card its role when it has no kind yet', () => {
    const seed = seedWithCast();
    seed.world.optional.worldFoundations.factions = [{ id: 'faction-1', name: 'Heavenly Sword Sect', role: 'Ruling Power' }];
    act(() => root.render(<Review seed={seed} />));
    expect(container.querySelector('button[aria-label="Faction: Heavenly Sword Sect"]')?.textContent).toContain('Ruling Power');
  });

  it('offers no edits on a view-only Blueprint', () => {
    act(() => root.render(<>
      <CastScreen seed={seedWithCast()} updateSeed={vi.fn()} backgroundProfile="" onBackgroundProfileChange={vi.fn()} readOnly />
      <WorldCardGrid seed={seedWithCast()} updateSeed={vi.fn()} readOnly />
    </>));
    expect(container.querySelector('[data-testid="blueprint-cast-edit"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Add (Character|Faction|Thing)/);
    expect(container.querySelector('button[aria-label^="Add character"]')).toBeNull();
    // Its tiles still open, read-only, so a reader can see every field.
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Thing: Jade Token"]')!.click());
    expect(document.querySelector<HTMLFieldSetElement>('[data-blueprint-sheet]')?.disabled).toBe(true);
  });

  it('keeps the view-only Blueprint\'s portraits and tiles usable, outside its disabled fields', () => {
    const seed = seedWithCast();
    act(() => root.render(<NovelBlueprintEditor snapshot={{ seed, blueprint: createBlueprintDraftFromSeed(seed) }} readOnly />));
    const avatar = container.querySelector<HTMLButtonElement>('[data-testid="blueprint-cast"] button[aria-label="Elder Qin"]')!;
    const tile = container.querySelector<HTMLButtonElement>('button[aria-label="Thing: Jade Token"]')!;
    // A disabled fieldset hides its buttons; navigation must never sit inside one.
    expect(avatar.closest('fieldset:disabled')).toBeNull();
    expect(tile.closest('fieldset:disabled')).toBeNull();
    act(() => avatar.click());
    expect(stat('role')).toBe('Protector');
    // The fields themselves stay view-only.
    expect(container.querySelector<HTMLTextAreaElement>('#blueprint-world-overview')!.closest('fieldset')!.disabled).toBe(true);
  });
});
