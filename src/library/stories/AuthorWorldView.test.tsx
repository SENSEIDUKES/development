// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../test-utils/writtenChapter';
import { HarnessGenerationController, type HarnessGenerationModelAdapter, type HarnessTagRequest } from '@seihouse/sen/harness-generation';
import type { CreatorWorld } from '../../components/creator-space/shared/creatorSpaceContracts';
import { AuthorWorldView } from './AuthorWorldView';
import { useLibraryStories } from './useLibraryStories';

/**
 * The author's world view (SENSEI, 2026-10-30): what a world opens to in
 * Create. The chapters as an iTunes list, tagged a few at a time; the only
 * place in the app where tagging is seen.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const receipt = { provider: 'gemini' as const, model: 'fixture', generatedAt: '2026-10-30T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const reply = (title: string, line: string) => writtenChapterReply(JSON.stringify({
  title, paragraphs: [line, 'The tide went out.'],
  arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' }, recap: 'Mara returns.', chapterFunction: 'progression',
  nextProgression: 'Mara climbs.', nextWorldBuilding: 'The keeper explains.', nextConflict: 'The wardens close in.',
}));
const LINES = ['Mara counted the bells.', 'Mara climbed the tower.', 'Mara rang the last bell.'];

let container: HTMLDivElement;
let root: Root;
const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const click = async (element: Element | null | undefined, label: string, init: MouseEventInit = {}) => {
  expect(element, `Expected ${label}`).toBeTruthy();
  await act(async () => { element!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init })); });
  await flush();
};
const view = () => container.querySelector<HTMLElement>('[data-testid="author-world"]')!;
const rows = () => [...view().querySelectorAll<HTMLElement>('[data-testid="author-world-chapter"]')];
const row = (n: number) => view().querySelector<HTMLElement>(`[data-testid="author-world-chapter"][data-chapter-number="${n}"]`)!;
const stateOf = (n: number) => row(n).querySelector('[data-testid="author-world-chapter-state"]')!.textContent;
const buttonByText = (text: string) => [...view().querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text);
const tab = (name: string) => [...view().querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(button => button.textContent === name);

/** A world with three chapters, written by a host with no tagger, so none is tagged yet. */
const threeChapters = async () => {
  const repository = new InMemoryHarnessGenerationRepository();
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  const writer = new HarnessGenerationController({
    repository,
    modelAdapter: {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }),
      generate,
      arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
    },
  });
  await writer.hydrate();
  const story = await writer.createStory({
    title: 'The Drowned Name', premise: 'A courier returns to the drowned city.', destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL,
    cast: [{ name: 'Mara', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
  });
  for (const [index, line] of LINES.entries()) {
    generate.mockResolvedValueOnce({ rawProviderResponse: reply(`Bell ${index + 1}`, line), providerReceipt: receipt });
    await writer.generateNextChapter(story.id, 'fixture');
  }
  return { repository, storyId: story.id };
};

function Host({ repository, adapter, storyId, worlds }: {
  repository: InMemoryHarnessGenerationRepository; adapter: HarnessGenerationModelAdapter; storyId: string; worlds: CreatorWorld[];
}) {
  const stories = useLibraryStories({ repository, modelAdapter: adapter });
  const [chapterNumber, setChapterNumber] = useState<number>();
  if (!stories.state) return null;
  return <AuthorWorldView stories={stories} worlds={worlds} storyId={storyId} chapterNumber={chapterNumber}
    onChooseWorld={() => undefined} onOpenChapter={setChapterNumber} onCloseChapter={() => setChapterNumber(undefined)} onBack={() => undefined} />;
}

const rects = Range.prototype.getClientRects;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // The chapter's lit view measures its words; jsdom cannot, so one line stands in.
  Range.prototype.getClientRects = () => [{ left: 100, top: 200, right: 170, bottom: 222, width: 70, height: 22 }] as unknown as DOMRectList;
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  Range.prototype.getClientRects = rects;
});

describe('the author\'s world view', { timeout: 20_000 }, () => {
  it('lists the chapters, tags the ones the author checks, in order, and opens one with its tags lit', async () => {
    const { repository, storyId } = await threeChapters();
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: [{ paragraph: 1, words: request.paragraphs[0], tag: '[[appears: MC | character]]' }] }),
      providerReceipt: receipt,
    }));
    const adapter: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }),
      generate: vi.fn(),
      arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
      tagChapter,
    };
    const worlds: CreatorWorld[] = [{ id: storyId, title: 'The Drowned Name', chapterCount: 3, status: 'draft', updatedAt: '2026-10-30T12:00:00.000Z' }];
    await act(async () => root.render(<Host repository={repository} adapter={adapter} storyId={storyId} worlds={worlds} />));
    await flush(20);

    // The world, its medium (Sequential Art waits), and Chapters open first.
    expect(view().querySelector('h1')!.textContent).toBe('The Drowned Name');
    expect(view().querySelector(`[data-world-id="${storyId}"]`)!.getAttribute('aria-current')).toBe('true');
    expect(buttonByText('Sequential Art')!.disabled).toBe(true);
    expect(tab('Chapters')!.getAttribute('aria-selected')).toBe('true');
    expect(rows().map(entry => entry.getAttribute('data-chapter-number'))).toEqual(['1', '2', '3']);
    expect([1, 2, 3].map(stateOf)).toEqual(['Not yet', 'Not yet', 'Not yet']);
    expect(view().querySelector('[data-testid="author-world-summary"]')!.textContent).toBe('3 chapters · 0 tagged · 3 not tagged yet');

    // Click one, shift-click to the last: a run of three. Click the middle again to leave it out.
    await click(row(1), 'Chapter 1');
    await click(row(3), 'Chapter 3', { shiftKey: true });
    expect(rows().map(entry => entry.getAttribute('data-checked'))).toEqual(['true', 'true', 'true']);
    expect(buttonByText('Tag 3 chapters')).toBeTruthy();
    expect(view().querySelector('[data-testid="author-world-cost"]')!.textContent).toContain('3 tagging calls');
    await click(row(2), 'Chapter 2');
    expect(buttonByText('Tag 2 chapters')).toBeTruthy();

    await click(buttonByText('Tag 2 chapters'), 'Tag 2 chapters');
    await flush(50);
    expect(tagChapter.mock.calls.map(([request]) => request.chapterNumber)).toEqual([1, 3]);
    expect([1, 2, 3].map(stateOf)).toEqual(['Tagged', 'Not yet', 'Tagged']);
    expect(row(1).textContent).toContain('Appearances');
    expect(view().querySelector('[data-testid="author-world-summary"]')!.textContent).toBe('3 chapters · 2 tagged · 1 not tagged yet');
    expect(rows().every(entry => entry.getAttribute('data-checked') === 'false')).toBe(true);

    // Its arrow opens a chapter with its tags lit; Chapters goes back to the list.
    await click(row(1).querySelector('button[aria-label="Open Chapter 1"]'), 'Open Chapter 1');
    const chapter = view().querySelector<HTMLElement>('[data-testid="author-chapter"]')!;
    expect(chapter.getAttribute('data-tagging-status')).toBe('tagged');
    expect(chapter.querySelector('[data-tagging-kind="Appearances"]')!.textContent).toContain('1 appearance');
    await click(buttonByText('Chapters'), 'Chapters');
    expect(rows()).toHaveLength(3);
  });

  it('shows the world\'s Blueprint, its coming Codex, and its skill packs', async () => {
    const { repository, storyId } = await threeChapters();
    // A server with no configured model: the tagger cannot be reached.
    const adapter: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ provider: 'gemini', configured: false, models: [], defaultModel: '' }),
      generate: vi.fn(),
      arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
    };
    const worlds: CreatorWorld[] = [{ id: storyId, title: 'The Drowned Name', chapterCount: 3, status: 'draft', updatedAt: '2026-10-30T12:00:00.000Z' }];
    await act(async () => root.render(<Host repository={repository} adapter={adapter} storyId={storyId} worlds={worlds} />));
    await flush(20);

    // No tagger here: nothing can be checked, and it says why.
    expect(row(1).querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(true);
    expect(row(1).textContent).toContain('The tagger cannot be reached here right now.');
    // A world begun from a premise has no Blueprint, and says so.
    await click(tab('Blueprint'), 'Blueprint');
    expect(view().querySelector('[data-testid="author-world-no-blueprint"]')!.textContent).toContain('An imported novel doesn’t have one');
    await click(tab('Codex'), 'Codex');
    expect(view().querySelector('[data-testid="author-world-codex"]')!.textContent).toContain('Coming soon');
    // Assets: the world's CAPA skills and media, and nothing else of Story Settings.
    await click(tab('Assets'), 'Assets');
    const assets = view().querySelector<HTMLElement>('[data-testid="story-assets"]')!;
    expect(assets).toBeTruthy();
    expect(assets.textContent).not.toContain('Language and Reading Mode');
  });
});
