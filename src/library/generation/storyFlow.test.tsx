// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, type HarnessGenerationModelAdapter, type HarnessGenerationRepository } from '@seihouse/sen/harness-generation';
import type { ReaderStateRepository, ReaderStoryState } from '@seihouse/sen/reader-runtime';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';
import { harnessStoryDisplay } from '../stories/storyView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const LOGLINE = 'A courier walks back into the drowned city that erased her name.';
const VERSA = { id: 'versa', name: 'VERSA', logoUrl: '/versa.png', colorClass: 'text-human' };
const receipt = { provider: 'gemini' as const, model: 'fixture', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' as const } };

/** A model whose next chapter waits until the test releases it, so the veil can be seen. */
const scriptedModel = () => {
  let release = () => undefined as void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const recoverMemory = vi.fn(async () => ({ rawProviderResponse: JSON.stringify({ events: [] }), providerReceipt: receipt }));
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }),
    generate: async () => {
      await gate;
      return { rawProviderResponse: JSON.stringify(writtenChapter({
        title: 'Low Tide', paragraphs: ['The tide pulled back from the drowned gate.', 'Mara counted the bells that no longer rang.'],
        arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' }, recap: 'Mara returns.', chapterFunction: 'progression',
        nextProgression: 'Mara climbs the bell tower.', nextWorldBuilding: 'The keeper explains the drowned law.', nextConflict: 'The tide wardens seize the causeway.',
      })), providerReceipt: receipt };
    },
    arcOperation: async () => ({ rawProviderResponse: JSON.stringify({ plan: GOAL, destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }),
  };
  return { adapter, recoverMemory, release: () => release() };
};

class MemoryReaderStateRepository implements ReaderStateRepository {
  records = new Map<string, ReaderStoryState>();
  async load(storyId: string) { return this.records.has(storyId) ? structuredClone(this.records.get(storyId)) : undefined; }
  async save(state: ReaderStoryState) { this.records.set(state.storyId, structuredClone(state)); }
}

/** A story started from a Story Seed: the Seed and its Blueprint travel as frozen source evidence. */
const seededStory = async (adapter: HarnessGenerationModelAdapter) => {
  const repository = new InMemoryHarnessGenerationRepository();
  const setup = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await setup.hydrate();
  const story = await setup.createStory({
    title: 'The Drowned Name', premise: 'A courier returns to the drowned city that erased her name.', genre: 'Xianxia',
    destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL,
    cast: [{ name: 'Mara', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
    sourceSnapshot: { kind: 'story-seed', sourceId: 'seed-1', sourceUpdatedAt: '2026-10-01T00:00:00.000Z', schemaVersion: 1,
      seed: { story: { required: { storyTags: ['Revenge', 'Found Family'] } } }, blueprint: { logline: LOGLINE } },
  });
  return { repository, storyId: story.id };
};

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

beforeEach(() => {
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('A story\'s way in: World Info, then the Reader', { timeout: 20_000 }, () => {
  it('shows a HARNESS story on its World Info page with only what the story knows', async () => {
    const { adapter } = scriptedModel();
    const { repository, storyId } = await seededStory(adapter);
    const display = harnessStoryDisplay(repository.snapshot(), storyId)!;
    expect(display).toMatchObject({
      title: 'The Drowned Name', genre: 'Xianxia', synopsis: LOGLINE, tags: ['Revenge', 'Found Family'],
      mcName: 'Mara', chapterCount: 0, author: '', imageUrl: '', currentArc: '',
      // The Information panel: the story's language and visibility; a Seed with no rating claims none.
      originalLanguage: 'en', permissions: { visibility: 'private' },
    });
    expect(display.matureContent).toBeUndefined();
    expect(harnessStoryDisplay(repository.snapshot(), 'missing')).toBeUndefined();
  });

  it('Start Story writes Chapter 1 under the Aura Veil, Back returns to World Info, and memory waits until asked', async () => {
    const model = scriptedModel();
    const { repository } = await seededStory(model.adapter);
    const readerState = new MemoryReaderStateRepository();
    await act(async () => root.render(renderWithDevAudio(<HarnessGenerationWorkspace repository={repository} modelAdapter={model.adapter}
      readerStateRepository={readerState} writingAgent={VERSA} />)));
    await flush();

    // The panel's World Info opens the story's page; an empty story offers Start Story.
    await click(buttonByText('World Info'), 'World Info');
    expect(worldInfo()!.querySelector('h1')!.textContent).toBe('The Drowned Name');
    expect(worldInfo()!.textContent).toContain(LOGLINE);
    expect(worldInfo()!.textContent).toContain('Xianxia');
    const start = worldInfo()!.querySelector<HTMLElement>('[data-world-info-chapters="action"]');
    expect(start?.textContent).toBe('Begin Story');

    // Start Story opens the Reader and begins Chapter 1 at once, with Versa's veil over it.
    await click(start, 'Start Story');
    await flush();
    expect(container.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
    const veil = container.querySelector('img[alt="VERSA"]')?.closest<HTMLElement>('.fixed');
    expect(veil, 'Expected the Aura Veil').toBeTruthy();
    expect(veil!.textContent).toContain('Chapter 1');
    // A HARNESS chapter arrives whole, so the veil never shows a made-up percentage.
    expect(veil!.textContent).not.toMatch(/\d+%/);

    await act(async () => { model.release(); });
    await flush();
    expect(container.querySelector('[data-chapter-number="1"]')!.textContent).toContain('The tide pulled back from the drowned gate.');
    // The Library reads story memory only on request: the chapter is ready as soon as it is saved.
    expect(model.recoverMemory).not.toHaveBeenCalled();

    // Back from the Reader returns to World Info, which now continues where the reader is.
    await click(buttonByText('Back'), 'Back');
    await flush();
    expect(worldInfo()).toBeTruthy();
    expect(worldInfo()!.querySelector('[data-world-info-chapters="action"]')!.textContent).toBe('Continue');

    // Back from World Info returns to the panel, with the story still selected.
    await click(worldInfo()!.querySelector<HTMLButtonElement>('button[aria-label="Back to novels"]'), 'Back to novels');
    expect(worldInfo()).toBeNull();
    expect(container.querySelector('[data-testid="harness-generation-workspace"]')).toBeTruthy();
    expect(buttonByText('Open Reader Chamber')).toBeTruthy();
  });

  it('takes a load error down once Retry opens the stories', async () => {
    const model = scriptedModel();
    const { repository, storyId } = await seededStory(model.adapter);
    let failures = 1;
    const flaky: HarnessGenerationRepository = {
      load: async () => {
        if (failures > 0) { failures -= 1; throw new Error('Your stories could not be opened.'); }
        return repository.load();
      },
      save: state => repository.save(state),
    };
    function Host() {
      const [reading, setReading] = useState<string | undefined>(storyId);
      return <HarnessGenerationWorkspace repository={flaky} modelAdapter={model.adapter} readerStateRepository={new MemoryReaderStateRepository()}
        readingStoryId={reading} onReadingStoryChange={setReading} />;
    }
    await act(async () => root.render(renderWithDevAudio(<Host />)));
    await flush();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('Your stories could not be opened.');

    // Retry on the story's page opens the stories, and the Reader shows.
    await click(buttonByText('Retry'), 'Retry');
    await flush();
    expect(container.querySelector('[data-testid="harness-reader"]')).toBeTruthy();

    // Back on the developer page, the old error is gone.
    await click(buttonByText('Back'), 'Back');
    expect(container.querySelector('[data-testid="harness-generation-workspace"]')).toBeTruthy();
    expect(container.textContent).not.toContain('Your stories could not be opened.');
  });
});
