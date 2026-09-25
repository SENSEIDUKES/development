// @vitest-environment jsdom
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import type { ReaderStateRepository, ReaderStoryState } from '@seihouse/sen/reader-runtime';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CHAPTERS = [
  { title: 'Low Tide', paragraphs: ['The tide pulled back from the drowned gate.', 'Mara counted the bells that no longer rang.', 'Salt dried white on the courier seal.'] },
  { title: 'The Bell Keeper', paragraphs: ['A keeper waited on the causeway with a lantern.', 'He asked for the name the city had erased.', 'Mara gave him the only one she still owned.'] },
];

const scriptedProvider = (): HarnessGenerationModelAdapter => {
  const replies = [...CHAPTERS];
  const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-09-24T12:00:00.000Z', durationMs: 1, usage: { source: 'unavailable' as const } };
  return {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate: async () => ({ rawProviderResponse: JSON.stringify(replies.shift()), providerReceipt: receipt }),
    recoverMemory: async () => ({ rawProviderResponse: JSON.stringify({ events: [] }), providerReceipt: receipt }),
    arcOperation: async () => ({ rawProviderResponse: JSON.stringify({
      plan: { arcNumber: 1, goals: [{ id: 'arc-1-goal', text: 'Carry the story through its opening arc.', chapters: 100 }] },
      destinedEnding: 'Mara reclaims her name.',
    }), providerReceipt: receipt }),
  };
};

class MemoryReaderStateRepository implements ReaderStateRepository {
  records = new Map<string, ReaderStoryState>();
  saves = 0;
  async load(storyId: string) { return this.records.has(storyId) ? structuredClone(this.records.get(storyId)) : undefined; }
  async save(state: ReaderStoryState) { this.saves += 1; this.records.set(state.storyId, structuredClone(state)); }
}

let container: HTMLDivElement;
let root: Root;

const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
/** Lets chapter entrance/exit animations finish (they run on real frame time). */
const settle = async () => {
  for (let index = 0; index < 30 && container.querySelector('[data-reader-anchor^="1:"]'); index++) await flush(100);
};
const buttonBy = (predicate: (button: HTMLButtonElement) => boolean) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(predicate);
const click = async (predicate: (button: HTMLButtonElement) => boolean, label: string) => {
  const target = buttonBy(predicate);
  expect(target, `Expected ${label}`).toBeTruthy();
  await act(async () => { target!.click(); });
  await flush();
};

async function mount(harness: InMemoryHarnessGenerationRepository, readerState: MemoryReaderStateRepository) {
  const controller = new HarnessGenerationController({ repository: harness, modelAdapter: scriptedProvider() });
  await controller.hydrate();
  const state = controller.snapshot();
  await act(async () => {
    root.render(renderWithDevAudio(<HarnessReaderSession state={state} storyId={state.stories[0].id} controller={controller}
      readerStateRepository={readerState} onClose={() => undefined} />));
  });
  await flush();
  return controller;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('HarnessReaderSession on a saved HARNESS story', { timeout: 20_000 }, () => {
  it('keeps place, bookmarks and read marks across a reload without touching HARNESS canon', async () => {
    const harness = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository: harness, modelAdapter: scriptedProvider() });
    await setup.hydrate();
    const story = await setup.createStory({ premise: 'A courier returns to the drowned city that erased her name.' });
    await setup.generateNextChapter(story.id, 'test-model');
    await setup.generateNextChapter(story.id, 'test-model');
    // A bookmark saved through the older journal path must survive the move to Reader state.
    await setup.updateReaderStory(story.id, 2, { bookmarks: [{ id: 'legacy', chapterNumber: 2, paragraphIndex: 1, paragraphExcerpt: 'He asked…', createdAt: '2026-09-01T00:00:00.000Z' }] });
    const canonBefore = harness.snapshot();
    const readerState = new MemoryReaderStateRepository();

    await mount(harness, readerState);
    expect(container.textContent).toContain('The tide pulled back from the drowned gate.');

    await click(button => button.getAttribute('aria-label') === 'Next Chapter', 'Next Chapter');
    await settle();
    expect(container.textContent).toContain('A keeper waited on the causeway with a lantern.');
    await flush(2100);
    expect(readerState.records.get(story.id)?.lastReadChapter).toBe(2);

    // The older journal bookmark is found again by its excerpt, on its own passage.
    expect(buttonBy(button => button.title === 'Edit this Mind Palace passage')).toBeTruthy();
    await click(button => button.title === 'Keep this passage in your Mind Palace', 'Mind Palace control');
    await click(button => button.getAttribute('aria-label') === 'Save to Mind Palace', 'Save to Mind Palace');
    const saved = readerState.records.get(story.id)!;
    expect(saved.bookmarks.map(bookmark => bookmark.id)).toContain('legacy');
    expect(saved.bookmarks).toHaveLength(2);
    // A new passage is anchored to its block and its exact text.
    const kept = saved.bookmarks.find(bookmark => bookmark.id !== 'legacy')!;
    const chapter = canonBefore.chapters.find(entry => entry.chapterNumber === 2)!;
    expect(kept).toMatchObject({ chapterNumber: 2, paragraphIndex: 0, blockId: chapter.blocks![0].id, passage: 'A keeper waited on the causeway with a lantern.' });

    await click(button => button.getAttribute('aria-label') === 'Reader Settings', 'Reader Settings');
    await click(button => button.textContent?.trim() === 'Mark as Read', 'Mark as Read');
    expect(readerState.records.get(story.id)?.readChapters).toEqual([2]);
    await click(button => button.textContent?.trim() === 'sepia', 'sepia theme');
    expect(readerState.records.get(story.id)?.readerPreferences?.themeOverride).toBe('sepia');

    // Reader state never enters the HARNESS workspace.
    expect(harness.snapshot()).toEqual(canonBefore);

    // Reload: a fresh controller and session open the last-read chapter with its bookmarks.
    act(() => root.unmount());
    root = createRoot(container);
    await mount(harness, readerState);
    expect(container.textContent).toContain('A keeper waited on the causeway with a lantern.');
    expect(container.querySelectorAll('.custom-bookmark-bg')).toHaveLength(2);
    expect(container.querySelector('#reader-chamber-root')?.className).toContain('#1a1614');
  });

  it('keeps Codex edits on the HARNESS correction journal', async () => {
    const harness = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository: harness, modelAdapter: scriptedProvider() });
    await setup.hydrate();
    const story = await setup.createStory({ premise: 'A courier returns to the drowned city that erased her name.' });
    await setup.generateNextChapter(story.id, 'test-model');
    const readerState = new MemoryReaderStateRepository();
    const controller = await mount(harness, readerState);
    await act(async () => {
      await controller.updateReaderStory(story.id, 1, { memory: { characters: [{ id: 'c1', name: 'Mara', role: 'Courier', relationshipToMC: 'Self', status: 'alive', description: 'Keeper of the seal.' }] } });
    });
    expect(harness.snapshot().corrections.some(correction => correction.readerEdit?.changes.some(change => change.path[0] === 'memory'))).toBe(true);
    expect(readerState.records.get(story.id)?.readerPreferences).toBeUndefined();
  });
});
