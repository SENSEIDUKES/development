import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ReaderAudioNote } from './ReaderAudioNote';
import { useSoundtrackChanges } from './useSoundtrackChanges';
import { useReaderDocumentScrollbar } from './useReaderDocumentScrollbar';
import type { TextHighlightBlock } from '@seihouse/sen/highlight-engine';
import type { SceneAudioTrack } from '@seihouse/sen/audio';
import { getSenTextDirection } from '@seihouse/sen/contracts';
import {
  DEFAULT_READER_FONTS,
  READ_ALOUD_SCRIPT_VERSION,
  applyReaderStatePatch,
  buildReadAloudScript,
  createReaderStoryState,
  readReaderTextSettings,
  readSoundtrackChoice,
  resolveReaderOpeningChapter,
  resolveReaderText,
  useReadAloud,
  writeReaderTextSettings,
  writeSoundtrackChoice,
  type ReadAloudScript,
  type ReadAloudVoicePicks,
  type ReaderFonts,
  type ReaderPreferenceStorage,
  type ReaderStateRepository,
  type ReaderStoryState,
  type ReaderTextSettings,
  type SoundtrackChoice,
} from '@seihouse/sen/reader-runtime';
import { harnessParagraphBlockId } from '../shared/chapterBody';
import { chapterTitleText } from '../../../narrative/chapterTitle';
import { harnessStoryMode, nextArcStep } from '../shared/arcState';
import { pendingChapterDirection } from '../shared/chapterDirection';
import { chapterRewriteGap, latestStoryChapter } from '../shared/chapterRewrite';
import { protagonistNames } from '../shared/speakers';
import { declaredCharacters } from '../shared/holdings';
import { deriveStoryCodex, type CodexPictures } from '../shared/storyCodex';
import { BlueprintArcPage } from './BlueprintArcPage';
import { ChapterAuthoring } from './ChapterAuthoring';
import { ChapterRewrite } from './ChapterRewrite';
import { FatePage } from './FatePage';
import { ProseChapterBody } from './ProseChapterBody';
import { ReaderBottomBar } from './ReaderBottomBar';
import type { ReaderChapter, ReaderChapterBody } from './readerChapterBody';
import { ReaderPanel } from './ReaderPanel';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';
import { ReaderTopBar } from './ReaderTopBar';
import { StoryCodex } from './StoryCodex';
import { useFollowNarration, type NarrationHighlight } from './useFollowNarration';
import { useNextChapterWriter } from './useNextChapterWriter';
import { readingScene, useReaderSoundtrack } from './useReaderSoundtrack';
import { useChapterFinished } from './useChapterFinished';
import './reader-frame.css';
import type { HarnessGenerationController } from '../shared/controller';
import type { HarnessChapter, HarnessWorkspaceState } from '../../../narrative/generation';

/** What the host's writing screen shows. */
export interface HarnessReaderWriting {
  /** True while the next chapter is being written. */
  active: boolean;
  /** The chapter being written. It keeps its number while the screen closes. */
  chapterNumber: number;
}

/**
 * What is open over the chapter. One at a time, so opening one closes the
 * others, and the chapter itself never leaves:
 * - a **panel** (Fate, the Codex, Reader Settings) leaves it visible and
 *   scrollable beside or under it, so the reader can look back at what they
 *   just read (or watch their text settings change it, or check the Codex
 *   against the passage it points at);
 * - a **page** (an arc's goals) takes the screen; the chapter waits
 *   underneath, and the reader comes back to their place.
 */
export type ReaderLayer =
  | { kind: 'panel'; id: 'fate'; focusDirection?: boolean }
  | { kind: 'panel'; id: 'codex' }
  | { kind: 'panel'; id: 'settings'; section?: 'audio' | 'narration' }
  | { kind: 'page'; id: 'arc' };

const navButton = 'min-h-11 rounded-full border px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40';

const NO_SCRIPT: ReadAloudScript = { version: READ_ALOUD_SCRIPT_VERSION, lines: [] };

/** The engine blocks of one chapter, under the ids its Sound Cues and speaker records use. */
const chapterBlocks = (chapter: ReaderChapter): TextHighlightBlock[] => chapter.paragraphs.map((text, index) => ({
  id: harnessParagraphBlockId(chapter.chapterNumber, index), text,
}));

/**
 * The first line to read when the reader taps Listen: the chapter title while
 * it is on screen, otherwise the first paragraph still in view. `top` is where
 * the visible area begins, below the top bar.
 */
function lineWhereTheReaderIs(script: ReadAloudScript, article: HTMLElement | null, top = 0): number {
  if (!article || typeof article.getBoundingClientRect !== 'function') return 0;
  const title = article.querySelector<HTMLElement>('[data-read-aloud-title]');
  if (!title || title.getBoundingClientRect().bottom > top) return 0;
  for (const block of article.querySelectorAll<HTMLElement>('[data-sen-text-block]')) {
    if (block.getBoundingClientRect().bottom <= top) continue;
    const index = script.lines.findIndex(line => line.blockId === block.getAttribute('data-sen-text-block'));
    if (index >= 0) return index;
  }
  return 0;
}

/**
 * The Reader for a HARNESS story: a frame around a swappable chapter body.
 * The frame fills the screen: the top bar (Back, the story and chapter, which
 * open the chapter list, and Reader Settings) and the bottom bar (Listen,
 * Codex, the chapter arrows with Fate between them) run edge to edge, and on a
 * wide screen the chapter grows with it, so it never sits small in the middle.
 * A panel shrinks the frame beside it. What opens over the chapter (`ReaderLayer`:
 * the Fate, Codex and Reader Settings panels; an arc's goals as a page). The chapter
 * never leaves the page for them, so the reader keeps their place; the body shows the
 * chapter on screen (`chapterBody`, prose by default: the paragraphs on the
 * Highlight Engine, read-only, with Sound Cues as the only active layer).
 * Listen reads the chapter aloud in three voices with the spoken sentence lit,
 * and Reader Settings sets its text: font, title font, size, line spacing and
 * weight, from the host's fonts. At the newest chapter, Next writes the next
 * one; the Fate page is one tap away. In Fate Survival every chapter goes
 * through Fate: at the newest chapter Fate opens once the reader reaches its
 * last paragraph, and Next waits until Fate has the next chapter's direction.
 * With the host's reader mixer, the story's soundtrack (the reader's
 * atmosphere and the chapter's Sound Cues) plays through the SEIHouse audio
 * player: a story audio note mutes it, and Reader Settings holds Audio and
 * Narration. At the end of the newest chapter, until the next one is written,
 * the reader may have it written again. The Codex shows what the story's record
 * knows, and each fact in it moves the chapter to its passage. Mind Palace is
 * not part of it.
 */
export function HarnessReaderSession({
  state, storyId, onClose, controller, readerStateRepository, onGenerateNextChapter, onRewriteChapter, onPlanArc, renderWriting, renderWriteAside, startOnOpen = false,
  readerPreferences, readAloudVoices, soundscapes, readerFonts = DEFAULT_READER_FONTS, chapterBody: ChapterBody = ProseChapterBody, companion, codexPictures,
}: {
  state: HarnessWorkspaceState; storyId: string; onClose: () => void; controller: HarnessGenerationController;
  /**
   * Writes the story's next chapter with the host's model: from Next at the
   * newest chapter, and from the Fate page. Absent when the host cannot generate here.
   */
  onGenerateNextChapter?: () => Promise<void>;
  /**
   * Writes the newest chapter again with the host's model, with the reader's
   * optional note on what to change. Offered at the end of the newest chapter
   * only, until the next one is written. Absent when the host cannot generate here.
   */
  onRewriteChapter?: (note?: string) => Promise<void>;
  /**
   * Plans the goals of the arc the next chapter begins, with the host's model.
   * When a new arc begins, the World Blueprint's goal section reappears for
   * the reader to review them before its first chapter.
   */
  onPlanArc?: () => Promise<void>;
  /** Host-owned durable Reader state. Without it, the reading place lasts for this session only. */
  readerStateRepository?: ReaderStateRepository;
  /**
   * The host's screen while a chapter is being written (for example the
   * Library's Aura Veil). It is rendered on every pass so it can animate in
   * and out. Without it, the Next button says the chapter is being written.
   */
  renderWriting?: (writing: HarnessReaderWriting) => ReactNode;
  /**
   * Shown beside the button that writes the next chapter, such as the host's
   * price for a chapter. `chaptersWritten` counts the story's chapters, so a
   * host can mark each new one as it arrives.
   */
  renderWriteAside?: (chaptersWritten: number) => ReactNode;
  /**
   * Begins a story that has no chapters yet as soon as the Reader opens:
   * Chapter 1 is written (Regular Reader) or its direction is asked for
   * first (Fate Survival). The host sets it from Start Story; it runs once.
   */
  startOnOpen?: boolean;
  /** Host-owned storage for the reader's device preferences (narration voices and speed). */
  readerPreferences?: ReaderPreferenceStorage;
  /** The host's preferred narration voices, by story language and role. SEN prefers none. */
  readAloudVoices?: ReadAloudVoicePicks;
  /**
   * The host's soundscapes: the Reader's own music before the story has a
   * chapter to take its pieces from (Chapter 1 being written). Without them,
   * the Reader is silent until then.
   */
  soundscapes?: readonly SceneAudioTrack[];
  /**
   * The fonts Reader Settings offers for chapter text and titles, first ones
   * first; the host loads their faces. Without them, SEN's own serif, sans and
   * display fonts.
   */
  readerFonts?: ReaderFonts;
  /** How a chapter is shown inside the frame. Prose by default; any body keeps the marks `ReaderChapterBodyProps` names. */
  chapterBody?: ReaderChapterBody;
  /** The host's companion in the top bar, beside Reader Settings (the Library puts its Familiar there). */
  companion?: ReactNode;
  /** The host's pictures for this story's Codex cards, with Manifest. Without them, cards show their aura. */
  codexPictures?: CodexPictures;
}) {
  const story = state.stories.find(entry => entry.id === storyId);
  const chapters = useMemo(() => state.chapters
    .filter(chapter => chapter.storyId === storyId)
    .sort((left, right) => left.chapterNumber - right.chapterNumber), [state.chapters, storyId]);
  const [readerState, setReaderState] = useState<ReaderStoryState>();
  const [selectedChapter, setSelectedChapter] = useState(1);
  useReaderDocumentScrollbar();
  const [layer, setLayer] = useState<ReaderLayer>();
  const closeLayer = useCallback(() => setLayer(undefined), []);
  /** A paragraph to bring into view once its chapter is on screen: the passage a Codex fact came from. */
  const [passageTarget, setPassageTarget] = useState<string>();
  /** Counts the Codex's trips to a passage; each one lowers its sheet so the chapter shows. */
  const [codexPeek, setCodexPeek] = useState(0);
  const writer = useNextChapterWriter(controller, storyId, onGenerateNextChapter, onRewriteChapter);
  const [storageError, setStorageError] = useState('');
  const readerStateRef = useRef<ReaderStoryState | undefined>(undefined);
  const persistEnabled = useRef(Boolean(readerStateRepository));
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const topRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  // The chapter's own navigation, held as state so the soundtrack sees it whenever it appears.
  const [chapterEnd, setChapterEnd] = useState<HTMLElement | null>(null);
  const openSettings = useCallback((section?: 'audio' | 'narration') => setLayer({ kind: 'panel', id: 'settings', section }), []);
  // The reader's text settings: kept on the device, applied by the chapter body.
  const [textSettings, setTextSettings] = useState<ReaderTextSettings>(() => readReaderTextSettings(readerPreferences));
  const changeText = useCallback((next: ReaderTextSettings) => {
    setTextSettings(next);
    writeReaderTextSettings(readerPreferences, next);
  }, [readerPreferences]);
  const text = useMemo(() => resolveReaderText(textSettings, readerFonts), [textSettings, readerFonts]);
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  // Load once per story: the Reader opens where the reader left off.
  useEffect(() => {
    let active = true;
    const open = (saved: ReaderStoryState | undefined) => {
      if (!active) return;
      const initial = saved ?? createReaderStoryState(storyId);
      readerStateRef.current = initial;
      setReaderState(initial);
      setSelectedChapter(resolveReaderOpeningChapter(initial, chaptersRef.current.map(chapter => chapter.chapterNumber)));
    };
    if (!readerStateRepository) { open(undefined); return () => { active = false; }; }
    readerStateRepository.load(storyId).then(open, () => {
      persistEnabled.current = false;
      setStorageError('Your saved reading place could not be loaded. You can keep reading, but changes in this visit will not be saved.');
      open(undefined);
    });
    return () => { active = false; };
  }, [storyId, readerStateRepository]);

  const openChapter = useCallback((chapterNumber: number) => {
    setSelectedChapter(chapterNumber);
    setCreating(false);
    topRef.current?.scrollIntoView?.({ block: 'start' });
    const current = readerStateRef.current;
    if (!current) return;
    const next = applyReaderStatePatch(current, { lastReadChapter: chapterNumber });
    readerStateRef.current = next;
    setReaderState(next);
    if (!readerStateRepository || !persistEnabled.current) return;
    // Serialized so an older place can never land after a newer one.
    saveQueue.current = saveQueue.current.then(() => readerStateRepository.save(next)).then(
      () => setStorageError(''),
      () => setStorageError('Your reading place could not be saved. It will be retried when you turn the page.'),
    );
  }, [readerStateRepository]);

  const upcoming = story?.head.nextChapterNumber ?? 1;
  // A page takes the screen, so the reader's place is kept and given back when it closes.
  const placeBeforePage = useRef(0);
  const openPage = (id: 'arc') => {
    if (layer?.kind !== 'page') placeBeforePage.current = window.scrollY;
    setLayer({ kind: 'page', id });
  };
  const openFate = (focusDirection = false) => { writer.reset(); setLayer({ kind: 'panel', id: 'fate', focusDirection }); };
  const openArc = () => { writer.reset(); openPage('arc'); };
  const openCodex = () => setLayer({ kind: 'panel', id: 'codex' });
  // Reading another chapter from a page or panel opens it at its top, not at the old place.
  const readChapter = (chapterNumber: number) => { placeBeforePage.current = 0; setLayer(undefined); openChapter(chapterNumber); };
  // The Codex stays open while the chapter behind it moves to a fact's passage, so the two can be read together.
  const revealChapter = (chapterNumber: number) => {
    if (chapterNumber !== chapter?.chapterNumber) openChapter(chapterNumber);
    setCodexPeek(count => count + 1);
  };
  const revealPassage = (chapterNumber: number, blockId: string) => {
    revealChapter(chapterNumber);
    setPassageTarget(blockId);
  };
  const pageOpen = layer?.kind === 'page';
  // Create mode: the reader authors the chapter on screen in place. It closes when another chapter opens.
  const [creating, setCreating] = useState(false);
  useLayoutEffect(() => {
    if (!pageOpen) return undefined;
    window.scrollTo?.({ top: 0 });
    return () => window.scrollTo?.({ top: placeBeforePage.current });
  }, [pageOpen]);
  // At the start of an arc, the next chapter waits for the arc's goals: planned, then reviewed in the World Blueprint.
  const arcStep = nextArcStep(state, storyId);
  // Next at the newest chapter. Regular Reader: write the next chapter (through
  // Rhythm, or the reader's one-chapter choice when they made one) and open it.
  // Fate Survival: the chapter waits on the reader's direction, so Next goes to
  // that step first. An ended story sends the reader to how it ended.
  const mode = harnessStoryMode(state.foundations.find(item => item.id === story?.activeFoundationRevisionId)?.input);
  const writeNext = async () => {
    const written = await writer.write();
    if (written) openChapter(written);
  };
  const continueAfterLatest: { label: string; run: () => void; busy?: boolean; writes?: boolean; direct?: boolean } | undefined = !story ? undefined
    : story.conclusion
      ? { label: 'See how the story ended', run: () => openFate() }
      : arcStep
        ? { label: `Arc ${arcStep.arcNumber} begins`, run: openArc }
        : mode === 'survival' && !pendingChapterDirection(story)
        ? { label: `Direct Chapter ${upcoming}`, run: () => openFate(true), direct: true }
        : onGenerateNextChapter
          ? { label: writer.writing ? `Writing Chapter ${upcoming}…` : `Write Chapter ${upcoming}`, run: () => void writeNext(), busy: writer.writing, writes: true }
          : undefined;

  // Start Story: the first chapter begins once, as soon as the Reader can begin it.
  // One already being written (begun as the story was made) is that start.
  const continueRef = useRef(continueAfterLatest);
  continueRef.current = continueAfterLatest;
  const started = useRef(false);
  const readyToStart = startOnOpen && Boolean(readerState) && chapters.length === 0 && Boolean(continueAfterLatest);
  useEffect(() => {
    if (!readyToStart || started.current) return;
    started.current = true;
    if (!writer.writing) continueRef.current?.run();
  }, [readyToStart, writer.writing]);
  // A chapter written while the reader waited opens when it is saved, wherever its write began.
  useEffect(() => {
    if (writer.written) openChapter(writer.written);
  }, [writer.written, openChapter]);

  // Read Aloud follows the chapter on screen: a panel leaves the chapter there, so
  // it reads on; a page or the writing screen in its place pauses it until the
  // chapter is back. The soundtrack plays on under all of them; only leaving the
  // Reader stops it.
  const chapter = chapters.find(entry => entry.chapterNumber === selectedChapter) ?? chapters.at(-1);
  const covered = pageOpen || writer.writing;
  const language = story?.originalLanguage ?? 'en';
  // The story's language sets the frame's direction: a right-to-left story reads, and is steered, right to left.
  const direction = getSenTextDirection(language);
  const blocks = useMemo(() => (chapter ? chapterBlocks(chapter) : []), [chapter]);
  // The main character as this chapter's writer was told: speech it left untagged is voiced from its narration.
  const attempt = chapter && state.attempts.find(item => item.id === chapter.attemptId);
  const mainCharacter = useMemo(() => (attempt
    ? protagonistNames(attempt.storyInformation.currentStory, attempt.storyInformation.canonicalState.characters) : undefined), [attempt]);
  const readAloud = useReadAloud({
    scriptKey: chapter?.id ?? 'no-chapter',
    buildScript: () => (chapter ? buildReadAloudScript({
      chapterNumber: chapter.chapterNumber, title: chapter.title, language, paragraphs: blocks, speakers: chapter.speakers, mainCharacter,
    }) : NO_SCRIPT),
    language, preferences: readerPreferences, picks: readAloudVoices,
    suspended: covered,
  });
  const reading = readAloud.status === 'playing' || readAloud.status === 'paused';
  const spoken = reading ? readAloud.line : undefined;
  // One highlight per sentence: a voice change mid-sentence keeps the same light.
  const spokenBlock = spoken ? spoken.blockId ?? 'title' : undefined;
  const sentenceStart = spoken?.sentence.start;
  const sentenceEnd = spoken?.sentence.end;
  const highlight = useMemo((): NarrationHighlight | undefined => {
    if (!spokenBlock || sentenceStart === undefined || sentenceEnd === undefined) return undefined;
    if (spokenBlock === 'title') return 'title';
    const block = blocks.find(entry => entry.id === spokenBlock);
    return block && { blockId: block.id, startOffset: sentenceStart, endOffset: sentenceEnd, selectedText: block.text.slice(sentenceStart, sentenceEnd) };
  }, [blocks, spokenBlock, sentenceStart, sentenceEnd]);
  const follow = useFollowNarration({ article: articleRef, highlight, active: reading, player: playerRef, header: barRef });
  // The chapter's scene (its music and atmosphere), unless the reader chose their own.
  const [soundtrackChoice, setSoundtrackChoice] = useState<SoundtrackChoice>(() => readSoundtrackChoice(readerPreferences));
  const chooseSoundtrack = useCallback((choice: SoundtrackChoice) => {
    setSoundtrackChoice(choice);
    writeSoundtrackChoice(readerPreferences, choice);
  }, [readerPreferences]);
  const writerScene = useMemo(() => (chapter ? readingScene(chapters, chapter.chapterNumber) : undefined), [chapters, chapter]);
  const blockOrder = useMemo(() => blocks.map(block => block.id), [blocks]);
  const listening = useMemo(() => (spokenBlock && spokenBlock !== 'title' && sentenceStart !== undefined
    ? { blockId: spokenBlock, offset: sentenceStart, order: blockOrder } : undefined), [blockOrder, sentenceStart, spokenBlock]);
  // The reader's own opening and changes (Create mode) over the writer's scene, as the reader reaches them.
  const scene = useSoundtrackChanges({ chapter, scene: writerScene, article: articleRef, listening });
  // The chapter's soundscapes; before the story has a chapter, the newest one's or the host's.
  const loadout = chapter?.mediaLoadout ?? chapters.at(-1)?.mediaLoadout;
  const pieces = useMemo(() => loadout?.soundscapes.map(entry => entry.track) ?? soundscapes, [loadout, soundscapes]);
  const mixer = useReaderSoundtrack({
    active: Boolean(story && readerState),
    chapterId: chapter?.id, soundCues: chapter?.soundCues, scene, pieces, atmospheres: loadout?.atmospheres, choice: soundtrackChoice,
    speaking: readAloud.status === 'playing', listenEnded: readAloud.status === 'ended',
    onSleep: readAloud.stop, chapterEnd,
  });
  // Fate Survival goes through Fate every chapter: at the newest one, Fate opens once the reader
  // reaches its last paragraph (scrolling to it, or Listen reading it), and Next waits for Fate.
  const survivalAtNewest = mode === 'survival' && Boolean(chapter) && chapter === chapters.at(-1) && !story?.conclusion
    && !(story && pendingChapterDirection(story));
  const finished = useChapterFinished({ article: articleRef, chapterEnd, chapterId: chapter?.id, watch: survivalAtNewest, listened: readAloud.status === 'ended' });
  const fateLocked = survivalAtNewest && !finished;
  const fateCalls = survivalAtNewest && finished && Boolean(continueAfterLatest?.direct);
  const listen = () => readAloud.play(lineWhereTheReaderIs(readAloud.script(), articleRef.current, barRef.current?.getBoundingClientRect?.().bottom ?? 0));
  // After a Codex fact points at a passage, its paragraph comes into view just under the top bar
  // (above the half-height Codex on a phone) and lights up for a moment.
  useEffect(() => {
    if (!passageTarget || pageOpen) return undefined;
    // Paragraph ids are `c{n}-p{i}`; anything else is never put into a selector.
    const block = /^[\w-]+$/.test(passageTarget) ? articleRef.current?.querySelector<HTMLElement>(`[data-sen-text-block="${passageTarget}"]`) : undefined;
    if (!block) return undefined;
    block.style.scrollMarginTop = `${Math.round((barRef.current?.getBoundingClientRect?.().bottom ?? 0) + 16)}px`;
    block.scrollIntoView?.({ block: 'start' });
    block.removeAttribute('data-codex-lit');
    void block.offsetWidth;
    block.setAttribute('data-codex-lit', '');
    setPassageTarget(undefined);
    const dim = window.setTimeout(() => block.removeAttribute('data-codex-lit'), 2_600);
    return () => window.clearTimeout(dim);
  }, [passageTarget, pageOpen, chapter?.id]);

  if (!story) return <p role="alert" className="p-4 text-sm text-amber-200">This story is no longer available.</p>;
  if (!readerState) return <main className="mx-auto w-full max-w-3xl px-4 py-6"><p role="status" className="text-sm text-neutral-400">Opening your place in the story…</p></main>;

  // One position for the writing screen in both views, so it can close smoothly.
  const writing = renderWriting?.({ active: writer.writing, chapterNumber: writer.writingChapter ?? upcoming });
  const index = chapter ? chapters.indexOf(chapter) : -1;
  const previous = index > 0 ? chapters[index - 1] : undefined;
  const later = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined;
  // Rewrite this chapter: only the newest chapter, and only while nothing is built on it yet. It
  // stays in place while its own rewrite is written, so a failed one keeps the reader's note.
  const rewritable = Boolean(onRewriteChapter && chapter && !later && latestStoryChapter(state, storyId)?.id === chapter.id
    && (writer.writing || !chapterRewriteGap(state, storyId)));
  // Only the newest chapter, before anything is built on it, can be changed: moving on seals it.
  const authorable = Boolean(chapter && !later && latestStoryChapter(state, storyId)?.id === chapter.id && !writer.writing && !chapterRewriteGap(state, storyId));
  const authoring = creating && authorable && chapter;
  const rewriteChapter = async (note?: string) => {
    const rewritten = await writer.rewrite(note);
    if (rewritten) openChapter(rewritten);
    return Boolean(rewritten);
  };

  const panel = layer?.kind === 'panel' ? layer.id : undefined;
  return <>
    {/* The frame fills the screen; on laptops a panel sits at the right and the frame shrinks beside it.
        A right-to-left story mirrors the frame: its text, the chapter arrows and the bars' ends. */}
    <div dir={direction} className={`reader-frame transition-[padding] duration-200 motion-reduce:transition-none ${panel ? 'lg:pr-[28rem]' : ''}`} data-panel={panel}>
    <main hidden={pageOpen} className="w-full min-w-0 px-4 pb-12" data-testid="harness-reader">
      {/* A new chapter returns here and reveals its top bar. */}
      <div ref={topRef} aria-hidden />
      <ReaderTopBar barRef={barRef} storyTitle={story.title} place={chapter ? `Chapter ${chapter.chapterNumber} · ${chapterTitleText(chapter.title) || chapter.title}` : 'Story start'}
        chapterSelection={chapter ? { current: chapter.chapterNumber, entries: chapters.map(entry => ({ number: entry.chapterNumber, title: entry.title })), onSelect: openChapter } : undefined}
        onBack={onClose} onOpenSettings={() => openSettings()} companion={companion} pinned={Boolean(panel) || pageOpen} direction={direction} />
      <div className="reader-column">
      {storageError && <p role="alert" className="mt-3 text-sm text-amber-300">{storageError}</p>}

      {authoring
        ? <ChapterAuthoring key={chapter.id} chapter={chapter} controller={controller} locale={story.originalLanguage} text={text} articleRef={articleRef} />
        : chapter
        ? <ChapterBody chapter={chapter} blocks={blocks} locale={story.originalLanguage} articleRef={articleRef}
            highlight={highlight} reading={reading} text={text} />
        : <section className="py-16 text-center" aria-label="Story start">
            <h1 className="font-display text-3xl text-white">{story.title}</h1>
            <p className="mt-3 text-sm text-neutral-400">
              {continueAfterLatest ? 'Your story begins here.' : 'The first chapter can’t be written here yet.'}
            </p>
          </section>}

      {writer.error && <p role="alert" className="mt-6 text-sm text-amber-200">{writer.error}</p>}
      {/* The chapter's end: at the newest chapter, the story's next step (write, direct, or see how it ended). */}
      <div ref={setChapterEnd} className="mt-8 flex min-h-11 items-center justify-end gap-3" data-testid="reader-chapter-end">
        {!later && continueAfterLatest && <span className="relative inline-flex items-center gap-2">
          {continueAfterLatest.writes && renderWriteAside?.(chapters.length)}
          <button type="button" disabled={continueAfterLatest.busy} aria-busy={continueAfterLatest.busy || undefined} onClick={continueAfterLatest.run}
            className={`${navButton} border-cyan-300/50 bg-cyan-400/15 font-semibold text-cyan-50 hover:bg-cyan-400/25`}>{continueAfterLatest.label}</button>
        </span>}
      </div>
      {rewritable && chapter && !authoring && <ChapterRewrite key={chapter.id} chapterNumber={chapter.chapterNumber} disabled={writer.writing} onRewrite={rewriteChapter} />}
      </div>
      <ReaderBottomBar readAloud={readAloud} onListen={chapter ? listen : undefined} offscreen={follow.offscreen} direction={direction}
        onBackToNarration={follow.backToNarration} barRef={playerRef}
        note={mixer && <ReaderAudioNote mixer={mixer} />}
        onOpenCodex={openCodex} fate={{ run: () => openFate(fateCalls), disabled: fateLocked, attention: fateCalls }}
        create={chapter ? {
          active: Boolean(authoring), onToggle: () => setCreating(!authoring),
          unavailable: authorable ? undefined : later ? 'Only the newest chapter can be changed' : 'This chapter is sealed: the story has moved on from it',
        } : undefined}
        previous={previous ? { label: 'Previous Chapter', run: () => openChapter(previous.chapterNumber) } : undefined}
        next={later ? { label: 'Next Chapter', run: () => openChapter(later.chapterNumber) }
          : continueAfterLatest ? {
              label: `Next Chapter: ${continueAfterLatest.label}`, run: continueAfterLatest.run, busy: continueAfterLatest.busy,
              disabled: fateLocked || fateCalls,
            } : undefined} />
    </main>
    </div>
    {layer?.id === 'arc' && <main className="mx-auto w-full min-w-0 max-w-6xl">
      <BlueprintArcPage state={state} storyId={storyId} controller={controller} onBack={closeLayer} onPlanArc={onPlanArc}
        onContinue={() => {
          setLayer(undefined);
          if (mode === 'survival') openFate(true);
          else if (onGenerateNextChapter) void writeNext();
        }} />
    </main>}
    <ReaderPanel open={panel === 'fate'} onClose={closeLayer} labelledBy="fate-page-title" testId="reader-panel-fate">
      <FatePage state={state} storyId={storyId} controller={controller} onBack={closeLayer} onOpenArc={openArc}
        onGenerateNextChapter={onGenerateNextChapter} writer={writer} focusDirection={layer?.id === 'fate' && layer.focusDirection}
        onReadChapter={readChapter} />
    </ReaderPanel>
    <ReaderPanel open={panel === 'codex'} onClose={closeLayer} labelledBy="codex-panel-title" testId="reader-panel-codex" peek={codexPeek}>
      <ReaderCodex state={state} storyId={storyId} chapters={chapters} storyTitle={story.title} onBack={closeLayer} pictures={codexPictures}
        onReadPassage={revealPassage} onReadChapter={revealChapter} />
    </ReaderPanel>
    <ReaderSettingsSheet open={layer?.id === 'settings'} onClose={closeLayer} readAloud={readAloud} language={language}
      mixer={mixer} section={layer?.id === 'settings' ? layer.section : undefined} soundtrack={{ choice: soundtrackChoice, onChoice: chooseSoundtrack, pieces: pieces ?? [] }}
      text={{ settings: textSettings, onChange: changeText, fonts: readerFonts }} />
    {writing}
  </>;
}

/**
 * The Codex inside the Reader: the story's record worked out from its
 * chapters as they are now. It is worked out only while the Codex is open.
 */
function ReaderCodex({ state, storyId, chapters, storyTitle, pictures, onBack, onReadPassage, onReadChapter }: {
  state: HarnessWorkspaceState;
  pictures?: CodexPictures;
  storyId: string;
  chapters: readonly HarnessChapter[];
  storyTitle: string;
  onBack: () => void;
  onReadPassage: (chapterNumber: number, blockId: string) => void;
  onReadChapter: (chapterNumber: number) => void;
}) {
  const story = state.stories.find(entry => entry.id === storyId);
  const foundation = state.foundations.find(entry => entry.id === story?.activeFoundationRevisionId)?.input;
  const codex = useMemo(() => deriveStoryCodex({
    entries: state.codexEntries.filter(entry => entry.storyId === storyId),
    chapters,
    mainCharacterName: foundation?.cast?.find(member => member.isMainCharacter)?.name,
    declared: foundation ? declaredCharacters(foundation) : [],
    declaredFactions: foundation?.identities?.filter(identity => identity.kind === 'faction') ?? [],
  }), [state.codexEntries, storyId, chapters, foundation]);
  return <StoryCodex codex={codex} storyTitle={storyTitle} pictures={pictures} onBack={onBack} onReadPassage={onReadPassage} onReadChapter={onReadChapter} />;
}
