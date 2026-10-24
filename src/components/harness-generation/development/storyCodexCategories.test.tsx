// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexCharacter, CodexWorldCard, StoryCodexRecord } from '../shared/storyCodex';

/**
 * A category appears once the record holds one of its kind, and never before
 * (SENSEI, 2026-10-24: an empty category is a promise the story has not made).
 */

const passage = { chapterNumber: 1, blockId: 'c1-p1', text: 'Then.' };
const empty: StoryCodexRecord = { characters: [], factions: [], abilities: [], places: [], species: [], checks: [], items: [] };
const chen: CodexCharacter = { key: 'chen', name: 'Ye Chen', mainCharacter: true, firstSeen: passage, things: [], abilities: [], chronicle: [] };
const edict: CodexWorldCard = { key: 'chapter-0:ability:frostbrush-edict', name: 'Frostbrush Edict', firstSeen: passage, atChapterZero: [] };

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
