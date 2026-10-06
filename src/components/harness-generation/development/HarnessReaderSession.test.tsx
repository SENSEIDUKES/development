// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { STOPPED_WRITE_REPLY, writtenChapter } from '../../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessReaderWriting } from '@seihouse/sen/harness-generation';
import type { ReadAloudVoicePicks, ReaderPreferenceStorage, ReaderStateRepository, ReaderStoryState } from '@seihouse/sen/reader-runtime';
import { installFakeSpeechSynthesis, type FakeSpeechSynthesis } from '../../../test-utils/fakeSpeechSynthesis';
import { ReaderMixerProvider, type ReaderMixer, type ReaderMixerSleepEvent } from '@seihouse/audio-player';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';

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
  const generate = vi.fn(async () => {
    await gate;
    return { rawProviderResponse: replies.shift()!, providerReceipt: receipt };
  });
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate,
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

const story = async ({ written = 0, replies }: { written?: number; replies?: string[] } = {}) => {
  const harness = new InMemoryHarnessGenerationRepository();
  const model = scriptedProvider(replies);
  const controller = new HarnessGenerationController({ repository: harness, modelAdapter: model.adapter, media });
  await controller.hydrate();
  const created = await controller.createStory({ premise: 'A courier returns to the drowned city that erased her name.',
    destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL });
  for (let index = 0; index < written; index++) await controller.generateNextChapter(created.id, 'test-model');
  return { harness, controller, storyId: created.id, ...model };
};

/** A host like the Library workspace: it follows the controller and writes chapters with its model. */
function Host({ controller, storyId, readerState, renderWriting, startOnOpen, canWrite = true, canRewrite = false, readerPreferences, readAloudVoices }: {
  controller: HarnessGenerationController; storyId: string; readerState?: ReaderStateRepository;
  renderWriting?: (writing: HarnessReaderWriting) => React.ReactNode; startOnOpen?: boolean; canWrite?: boolean; canRewrite?: boolean;
  readerPreferences?: ReaderPreferenceStorage; readAloudVoices?: ReadAloudVoicePicks;
}) {
  const [state, setState] = useState(controller.snapshot());
  useEffect(() => { const stop = controller.subscribe(setState); return () => { stop(); }; }, [controller]);
  return <HarnessReaderSession state={state} storyId={storyId} controller={controller} onClose={() => undefined}
    readerStateRepository={readerState} renderWriting={renderWriting} startOnOpen={startOnOpen}
    readerPreferences={readerPreferences} readAloudVoices={readAloudVoices}
    onGenerateNextChapter={canWrite ? async () => { await controller.generateNextChapter(storyId, 'test-model'); } : undefined}
    onRewriteChapter={canRewrite ? async note => { await controller.rewriteLatestChapter(storyId, 'test-model', note); } : undefined} />;
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

    // One engine paragraph per HARNESS paragraph, on the chapter's own block ids (the fourth is the rest of the chapter).
    const first = chapterOnScreen(1)!;
    expect(first.querySelector('h1')!.textContent).toBe('Low Tide');
    expect([...first.querySelectorAll('[data-sen-text-block]')].map(block => block.getAttribute('data-sen-text-block'))).toEqual(['c1-p1', 'c1-p2', 'c1-p3', 'c1-p4']);
    // The Sound Cue sits on the words the writer marked; no mark is left in the prose.
    expect(first.querySelector('[data-cue-annotation]')!.getAttribute('data-cue-annotation')).toBe('the beast roared');
    expect(first.textContent).not.toContain('[[');
    // Only Sound Cues: no Codex, no Mind Palace. A browser without speech gets no Listen and no Reader Settings.
    expect(container.textContent).not.toMatch(/Codex|Mind Palace/);
    expect(buttonBy(byLabel('Reader Settings'))).toBeUndefined();
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

  it('a write that stops far short of a chapter saves nothing, says so, and the reader tries again', async () => {
    const { controller, storyId } = await story({ replies: [STOPPED_WRITE_REPLY, ...CHAPTERS] });
    await mount(<Host controller={controller} storyId={storyId} />);

    await click(byLabel('Next Chapter: Write Chapter 1'), 'Write Chapter 1');
    expect(chapterOnScreen(1)).toBeNull();
    expect(container.querySelector('[role="alert"]')!.textContent)
      .toBe('Chapter 1 was not saved. The writer stopped after 104 words, far short of the 1,800 a chapter needs. You can try again.');
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

  it('reads the chapter from its title in the host\'s voices, lighting the sentence being spoken', async () => {
    const { controller, storyId } = await story({ written: 2 });
    const { storage } = memory();
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={storage} readAloudVoices={PICKS} />);

    await click(button => button.textContent?.trim() === 'Listen', 'Listen');
    expect(lastSpoken().text).toBe('Chapter 1. Low Tide');
    expect(lastSpoken().voice?.name).toBe('Daniel');
    expect(container.querySelector('h1[data-speaking]')!.textContent).toBe('Low Tide');
    expect(container.querySelector('[data-testid="read-aloud-speaker"]')!.textContent).toBe('Narrator');

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
    await click(byLabel('Stop'), 'Stop');
    expect(container.querySelector('[data-overlay-id="read-aloud"]')).toBeNull();
    expect(buttonBy(button => button.textContent?.trim() === 'Listen')).toBeTruthy();
  });

  it('Reader Settings holds only Narration: three voices with previews and the speed, saved on the device', async () => {
    const { controller, storyId } = await story({ written: 1 });
    const { storage, values } = memory();
    await mount(<Host controller={controller} storyId={storyId} readerPreferences={storage} readAloudVoices={PICKS} />);

    await click(byLabel('Reader Settings'), 'Reader Settings');
    const dialog = container.ownerDocument.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.querySelector('h2')!.textContent).toBe('Reader Settings');
    expect([...dialog.querySelectorAll('section h3')].map(heading => heading.textContent)).toEqual(['Narration']);
    expect(dialog.textContent).not.toMatch(/Codex|Mind Palace|Audio|Customize|Accessibility/);
    const selected = (role: string) => {
      const select = dialog.querySelector<HTMLSelectElement>(`select[data-voice-role="${role}"]`)!;
      return select.options[select.selectedIndex].textContent;
    };
    expect([selected('narrator'), selected('protagonist'), selected('side')]).toEqual(['Daniel (en-GB)', 'Rishi (en-IN)', 'Samantha (en-US)']);
    expect(dialog.querySelector('optgroup')!.getAttribute('label')).toBe('English voices');

    await act(async () => { dialog.querySelector<HTMLInputElement>('input[name="read-aloud-rate"][value="1.25"]')!.click(); });
    expect(JSON.parse(values.get('read-aloud')!)).toMatchObject({ v: 1, rate: 1.25 });
    await act(async () => { buttonBy(byLabel('Preview the Side characters voice'))!.click(); });
    await flush();
    expect(lastSpoken().voice?.name).toBe('Samantha');

    await click(byLabel('Close Reader Settings'), 'Close Reader Settings');
    expect(container.ownerDocument.querySelector('[role="dialog"]')).toBeNull();
  });

  it('pauses while the Fate page covers the chapter, and keeps listening into the next chapter', async () => {
    const { controller, storyId } = await story({ written: 2 });
    await mount(<Host controller={controller} storyId={storyId} readAloudVoices={PICKS} />);
    await click(button => button.textContent?.trim() === 'Listen', 'Listen');
    await next();
    const cancels = speech.cancels;

    await click(byLabel('Open Fate'), 'Open Fate');
    expect(speech.cancels).toBeGreaterThan(cancels);
    const spokenOnFate = speech.spoken.length;
    await flush(20);
    expect(speech.spoken.length).toBe(spokenOnFate);

    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    await flush();
    // Still listening: the same line is read again from its start.
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
    return { mixer: createHostReaderMixer(storage), values };
  };
  const mountWithMixer = async (mixer: ReaderMixer, element: React.ReactElement) => {
    await act(async () => { root.render(renderWithDevAudio(<ReaderMixerProvider mixer={mixer}>{element}</ReaderMixerProvider>)); });
    await flush();
  };
  const note = () => container.querySelector<HTMLButtonElement>('[data-testid="story-audio-note"] button');
  /** Opens the lazily loaded Audio panel and waits for it. */
  const audioPanel = async () => {
    for (let tries = 0; tries < 50 && !container.ownerDocument.querySelector('[data-testid="reader-settings-audio"] h3'); tries++) await flush(20);
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
    // Chapter 1 has a Sound Cue: Sound Cues show in Audio and its sound is warmed. Soundscapes are not chosen yet.
    expect(mixer.getState().availability).toMatchObject({ soundscapes: false, atmosphere: true, cues: true });
    expect(preloadCues).toHaveBeenCalledWith([expect.stringMatching(BEAST_ROAR)]);
    // Tapping the cue plays it over the soundtrack, at the writer's Energy (high).
    await act(async () => { buttonBy(button => button.dataset.cuePhrase === 'the beast roared')!.click(); });
    expect(playCue).toHaveBeenCalledWith(expect.stringMatching(BEAST_ROAR), { volume: 1 });

    // Reaching the chapter's navigation is the chapter's end, for an End of chapter timer.
    expect(observed.map(entry => entry.target?.getAttribute('aria-label'))).toEqual(['Chapters']);
    act(() => observed[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(notifyChapterEnd).toHaveBeenCalledTimes(1);

    // Chapter 2 has no cue: Sound Cues leave Audio settings.
    await click(byLabel('Next Chapter'), 'Next Chapter');
    expect(mixer.getState().availability.cues).toBe(false);

    // The Fate page covers the chapter (and its note): the atmosphere fades out until the chapter is back.
    const stopAtmosphere = vi.spyOn(mixer, 'stopAtmosphere');
    await click(byLabel('Open Fate'), 'Open Fate');
    expect(stopAtmosphere).toHaveBeenCalledTimes(1);
    await click(button => button.textContent?.trim() === 'Back to reading', 'Back to reading');
    expect(startAtmosphere).toHaveBeenCalledTimes(2);

    expect(stopAll).not.toHaveBeenCalled();
    act(() => root.unmount());
    expect(stopAll).toHaveBeenCalledTimes(1);
    root = createRoot(container);
  });

  it('the note mutes story audio with a tap, and a long-press opens Reader Settings at Audio', async () => {
    const { controller, storyId } = await story({ written: 1 });
    const { mixer, values } = mixerFor();
    // A browser without speech still gets the note and the gear, for the soundtrack.
    await mountWithMixer(mixer, <Host controller={controller} storyId={storyId} />);
    expect(container.querySelector('[data-testid="read-aloud-player"]')).toBeNull();
    expect(note()!.getAttribute('aria-label')).toBe('Mute story audio');

    await act(async () => { note()!.click(); });
    expect(mixer.getState().preferences.masterEnabled).toBe(false);
    expect(note()!.getAttribute('aria-label')).toBe('Unmute story audio');
    // The reader's mix is kept on the device, never in the story.
    await flush(350);
    expect(JSON.parse(values.get('audio-mixer')!)).toMatchObject({ masterEnabled: false });

    await act(async () => { note()!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); });
    const audio = await audioPanel();
    const dialog = container.ownerDocument.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-label') ?? dialog.querySelector('h2')!.textContent).toBe('Reader Settings');
    expect(audio.scrollIntoView).toHaveBeenCalled();
    // Without speech, Narration only says so.
    expect([...dialog.querySelectorAll('section h3')].map(heading => heading.textContent)).toEqual(['Audio', 'Narration']);
    expect(dialog.querySelector('[data-testid="reader-settings-narration"]')!.textContent).toContain("This browser can't read aloud.");
    // Only the layers this chapter uses: Atmosphere and Sound Cues, never Soundscapes or Voice yet.
    expect(audio.textContent).toContain('Atmosphere');
    expect(audio.textContent).toContain('Sound Cues');
    expect(audio.textContent).not.toMatch(/Soundscapes|Voice/);
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

      // Settings now holds Audio first, then Narration.
      await click(byLabel('Reader Settings'), 'Reader Settings');
      await audioPanel();
      expect([...container.ownerDocument.querySelectorAll('[role="dialog"] section h3')].map(heading => heading.textContent)).toEqual(['Audio', 'Narration']);
      await click(byLabel('Close Reader Settings'), 'Close Reader Settings');

      await click(button => button.textContent?.trim() === 'Listen', 'Listen');
      await act(async () => { speech.start(); });
      await flush();
      expect(leases).toHaveLength(1);
      expect(leases[0].setDuck).toHaveBeenCalledWith(0.6);
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
