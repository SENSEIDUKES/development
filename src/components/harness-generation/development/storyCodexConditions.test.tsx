// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexCharacter, StoryCodexRecord } from '../shared/storyCodex';

/**
 * Conditions in the Codex (SENSEI, 2026-11-11): a character's card lists what
 * they carry now, each condition with how it shows at the stage it has reached.
 */

const empty: StoryCodexRecord = { characters: [], factions: [], abilities: [], places: [], species: [], minor: [], checks: [], items: [] };
const lin: CodexCharacter = {
  key: 'lin', name: 'Lin Qingshan', mainCharacter: true, firstSeen: { chapterNumber: 1, blockId: 'c1-p1', text: 'Lin Qingshan stood above the village gate.' },
  atChapterZero: [], things: [], abilities: [], chronicle: [],
  conditions: [
    { name: 'Frost-burned hand', showing: 'blackened skin' }, { name: 'Blind in one eye' },
    { name: 'shoulder injured', passage: { chapterNumber: 9, blockId: 'c9-p4', text: 'A branch tore his shoulder open.' } },
  ],
};

const open = async (character: CodexCharacter) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StoryCodex codex={{ ...empty, characters: [character] }} storyTitle="Frost" />));
  await act(async () => container.querySelector<HTMLElement>('[data-testid="codex-character"]')!.click());
  return { container, root };
};

it('lists what a character carries, each condition with how it shows now', async () => {
  const view = await open(lin);
  const section = view.container.querySelector('[data-testid="codex-conditions"]')!;
  expect(section.getAttribute('aria-label')).toBe('Lin Qingshan: Conditions');
  expect([...section.querySelectorAll('li')].map(item => item.textContent)).toEqual(['Frost-burned handblackened skin', 'Blind in one eye', 'shoulder injuredSince Ch. 9']);
  // The single status chip is gone: what they carry is this list.
  expect(view.container.querySelector('[data-testid="codex-status"]')).toBeNull();
  act(() => view.root.unmount());
});

it('shows no Conditions section for someone who carries nothing', async () => {
  const { conditions: _none, ...well } = lin;
  const view = await open(well);
  expect(view.container.querySelector('[data-testid="codex-conditions"]')).toBeNull();
  act(() => view.root.unmount());
});
