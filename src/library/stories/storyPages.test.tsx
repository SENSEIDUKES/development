// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, type HarnessGenerationModelAdapter, type HarnessGenerationRepository } from '@seihouse/sen/harness-generation';
import type { ReaderStateRepository, ReaderStoryState } from '@seihouse/sen/reader-runtime';
import { StoryPages, storyHomeWorlds, useLibraryStories, type LibraryStories } from '@seihouse/library/stories';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const VERSA = { id: 'versa', name: 'VERSA', logoUrl: '/versa.png', colorClass: 'text-human' };
const receipt = { provider: 'gemini' as const, model: 'fixture', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' as const } };

/** A model whose chapter waits until the test releases it, so the veil can be seen. */
const scriptedModel = ({ configured = true } = {}) => {
  let release = () => undefined as void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const generate = vi.fn(async (request: { model: string }) => {
    void request;
    await gate;
    return { rawProviderResponse: JSON.stringify(writtenChapter({
      title: 'Low Tide', paragraphs: ['The tide pulled back from the drowned gate.', 'Mara counted the bells that no longer rang.'],
      arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' }, recap: 'Mara returns.', chapterFunction: 'progression',
      nextProgression: 'Mara climbs the bell tower.', nextWorldBuilding: 'The keeper explains the drowned law.', nextConflict: 'The tide wardens seize the causeway.',
    })), providerReceipt: receipt };
  });
  const recoverMemory = vi.fn(async () => ({ rawProviderResponse: JSON.stringify({ events: [] }), providerReceipt: receipt }));
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured, models: [{ id: 'fixture', label: 'Fixture' }, { id: 'remembered', label: 'Remembered' }], defaultModel: 'fixture' }),
    generate: generate as unknown as HarnessGenerationModelAdapter['generate'],
    arcOperation: async () => ({ rawProviderResponse: JSON.stringify({ plan: GOAL, destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }),
  };
  return { adapter, generate, recoverMemory, release: () => release() };
};

class MemoryReaderStateRepository implements ReaderStateRepository {
  records = new Map<string, ReaderStoryState>();
  async load(storyId: string) { return this.records.has(storyId) ? structuredClone(this.records.get(storyId)) : undefined; }
  async save(state: ReaderStoryState) { this.records.set(state.storyId, structuredClone(state)); }
}

const createSeededStory = async (repository: InMemoryHarnessGenerationRepository, adapter: HarnessGenerationModelAdapter, title: string) => {
  const setup = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await setup.hydrate();
  return setup.createStory({
    title, premise: `${title}: a courier returns to the drowned city that erased her name.`, genre: 'Xianxia',
    destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL,
    cast: [{ name: 'Mara', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
  });
};

/** A host the way the app is one: it decides the page and keys StoryPages by story, never by page. */
function StoryHost({ repository, adapter, readerState, storyId, preferredModel, onStories }: {
  repository: HarnessGenerationRepository;
  adapter: HarnessGenerationModelAdapter;
  readerState?: ReaderStateRepository;
  storyId: string;
  preferredModel?: string;
  onStories?: (stories: LibraryStories) => void;
}) {
  const stories = useLibraryStories({ repository, modelAdapter: adapter, preferredModel });
  onStories?.(stories);
  const [page, setPage] = useState<'home' | 'info' | 'read'>('info');
  if (page === 'home') return <p data-testid="story-host-home">Your stories</p>;
  return <StoryPages key={storyId} stories={stories} storyId={storyId} page={page} readerStateRepository={readerState}
    writingAgent={VERSA} backLabel="Back to your stories"
    onOpenReader={() => setPage('read')} onCloseReader={() => setPage('info')} onBack={() => setPage('home')} />;
}

let container: HTMLDivElement;
let root: Root;
const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const click = async (element: HTMLElement | null | undefined, label: string) => {
  expect(element, `Expected ${label}`).toBeTruthy();
  await act(async () => { element!.click(); });
  await flush();
};
const buttonByText = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text);
const worldInfo = () => container.querySelector<HTMLElement>('[data-testid="harness-world-info"]');
const chaptersAction = () => worldInfo()?.querySelector<HTMLElement>('[data-world-info-chapters="action"]');

beforeEach(() => {
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('A story\'s own pages for any host', { timeout: 20_000 }, () => {
  it('Start Story survives the move to the Reader: Chapter 1 is written under the veil, then Back returns to World Info and Home', async () => {
    const model = scriptedModel();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createSeededStory(repository, model.adapter, 'The Drowned Name');
    const readerState = new MemoryReaderStateRepository();
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={repository} adapter={model.adapter}
      readerState={readerState} storyId={story.id} />)));
    await flush();

    expect(worldInfo()!.querySelector('h1')!.textContent).toBe('The Drowned Name');
    expect(chaptersAction()!.textContent).toContain('Start Story');

    // The host swaps the page; StoryPages stays mounted, so the Reader begins Chapter 1 at once.
    await click(chaptersAction(), 'Start Story');
    await flush();
    expect(container.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
    const veil = container.querySelector('img[alt="VERSA"]')?.closest<HTMLElement>('.fixed');
    expect(veil?.textContent).toContain('Chapter 1');
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(model.generate.mock.calls[0][0].model).toBe('fixture');

    await act(async () => { model.release(); });
    await flush();
    expect(container.querySelector('[data-chapter-number="1"]')!.textContent).toContain('The tide pulled back from the drowned gate.');
    // A saved result finishes the journey while the veil still covers the Reader.
    expect(container.querySelector('[data-testid="generation-overlay"]')?.getAttribute('data-journey-progress')).toBe('1');
    // Story memory waits until it is asked for.
    expect(model.recoverMemory).not.toHaveBeenCalled();

    // Back returns to World Info, which continues where the reader is.
    await click(buttonByText('Back'), 'Back');
    await flush();
    expect(chaptersAction()!.textContent).toContain('Continue · Ch. 1');

    // Opening the Reader again reads; it never writes another chapter by itself.
    await click(chaptersAction(), 'Continue');
    await flush();
    expect(container.querySelector('[data-chapter-number="1"]')).toBeTruthy();
    expect(model.generate).toHaveBeenCalledTimes(1);
    await click(buttonByText('Back'), 'Back');

    // World Info's way back carries the host's name for it.
    await click(worldInfo()!.querySelector<HTMLButtonElement>('button[aria-label="Back to your stories"]'), 'Back to your stories');
    expect(container.querySelector('[data-testid="story-host-home"]')).toBeTruthy();
  });

  it('World Info saves the whole story as one file, so a test can be shared', async () => {
    const model = scriptedModel();
    model.release();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createSeededStory(repository, model.adapter, 'The Drowned Name');
    const writer = new HarnessGenerationController({ repository, modelAdapter: model.adapter });
    await writer.hydrate();
    await writer.generateNextChapter(story.id, 'fixture');
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={repository} adapter={model.adapter} storyId={story.id} />)));
    await flush();

    const saved: Blob[] = [];
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { saved.push(blob as Blob); return 'blob:story'; });
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const names: string[] = [];
    const followed = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    try {
      await click(worldInfo()!.querySelector<HTMLElement>('[data-testid="story-export"] button'), 'Export story');
      expect(names).toEqual(['The-Drowned-Name.json']);
      expect(saved).toHaveLength(1);
      const archive = JSON.parse(await saved[0].text());
      expect(archive.story).toMatchObject({ id: story.id, title: 'The Drowned Name' });
      expect(archive.chapters.map((chapter: { title: string }) => chapter.title)).toEqual(['Low Tide']);
      // Each chapter travels with what the writer was given and what it returned.
      expect(archive.attempts[0]).toMatchObject({
        capaPrompt: { text: expect.any(String) },
        storyInformation: { arc: { activeGoal: { text: 'Reclaim her name.' } } },
        immediateChapterRequest: { chapterNumber: 1 },
        warnings: expect.any(Array),
      });
      expect(JSON.parse(archive.attempts[0].rawProviderResponse).recap).toBe('Mara returns.');
      expect(worldInfo()!.querySelector('[role="alert"]')).toBeNull();
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      followed.mockRestore();
    }
  });

  it('the Reader writes the newest chapter again with the host\'s model when the reader asks', async () => {
    const model = scriptedModel();
    model.release();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createSeededStory(repository, model.adapter, 'The Drowned Name');
    const writer = new HarnessGenerationController({ repository, modelAdapter: model.adapter });
    await writer.hydrate();
    await writer.generateNextChapter(story.id, 'fixture');
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={repository} adapter={model.adapter} storyId={story.id}
      preferredModel="remembered" />)));
    await flush();
    await click(chaptersAction(), 'Start Reading');
    await flush();
    expect(container.querySelector('[data-chapter-number="1"]')).toBeTruthy();

    await click(buttonByText('Rewrite this chapter'), 'Rewrite this chapter');
    await click(buttonByText('Rewrite Chapter 1'), 'Rewrite Chapter 1');
    await flush();
    expect(model.generate).toHaveBeenCalledTimes(2);
    expect(model.generate.mock.calls[1][0]).toMatchObject({ model: 'remembered', immediateChapterRequest: { chapterNumber: 1, rewrite: { previous: { title: 'Low Tide' } } } });
    expect(container.querySelector('[data-chapter-number="1"]')).toBeTruthy();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('says plainly when a story is gone, and when storage cannot open, then opens on Retry', async () => {
    const model = scriptedModel();
    const repository = new InMemoryHarnessGenerationRepository();
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={repository} adapter={model.adapter} storyId="hst_missing" />)));
    await flush();
    expect(container.textContent).toContain('This story is no longer available.');
    act(() => root.unmount());

    root = createRoot(container);
    let failures = 1;
    const flaky: HarnessGenerationRepository = {
      load: async () => {
        if (failures > 0) { failures -= 1; throw new Error('Your stories could not be opened.'); }
        return repository.load();
      },
      save: state => repository.save(state),
    };
    let latest: LibraryStories | undefined;
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={flaky} adapter={model.adapter} storyId="hst_missing"
      onStories={stories => { latest = stories; }} />)));
    await flush();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('Your stories could not be opened.');
    expect(latest!.state).toBeUndefined();

    await click(buttonByText('Retry'), 'Retry');
    await flush();
    expect(latest!.loadError).toBeUndefined();
    expect(latest!.state).toBeDefined();
    expect(container.textContent).toContain('This story is no longer available.');
  });

  it('writes only when the server is configured, with the remembered model when the server offers it', async () => {
    const unconfigured = scriptedModel({ configured: false });
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createSeededStory(repository, unconfigured.adapter, 'The Drowned Name');
    let latest: LibraryStories | undefined;
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={repository} adapter={unconfigured.adapter} storyId={story.id}
      onStories={stories => { latest = stories; }} />)));
    await flush();
    expect(latest!.canGenerate).toBe(false);
    act(() => root.unmount());

    root = createRoot(container);
    const configured = scriptedModel();
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={repository} adapter={configured.adapter} storyId={story.id}
      preferredModel="remembered" onStories={stories => { latest = stories; }} />)));
    await flush();
    expect(latest!.canGenerate).toBe(true);
    expect(latest!.model).toBe('remembered');
  });
});

describe('A writer that does not answer', { timeout: 20_000 }, () => {
  it('still opens the story to read, says why nothing can be written, and reaches the writer on Retry', async () => {
    const model = scriptedModel();
    const repository = new InMemoryHarnessGenerationRepository();
    const story = await createSeededStory(repository, model.adapter, 'The Drowned Name');
    let unreachable = true;
    const adapter: HarnessGenerationModelAdapter = {
      ...model.adapter,
      getServerInfo: async () => {
        if (unreachable) throw new Error('The writer could not be reached.');
        return model.adapter.getServerInfo();
      },
    };
    let latest: LibraryStories | undefined;
    await act(async () => root.render(renderWithDevAudio(<StoryHost repository={repository} adapter={adapter} storyId={story.id}
      onStories={stories => { latest = stories; }} />)));
    await flush();
    expect(worldInfo()!.querySelector('h1')!.textContent).toBe('The Drowned Name');
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('The writer could not be reached.');
    expect(latest!.canGenerate).toBe(false);

    unreachable = false;
    await click(buttonByText('Retry'), 'Retry');
    await flush();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(latest!.canGenerate).toBe(true);
  });
});

describe('Home cards', () => {
  it('lists every story newest first', async () => {
    const { adapter } = scriptedModel();
    const repository = new InMemoryHarnessGenerationRepository();
    const first = await createSeededStory(repository, adapter, 'The Drowned Name');
    await new Promise(resolve => setTimeout(resolve, 5));
    const second = await createSeededStory(repository, adapter, 'Seven Chapters to Live');
    const cards = storyHomeWorlds(repository.snapshot());
    expect(cards.map(card => card.id)).toEqual([second.id, first.id]);
    expect(cards[0]).toMatchObject({ title: 'Seven Chapters to Live', genre: 'Xianxia', mcName: 'Mara', chapterCount: 0 });
  });
});
