// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexCharacter, CodexPlace, CodexWorldCard, StoryCodexRecord } from '../shared/storyCodex';

/**
 * A category appears once the record holds one of its kind, and never before
 * (SENSEI, 2026-10-24: an empty category is a promise the story has not made).
 */

const passage = { chapterNumber: 1, blockId: 'c1-p1', text: 'Then.' };
const empty: StoryCodexRecord = { characters: [], factions: [], abilities: [], places: [], species: [], checks: [], items: [] };
const chen: CodexCharacter = { key: 'chen', name: 'Ye Chen', mainCharacter: true, firstSeen: passage, things: [], abilities: [], chronicle: [] };
const edict: CodexWorldCard = { key: 'world:ability:frostbrush-edict', name: 'Frostbrush Edict', firstSeen: passage, atChapterZero: [] };

const render = async (codex: StoryCodexRecord) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StoryCodex codex={codex} storyTitle="Blade" />));
  const tabs = () => [...container.querySelectorAll('[role="tab"]')].map(tab => tab.textContent?.replace(/\d+$/, '') ?? '');
  return { container, root, tabs };
};

it('offers only the categories the record holds', async () => {
  const view = await render({ ...empty, characters: [chen] });
  expect(view.tabs()).toEqual(['Characters']);
  act(() => view.root.unmount());

  const withAbility = await render({ ...empty, characters: [chen], abilities: [edict] });
  expect(withAbility.tabs()).toEqual(['Characters', 'Abilities']);
  act(() => withAbility.root.unmount());
});

it('says the Codex is still filling when the record holds nothing at all', async () => {
  const view = await render(empty);
  expect(view.container.querySelector('[role="tablist"]')).toBeNull();
  expect(view.container.querySelector('[data-testid="codex-empty"]')!.textContent)
    .toBe('The Codex fills as the story reaches each person, thing and place.');
  act(() => view.root.unmount());
});

it('falls back to a category that still holds something when the open one empties', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StoryCodex codex={{ ...empty, characters: [chen], abilities: [edict] }} storyTitle="Blade" />));
  const abilities = [...container.querySelectorAll<HTMLElement>('[role="tab"]')].find(tab => tab.textContent?.startsWith('Abilities'))!;
  await act(async () => abilities.click());
  expect(container.querySelector('[aria-selected="true"]')!.textContent).toContain('Abilities');
  // The world closes to its reader: the Abilities category goes, and the Codex does not show an empty panel.
  await act(async () => root.render(<StoryCodex codex={{ ...empty, characters: [chen] }} storyTitle="Blade" />));
  expect(container.querySelector('[aria-selected="true"]')!.textContent).toContain('Characters');
  expect(container.querySelector('[data-testid="codex-character"]')).not.toBeNull();
  act(() => root.unmount());
});

it('shows where a character is now, and a place with its look and who is there (Place, 2026-11-04)', async () => {
  const there = { chapterNumber: 2, blockId: 'c2-p1', text: 'He went down into the Lower Stacks.' };
  const stacks: CodexPlace = {
    key: 'e-stacks', name: 'Lower Stacks', firstSeen: there, atChapterZero: [],
    appearance: { first: there, changes: [], look: { summary: 'Dust-choked shelves under a low stone vault.', traits: { light: 'one oil lamp' }, passage: there } },
    here: [{ key: 'chen', name: 'Ye Chen', mainCharacter: true }],
  };
  const view = await render({ ...empty, characters: [{ ...chen, place: { text: 'Lower Stacks', passage: there } }], places: [stacks] });
  const click = (element: Element | null | undefined) => act(() => { (element as HTMLElement).click(); });
  click(view.container.querySelector('[data-testid="codex-character"] button, [data-testid="codex-character"]'));
  expect(view.container.querySelector('[data-testid="codex-place"]')?.textContent).toContain('At Lower Stacks · Ch. 2');
  click([...view.container.querySelectorAll('[role="tab"]')].find(tab => tab.textContent?.startsWith('Places')));
  click(view.container.querySelector('[data-testid="codex-places"] button, [data-testid="codex-places"]'));
  expect(view.container.textContent).toContain('Dust-choked shelves under a low stone vault.');
  expect(view.container.querySelector('[data-testid="codex-here"]')?.textContent).toContain('Ye Chen');
  act(() => view.root.unmount());
});
