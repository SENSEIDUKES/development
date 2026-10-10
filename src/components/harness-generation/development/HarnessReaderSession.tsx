import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ReaderMixerNote } from '@seihouse/audio-player';
import type { TextHighlightBlock } from '@seihouse/sen/text-highlight-engine';
import type { SceneAudioTrack } from '@seihouse/sen/audio';
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
import { harnessStoryMode, nextArcStep } from '../shared/arcState';
import { pendingChapterDirection } from '../shared/chapterDirection';
import { chapterRewriteGap, latestStoryChapter } from '../shared/chapterRewrite';
import { protagonistNames } from '../shared/speakers';
import { BlueprintArcPage } from './BlueprintArcPage';
import { ChapterRewrite } from './ChapterRewrite';
import { FatePage } from './FatePage';
import { HoldingsPage } from './HoldingsPage';
import { ProseChapterBody } from './ProseChapterBody';
import { ReadAloudPlayer } from './ReadAloudPlayer';
import type { ReaderChapter, ReaderChapterBody } from './readerChapterBody';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';
import { ReaderTopBar } from './ReaderTopBar';
import { useFollowNarration, type NarrationHighlight } from './useFollowNarration';
import { useNextChapterWriter } from './useNextChapterWriter';
import { readingScene, useReaderSoundtrack } from './useReaderSoundtrack';
import type { HarnessGenerationController } from '../shared/controller';
import type { HarnessWorkspaceState } from '../../../narrative/generation';

/** What the host's writing screen shows. */
export interface HarnessReaderWriting {
  /** True while the next chapter is being written. */
  active: boolean;
  /** The chapter being written. It keeps its number while the screen closes. */
  chapterNumber: number;
}

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
 * The frame is the top bar (Back, Holdings, Fate, Reader Settings), the
 * chapter navigation, Listen and the Reader's own pages; the body shows the
 * chapter on screen (`chapterBody`, prose by default: the paragraphs on the
 * Text Highlight Engine, read-only, with Sound Cues as the only active layer).
 * Listen reads the chapter aloud in three voices with the spoken sentence lit,
 * and Reader Settings sets its text: font, title font, size, line spacing and
 * weight, from the host's fonts. At the newest chapter, Next writes the next
 * one (or, in Fate Survival, asks for its direction first); the Fate page is
 * one tap away.
 * With the host's reader mixer, the story's soundtrack (the reader's
 * atmosphere and the chapter's Sound Cues) plays through the SEIHouse audio
 * player: a story audio note mutes it, and Reader Settings holds Audio and
 * Narration. At the end of the newest chapter, until the next one is written,
 * the reader may have it written again. Codex and Mind Palace are not part of it.
 */
export function HarnessReaderSession({
  state, storyId, onClose, controller, readerStateRepository, onGenerateNextChapter, onRewriteChapter, onPlanArc, renderWriting, renderWriteAside, startOnOpen = false,
  readerPreferences, readAloudVoices, soundscapes, readerFonts = DEFAULT_READER_FONTS, chapterBody: ChapterBody = ProseChapterBody,
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
}) {
  const story = state.stories.find(entry => entry.id === storyId);
  const chapters = useMemo(() => state.chapters
    .filter(chapter => chapter.storyId === storyId)
    .sort((left, right) => left.chapterNumber - right.chapterNumber), [state.chapters, storyId]);
  const [readerState, setReaderState] = useState<ReaderStoryState>();
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [fateOpen, setFateOpen] = useState(false);
  const [fateFocus, setFateFocus] = useState(false);
  const [arcOpen, setArcOpen] = useState(false);
  const [holdingsOpen, setHoldingsOpen] = useState(false);
  /** A paragraph to bring into view once its chapter is on screen: where a holding change happened. */
  const [passageTarget, setPassageTarget] = useState<string>();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'audio' | 'narration'>();
  const openSettings = useCallback((section?: 'audio' | 'narration') => { setSettingsSection(section); setSettingsOpen(true); }, []);
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
  const openFate = (focusDirection = false) => { writer.reset(); setArcOpen(false); setHoldingsOpen(false); setFateFocus(focusDirection); setFateOpen(true); };
  const openArc = () => { writer.reset(); setFateOpen(false); setHoldingsOpen(false); setArcOpen(true); };
  const openHoldings = () => { setFateOpen(false); setArcOpen(false); setHoldingsOpen(true); };
  const openPassage = (chapterNumber: number, blockId: string) => {
    setHoldingsOpen(false);
    openChapter(chapterNumber);
    setPassageTarget(blockId);
  };
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
  const continueAfterLatest: { label: string; run: () => void; busy?: boolean; writes?: boolean } | undefined = !story ? undefined
    : story.conclusion
      ? { label: 'See how the story ended', run: () => openFate() }
      : arcStep
        ? { label: `Arc ${arcStep.arcNumber} begins`, run: openArc }
        : mode === 'survival' && !pendingChapterDirection(story)
        ? { label: `Direct Chapter ${upcoming}`, run: () => openFate(true) }
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

  // Read Aloud follows the chapter on screen: another page or the writing screen
  // over the chapter pauses it until the chapter is back. The soundtrack plays on
  // under them; only leaving the Reader stops it.
  const chapter = chapters.find(entry => entry.chapterNumber === selectedChapter) ?? chapters.at(-1);
  const covered = fateOpen || arcOpen || holdingsOpen || writer.writing;
  const language = story?.originalLanguage ?? 'en';
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
  const scene = useMemo(() => (chapter ? readingScene(chapters, chapter.chapterNumber) : undefined), [chapters, chapter]);
  // The chapter's soundscapes; before the story has a chapter, the newest one's or the host's.
  const loadout = chapter?.mediaLoadout ?? chapters.at(-1)?.mediaLoadout;
  const pieces = useMemo(() => loadout?.soundscapes.map(entry => entry.track) ?? soundscapes, [loadout, soundscapes]);
  const mixer = useReaderSoundtrack({
    active: Boolean(story && readerState),
    chapterId: chapter?.id, soundCues: chapter?.soundCues, scene, pieces, choice: soundtrackChoice,
    speaking: readAloud.status === 'playing', listenEnded: readAloud.status === 'ended',
    onSleep: readAloud.stop, chapterEnd,
  });
  const listen = () => readAloud.play(lineWhereTheReaderIs(readAloud.script(), articleRef.current, barRef.current?.getBoundingClientRect?.().bottom ?? 0));
  // After a Holdings link opens a chapter, the paragraph where the change happened comes into view.
  useEffect(() => {
    if (!passageTarget || holdingsOpen) return;
    // Paragraph ids are `c{n}-p{i}`; anything else is never put into a selector.
    const block = /^[\w-]+$/.test(passageTarget) ? articleRef.current?.querySelector<HTMLElement>(`[data-sen-text-block="${passageTarget}"]`) : undefined;
    if (!block) return;
    block.scrollIntoView?.({ block: 'center' });
    setPassageTarget(undefined);
  }, [passageTarget, holdingsOpen, chapter?.id]);

  if (!story) return <p role="alert" className="p-4 text-sm text-amber-200">This story is no longer available.</p>;
  if (!readerState) return <main className="mx-auto w-full max-w-3xl px-4 py-6"><p role="status" className="text-sm text-neutral-400">Opening your place in the story…</p></main>;

  // One position for the writing screen in both views, so it can close smoothly.
  const writing = renderWriting?.({ active: writer.writing, chapterNumber: writer.writingChapter ?? upcoming });
  if (arcOpen) {
    return <>
      <main className="mx-auto w-full min-w-0 max-w-6xl">
        <BlueprintArcPage state={state} storyId={storyId} controller={controller} onBack={() => setArcOpen(false)} onPlanArc={onPlanArc}
          onContinue={() => {
            setArcOpen(false);
            if (mode === 'survival') openFate(true);
            else if (onGenerateNextChapter) void writeNext();
          }} />
      </main>
      {writing}
    </>;
  }
  if (holdingsOpen) {
    return <>
      <main className="mx-auto w-full min-w-0 max-w-6xl">
        <HoldingsPage state={state} storyId={storyId} onBack={() => setHoldingsOpen(false)} onReadPassage={openPassage}
          onReadChapter={number => { openChapter(number); setHoldingsOpen(false); }} />
      </main>
      {writing}
    </>;
  }
  if (fateOpen) {
    return <>
      <main className="mx-auto w-full min-w-0 max-w-6xl">
        <FatePage state={state} storyId={storyId} controller={controller} onBack={() => setFateOpen(false)} onOpenArc={openArc}
          onGenerateNextChapter={onGenerateNextChapter} writer={writer} focusDirection={fateFocus}
          onReadChapter={number => { openChapter(number); setFateOpen(false); }} />
      </main>
      {writing}
    </>;
  }

  const index = chapter ? chapters.indexOf(chapter) : -1;
  const previous = index > 0 ? chapters[index - 1] : undefined;
  const later = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined;
  // Rewrite this chapter: only the newest chapter, and only while nothing is built on it yet. It
  // stays in place while its own rewrite is written, so a failed one keeps the reader's note.
  const rewritable = Boolean(onRewriteChapter && chapter && !later && latestStoryChapter(state, storyId)?.id === chapter.id
    && (writer.writing || !chapterRewriteGap(state, storyId)));
  const rewriteChapter = async (note?: string) => {
    const rewritten = await writer.rewrite(note);
    if (rewritten) openChapter(rewritten);
    return Boolean(rewritten);
  };

  return <>
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 pb-12" data-testid="harness-reader">
      {/* Where a new chapter scrolls to: the stuck bar itself is always in view. */}
      <div ref={topRef} aria-hidden />
      <ReaderTopBar barRef={barRef} storyTitle={story.title} place={chapter ? `Chapter ${chapter.chapterNumber}` : 'Story start'}
        onBack={onClose} onOpenHoldings={openHoldings} onOpenFate={() => openFate()} onOpenSettings={() => openSettings()} />
      {storageError && <p role="alert" className="mt-3 text-sm text-amber-300">{storageError}</p>}

      {chapter
        ? <ChapterBody chapter={chapter} blocks={blocks} locale={story.originalLanguage} articleRef={articleRef}
            highlight={highlight} reading={reading} text={text} />
        : <section className="py-16 text-center" aria-label="Story start">
            <h1 className="font-display text-3xl text-white">{story.title}</h1>
            <p className="mt-3 text-sm text-neutral-400">
              {continueAfterLatest ? 'Your story begins here.' : 'The first chapter can’t be written here yet.'}
            </p>
          </section>}

      {writer.error && <p role="alert" className="mt-6 text-sm text-amber-200">{writer.error}</p>}
      <nav ref={setChapterEnd} className="mt-8 flex items-center justify-between gap-3" aria-label="Chapters">
        <button type="button" aria-label="Previous Chapter" disabled={!previous} onClick={() => previous && openChapter(previous.chapterNumber)}
          className={`${navButton} border-white/15 text-neutral-200 hover:border-white/30`}>Previous</button>
        {later
          ? <button type="button" aria-label="Next Chapter" onClick={() => openChapter(later.chapterNumber)}
              className={`${navButton} border-white/15 text-neutral-200 hover:border-white/30`}>Next</button>
          : continueAfterLatest && <span className="relative inline-flex items-center gap-2">
              {continueAfterLatest.writes && renderWriteAside?.(chapters.length)}
              <button type="button" aria-label={`Next Chapter: ${continueAfterLatest.label}`}
                disabled={continueAfterLatest.busy} aria-busy={continueAfterLatest.busy || undefined} onClick={continueAfterLatest.run}
                className={`${navButton} border-cyan-300/50 bg-cyan-400/15 font-semibold text-cyan-50 hover:bg-cyan-400/25`}>{continueAfterLatest.label}</button>
            </span>}
      </nav>
      {rewritable && chapter && <ChapterRewrite key={chapter.id} chapterNumber={chapter.chapterNumber} disabled={writer.writing} onRewrite={rewriteChapter} />}
      {chapter && <ReadAloudPlayer readAloud={readAloud} onListen={listen} offscreen={follow.offscreen}
        onBackToNarration={follow.backToNarration} playerRef={playerRef}
        note={mixer && <ReaderMixerNote mixer={mixer} onOpenSettings={() => openSettings('audio')} />} />}
    </main>
    <ReaderSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} readAloud={readAloud} language={language}
      mixer={mixer} section={settingsSection} soundtrack={{ choice: soundtrackChoice, onChoice: chooseSoundtrack, pieces: pieces ?? [] }}
      text={{ settings: textSettings, onChange: changeText, fonts: readerFonts }} />
    {writing}
  </>;
}
