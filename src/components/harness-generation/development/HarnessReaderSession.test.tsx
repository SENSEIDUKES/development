// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter, type HarnessReaderWriting } from '@seihouse/sen/harness-generation';
import type { ReaderStateRepository, ReaderStoryState } from '@seihouse/sen/reader-runtime';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 100 }] };
const reply = (title: string, paragraphs: string[], soundCues: unknown[] = []) => JSON.stringify({
  title, paragraphs, soundCues,
  arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' },
  recap: `${title}.`, chapterFunction: 'progression',
  nextProgression: 'Mara climbs the bell tower.', nextWorldBuilding: 'The keeper explains the drowned law.', nextConflict: 'The tide wardens seize the causeway.',
});
// The writer marks the words where a sound happens; the HARNESS places the cue there.
const CHAPTERS = [
  reply('Low Tide', ['The tide pulled back from the drowned gate.', 'Mara froze as [[1|the beast roared]] beyond the seawall.', 'Salt dried white on the courier seal.'],
    [{ mark: 1, sound: 'beast roar', energy: 'high' }]),
  reply('The Bell Keeper', ['A keeper waited on the causeway with a lantern.', 'He asked for the name the city had erased.', 'Mara gave him the only one she still owned.']),
];
const media = createLibraryMediaPort({ registered: [], entitlements: [], base: LIBRARY_BASE_MEDIA });
const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' as const } };

/** A model that answers with the next scripted chapter; `hold()` keeps the next answer until released. */
const scriptedProvider = () => {
  const replies = [...CHAPTERS];
  let gate: Promise<void> = Promise.resolve();
  const generate = vi.fn(async () => {
    await gate;
    return { rawProviderResponse: replies.shift()!, providerReceipt: receipt };
  });
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate,
    recoverMemory: async () => ({ rawProviderResponse: JSON.stringify({ events: [] }), providerReceipt: receipt }),
    arcOperation: async () => ({ rawProviderResponse: JSON.stringify({ plan: GOAL, destinedEnding: 'Mara reclaims her name.' }), providerReceipt: receipt }),
  };
  const hold = () => {
    let release = () => undefined as void;
    gate = new Promise<void>(resolve => { release = resolve; });
    return () => release();
  };
  return { adapter, generate, hold };
};

class MemoryReaderStateRepository implements ReaderStateRepository {
  records = new Map<string, ReaderStoryState>();
  async load(storyId: string) { return this.records.has(storyId) ? structuredClone(this.records.get(storyId)) : undefined; }
  async save(state: ReaderStoryState) { this.records.set(state.storyId, structuredClone(state)); }
}

const story = async ({ written = 0 } = {}) => {
  const harness = new InMemoryHarnessGenerationRepository();
  const model = scriptedProvider();
  const controller = new HarnessGenerationController({ repository: harness, modelAdapter: model.adapter, media });
  await controller.hydrate();
  const created = await controller.createStory({ premise: 'A courier returns to the drowned city that erased her name.',
    destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL });
  for (let index = 0; index < written; index++) await controller.generateNextChapter(created.id, 'test-model');
  return { harness, controller, storyId: created.id, ...model };
};

/** A host like the Library workspace: it follows the controller and writes chapters with its model. */
function Host({ controller, storyId, readerState, renderWriting, startOnOpen, canWrite = true }: {
  controller: HarnessGenerationController; storyId: string; readerState?: ReaderStateRepository;
  renderWriting?: (writing: HarnessReaderWriting) => React.ReactNode; startOnOpen?: boolean; canWrite?: boolean;
}) {
  const [state, setState] = useState(controller.snapshot());
  useEffect(() => { const stop = controller.subscribe(setState); return () => { stop(); }; }, [controller]);
  return <HarnessReaderSession state={state} storyId={storyId} controller={controller} onClose={() => undefined}
    readerStateRepository={readerState} renderWriting={renderWriting} startOnOpen={startOnOpen}
    onGenerateNextChapter={canWrite ? async () => { await controller.generateNextChapter(storyId, 'test-model'); } : undefined} />;
}

let container: HTMLDivElement;
let root: Root;

const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const buttonBy = (predicate: (button: HTMLButtonElement) => boolean) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(predicate);
const byLabel = (label: string) => (button: HTMLButtonElement) => button.getAttribute('aria-label') === label;
const click = async (predicate: (button: HTMLButtonElement) => boolean, label: string) => {
  const target = buttonBy(predicate);
  expect(target, `Expected ${label}`).toBeTruthy();
  await act(async () => { target!.click(); });
  await flush();
};
const mount = async (element: React.ReactElement) => {
  await act(async () => { root.render(renderWithDevAudio(element)); });
  await flush();
};
const chapterOnScreen = (chapterNumber: number) => container.querySelector<HTMLElement>(`[data-chapter-number="${chapterNumber}"]`);

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

describe('The HARNESS Reader', { timeout: 20_000 }, () => {
  it('shows each chapter on the Text Highlight Engine with its Sound Cues, keeps the place, and never touches HARNESS canon', async () => {
    const { harness, controller, storyId } = await story({ written: 2 });
    const canonBefore = harness.snapshot();
    const readerState = new MemoryReaderStateRepository();
    await mount(<Host controller={controller} storyId={storyId} readerState={readerState} />);

    // One engine paragraph per HARNESS paragraph, on the chapter's own block ids.
    const first = chapterOnScreen(1)!;
    expect(first.querySelector('h1')!.textContent).toBe('Low Tide');
    expect([...first.querySelectorAll('[data-sen-text-block]')].map(block => block.getAttribute('data-sen-text-block'))).toEqual(['c1-p1', 'c1-p2', 'c1-p3']);
    // The Sound Cue sits on the words the writer marked; no mark is left in the prose.
    expect(first.querySelector('[data-cue-annotation]')!.getAttribute('data-cue-annotation')).toBe('the beast roared');
    expect(first.textContent).not.toContain('[[');
    // Only Sound Cues: no Codex, no Mind Palace, no reading settings.
    expect(container.textContent).not.toMatch(/Codex|Mind Palace|Reader Settings/);

    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(chapterOnScreen(2)!.textContent).toContain('A keeper waited on the causeway with a lantern.');
    await flush();
    expect(readerState.records.get(storyId)?.lastReadChapter).toBe(2);
    // Reader state never enters the HARNESS workspace.
    expect(harness.snapshot()).toEqual(canonBefore);

    // Reload: a fresh session opens the last-read chapter.
    act(() => root.unmount());
    root = createRoot(container);
    await mount(<Host controller={controller} storyId={storyId} readerState={readerState} />);
    expect(chapterOnScreen(2)).toBeTruthy();
    await click(byLabel('Previous Chapter'), 'Previous Chapter');
    expect(chapterOnScreen(1)).toBeTruthy();
  });

  it('a new story: Write Chapter 1 shows the host writing screen until the chapter is saved, then opens it', async () => {
    const { controller, storyId, hold } = await story();
    const seen: HarnessReaderWriting[] = [];
    const renderWriting = (writing: HarnessReaderWriting) => {
      seen.push(writing);
      return writing.active ? <div data-testid="writing-screen">Chapter {writing.chapterNumber}</div> : null;
    };
    await mount(<Host controller={controller} storyId={storyId} renderWriting={renderWriting} />);
    expect(container.querySelector('[aria-label="Story start"]')!.textContent).toContain('Your story begins here.');

    const release = hold();
    await click(byLabel('Next Chapter: Write Chapter 1'), 'Write Chapter 1');
    expect(container.querySelector('[data-testid="writing-screen"]')!.textContent).toBe('Chapter 1');
    expect(buttonBy(byLabel('Next Chapter: Writing Chapter 1…'))!.disabled).toBe(true);

    await act(async () => { release(); });
    await flush();
    expect(container.querySelector('[data-testid="writing-screen"]')).toBeNull();
    expect(chapterOnScreen(1)!.textContent).toContain('The tide pulled back from the drowned gate.');
    // The closing screen keeps the number of the chapter it was writing.
    expect(seen.at(-1)).toEqual({ active: false, chapterNumber: 1 });
    expect(buttonBy(byLabel('Next Chapter: Write Chapter 2'))).toBeTruthy();
  });

  it('Start Story begins Chapter 1 as the Reader opens, once', async () => {
    const { controller, storyId, generate } = await story();
    await mount(<Host controller={controller} storyId={storyId} startOnOpen />);
    await flush();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(chapterOnScreen(1)).toBeTruthy();
    // Later renders never start another chapter on their own.
    await flush(50);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(buttonBy(byLabel('Next Chapter: Write Chapter 2'))).toBeTruthy();
  });

  it('says when the first chapter cannot be written here, and opens the Fate page from its header', async () => {
    const { controller, storyId } = await story();
    await mount(<Host controller={controller} storyId={storyId} canWrite={false} startOnOpen />);
    expect(container.querySelector('[aria-label="Story start"]')!.textContent).toContain('The first chapter can’t be written here yet.');
    expect(buttonBy(button => button.getAttribute('aria-label')?.startsWith('Next Chapter:') ?? false)).toBeUndefined();

    await click(byLabel('Open Fate'), 'Open Fate');
    expect(container.querySelector('[data-testid="fate-page"]')).toBeTruthy();
    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    expect(container.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
  });
});
