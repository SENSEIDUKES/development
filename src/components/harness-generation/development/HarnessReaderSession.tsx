import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Settings } from 'lucide-react';
import { TextHighlightEngine, type TextHighlightBlock, type TextHighlightOverlay } from '@seihouse/sen/text-highlight-engine';
import { InlineAudioText } from '@seihouse/sen/inline-audio';
import type { SoundCueAttachment } from '@seihouse/sen/audio';
import {
  READ_ALOUD_SCRIPT_VERSION,
  applyReaderStatePatch,
  buildReadAloudScript,
  createReaderStoryState,
  resolveReaderOpeningChapter,
  useReadAloud,
  type ReadAloudScript,
  type ReadAloudVoicePicks,
  type ReaderPreferenceStorage,
  type ReaderStateRepository,
  type ReaderStoryState,
} from '@seihouse/sen/reader-runtime';
import { harnessParagraphBlockId } from '../shared/chapterBody';
import { harnessStoryMode, nextArcStep } from '../shared/arcState';
import { pendingChapterDirection } from '../shared/chapterDirection';
import { protagonistNames } from '../shared/speakers';
import { BlueprintArcPage } from './BlueprintArcPage';
import { FatePage } from './FatePage';
import { HoldingsPage } from './HoldingsPage';
import { ReadAloudPlayer } from './ReadAloudPlayer';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';
import { useFollowNarration, type NarrationHighlight } from './useFollowNarration';
import { useNextChapterWriter } from './useNextChapterWriter';
import type { HarnessGenerationController } from '../shared/controller';
import type { HarnessWorkspaceState } from '../../../narrative/generation';

/** What the host's writing screen shows. */
export interface HarnessReaderWriting {
  /** True while the next chapter is being written. */
  active: boolean;
  /** The chapter being written. It keeps its number while the screen closes. */
  chapterNumber: number;
}

/** The Reader shows chapters; it never edits them. */
const keepProse = () => undefined;

const navButton = 'min-h-11 rounded-full border px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40';

type ReaderChapter = HarnessWorkspaceState['chapters'][number];

const NO_SCRIPT: ReadAloudScript = { version: READ_ALOUD_SCRIPT_VERSION, lines: [] };

/** The engine blocks of one chapter, under the ids its Sound Cues and speaker records use. */
const chapterBlocks = (chapter: ReaderChapter): TextHighlightBlock[] => chapter.paragraphs.map((text, index) => ({
  id: harnessParagraphBlockId(chapter.chapterNumber, index), text,
}));

/**
 * The first line to read when the reader taps Listen: the chapter title while
 * it is on screen, otherwise the first paragraph still in view.
 */
function lineWhereTheReaderIs(script: ReadAloudScript, article: HTMLElement | null): number {
  if (!article || typeof article.getBoundingClientRect !== 'function') return 0;
  const title = article.querySelector<HTMLElement>('[data-read-aloud-title]');
  if (!title || title.getBoundingClientRect().bottom > 0) return 0;
  for (const block of article.querySelectorAll<HTMLElement>('[data-sen-text-block]')) {
    if (block.getBoundingClientRect().bottom <= 0) continue;
    const index = script.lines.findIndex(line => line.blockId === block.getAttribute('data-sen-text-block'));
    if (index >= 0) return index;
  }
  return 0;
}

/**
 * The Reader for a HARNESS story. Each chapter's paragraphs sit on the Text
 * Highlight Engine (read-only, no tools yet) with its Sound Cues as the only
 * active layer, and Listen reads it aloud in three voices with the spoken
 * sentence lit. At the newest chapter, Next writes the next one (or, in Fate
 * Survival, asks for its direction first); the Fate page is one tap away.
 * Reader Settings holds Narration only; Codex and Mind Palace are not part of it.
 */
export function HarnessReaderSession({
  state, storyId, onClose, controller, readerStateRepository, onGenerateNextChapter, onPlanArc, renderWriting, startOnOpen = false,
  readerPreferences, readAloudVoices,
}: {
  state: HarnessWorkspaceState; storyId: string; onClose: () => void; controller: HarnessGenerationController;
  /**
   * Writes the story's next chapter with the host's model: from Next at the
   * newest chapter, and from the Fate page. Absent when the host cannot generate here.
   */
  onGenerateNextChapter?: () => Promise<void>;
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
   * Begins a story that has no chapters yet as soon as the Reader opens:
   * Chapter 1 is written (Regular Reader) or its direction is asked for
   * first (Fate Survival). The host sets it from Start Story; it runs once.
   */
  startOnOpen?: boolean;
  /** Host-owned storage for the reader's device preferences (narration voices and speed). */
  readerPreferences?: ReaderPreferenceStorage;
  /** The host's preferred narration voices, by story language and role. SEN prefers none. */
  readAloudVoices?: ReadAloudVoicePicks;
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
  const writer = useNextChapterWriter(controller, storyId, onGenerateNextChapter);
  const [storageError, setStorageError] = useState('');
  const readerStateRef = useRef<ReaderStoryState | undefined>(undefined);
  const persistEnabled = useRef(Boolean(readerStateRepository));
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const topRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const continueAfterLatest: { label: string; run: () => void; busy?: boolean } | undefined = !story ? undefined
    : story.conclusion
      ? { label: 'See how the story ended', run: () => openFate() }
      : arcStep
        ? { label: `Arc ${arcStep.arcNumber} begins`, run: openArc }
        : mode === 'survival' && !pendingChapterDirection(story)
        ? { label: `Direct Chapter ${upcoming}`, run: () => openFate(true) }
        : onGenerateNextChapter
          ? { label: writer.writing ? `Writing Chapter ${upcoming}…` : `Write Chapter ${upcoming}`, run: () => void writeNext(), busy: writer.writing }
          : undefined;

  // Start Story: the first chapter begins once, as soon as the Reader can begin it.
  const continueRef = useRef(continueAfterLatest);
  continueRef.current = continueAfterLatest;
  const started = useRef(false);
  const readyToStart = startOnOpen && Boolean(readerState) && chapters.length === 0 && Boolean(continueAfterLatest);
  useEffect(() => {
    if (!readyToStart || started.current) return;
    started.current = true;
    continueRef.current?.run();
  }, [readyToStart]);

  // Read Aloud follows the chapter on screen. Another page or the writing
  // screen over the chapter silences it until the chapter is back.
  const chapter = chapters.find(entry => entry.chapterNumber === selectedChapter) ?? chapters.at(-1);
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
    suspended: fateOpen || arcOpen || holdingsOpen || writer.writing,
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
  const follow = useFollowNarration({ article: articleRef, highlight, active: reading, player: playerRef });
  const listen = () => readAloud.play(lineWhereTheReaderIs(readAloud.script(), articleRef.current));
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

  return <>
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 pb-12 pt-4" data-testid="harness-reader">
      <div ref={topRef} className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClose} className={`${navButton} border-white/15 text-neutral-200 hover:border-white/30`}>Back</button>
        <p className="min-w-0 flex-1 truncate text-center font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">{story.title}</p>
        {readAloud.supported && <button type="button" aria-label="Reader Settings" title="Reader Settings" aria-haspopup="dialog"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 text-neutral-200 hover:border-white/30">
          <Settings className="h-4 w-4" aria-hidden />
        </button>}
        <button type="button" aria-label="Open Holdings" title="Holdings: what each character has now" onClick={openHoldings}
          className={`${navButton} border-white/15 text-neutral-200 hover:border-white/30`}>Holdings</button>
        <button type="button" aria-label="Open Fate" title="Fate: decide what happens next" onClick={() => openFate()}
          className={`${navButton} border-cyan-300/30 text-cyan-50 hover:border-cyan-300/60`}>Fate</button>
      </div>
      {storageError && <p role="alert" className="mt-3 text-sm text-amber-300">{storageError}</p>}

      {chapter
        ? <ChapterView chapter={chapter} blocks={blocks} locale={story.originalLanguage} articleRef={articleRef}
            highlight={highlight} reading={reading} />
        : <section className="py-16 text-center" aria-label="Story start">
            <h1 className="font-display text-3xl text-white">{story.title}</h1>
            <p className="mt-3 text-sm text-neutral-400">
              {continueAfterLatest ? 'Your story begins here.' : 'The first chapter can’t be written here yet.'}
            </p>
          </section>}

      {writer.error && <p role="alert" className="mt-6 text-sm text-amber-200">{writer.error}</p>}
      <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Chapters">
        <button type="button" aria-label="Previous Chapter" disabled={!previous} onClick={() => previous && openChapter(previous.chapterNumber)}
          className={`${navButton} border-white/15 text-neutral-200 hover:border-white/30`}>Previous</button>
        {later
          ? <button type="button" aria-label="Next Chapter" onClick={() => openChapter(later.chapterNumber)}
              className={`${navButton} border-white/15 text-neutral-200 hover:border-white/30`}>Next</button>
          : continueAfterLatest && <button type="button" aria-label={`Next Chapter: ${continueAfterLatest.label}`}
              disabled={continueAfterLatest.busy} aria-busy={continueAfterLatest.busy || undefined} onClick={continueAfterLatest.run}
              className={`${navButton} border-cyan-300/50 bg-cyan-400/15 font-semibold text-cyan-50 hover:bg-cyan-400/25`}>{continueAfterLatest.label}</button>}
      </nav>
      {chapter && <ReadAloudPlayer readAloud={readAloud} onListen={listen} offscreen={follow.offscreen}
        onBackToNarration={follow.backToNarration} playerRef={playerRef} />}
    </main>
    <ReaderSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} readAloud={readAloud} language={language} />
    {writing}
  </>;
}

/** Behind the sentence being read aloud; a host theme may set its own. */
const READ_ALOUD_TONE = 'var(--sen-read-aloud-highlight, rgba(103, 232, 249, 0.16))';

/**
 * One chapter: its title and its paragraphs on the engine, with the Sound
 * Cues placed on their words and the sentence being read aloud lit. The
 * overlay stays mounted while Read Aloud is active, so moving from sentence
 * to sentence never replays its fade.
 */
const ChapterView = memo(function ChapterView({ chapter, blocks, locale, articleRef, highlight, reading }: {
  chapter: ReaderChapter; blocks: readonly TextHighlightBlock[]; locale?: string; articleRef: RefObject<HTMLElement | null>;
  highlight?: NarrationHighlight; reading: boolean;
}) {
  const overlay = useMemo((): TextHighlightOverlay | undefined => {
    if (!reading) return undefined;
    if (!highlight || highlight === 'title') return { marks: [] };
    return { marks: [{ id: 'read-aloud', selection: highlight, tone: READ_ALOUD_TONE }] };
  }, [reading, highlight]);
  const cuesByBlock = useMemo(() => {
    const byBlock = new Map<string, SoundCueAttachment[]>();
    for (const cue of chapter.soundCues ?? []) byBlock.set(cue.anchor.blockId, [...(byBlock.get(cue.anchor.blockId) ?? []), cue]);
    return byBlock;
  }, [chapter]);
  return <article ref={articleRef} className="mt-6" data-chapter-number={chapter.chapterNumber} lang={locale} aria-labelledby={`harness-reader-chapter-${chapter.chapterNumber}`}>
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Chapter {chapter.chapterNumber}</p>
    <h1 id={`harness-reader-chapter-${chapter.chapterNumber}`} data-read-aloud-title="" data-speaking={highlight === 'title' ? '' : undefined}
      className={`mt-1 rounded font-display text-2xl text-white transition-colors sm:text-3xl ${highlight === 'title' ? 'bg-cyan-300/15' : ''}`}>{chapter.title}</h1>
    <TextHighlightEngine blocks={blocks} onBlocksChange={keepProse} editable={false} locale={locale} overlay={overlay}
      className="mt-6 font-serif text-[1.075rem] leading-8 text-neutral-200 [&_p]:mb-5"
      renderBlockText={block => {
        const cues = cuesByBlock.get(block.id);
        return cues?.length ? <InlineAudioText text={block.text} cues={cues} renderText={text => text} /> : block.text;
      }} />
  </article>;
});
