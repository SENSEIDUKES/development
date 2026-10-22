// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexCharacter, StoryCodexRecord } from '../shared/storyCodex';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A thing's history stays out of the way: one line for how it is now, every change one tap away, the newest first, ten at a time. */

const event = (chapterNumber: number, verb: 'equipped' | 'unequipped') => ({
  verb, target: 'Vanguard Breaker Blade', targetId: 'blade',
  passage: { chapterId: `c${chapterNumber}`, chapterNumber, recordId: `h${chapterNumber}`, blockId: `c${chapterNumber}-p1`, text: 'He took it up.' },
}) as unknown as CodexCharacter['chronicle'][number];
const events = Array.from({ length: 23 }, (_, index) => event(index + 1, index % 2 ? 'unequipped' : 'equipped'));
const codex: StoryCodexRecord = { factions: [], items: [], abilities: [], places: [], species: [], checks: [], characters: [{
  key: 'mc', name: 'Han Shuo', mainCharacter: true, firstSeen: events[0].passage, abilities: [], chronicle: events,
  things: [{ entryId: 'blade', name: 'Vanguard Breaker Blade', count: 1, equipped: true, events }],
} as unknown as CodexCharacter] };

it('shows how a thing is now in one line and keeps its changes behind a tap, the newest first, ten at a time', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StoryCodex codex={codex} storyTitle="Blade" onReadPassage={() => undefined} />));
  await act(async () => (container.querySelector('[data-testid="codex-character"]') as HTMLElement).click());
  const slot = container.querySelector('[data-testid="codex-slot"]')!;
  expect(slot.querySelector('[data-testid="codex-slot-state"]')!.textContent).toBe('In hand since Ch. 23');
  const history = slot.querySelector<HTMLDetailsElement>('[data-testid="codex-history"]')!;
  expect(history.open).toBe(false);
  expect(history.querySelector('summary')!.textContent).toBe('History (23)');
  const chips = () => [...history.querySelectorAll(':scope > div > button')].map(chip => chip.textContent);
  expect(chips()).toHaveLength(10);
  expect(chips()[0]).toBe('Ch. 23 · took up');
  const older = () => [...history.querySelectorAll('button')].find(button => button.textContent?.startsWith('Show'));
  expect(older()!.textContent).toBe('Show 10 older');
  await act(async () => older()!.click());
  await act(async () => older()!.click());
  expect(chips()).toHaveLength(23);
  expect(chips().at(-1)).toBe('Ch. 1 · took up');
  expect(older()).toBeUndefined();
  act(() => root.unmount());
});
