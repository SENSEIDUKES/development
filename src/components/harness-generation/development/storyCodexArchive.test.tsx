// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexItem, StoryCodexRecord } from '../shared/storyCodex';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const passage = { chapterNumber: 1, blockId: 'c1-p1', text: 'Then.' };
const event = (verb: 'gained' | 'lost') => ({ verb, holder: 'Han Shuo', passage: { ...passage, chapterId: 'c1', recordId: `h-${verb}` } }) as unknown as CodexItem['events'][number];
const item = (key: string, extra: Partial<CodexItem>): CodexItem => ({ key, name: key, count: 1, equipped: false, events: [], firstSeen: passage, ...extra });

it('keeps lost and discarded things under Archived, below what is held now', async () => {
  const codex: StoryCodexRecord = { characters: [], factions: [], checks: [], items: [
    item('Iron Tongs', { holder: { key: 'mc', name: 'Han Shuo', mainCharacter: true }, events: [event('gained')] }),
    item('Blood-Vein Cinder', { events: [event('gained'), event('lost')] }),
    item('Heavenly Furnace', {}),
  ] };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StoryCodex codex={codex} storyTitle="Blade" />));
  await act(async () => [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(tab => tab.textContent?.startsWith('Items'))!.click());
  const archive = container.querySelector('[data-testid="codex-archived"]')!;
  expect(archive.querySelector('h3')!.textContent).toBe('Archived (1)');
  expect(archive.textContent).toContain('Blood-Vein Cinder');
  const held = [...container.querySelectorAll('[data-testid="codex-item"]')].filter(card => !archive.contains(card)).map(card => card.textContent);
  expect(held).toEqual([expect.stringContaining('Iron Tongs'), expect.stringContaining('Heavenly Furnace')]);
  await act(async () => archive.querySelector<HTMLButtonElement>('button')!.click());
  expect(container.querySelector('[data-testid="codex-profile"] header')!.textContent).toContain('Archived');
  act(() => root.unmount());
});
