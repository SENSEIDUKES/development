// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexCharacter, CodexMinor, StoryCodexRecord } from '../shared/storyCodex';

/**
 * Minor figures in the Codex (SENSEI, 2026-11-11): listed lightly under Minor,
 * promoted to a card by the reader, who then fills the card in. A main card's
 * look says it is its card's own.
 */

const passage = { chapterNumber: 1, blockId: 'c1-p2', text: 'A gate guard in a dented helm barred the stair.' };
const empty: StoryCodexRecord = { characters: [], factions: [], abilities: [], places: [], species: [], minor: [], checks: [], items: [] };
const lin: CodexCharacter = {
  key: 'lin', name: 'Lin Qingshan', mainCharacter: true, firstSeen: { chapterNumber: 1, blockId: 'c1-p1', text: 'Lin Qingshan stood above the village gate.' },
  atChapterZero: [], things: [], abilities: [], chronicle: [],
  appearance: {
    first: { chapterNumber: 1, blockId: 'c1-p1', text: 'Lin Qingshan stood above the village gate.' }, changes: [],
    look: { summary: 'A lean young man in patched brown hunting clothes.', traits: { skin: 'Tanned' }, passage: { chapterNumber: 1, blockId: 'c1-p1', text: 'Lin Qingshan stood above the village gate.' }, fromCard: true },
  },
};
const guard: CodexMinor = { key: 'guard', name: 'gate guard', kind: 'character', introduced: passage, chapters: [1, 3], promotable: true };
const promotedGuard: CodexCharacter = {
  key: 'guard', name: 'gate guard', mainCharacter: false, firstSeen: passage, atChapterZero: [], things: [], abilities: [], chronicle: [],
  promoted: { key: 'world:character:gate-guard', kind: 'character', enteredInChapter: 3, slots: {} },
};

const mount = async (element: React.ReactElement) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  const tab = (label: string) => [...container.querySelectorAll<HTMLElement>('[role="tab"]')].find(entry => entry.textContent?.startsWith(label));
  return { container, root, tab };
};

it('lists a minor figure under Minor, with its chapters and the sentence that introduced it, and no card', async () => {
  const view = await mount(<StoryCodex codex={{ ...empty, characters: [lin], minor: [guard] }} storyTitle="Frost" />);
  expect(view.container.querySelectorAll('[data-testid="codex-character"]')).toHaveLength(1);
  await act(async () => view.tab('Minor')!.click());
  const row = view.container.querySelector('[data-testid="codex-minor"]')!;
  expect(row.textContent).toContain('gate guard');
  expect(row.textContent).toContain('Person · Ch. 1, 3');
  expect(row.textContent).toContain('A gate guard in a dented helm barred the stair.');
  // Without a way to promote, the list offers none.
  expect(row.querySelector('button[aria-label^="Promote"]')).toBeNull();
  act(() => view.root.unmount());
});

it('promotes a minor figure and opens its new card to be filled in', async () => {
  const onPromote = vi.fn(async () => undefined);
  const onFillCard = vi.fn(async () => undefined);
  const view = await mount(<StoryCodex codex={{ ...empty, characters: [lin], minor: [guard] }} storyTitle="Frost" onPromote={onPromote} onFillCard={onFillCard} />);
  await act(async () => view.tab('Minor')!.click());
  await act(async () => view.container.querySelector<HTMLElement>('button[aria-label="Promote gate guard to a card"]')!.click());
  expect(onPromote).toHaveBeenCalledWith('guard');
  // The host's record now holds them as a character with a card.
  await act(async () => view.root.render(<StoryCodex codex={{ ...empty, characters: [lin, promotedGuard] }} storyTitle="Frost" onPromote={onPromote} onFillCard={onFillCard} />));
  expect(view.container.querySelector('#codex-profile-name')!.textContent).toBe('gate guard');
  expect(view.container.querySelector('[data-testid="codex-promoted-card"]')!.textContent).toContain('It is blank until you fill it in.');

  await act(async () => view.container.querySelector<HTMLElement>('[data-testid="codex-fill-card"]')!.click());
  const form = view.container.querySelector('[data-testid="codex-card-form"]')!;
  const look = form.querySelector<HTMLInputElement>('input[data-slot="appearance"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(look, 'A stooped man in a dented helm.');
    look.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => form.querySelector<HTMLElement>('button[type="submit"]')!.click());
  expect(onFillCard).toHaveBeenCalledTimes(1);
  const [cardKey, slots] = onFillCard.mock.calls[0] as unknown as [string, Record<string, string>];
  expect(cardKey).toBe('world:character:gate-guard');
  expect(slots.appearance).toBe('A stooped man in a dented helm.');
  expect(slots.role).toBe('');
  act(() => view.root.unmount());
});

it('opens the card under the key the host names, for someone who had no entry until they were promoted', async () => {
  // Someone only speaker tags named is listed by the name they speak under; promotion makes their entry, and the card is listed by it.
  const ferryman: CodexMinor = { key: 'character:old ferryman', name: 'Old Ferryman', kind: 'character', introduced: passage, chapters: [1], promotable: true };
  const promotedFerryman: CodexCharacter = { ...promotedGuard, key: 'hcx_ferryman', name: 'Old Ferryman', promoted: { key: 'world:character:old-ferryman', kind: 'character', enteredInChapter: 1, slots: {} } };
  const onPromote = vi.fn(async () => 'hcx_ferryman');
  const view = await mount(<StoryCodex codex={{ ...empty, characters: [lin], minor: [ferryman] }} storyTitle="Frost" onPromote={onPromote} />);
  await act(async () => view.tab('Minor')!.click());
  await act(async () => view.container.querySelector<HTMLElement>('button[aria-label="Promote Old Ferryman to a card"]')!.click());
  expect(onPromote).toHaveBeenCalledWith('character:old ferryman');
  await act(async () => view.root.render(<StoryCodex codex={{ ...empty, characters: [lin, promotedFerryman] }} storyTitle="Frost" onPromote={onPromote} />));
  expect(view.container.querySelector('#codex-profile-name')!.textContent).toBe('Old Ferryman');
  expect(view.container.querySelector('[data-testid="codex-promoted-card"]')).not.toBeNull();
  act(() => view.root.unmount());
});

it('says a main card\'s look is its card\'s own, with no passage to read', async () => {
  const view = await mount(<StoryCodex codex={{ ...empty, characters: [lin] }} storyTitle="Frost" />);
  await act(async () => view.container.querySelector<HTMLElement>('[data-testid="codex-character"]')!.click());
  const look = view.container.querySelector('[data-testid="codex-look"]')!;
  expect(look.textContent).toContain('A lean young man in patched brown hunting clothes.');
  expect(look.querySelector('[data-testid="codex-look-from-card"]')!.textContent).toBe('From its card');
  act(() => view.root.unmount());
});
