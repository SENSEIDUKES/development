// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createReplayTagger } from '../../../test-utils/replayTagger';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { STOPPED_WRITE_REPLY, writtenChapter } from '../../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessReaderWriting, type ReaderChapterBody, type ReaderHostTools } from '@seihouse/sen/harness-generation';
import type { ReadAloudVoicePicks, ReaderFonts, ReaderPreferenceStorage, ReaderStateRepository, ReaderStoryState } from '@seihouse/sen/reader-runtime';
import { installFakeSpeechSynthesis, type FakeSpeechSynthesis } from '../../../test-utils/fakeSpeechSynthesis';
import { ReaderMixerProvider, type ReaderMixer, type ReaderMixerSleepEvent } from '@seihouse/audio-player';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';
import { SEN_ATMOSPHERES } from '../../../host/media/atmosphereCatalog';
import { SEN_SOUNDSCAPES } from '../../../host/media/soundscapeCatalog';
import { piecesForMood, storySoundtrack } from '@seihouse/sen/reader-runtime';
import { LISTEN_DUCK, READER_MUSIC_MOOD } from './useReaderSoundtrack';
import type { SenLanguageCode } from '@seihouse/sen/contracts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const reply = (title: string, paragraphs: string[]) => JSON.stringify(writtenChapter({
  title, paragraphs,
  arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' },
  recap: `${title}.`, chapterFunction: 'progression',
  nextProgression: 'Mara climbs the bell tower.', nextWorldBuilding: 'The keeper explains the drowned law.', nextConflict: 'The tide wardens seize the causeway.',
}));
// The writer puts a sound tag on the words where a sound happens; the HARNESS places the cue there.
const CHAPTERS = [
  reply('Low Tide', ['The tide pulled back from the drowned gate.', 'Mara froze as [[sound: beast roar | the beast roared | high]] beyond the seawall. Nothing answered it.', 'Salt dried white on the courier seal.']),
  reply('The Bell Keeper', ['A keeper waited on the causeway with a lantern.', 'He asked for the name the city had erased.', 'Mara gave him the only one she still owned.']),
];
const media = createLibraryMediaPort({ registered: [], entitlements: [], base: LIBRARY_BASE_MEDIA });
const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' as const } };

/** A model that answers with the next scripted reply; `hold()` keeps the next answer until released. */
const scriptedProvider = (replies = [...CHAPTERS]) => {
  let gate: Promise<void> = Promise.resolve();
  // Each scripted reply is the chapter as the tagger hands it back; the writer's
  // own reply is it with the tags stripped, which is all the writer is asked
  // for now (SENSEI, 2026-10-24), and the tagger puts them back where they were.
  const { tagChapter, teach } = createReplayTagger(receipt);
  for (const reply of replies) teach(reply);
  const generate = vi.fn(async () => {
    await gate;
    return { rawProviderResponse: teach(replies.shift()!), providerReceipt: receipt };
  });
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate,
    tagChapter,
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

const story = async ({ written = 0, replies, language }: { written?: number; replies?: string[]; language?: SenLanguageCode } = {}) => {
  const harness = new InMemoryHarnessGenerationRepository();
  const model = scriptedProvider(replies);
  const controller = new HarnessGenerationController({ repository: harness, modelAdapter: model.adapter, media });
  await controller.hydrate();
  const created = await controller.createStory({ premise: 'A courier returns to the drowned city that erased her name.',
    destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL }, language);
  for (let index = 0; index < written; index++) await controller.generateNextChapter(created.id, 'test-model');
  return { harness, controller, storyId: created.id, ...model };
};

/** A host like the Library workspace: it follows the controller and writes chapters with its model. */
function Host({ controller, storyId, readerState, renderWriting, renderWriteAside, startOnOpen, canWrite = true, canRewrite = false, readerPreferences, readAloudVoices, readerFonts, chapterBody, renderHostTools }: {
  controller: HarnessGenerationController; storyId: string; readerState?: ReaderStateRepository;
  renderWriting?: (writing: HarnessReaderWriting) => React.ReactNode; renderWriteAside?: (written: number) => React.ReactNode;
  startOnOpen?: boolean; canWrite?: boolean; canRewrite?: boolean;
  readerPreferences?: ReaderPreferenceStorage; readAloudVoices?: ReadAloudVoicePicks;
  readerFonts?: ReaderFonts; chapterBody?: ReaderChapterBody; renderHostTools?: (tools: ReaderHostTools) => React.ReactNode;
}) {
  const [state, setState] = useState(controller.snapshot());
  useEffect(() => { const stop = controller.subscribe(setState); return () => { stop(); }; }, [controller]);
  return <HarnessReaderSession state={state} storyId={storyId} controller={controller} onClose={() => undefined}
    readerStateRepository={readerState} renderWriting={renderWriting} renderWriteAside={renderWriteAside} startOnOpen={startOnOpen}
    readerPreferences={readerPreferences} readAloudVoices={readAloudVoices} readerFonts={readerFonts} chapterBody={chapterBody} renderHostTools={renderHostTools}
    onGenerateNextChapter={canWrite ? async () => { await controller.generateNextChapter(storyId, 'test-model'); } : undefined}
    onRewriteChapter={canRewrite ? async note => { await controller.rewriteLatestChapter(storyId, 'test-model', note); } : undefined} />;
}

let container: HTMLDivElement;
let root: Root;

const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
// Panels open in a portal beside the Reader, so buttons are found anywhere on the page.
const buttonBy = (predicate: (button: HTMLButtonElement) => boolean) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(predicate);
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
  it('shows each chapter on the Highlight Engine with its Sound Cues, keeps the place, and never touches HARNESS canon', async () => {
    const { harness, controller, storyId } = await story({ written: 2 });
    const canonBefore = harness.snapshot();
    const readerState = new MemoryReaderStateRepository();
    await mount(<Host controller={controller} storyId={storyId} readerState={readerState} />);

    // One engine paragraph per HARNESS paragraph, on the chapter's own block ids (the fourth is the rest of the chapter).
    const first = chapterOnScreen(1)!;
    expect(first.querySelector('h1')!.textContent).toBe('Low Tide');
    // Beside the title, the chapter's saved word count (a testing aid while length is tuned).
    const saved = harness.snapshot().chapters.find(chapter => chapter.storyId === storyId && chapter.chapterNumber === 1)!;
    expect(first.querySelector('[data-testid="harness-reader-word-count"]')!.textContent).toBe(` · ${saved.metrics.wordCount.toLocaleString()} words`);
    expect([...first.querySelectorAll('[data-sen-text-block]')].map(block => block.getAttribute('data-sen-text-block'))).toEqual(['c1-p1', 'c1-p2', 'c1-p3', 'c1-p4']);
    // The Sound Cue sits on the words the writer marked; no mark is left in the prose.
    expect(first.querySelector('[data-cue-annotation]')!.getAttribute('data-cue-annotation')).toBe('the beast roared');
    expect(first.textContent).not.toContain('[[');
    // On the chapter, only Sound Cues: the Codex is its own page, opened from the top bar, and there is no Mind Palace.
    // A browser without speech gets no Listen; Reader Settings stays for the text.
    expect(first.textContent).not.toMatch(/Codex|Mind Palace/);
    expect(container.textContent).not.toMatch(/Mind Palace/);
    expect(buttonBy(byLabel('Reader Settings'))).toBeTruthy();
    expect(container.querySelector('[data-testid="read-aloud-player"]')).toBeNull();

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

  it('chooses any saved chapter by its full title, marks the current one, and restores the chosen place after reload', async () => {
    const { harness, controller, storyId } = await story({ written: 3, replies: [...CHAPTERS, reply('The Drowned Gate', ['Mara crossed the gate.'])] });
    const canonBefore = harness.snapshot();
    const readerState = new MemoryReaderStateRepository();
    await mount(<Host controller={controller} storyId={storyId} readerState={readerState} />);
    await click(byLabel('Select chapter: Chapter 1'), 'chapter picker');
    expect(buttonBy(byLabel('Chapter 1: Low Tide'))!.getAttribute('aria-current')).toBe('page');
    expect(buttonBy(byLabel('Chapter 3: The Drowned Gate'))!.getAttribute('aria-current')).toBeNull();
    await click(byLabel('Chapter 3: The Drowned Gate'), 'Chapter 3');
    expect(chapterOnScreen(3)!.textContent).toContain('Mara crossed the gate.');
    expect(buttonBy(byLabel('Select chapter: Chapter 3'))).toBeTruthy();
    expect(readerState.records.get(storyId)?.lastReadChapter).toBe(3);
    expect(harness.snapshot()).toEqual(canonBefore);
    await click(byLabel('Previous Chapter'), 'Previous Chapter');
    expect(chapterOnScreen(2)).toBeTruthy();
    await click(byLabel('Select chapter: Chapter 2'), 'chapter picker');
    expect(buttonBy(byLabel('Chapter 2: The Bell Keeper'))!.getAttribute('aria-current')).toBe('page');
    await click(byLabel('Chapter 3: The Drowned Gate'), 'Chapter 3');
    act(() => root.unmount());
    root = createRoot(container);
    await mount(<Host controller={controller} storyId={storyId} readerState={readerState} />);
    expect(chapterOnScreen(3)).toBeTruthy();
    expect(buttonBy(byLabel('Select chapter: Chapter 3'))).toBeTruthy();
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

  it('shows the host\'s aside beside Write, with how many chapters are written, and nowhere else', async () => {
    const { controller, storyId } = await story();
    const renderWriteAside = (written: number) => <span data-testid="write-aside">{written}</span>;
    await mount(<Host controller={controller} storyId={storyId} renderWriteAside={renderWriteAside} />);
    expect(container.querySelector('[data-testid="write-aside"]')?.textContent).toBe('0');
    await click(byLabel('Next Chapter: Write Chapter 1'), 'Write Chapter 1');
    await flush();
    expect(container.querySelector('[data-testid="write-aside"]')?.textContent).toBe('1');
    // Reading an earlier chapter, Next only opens the next one: no aside.
    await mount(<Host controller={controller} storyId={storyId} renderWriteAside={renderWriteAside} canWrite={false} />);
    expect(container.querySelector('[data-testid="write-aside"]')).toBeNull();
  });

  it('a chapter keeps writing when the reader leaves: back in the Reader it is still writing, never begun twice, and opens when saved', async () => {
    const { controller, storyId, generate, hold } = await story();
    const renderWriting = (writing: HarnessReaderWriting) => (writing.active ? <div data-testid="writing-screen">Chapter {writing.chapterNumber}</div> : null);
    // Chapter 1 begins before the Reader opens, as the app begins it the moment a story is made.
    const release = hold();
    const background = controller.generateNextChapter(storyId, 'test-model');
    await mount(<Host controller={controller} storyId={storyId} renderWriting={renderWriting} startOnOpen />);
    // Start Story finds it already being written: the writing screen, and no second write.
    expect(container.querySelector('[data-testid="writing-screen"]')!.textContent).toBe('Chapter 1');
    expect(buttonBy(byLabel('Next Chapter: Writing Chapter 1…'))!.disabled).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);

    // The reader leaves and comes back: still writing, still one write.
    act(() => root.unmount());
    root = createRoot(container);
    await mount(<Host controller={controller} storyId={storyId} renderWriting={renderWriting} startOnOpen />);
    expect(container.querySelector('[data-testid="writing-screen"]')!.textContent).toBe('Chapter 1');
    expect(generate).toHaveBeenCalledTimes(1);

    await act(async () => { release(); await background; });
    await flush();
    expect(container.querySelector('[data-testid="writing-screen"]')).toBeNull();
    expect(chapterOnScreen(1)!.textContent).toContain('The tide pulled back from the drowned gate.');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('a write that stops far short of a chapter saves nothing, says so, and the reader tries again', async () => {
    const { controller, storyId } = await story({ replies: [STOPPED_WRITE_REPLY, ...CHAPTERS] });
    await mount(<Host controller={controller} storyId={storyId} />);

    await click(byLabel('Next Chapter: Write Chapter 1'), 'Write Chapter 1');
    expect(chapterOnScreen(1)).toBeNull();
    expect(container.querySelector('[role="alert"]')!.textContent)
      .toBe('Chapter 1 was not saved. The writer stopped after 104 words, far short of the 1,200 a chapter needs. You can try again.');
    expect(container.textContent).not.toContain('Need fix tag syntax');

    await click(byLabel('Next Chapter: Write Chapter 1'), 'Write Chapter 1');
    expect(chapterOnScreen(1)!.textContent).toContain('The tide pulled back from the drowned gate.');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('Rewrite this chapter: offered at the end of the newest chapter only, written with the reader\'s note, opened from its top', async () => {
    const rewritten = reply('The Keeper Returns', ['The keeper had waited three nights for her.', 'He did not ask for her name this time.']);
    const { controller, storyId, generate, hold } = await story({ written: 2, replies: [...CHAPTERS, rewritten] });
    const seen: HarnessReaderWriting[] = [];
    const renderWriting = (writing: HarnessReaderWriting) => { seen.push(writing); return writing.active ? <div data-testid="writing-screen">Chapter {writing.chapterNumber}</div> : null; };
    await mount(<Host controller={controller} storyId={storyId} canRewrite renderWriting={renderWriting} />);
    const rewriteLink = () => buttonBy(button => button.textContent === 'Rewrite this chapter');
    // An earlier chapter is never offered.
    expect(chapterOnScreen(1)).toBeTruthy();
    expect(rewriteLink()).toBeUndefined();
    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(chapterOnScreen(2)).toBeTruthy();

    await click(button => button.textContent === 'Rewrite this chapter', 'Rewrite this chapter');
    const note = container.querySelector<HTMLTextAreaElement>('form[aria-label="Rewrite Chapter 2"] textarea')!;
    expect(container.querySelector(`label[for="${note.id}"]`)!.textContent).toBe('What should change? Optional');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(note, 'Let the keeper wait longer.');
      note.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const scrolled = vi.mocked(Element.prototype.scrollIntoView).mock.calls.length;
    const release = hold();
    await click(button => button.textContent === 'Rewrite Chapter 2', 'Rewrite Chapter 2');
    // The writing screen covers the chapter while it is written again.
    expect(container.querySelector('[data-testid="writing-screen"]')!.textContent).toBe('Chapter 2');
    await act(async () => { release(); });
    await flush();

    expect(generate).toHaveBeenCalledTimes(3);
    expect((generate.mock.calls[2] as unknown as [HarnessGenerationRequest])[0])
      .toMatchObject({ immediateChapterRequest: { chapterNumber: 2, rewrite: { note: 'Let the keeper wait longer.', previous: { title: 'The Bell Keeper' } } } });
    expect(container.querySelector('[data-testid="writing-screen"]')).toBeNull();
    expect(seen.at(-1)).toEqual({ active: false, chapterNumber: 2 });
    const shown = chapterOnScreen(2)!;
    expect(shown.querySelector('h1')!.textContent).toBe('The Keeper Returns');
    expect(shown.textContent).toContain('The keeper had waited three nights for her.');
    expect(shown.textContent).not.toContain('A keeper waited on the causeway with a lantern.');
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.calls.length).toBeGreaterThan(scrolled);
    // Still the newest chapter: it may be written again, with a fresh, empty note.
    expect(rewriteLink()).toBeTruthy();
    expect(container.querySelector('form[aria-label="Rewrite Chapter 2"]')).toBeNull();
    expect(controller.snapshot().stories[0].head.nextChapterNumber).toBe(3);
  });

  it('a rewrite that fails keeps the chapter and the note, and says the chapter is unchanged', async () => {
    const { controller, storyId, generate } = await story({ written: 1 });
    generate.mockRejectedValueOnce(new Error('The writer is busy.'));
    await mount(<Host controller={controller} storyId={storyId} canRewrite />);
    await click(button => button.textContent === 'Rewrite this chapter', 'Rewrite this chapter');
    const note = container.querySelector<HTMLTextAreaElement>('form[aria-label="Rewrite Chapter 1"] textarea')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(note, 'Shorter, please.');
      note.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(button => button.textContent === 'Rewrite Chapter 1', 'Rewrite Chapter 1');

    expect(container.querySelector('[role="alert"]')!.textContent).toBe('Chapter 1 was not rewritten. The writer is busy. Chapter 1 is unchanged.');
    expect(chapterOnScreen(1)!.textContent).toContain('The tide pulled back from the drowned gate.');
    expect(container.querySelector<HTMLTextAreaElement>('form[aria-label="Rewrite Chapter 1"] textarea')!.value).toBe('Shorter, please.');
    // Cancel closes the box; the chapter goes on as it was.
    await click(button => button.textContent === 'Cancel', 'Cancel');
    expect(container.querySelector('form[aria-label="Rewrite Chapter 1"]')).toBeNull();
    expect(buttonBy(byLabel('Next Chapter: Write Chapter 2'))).toBeTruthy();
  });

  it('offers no rewrite where the host cannot write chapters', async () => {
    const { controller, storyId } = await story({ written: 1 });
    await mount(<Host controller={controller} storyId={storyId} canWrite={false} />);
    expect(chapterOnScreen(1)).toBeTruthy();
    expect(buttonBy(button => button.textContent === 'Rewrite this chapter')).toBeUndefined();
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

  it('says when the first chapter cannot be written here, and opens the Fate panel from its header', async () => {
    const { controller, storyId } = await story();
    await mount(<Host controller={controller} storyId={storyId} canWrite={false} startOnOpen />);
    expect(container.querySelector('[aria-label="Story start"]')!.textContent).toContain('The first chapter can’t be written here yet.');
    expect(buttonBy(button => button.getAttribute('aria-label')?.startsWith('Next Chapter:') ?? false)).toBeUndefined();

    await click(byLabel('Open Fate'), 'Open Fate');
    const panel = document.querySelector<HTMLElement>('[data-testid="reader-panel-fate"]')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-labelledby')).toBe('fate-page-title');
    expect(panel.querySelector('[data-testid="fate-page"]')).toBeTruthy();
    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    expect(document.querySelector('[data-testid="reader-panel-fate"]')).toBeNull();
    expect(container.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
  });

  it('keeps the chapter on the page under a panel, and gives focus back to what opened it', async () => {
    const { controller, storyId } = await story({ written: 2 });
    await mount(<Host controller={controller} storyId={storyId} />);
    const chapter = chapterOnScreen(1)!;
    buttonBy(byLabel('Reader Settings'))!.focus();

    await click(byLabel('Reader Settings'), 'Reader Settings');
    const panel = document.querySelector<HTMLElement>('[data-testid="reader-settings"]')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    // The same chapter, still on the page and readable: never hidden or taken away.
    expect(chapterOnScreen(1)).toBe(chapter);
    expect(container.querySelector<HTMLElement>('[data-testid="harness-reader"]')!.hidden).toBe(false);
    // A panel is not modal: the chapter is not shut away from the reader.
    expect(panel.getAttribute('aria-modal')).toBeNull();
    expect(document.activeElement?.id).toBe('reader-settings-title');
    // On a phone the sheet has two stops, its circle filled at full height and half filled at half.
    expect(panel.getAttribute('data-stop')).toBe('full');
    await click(byLabel('Show the chapter'), 'Show the chapter');
    expect(panel.getAttribute('data-stop')).toBe('half');
    await click(byLabel('Raise the panel'), 'Raise the panel');
    expect(panel.getAttribute('data-stop')).toBe('full');

    // Opening another closes the first, and focus stays with the one just opened.
    buttonBy(byLabel('Open Fate'))!.focus();
    await click(byLabel('Open Fate'), 'Open Fate');
    await flush(20);
    expect(document.querySelector('[data-testid="reader-settings"]')).toBeNull();
    expect(document.querySelector('[data-testid="reader-panel-fate"]')).toBeTruthy();
    expect(document.activeElement?.id).toBe('fate-page-title');

    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    await flush(20);
    expect(chapterOnScreen(1)).toBe(chapter);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Open Fate');
  });

  it('opens the Codex as a panel over the chapter, which stays on the page', async () => {
    const { controller, storyId } = await story({ written: 2 });
    await mount(<Host controller={controller} storyId={storyId} />);
    const chapter = chapterOnScreen(1)!;
    buttonBy(byLabel('Open Codex'))!.focus();

    await click(byLabel('Open Codex'), 'Open Codex');
    const panel = document.querySelector<HTMLElement>('[data-testid="reader-panel-codex"]')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.querySelector('h2')!.textContent).toBe('Codex');
    expect(document.activeElement?.id).toBe('codex-panel-title');
    // These chapters record nothing, so no category is offered at all.
    expect(panel.querySelector('[role="tablist"]')).toBeNull();
    expect(panel.querySelector('[data-testid="codex-empty"]')!.textContent)
      .toBe('The Codex fills as the story reaches each person, thing and place.');
    // The chapter stays on the page, readable, at the reader's place.
    expect(container.querySelector<HTMLElement>('[data-testid="harness-reader"]')!.hidden).toBe(false);
    expect(chapterOnScreen(1)).toBe(chapter);

    await click(button => button.textContent === 'Back to reading', 'Back to reading');
    await flush(20);
    expect(document.querySelector('[data-testid="reader-panel-codex"]')).toBeNull();
    expect(chapterOnScreen(1)).toBe(chapter);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Open Codex');
  });
});

describe('Read Aloud in the HARNESS Reader', { timeout: 20_000 }, () => {
  const PICKS: ReadAloudVoicePicks = { en: { narrator: ['Daniel'], protagonist: ['Rishi'], side: ['Samantha'] } };
  let speech: FakeSpeechSynthesis;
  let uninstall: () => void;
  const memory = () => {
    const values = new Map<string, string>();
    const storage: ReaderPreferenceStorage = { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
    return { values, storage };
  };
  const lastSpoken = () => speech.spoken.at(-1)!;
  /** The current line ends; the next one begins. */
  const next = async () => { await act(async () => { speech.start(); speech.finish(); }); await flush(60); };

  beforeEach(() => {
    ({ fake: speech, uninstall } = installFakeSpeechSynthesis());
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Range.prototype.getClientRects = () => [{ left: 10, top: 20, right: 90, bottom: 40, width: 80, height: 20 }] as unknown as DOMRectList;
  });
  afterEach(() => {
    uninstall();
    vi.unstubAllGlobals();
  });

  it('opens compact playback and chapter groups without changing their actions', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 639px)', media: query,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    const { controller, storyId } = await story({ written: 2 });
    const { storage, values } = memory();
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={storage} readAloudVoices={PICKS} />);
    const controls = container.querySelector('[data-testid="reader-controls-row"]')!;
    expect([...controls.querySelectorAll('button')].map(button => button.getAttribute('aria-label')))
      .toEqual(['Listen', 'Playback controls', 'Open Codex', 'Chapter controls', 'Create mode']);
    await click(byLabel('Listen'), 'Listen');
    await click(byLabel('Playback controls'), 'Playback controls');
    expect(buttonBy(byLabel('Narration speed: 1.5'))).toBeUndefined();
    await click(byLabel('Narration playback speed'), 'speed options');
    await click(byLabel('Narration speed: 1.5'), 'speed in compact playback');
    expect(JSON.parse(values.get('read-aloud')!)).toMatchObject({ rate: 1.5 });
    await click(byLabel('Next sentence'), 'Next sentence');
    expect(lastSpoken().text).toBe('The tide pulled back from the drowned gate.');
    await click(byLabel('Playback controls'), 'close playback');
    await flush(400);
    await click(byLabel('Chapter controls'), 'Chapter controls');
    expect(buttonBy(byLabel('Previous Chapter'))!.disabled).toBe(true);
    await click(byLabel('Next Chapter'), 'Next Chapter');
    await flush(400);
    expect(chapterOnScreen(2)).toBeTruthy();
    expect(buttonBy(byLabel('Chapter controls'))!.getAttribute('aria-expanded')).toBe('false');
    await click(byLabel('Chapter controls'), 'Chapter controls');
    await click(byLabel('Open Fate'), 'Fate inside chapter controls');
    await flush(400);
    expect(document.querySelector('[data-testid="reader-panel-fate"]')).toBeTruthy();
    expect(buttonBy(byLabel('Chapter controls'))!.getAttribute('aria-expanded')).toBe('false');
  });

  it('places a Sound Cue asked for in words in Create mode: on what Listen just read, or on named words', async () => {
    // Create mode's overlay measures the page as it changes size.
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    const { controller, storyId } = await story({ written: 2 });
    let tools: ReaderHostTools | undefined;
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={memory().storage} readAloudVoices={PICKS}
      renderHostTools={current => { tools = current; return null; }} />);
    // Chapter 1 is sealed, and Create mode is closed: no Create mode commands.
    expect(tools?.createMode).toBeUndefined();
    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(tools?.createMode).toBeUndefined();
    await click(byLabel('Create mode'), 'Create mode');
    const sounds = tools!.createMode!.sounds;
    expect(sounds.chapterNumber).toBe(2);
    const sound = sounds.soundWords[0];
    // Before Listen, "right there" has nowhere to go.
    expect(sounds.resolve(sound, { kind: 'just-read' })).toMatchObject({ ok: false, problem: expect.stringContaining('Start Listen first') });
    await click(button => button.textContent?.trim() === 'Listen', 'Listen');
    await next();
    expect(lastSpoken().text).toBe('A keeper waited on the causeway with a lantern.');
    const heard = tools!.createMode!.sounds.resolve(sound, { kind: 'just-read' });
    expect(heard).toMatchObject({ ok: true, paragraph: 0, cue: { anchor: { blockId: 'c2-p1', selectedText: 'with a lantern' }, payload: { origin: 'manual', sound } } });
    if (!heard.ok) return;
    await act(async () => { await tools!.createMode!.sounds.place(heard.cue); });
    const named = tools!.createMode!.sounds.resolve(sound, { kind: 'words', words: 'the name the city' });
    expect(named).toMatchObject({ ok: true, paragraph: 1, cue: { anchor: { blockId: 'c2-p2', selectedText: 'the name the city' } } });
    if (!named.ok) return;
    await act(async () => { await tools!.createMode!.sounds.place(named.cue); });
    const saved = controller.snapshot().chapters.find(chapter => chapter.chapterNumber === 2)!;
    expect(saved.soundCues?.map(cue => cue.anchor.selectedText)).toEqual(['with a lantern', 'the name the city']);
    expect(saved.paragraphs).toEqual(controller.snapshot().chapters[1].paragraphs);
    // The same words cannot hold a second cue.
    expect(tools!.createMode!.sounds.resolve(sound, { kind: 'words', words: 'a lantern' })).toMatchObject({ ok: false, problem: expect.stringContaining('already has a Sound Cue') });
    // Leaving Create mode takes its commands away.
    await click(byLabel('Create mode'), 'Back to reading');
    expect(tools?.createMode).toBeUndefined();
  });

  it('reads the chapter from its title in the host\'s voices, lighting the sentence being spoken', async () => {
    const { controller, storyId } = await story({ written: 2 });
    const { storage } = memory();
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={storage} readAloudVoices={PICKS} />);

    expect(buttonBy(byLabel('Previous sentence'))!.disabled).toBe(false);
    expect(buttonBy(byLabel('Next sentence'))!.disabled).toBe(false);
    expect(container.querySelector('[aria-label="Stop"]')).toBeNull();
    await click(button => button.textContent?.trim() === 'Listen', 'Listen');
    expect(lastSpoken().text).toBe('Chapter 1. Low Tide');
    expect(lastSpoken().voice?.name).toBe('Daniel');
    expect(container.querySelector('h1[data-speaking]')!.textContent).toBe('Low Tide');
    expect(container.querySelector('[data-testid="read-aloud-speaker"]')!.textContent).toBe('Narrator');
    const controls = container.querySelector('[data-testid="reader-controls-row"]')!;
    expect(container.querySelector('[data-testid="read-aloud-strip"]')).toBeNull();
    expect([...controls.querySelectorAll('button')].map(button => button.getAttribute('aria-label')))
      .toEqual(['Pause', 'Previous sentence', 'Narration playback speed', 'Next sentence', 'Open Codex', 'Previous Chapter', 'Open Fate', 'Next Chapter', 'Create mode']);

    await next();
    expect(lastSpoken().text).toBe('The tide pulled back from the drowned gate.');
    const mark = container.querySelector('[data-overlay-id="read-aloud"]');
    expect(mark).toBeTruthy();
    expect(container.querySelector('h1[data-speaking]')).toBeNull();

    // A cue that is loading in the same paragraph never hides the light on a later sentence.
    await next();
    expect(lastSpoken().text).toBe('Mara froze as the beast roared beyond the seawall.');
    await act(async () => { buttonBy(button => button.dataset.cuePhrase === 'the beast roared')!.click(); });
    await next();
    expect(lastSpoken().text).toBe('Nothing answered it.');
    expect(container.querySelector('[data-overlay-id="read-aloud"]')).toBeTruthy();

    await click(byLabel('Pause'), 'Pause');
    expect(container.querySelector('[data-testid="read-aloud-player"]')!.getAttribute('data-status')).toBe('paused');
    await click(byLabel('Resume'), 'Resume');
    expect(container.querySelector('[data-testid="read-aloud-player"]')!.getAttribute('data-status')).toBe('playing');
    expect(controls.querySelector('[aria-label="Stop"]')).toBeNull();
    expect(controls.querySelector('[aria-label="Previous sentence"]')).toBeTruthy();
  });

  it('Reader Settings separates Text and Narration, with saved voices and speed across category changes', async () => {
    const { controller, storyId } = await story({ written: 1 });
    const { storage, values } = memory();
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={storage} readAloudVoices={PICKS} />);

    // At normal speed the bar shows a quiet divider, not a number.
    expect(container.querySelector('[data-testid="reader-narration-speed"]')!.textContent).toBe('∶');
    await click(byLabel('Narration playback speed'), 'speed picker');
    expect(buttonBy(byLabel('Narration speed: 1'))!.getAttribute('aria-pressed')).toBe('true');
    await click(byLabel('Narration speed: 0.5'), 'Half speed');
    expect(container.querySelector('[data-testid="reader-narration-speed"]')!.textContent).toBe('½');
    expect(JSON.parse(values.get('read-aloud')!)).toMatchObject({ v: 1, rate: 0.5 });
    await click(byLabel('Reader Settings'), 'Reader Settings');
    const dialog = container.ownerDocument.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.querySelector('h2')!.textContent).toBe('Reader Settings');
    expect([...dialog.querySelectorAll('[role="tab"]')].map(tab => tab.textContent)).toEqual(['Text', 'Narration']);
    expect(dialog.querySelector('[data-testid="reader-settings-text"]')).not.toBeNull();
    expect(dialog.querySelector('[data-testid="reader-settings-narration"]')).toBeNull();
    expect(dialog.querySelector('[data-testid="reader-text-sample"]')).toBeNull();
    await click(button => button.getAttribute('role') === 'tab' && button.textContent === 'Narration', 'Narration tab');
    expect(dialog.textContent).not.toMatch(/Codex|Mind Palace|Audio|Customize|Accessibility/);
    const selected = (role: string) => {
      const select = dialog.querySelector<HTMLSelectElement>(`select[data-voice-role="${role}"]`)!;
      return select.options[select.selectedIndex].textContent;
    };
    expect([selected('narrator'), selected('protagonist'), selected('side')]).toEqual(['Daniel (en-GB)', 'Rishi (en-IN)', 'Samantha (en-US)']);
    expect(dialog.querySelector('optgroup')!.getAttribute('label')).toBe('English voices');

    expect(dialog.querySelector<HTMLInputElement>('input[name="read-aloud-rate"][value="0.5"]')!.checked).toBe(true);
    await act(async () => { dialog.querySelector<HTMLInputElement>('input[name="read-aloud-rate"][value="1.5"]')!.click(); });
    const speed = container.querySelector('[data-testid="reader-narration-speed"]')!;
    expect(speed.textContent).toBe('1½');
    expect(dialog.querySelector<HTMLInputElement>('input[name="read-aloud-rate"][value="1.5"]')!.checked).toBe(true);
    expect(JSON.parse(values.get('read-aloud')!)).toMatchObject({ v: 1, rate: 1.5 });
    await act(async () => { dialog.querySelector<HTMLInputElement>('input[name="read-aloud-rate"][value="1.25"]')!.click(); });
    expect(speed.textContent).toBe('1¼');
    expect(JSON.parse(values.get('read-aloud')!)).toMatchObject({ v: 1, rate: 1.25 });
    await act(async () => { buttonBy(byLabel('Preview the Side characters voice'))!.click(); });
    await flush();
    expect(lastSpoken().voice?.name).toBe('Samantha');
    expect(lastSpoken().rate).toBe(1.25);

    await click(button => button.getAttribute('role') === 'tab' && button.textContent === 'Text', 'Text tab');
    expect(dialog.querySelector('[data-testid="reader-settings-narration"]')).toBeNull();
    await click(button => button.getAttribute('role') === 'tab' && button.textContent === 'Narration', 'Narration tab');
    expect(dialog.querySelector<HTMLInputElement>('input[name="read-aloud-rate"][value="1.25"]')!.checked).toBe(true);

    await click(byLabel('Close Reader Settings'), 'Close Reader Settings');
    expect(container.ownerDocument.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reads on while the Fate panel is open over the chapter, and keeps listening into the next chapter', async () => {
    const { controller, storyId } = await story({ written: 2 });
    await mount(<Host controller={controller} storyId={storyId} readAloudVoices={PICKS} />);
    await click(button => button.textContent?.trim() === 'Listen', 'Listen');
    await next();
    const cancels = speech.cancels;

    // A panel leaves the chapter on the page, so the voice is never cut off.
    await click(byLabel('Open Fate'), 'Open Fate');
    expect(speech.cancels).toBe(cancels);
    expect(container.querySelector('[data-testid="read-aloud-player"]')!.getAttribute('data-status')).toBe('playing');

    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    await flush();
    expect(speech.cancels).toBe(cancels);
    expect(lastSpoken().text).toBe('The tide pulled back from the drowned gate.');

    await click(byLabel('Next Chapter'), 'Next Chapter');
    await flush();
    expect(lastSpoken().text).toBe('Chapter 2. The Bell Keeper');
  });
});

describe('The soundtrack in the HARNESS Reader', { timeout: 20_000 }, () => {
  const PICKS: ReadAloudVoicePicks = { en: { narrator: ['Daniel'], protagonist: ['Rishi'], side: ['Samantha'] } };
  const BEAST_ROAR = /Beasts\/Roar\//;
  let observed: { callback: IntersectionObserverCallback; target?: Element }[];
  const mixerFor = () => {
    const values = new Map<string, string>();
    const storage: ReaderPreferenceStorage = { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
    return { mixer: createHostReaderMixer(storage), values, storage };
  };
  const choose = async (select: HTMLSelectElement, value: string) => {
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
  };
  const mountWithMixer = async (mixer: ReaderMixer, element: React.ReactElement) => {
    await act(async () => { root.render(renderWithDevAudio(<ReaderMixerProvider mixer={mixer}>{element}</ReaderMixerProvider>)); });
    await flush();
  };
  const note = () => container.querySelector<HTMLButtonElement>('[data-testid="story-audio-note"] button');
  /** Opens the lazily loaded Audio panel and waits for it. */
  const audioPanel = async () => {
    await click(button => button.getAttribute('role') === 'tab' && button.textContent === 'Audio', 'Audio tab');
    for (let tries = 0; tries < 50 && !container.ownerDocument.querySelector('[data-testid="reader-settings-audio"] .sap-reader-mixer'); tries++) await flush(20);
    return container.ownerDocument.querySelector<HTMLElement>('[data-testid="reader-settings-audio"]')!;
  };

  beforeEach(() => {
    observed = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) { observed.push({ callback: this.callback, target }); }
      disconnect() { observed = observed.filter(entry => entry.callback !== this.callback); }
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('plays the reader\'s atmosphere and the chapter\'s cues through the mixer, shows only what the chapter uses, and stops on leaving', async () => {
    const { controller, storyId } = await story({ written: 2 });
    const { mixer } = mixerFor();
    const startAtmosphere = vi.spyOn(mixer, 'startAtmosphere');
    const stopAll = vi.spyOn(mixer, 'stopAll');
    const preloadCues = vi.spyOn(mixer, 'preloadCues');
    const playCue = vi.spyOn(mixer, 'playCue');
    const notifyChapterEnd = vi.spyOn(mixer, 'notifyChapterEnd');
    await mountWithMixer(mixer, <Host controller={controller} storyId={storyId} />);

    expect(startAtmosphere).toHaveBeenCalledTimes(1);
    // Chapter 1 has a Sound Cue: Sound Cues show in Audio and its sound is warmed. The music always shows.
    expect(mixer.getState().availability).toMatchObject({ soundscapes: true, atmosphere: true, cues: true });
    expect(preloadCues).toHaveBeenCalledWith([expect.stringMatching(BEAST_ROAR)]);
    // Tapping the cue plays it over the soundtrack, at the writer's Energy (high).
    await act(async () => { buttonBy(button => button.dataset.cuePhrase === 'the beast roared')!.click(); });
    expect(playCue).toHaveBeenCalledWith(expect.stringMatching(BEAST_ROAR), { volume: 1 });

    // Reaching the chapter's end (its next step, at the newest chapter) is the chapter's end, for an End of chapter timer.
    expect(observed.map(entry => entry.target?.getAttribute('data-testid'))).toEqual(['reader-chapter-end']);
    act(() => observed[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(notifyChapterEnd).toHaveBeenCalledTimes(1);

    // Chapter 2 has no cue: Sound Cues leave Audio settings.
    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(mixer.getState().availability.cues).toBe(false);

    // What opens over the chapter never quiets it: the atmosphere plays on under Fate and the Codex.
    const stopAtmosphere = vi.spyOn(mixer, 'stopAtmosphere');
    await click(byLabel('Open Fate'), 'Open Fate');
    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    await click(byLabel('Open Codex'), 'Open Codex');
    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    expect(stopAtmosphere).not.toHaveBeenCalled();
    expect(startAtmosphere).toHaveBeenCalledTimes(1);

    const cancelSleepTimer = vi.spyOn(mixer, 'cancelSleepTimer');
    act(() => root.unmount());
    // Leaving ends the session and the atmosphere; the music is left to the soundtrack.
    expect(stopAtmosphere).toHaveBeenCalledTimes(1);
    expect(cancelSleepTimer).toHaveBeenCalledTimes(1);
    expect(stopAll).not.toHaveBeenCalled();
    root = createRoot(container);
  });

  it('plays the music and atmosphere each chapter\'s writer chose at its start', async () => {
    const { controller, storyId } = await story({
      written: 2,
      replies: [
        reply('Low Tide', ['[[soundtrack: fighting | ancient battlefield]] The tide pulled back from the drowned gate.', 'Mara counted the bells.']),
        reply('The Bell Keeper', ['[[soundtrack: sad | gentle rain]] A keeper waited on the causeway with a lantern.', 'He asked for her name.']),
      ],
    });
    const beds = (word: string) => LIBRARY_BASE_MEDIA.atmospheres!.filter(entry => entry.word === word).map(entry => entry.id);
    const saved = controller.snapshot().chapters;
    // The beds that share a word take turns: Chapter 2 hears the second gentle rain.
    expect(saved.map(chapter => chapter.scene)).toEqual([
      { soundscape: 'fighting', atmosphere: beds('ancient battlefield')[0] },
      { soundscape: 'sad', atmosphere: beds('gentle rain')[1] },
    ]);
    expect(saved[0].paragraphs[0]).toBe('The tide pulled back from the drowned gate.');

    const { mixer } = mixerFor();
    await mountWithMixer(mixer, <Host controller={controller} storyId={storyId} />);
    const moodOf = (mood: string) => piecesForMood(mood, SEN_SOUNDSCAPES).map(piece => piece.id);
    expect(moodOf('fighting')).toContain(storySoundtrack(mixer).piece()?.id);
    expect(mixer.getPreferences().atmosphereId).toBe(beds('ancient battlefield')[0]);

    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(moodOf('sad')).toContain(storySoundtrack(mixer).piece()?.id);
    expect(mixer.getPreferences().atmosphereId).toBe(beds('gentle rain')[1]);
  });

  it('lets the reader keep their own music and atmosphere from Reader Settings, or give the choice back to each chapter', async () => {
    const { controller, storyId } = await story({ written: 1 });
    const { mixer, values, storage } = mixerFor();
    await mountWithMixer(mixer, <Host controller={controller} storyId={storyId} readerPreferences={storage} />);
    await click(byLabel('Reader Settings'), 'Reader Settings');
    const audio = await audioPanel();
    const scene = audio.querySelector<HTMLElement>('[data-testid="reader-soundtrack-choice"]')!;
    const piece = scene.querySelector<HTMLSelectElement>('#reader-soundtrack-piece')!;
    const atmosphere = scene.querySelector<HTMLSelectElement>('#reader-soundtrack-atmosphere')!;
    // Automatic until the reader chooses; the atmosphere is chosen here, beside the music, not in the mixer's own picker.
    expect([piece.value, atmosphere.value]).toEqual(['automatic', 'automatic']);
    const mixerPanel = audio.querySelector('.sap-reader-mixer')!;
    expect(mixerPanel.textContent).toContain('Atmosphere');
    expect(mixerPanel.textContent).not.toContain('Gentle Rain 1');
    expect([...piece.querySelectorAll('optgroup')].map(group => group.label)).toEqual(['Adventure', 'Ambient', 'Emotions', 'Fighting', 'War']);
    // A chapter written before scenes plays the Reader's own music, never the host's.
    const own = storySoundtrack(mixer).piece();
    expect(piecesForMood(READER_MUSIC_MOOD, SEN_SOUNDSCAPES).map(piece => piece.id)).toContain(own?.id);
    expect(scene.querySelector('[data-testid="reader-soundtrack-now"]')!.textContent).toBe(`Now: ${own!.label} · Gentle Rain 1`);

    const lament = SEN_SOUNDSCAPES.find(entry => entry.mood === 'sad')!;
    const waves = SEN_ATMOSPHERES.find(option => option.group === 'Waves')!;
    await choose(piece, lament.id);
    await choose(atmosphere, waves.id);
    expect(storySoundtrack(mixer).piece()?.id).toBe(lament.id);
    expect(mixer.getPreferences().atmosphereId).toBe(waves.id);
    expect(scene.querySelector('[data-testid="reader-soundtrack-now"]')!.textContent).toBe(`Now: ${lament.label} · ${waves.label}`);
    // Kept on the device, for every story.
    expect(JSON.parse(values.get('soundtrack-choice')!)).toMatchObject({ soundscape: { pieceId: lament.id }, atmosphere: { atmosphereId: waves.id } });

    // Back to Automatic: the chapter (written before scenes) chooses nothing, so the Reader's own music returns and the atmosphere stays.
    await choose(piece, 'automatic');
    await choose(atmosphere, 'automatic');
    expect(piecesForMood(READER_MUSIC_MOOD, SEN_SOUNDSCAPES).map(entry => entry.id)).toContain(storySoundtrack(mixer).piece()?.id);
    expect(mixer.getPreferences().atmosphereId).toBe(waves.id);
    expect(JSON.parse(values.get('soundtrack-choice')!)).toMatchObject({ soundscape: 'automatic', atmosphere: 'automatic' });

    // Presets still use the mixer's own state after moving below the primary levels.
    const preset = mixer.getState().presets.find(preset => preset.label === 'Cinematic')!;
    expect(preset).toBeTruthy();
    await act(async () => { audio.querySelector<HTMLInputElement>(`input[name="reader-audio-preset"][value="${preset.id}"]`)!.click(); });
    expect(mixer.getState().activePresetId).toBe(preset.id);
    await click(button => button.getAttribute('role') === 'tab' && button.textContent === 'Text', 'Text tab');
    const reopened = await audioPanel();
    expect(reopened.querySelector<HTMLInputElement>(`input[name="reader-audio-preset"][value="${preset.id}"]`)!.checked).toBe(true);
  });

  it('tap mutes without hiding the note, hold opens volume, and only Settings Master hides it', async () => {
    const { controller, storyId } = await story({ written: 1 });
    const { mixer, values } = mixerFor();
    // A browser without speech still gets the note and the gear, for the soundtrack.
    await mountWithMixer(mixer, <Host controller={controller} storyId={storyId} />);
    expect(container.querySelector('[data-testid="read-aloud-player"]')).toBeNull();
    expect(note()!.getAttribute('aria-label')).toBe('Mute story audio');

    await act(async () => { mixer.setMasterLevel(0); });
    expect(mixer.getState().preferences.masterEnabled).toBe(true);
    expect(note()).not.toBeNull();
    await act(async () => { mixer.setMasterLevel(1); });

    await act(async () => { note()!.click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(true);
    expect(mixer.getState().preferences.masterMuted).toBe(true);
    expect(note()!.getAttribute('aria-label')).toBe('Unmute story audio');
    // The reader's mix is kept on the device, never in the story.
    await flush(350);
    expect(JSON.parse(values.get('audio-mixer')!)).toMatchObject({ masterEnabled: true, masterMuted: true });

    await act(async () => { note()!.click(); });
    expect(mixer.getState().preferences.masterMuted).toBe(false);
    await act(async () => { note()!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 })); });
    await flush(650);
    expect(container.querySelector('[aria-label="Quick master volume"]')).not.toBeNull();
    expect(container.querySelector('input[aria-label="Quick master volume"]')!.getAttribute('aria-orientation')).toBe('vertical');
    expect(container.ownerDocument.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => { note()!.dispatchEvent(new MouseEvent('pointerup', { bubbles: true })); note()!.click(); });
    expect(mixer.getPreferences().masterMuted).toBe(false);
    await act(async () => { mixer.setMasterLevel(0); });
    expect(note()).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[aria-label="Quick master volume"]')!.value).toBe('0');
    await act(async () => { container.querySelector('input[aria-label="Quick master volume"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); mixer.setMasterLevel(1); });

    // Settings can restore the master switch even while the floating note is absent.
    await click(byLabel('Reader Settings'), 'Reader Settings');
    const masterPanel = await audioPanel();
    const master = masterPanel.querySelector<HTMLElement>('.sap-reader-mixer__row--master [role="switch"]')!;
    expect(master).not.toBeNull();
    await act(async () => { note()!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); });
    const quickVolume = container.querySelector<HTMLInputElement>('input[aria-label="Quick master volume"]')!;
    const settingsVolume = masterPanel.querySelector<HTMLInputElement>('input[type="range"]')!;
    const changeVolume = async (input: HTMLInputElement, value: string) => act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await changeVolume(quickVolume, '37');
    expect(settingsVolume.value).toBe('37');
    await changeVolume(settingsVolume, '62');
    expect(quickVolume.value).toBe('62');
    await changeVolume(quickVolume, '0');
    expect(settingsVolume.value).toBe('0');
    expect(note()).not.toBeNull();
    await act(async () => { note()!.click(); });
    expect(mixer.getPreferences().masterLevel).toBe(0.62);
    expect(quickVolume.value).toBe('62');
    expect(settingsVolume.value).toBe('62');
    await act(async () => { master.click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(false);
    expect(note()).toBeNull();
    await act(async () => { master.click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(true);
    expect(note()!.getAttribute('aria-label')).toBe('Mute story audio');
    expect(container.querySelector('input[aria-label="Quick master volume"]')).toBeNull();
    await click(byLabel('Close Reader Settings'), 'Close Reader Settings');

    await click(byLabel('Reader Settings'), 'Reader Settings');
    const audio = await audioPanel();
    const dialog = container.ownerDocument.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-label') ?? dialog.querySelector('h2')!.textContent).toBe('Reader Settings');
    expect([...dialog.querySelectorAll('[role="tab"]')].map(tab => tab.textContent)).toEqual(['Text', 'Audio', 'Narration']);
    // The layers this chapter uses: the music, the atmosphere and Sound Cues, never Voice yet.
    expect(audio.textContent).toContain('Soundscapes');
    expect(audio.textContent).toContain('Atmosphere');
    expect(audio.textContent).toContain('Sound Cues');
    expect(audio.textContent).not.toMatch(/Voice/);
    // Without speech, Narration explains its unavailable state.
    await click(button => button.getAttribute('role') === 'tab' && button.textContent === 'Narration', 'Narration tab');
    expect(dialog.querySelector('[data-testid="reader-settings-narration"]')!.textContent).toContain("This browser can't read aloud.");
  });

  it('dips the soundtrack under Listen and keeps the reader active, and a sleep timer stops Listen too', async () => {
    const { fake: speech, uninstall } = installFakeSpeechSynthesis();
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Range.prototype.getClientRects = () => [{ left: 10, top: 20, right: 90, bottom: 40, width: 80, height: 20 }] as unknown as DOMRectList;
    try {
      const { controller, storyId } = await story({ written: 1 });
      const { mixer } = mixerFor();
      const leases: { setDuck: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }[] = [];
      const retainDuck = mixer.retainDuck.bind(mixer);
      vi.spyOn(mixer, 'retainDuck').mockImplementation(() => {
        const lease = retainDuck();
        const spied = { setDuck: vi.fn(lease.setDuck), release: vi.fn(lease.release) };
        leases.push(spied);
        return spied;
      });
      const releaseActivity = vi.fn();
      vi.spyOn(mixer, 'retainActivity').mockImplementation(() => releaseActivity);
      let sleep = (_event: ReaderMixerSleepEvent) => undefined as void;
      vi.spyOn(mixer, 'subscribeSleep').mockImplementation(listener => { sleep = listener; return () => undefined; });
      await mountWithMixer(mixer, <Host controller={controller} storyId={storyId} readAloudVoices={PICKS} />);

      // Settings holds Text, then Audio, then Narration.
      await click(byLabel('Reader Settings'), 'Reader Settings');
      await audioPanel();
      expect([...container.ownerDocument.querySelectorAll('[role="dialog"] [role="tab"]')].map(tab => tab.textContent)).toEqual(['Text', 'Audio', 'Narration']);
      await click(byLabel('Close Reader Settings'), 'Close Reader Settings');

      await click(button => button.textContent?.trim() === 'Listen', 'Listen');
      await act(async () => { speech.start(); });
      await flush();
      expect(leases).toHaveLength(1);
      expect(leases[0].setDuck).toHaveBeenCalledWith(LISTEN_DUCK);
      expect(mixer.retainActivity).toHaveBeenCalledTimes(1);

      await click(byLabel('Pause'), 'Pause');
      expect(leases[0].release).toHaveBeenCalled();
      expect(releaseActivity).toHaveBeenCalled();

      await click(byLabel('Resume'), 'Resume');
      await act(async () => { speech.start(); });
      await flush();
      act(() => sleep({ choiceId: 'end-of-chapter', firedAt: Date.now() }));
      await flush();
      expect(buttonBy(button => button.textContent?.trim() === 'Listen')).toBeTruthy();
    } finally {
      uninstall();
    }
  });
});

describe('The Reader frame and its chapter body', { timeout: 20_000 }, () => {
  const FONTS: ReaderFonts = {
    text: [{ id: 'house-sans', label: 'House Sans', family: '"House Sans", sans-serif' }, { id: 'house-serif', label: 'House Serif', family: '"House Serif", serif' }],
    titles: [{ id: 'house-soft', label: 'House Soft', family: '"House Soft", serif' }, { id: 'house-edge', label: 'House Edge', family: '"House Edge", serif' }],
  };
  const memory = () => {
    const values = new Map<string, string>();
    const storage: ReaderPreferenceStorage = { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
    return { values, storage };
  };
  const dialog = () => container.ownerDocument.querySelector<HTMLElement>('[role="dialog"]')!;
  const pick = async (name: string, value: string) => {
    await act(async () => { dialog().querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!.click(); });
  };

  it('sets the chapter in the host\'s fonts, and Reader Settings → Text changes and keeps them on the device', async () => {
    const { controller, storyId } = await story({ written: 1 });
    const { storage, values } = memory();
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={storage} readerFonts={FONTS} />);

    // The host's first fonts, at the Reader's size and spacing, about 60 characters a line.
    const article = chapterOnScreen(1)!;
    expect(article.style.fontFamily).toBe('"House Sans", sans-serif');
    // On a wide screen the frame's scale enlarges the text and its measure lets the lines run a little longer.
    expect(article.style.fontSize).toBe('calc(1.075rem * var(--reader-scale, 1))');
    expect(article.style.getPropertyValue('--sen-text-line-height')).toBe('1.85');
    expect(article.className).toContain('max-w-[var(--reader-measure,34em)]');
    expect(article.querySelector<HTMLElement>('h1')!.style.fontFamily).toBe('"House Soft", serif');

    // The top bar's story and chapter open the chapter list; the bottom bar mirrors playback and the chapter arrows, Fate between them, around Codex.
    const bar = container.querySelector<HTMLElement>('[data-testid="reader-top-bar"]')!;
    expect(bar.querySelector('[data-testid="reader-place"]')!.textContent).toBe('Chapter 1 · Low Tide');
    expect([...bar.querySelectorAll('button')].map(button => button.getAttribute('aria-label')))
      .toEqual(['Back', 'Select chapter: Chapter 1', 'Reader Settings']);
    const bottom = container.querySelector<HTMLElement>('[data-testid="reader-bottom-bar"]')!;
    expect([...bottom.querySelectorAll('button')].map(button => button.getAttribute('aria-label')))
      .toEqual(['Previous sentence', 'Narration playback speed', 'Next sentence', 'Open Codex', 'Previous Chapter', 'Open Fate', 'Next Chapter: Write Chapter 2', 'Create mode']);
    // The far right keeps the coming Create mode's place.
    expect(bottom.querySelector('[data-testid="reader-create-slot"]')).toBeTruthy();
    // An English story reads left to right.
    expect(container.querySelector('.reader-frame')!.getAttribute('dir')).toBe('ltr');

    await click(byLabel('Reader Settings'), 'Reader Settings');
    expect([...dialog().querySelectorAll('[data-testid="reader-settings-text"] legend')].map(legend => legend.textContent))
      .toEqual(['Font', 'Title font', 'Size', 'Line spacing', 'Weight']);
    await pick('reader-text-font', 'house-serif');
    await pick('reader-title-font', 'house-edge');
    await pick('reader-text-size', 'larger');
    await pick('reader-line-spacing', 'compact');
    await pick('reader-text-weight', '300');
    expect(article.style.fontFamily).toBe('"House Serif", serif');
    expect(article.style.fontSize).toBe('calc(1.25rem * var(--reader-scale, 1))');
    expect(article.style.getPropertyValue('--sen-text-line-height')).toBe('1.5');
    expect(article.style.fontWeight).toBe('300');
    expect(article.querySelector<HTMLElement>('h1')!.style.fontFamily).toBe('"House Edge", serif');
    expect(JSON.parse(values.get('text-settings')!)).toEqual({ v: 1, font: 'house-serif', titleFont: 'house-edge', size: 'larger', lineSpacing: 'compact', weight: 300 });

    // A new visit opens in the same settings; Reset text goes back to the host's first fonts.
    act(() => root.unmount());
    root = createRoot(container);
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={storage} readerFonts={FONTS} />);
    expect(chapterOnScreen(1)!.style.fontFamily).toBe('"House Serif", serif');
    await click(byLabel('Reader Settings'), 'Reader Settings');
    await act(async () => { [...dialog().querySelectorAll('button')].find(button => button.textContent?.trim() === 'Reset text')!.click(); });
    expect(chapterOnScreen(1)!.style.fontFamily).toBe('"House Sans", sans-serif');
    expect(chapterOnScreen(1)!.style.fontSize).toBe('calc(1.075rem * var(--reader-scale, 1))');
  });

  it('reads a right-to-left story right to left: the frame, its chapter arrows and its chapter list mirror; the sentence controls do not', async () => {
    const { controller, storyId } = await story({ written: 2, language: 'ar', replies: [
      reply('المد المنحسر', ['انحسر المد عن البوابة الغارقة.', 'تجمّدت مارا حين [[sound: beast roar | زأر الوحش | high]] خلف السور البحري، عند البوابة رقم 7.']),
      reply('حارس الجرس', ['كان حارسٌ ينتظر على الممرّ بفانوسه.']),
    ] });
    await mount(<Host controller={controller} storyId={storyId} />);

    const frame = container.querySelector<HTMLElement>('.reader-frame')!;
    expect(frame.getAttribute('dir')).toBe('rtl');
    // The chapter is set in its own language, inside the mirrored frame, its Sound Cue on its Arabic words.
    const article = chapterOnScreen(1)!;
    expect(article.getAttribute('lang')).toBe('ar');
    expect(frame.contains(article)).toBe(true);
    expect(article.querySelector('h1')!.textContent).toBe('المد المنحسر');
    expect(article.textContent).toContain('زأر الوحش');
    // Back and the chapter arrows point the way a right-to-left reader turns pages, at the mirrored ends of their pill.
    const bottom = container.querySelector<HTMLElement>('[data-testid="reader-bottom-bar"]')!;
    const previous = buttonBy(byLabel('Previous Chapter'))!;
    const next = bottom.querySelector<HTMLButtonElement>('nav[aria-label="Chapters"] button:last-child')!;
    expect(previous.className).toContain('rounded-s-full');
    expect(next.className).toContain('rounded-e-full');
    for (const button of [previous, next, buttonBy(byLabel('Back'))!]) expect(button.querySelector('svg')!.getAttribute('class')).toContain('rtl:-scale-x-100');
    // Sentence controls are media controls: they keep their order in every language.
    expect(bottom.querySelector('[aria-label="Playback controls"]')!.getAttribute('dir')).toBe('ltr');
    // The chapter list opens outside the frame, so it is given the story's direction.
    await click(byLabel('Select chapter: Chapter 1'), 'Select chapter');
    const picker = document.querySelector<HTMLElement>('[data-testid="reader-chapter-picker"]')!;
    expect(picker.getAttribute('dir')).toBe('rtl');
    expect([...picker.querySelectorAll('button')].map(button => button.getAttribute('aria-label'))).toEqual(['Chapter 1: المد المنحسر', 'Chapter 2: حارس الجرس']);
  });

  it('shows another chapter body inside the same frame, with the passages it marks', async () => {
    const { controller, storyId } = await story({ written: 2 });
    const seen: string[] = [];
    // A stand-in for a future sequential-art view: one panel per passage.
    const Panels: ReaderChapterBody = ({ chapter, blocks, articleRef, text }) => {
      seen.push(`${chapter.chapterNumber}:${text.font.id}`);
      return <article ref={articleRef} data-chapter-number={chapter.chapterNumber} data-testid="panel-body">
        <h1 data-read-aloud-title="">{chapter.title}</h1>
        {blocks.map(block => <figure key={block.id} data-sen-text-block={block.id}><figcaption>{block.text}</figcaption></figure>)}
      </article>;
    };
    await mount(<Host controller={controller} storyId={storyId} chapterBody={Panels} />);

    const body = chapterOnScreen(1)!;
    expect(body.getAttribute('data-testid')).toBe('panel-body');
    expect([...body.querySelectorAll('figure')].map(figure => figure.getAttribute('data-sen-text-block'))).toEqual(['c1-p1', 'c1-p2', 'c1-p3', 'c1-p4']);
    expect(container.querySelector('.sen-text-highlight-root')).toBeNull();
    expect(seen.at(-1)).toBe('1:serif');
    // The frame stays: the bar, the chapter navigation and Reader Settings.
    expect(container.querySelector('[data-testid="reader-top-bar"]')).toBeTruthy();
    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(chapterOnScreen(2)!.getAttribute('data-testid')).toBe('panel-body');
    await click(byLabel('Reader Settings'), 'Reader Settings');
    expect(dialog().querySelector('h2')!.textContent).toBe('Reader Settings');
  });
});

describe('Create mode in the HARNESS Reader', { timeout: 20_000 }, () => {
  // The overlay measures the page as it changes size.
  const rects = Range.prototype.getClientRects;
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    Range.prototype.getClientRects = () => [{ left: 100, top: 200, right: 170, bottom: 222, width: 70, height: 22 }] as unknown as DOMRectList;
  });
  afterEach(() => { vi.unstubAllGlobals(); Range.prototype.getClientRects = rects; });
  it('opens the newest chapter on the Highlight Engine with its overlays; an earlier chapter is sealed', async () => {
    const { controller, storyId } = await story({ written: 2 });
    await mount(<Host controller={controller} storyId={storyId} />);
    const create = () => buttonBy(byLabel('Create mode'))!;
    // Chapter 1: the story has moved on from it, so it is sealed.
    expect(chapterOnScreen(1)).toBeTruthy();
    expect(create().disabled).toBe(true);
    expect(create().title).toBe('Only the newest chapter can be changed');
    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(create().disabled).toBe(false);
    await click(byLabel('Create mode'), 'Create mode');
    expect(create().getAttribute('aria-pressed')).toBe('true');
    const authoring = container.querySelector<HTMLElement>('[data-testid="chapter-authoring"]')!;
    expect(authoring.getAttribute('data-chapter-number')).toBe('2');
    expect(authoring.querySelector('[data-testid="create-mode-saving"]')!.textContent).toBe('Saved');
    // The Audio overlay is on: its legend explains the page's numbering, and Off hides it.
    expect(authoring.querySelector('[data-testid="overlay-legend"]')!.textContent).toContain('P2 S6');
    await click(button => button.textContent === 'Off' && button.closest('[data-testid="overlay-switch"]') !== null, 'Overlays off');
    expect(authoring.querySelector('[data-testid="overlay-legend"]')).toBeNull();
    expect(authoring.textContent).toContain('Mara');
    // Back to reading: the chapter is prose again.
    await click(byLabel('Create mode'), 'Back to reading');
    expect(container.querySelector('[data-testid="chapter-authoring"]')).toBeNull();
    expect(chapterOnScreen(2)).toBeTruthy();
    // Another chapter closes Create mode.
    await click(byLabel('Create mode'), 'Create mode');
    await click(byLabel('Previous Chapter'), 'Previous Chapter');
    expect(container.querySelector('[data-testid="chapter-authoring"]')).toBeNull();
    expect(create().getAttribute('aria-pressed')).toBe('false');
  });
  it('adds a Sound Cue placed in words to the open Create mode page and its saves', async () => {
    const { controller, storyId } = await story({ written: 2 });
    let tools: ReaderHostTools | undefined;
    await mount(<Host controller={controller} storyId={storyId} renderHostTools={current => { tools = current; return null; }} />);
    await click(byLabel('Next Chapter'), 'Next Chapter');
    await click(byLabel('Create mode'), 'Create mode');
    expect(container.querySelector('[data-testid="create-mode-no-cues"]')).toBeTruthy();
    const placed = tools!.createMode!.sounds.resolve(tools!.createMode!.sounds.soundWords[0], { kind: 'words', words: 'with a lantern' });
    if (!placed.ok) throw new Error(placed.problem);
    await act(async () => { await tools!.createMode!.sounds.place(placed.cue); });
    await flush();
    expect(container.querySelector('[data-testid="chapter-authoring"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="create-mode-no-cues"]')).toBeNull();
    // The cue joined the page itself, through its saves: a second on the same words is refused, and it is saved once.
    await act(async () => { await expect(tools!.createMode!.sounds.place(placed.cue)).rejects.toThrow('already has a Sound Cue'); });
    // A cue whose words moved or changed since it was reviewed is refused, never saved where it cannot play.
    const moved = { ...placed.cue, anchor: { ...placed.cue.anchor, startOffset: placed.cue.anchor.startOffset + 1, endOffset: placed.cue.anchor.endOffset + 1 } };
    await act(async () => { await expect(tools!.createMode!.sounds.place(moved)).rejects.toThrow('changed after you reviewed it'); });
    expect(controller.snapshot().chapters.find(chapter => chapter.chapterNumber === 2)!.soundCues?.map(cue => cue.anchor.selectedText)).toEqual(['with a lantern']);
  });
  it('saves a voice Sound Cue again when its first save failed, instead of refusing it as an overlap', async () => {
    const { controller, storyId } = await story({ written: 2 });
    let tools: ReaderHostTools | undefined;
    await mount(<Host controller={controller} storyId={storyId} renderHostTools={current => { tools = current; return null; }} />);
    await click(byLabel('Next Chapter'), 'Next Chapter');
    await click(byLabel('Create mode'), 'Create mode');
    const placed = tools!.createMode!.sounds.resolve(tools!.createMode!.sounds.soundWords[0], { kind: 'words', words: 'with a lantern' });
    if (!placed.ok) throw new Error(placed.problem);
    const authorChapter = vi.spyOn(controller, 'authorChapter').mockRejectedValueOnce(new Error('Storage is full.'));
    await act(async () => { await expect(tools!.createMode!.sounds.place(placed.cue)).rejects.toThrow('Storage is full.'); });
    await flush();
    await act(async () => { await tools!.createMode!.sounds.place(placed.cue); });
    expect(authorChapter).toHaveBeenCalledTimes(2);
    expect(controller.snapshot().chapters.find(chapter => chapter.chapterNumber === 2)!.soundCues?.map(cue => cue.anchor.selectedText)).toEqual(['with a lantern']);
    // Once saved, the same cue again is an overlap.
    await act(async () => { await expect(tools!.createMode!.sounds.place(placed.cue)).rejects.toThrow('already has a Sound Cue'); });
  });
});
