// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexCharacter, CodexItem, StoryCodexRecord } from '../shared/storyCodex';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Status on Codex cards: how each is now, on the card and in its profile, with every change linked to its passage. */

const passage = (chapterNumber: number, text = 'Then.') => ({ chapterNumber, blockId: `c${chapterNumber}-p1`, text });
const person = (key: string, extra: Partial<CodexCharacter>): CodexCharacter => ({ key, name: key, mainCharacter: false, firstSeen: passage(1), things: [], abilities: [], chronicle: [], ...extra });
const codex: StoryCodexRecord = {
  factions: [], checks: [],
  characters: [
    person('Ye Chen', { mainCharacter: true, status: { conditions: [], history: [{ state: 'wounded', detail: 'a cut arm', passage: passage(1) }, { state: 'recovered', passage: passage(2) }] } }),
    person('Zhao Wuchen', { status: { conditions: [{ state: 'dead', detail: 'by a spear', passage: passage(3, 'Zhao fell.') }], history: [{ state: 'dead', detail: 'by a spear', passage: passage(3, 'Zhao fell.') }] } }),
  ],
  items: [
    { key: 'Jade Seal', name: 'Jade Seal', count: 1, equipped: false, events: [], firstSeen: passage(2), holder: { key: 'Ye Chen', name: 'Ye Chen', mainCharacter: true },
      status: { conditions: [{ state: 'destroyed', passage: passage(4) }], history: [{ state: 'destroyed', passage: passage(4) }] } } satisfies CodexItem,
  ],
};

const render = async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StoryCodex codex={codex} storyTitle="Blade" onReadPassage={() => undefined} />));
  const click = (element: Element | null | undefined) => act(async () => (element as HTMLElement).click());
  return { container, root, click };
};

it('marks the dead on their card and opens to their Status, each change linked to its passage', async () => {
  const { container, root, click } = await render();
  const cards = [...container.querySelectorAll('[data-testid="codex-character"]')];
  expect(cards[1].textContent).toContain('Dead');
  expect(cards[1].textContent).toContain('Died in Chapter 3');
  await click(cards[1]);
  const profile = container.querySelector('[data-testid="codex-profile"]')!;
  expect(profile.querySelector('header')!.textContent).toContain('Dead');
  const status = profile.querySelector('[data-testid="codex-status"]')!;
  expect(status.textContent).toContain('Dead · by a spear');
  expect([...status.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Since Ch. 3', 'Ch. 3 · died']);
  act(() => root.unmount());
});

it('shows someone well again, and keeps a destroyed thing under Archived', async () => {
  const { container, root, click } = await render();
  await click(container.querySelector('[data-testid="codex-character"]'));
  const status = container.querySelector('[data-testid="codex-status"]')!;
  expect(status.textContent).toContain('Well and whole again.');
  expect([...status.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Ch. 1 · wounded', 'Ch. 2 · recovered']);
  await click([...container.querySelectorAll('button')].find(button => button.textContent?.includes('All characters')));
  await click([...container.querySelectorAll('[role="tab"]')].find(tab => tab.textContent?.startsWith('Items')));
  const archive = container.querySelector('[data-testid="codex-archived"]')!;
  expect(archive.textContent).toContain('Jade Seal');
  expect(archive.textContent).toContain('Destroyed');
  act(() => root.unmount());
});
