import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TextHighlightEngine, type TextHighlightBlock } from '@seihouse/sen/text-highlight-engine';
import { InlineAudioText } from '@seihouse/sen/reader-chamber';
import type { SoundCueAttachment } from '@seihouse/sen/audio';
import {
  applyReaderStatePatch,
  createReaderStoryState,
  resolveReaderOpeningChapter,
  type ReaderStateRepository,
  type ReaderStoryState,
} from '@seihouse/sen/reader-runtime';
import { harnessParagraphBlockId } from '../shared/chapterBody';
import { harnessStoryMode } from '../shared/arcState';
import { pendingChapterDirection } from '../shared/chapterDirection';
import { FatePage } from './FatePage';
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

/**
 * The Reader for a HARNESS story: just reading. Each chapter's paragraphs sit
 * on the Text Highlight Engine (read-only, no tools yet) with its Sound Cues
 * as the only active layer. At the newest chapter, Next writes the next one
 * (or, in Fate Survival, asks for its direction first); the Fate page is one
 * tap away. Codex, Mind Palace and reading settings are not part of it.
 */
export function HarnessReaderSession({ state, storyId, onClose, controller, readerStateRepository, onGenerateNextChapter, renderWriting, startOnOpen = false }: {
  state: HarnessWorkspaceState; storyId: string; onClose: () => void; controller: HarnessGenerationController;
  /**
   * Writes the story's next chapter with the host's model: from Next at the
   * newest chapter, and from the Fate page. Absent when the host cannot generate here.
   */
  onGenerateNextChapter?: () => Promise<void>;
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
}) {
  const story = state.stories.find(entry => entry.id === storyId);
  const chapters = useMemo(() => state.chapters
    .filter(chapter => chapter.storyId === storyId)
    .sort((left, right) => left.chapterNumber - right.chapterNumber), [state.chapters, storyId]);
  const [readerState, setReaderState] = useState<ReaderStoryState>();
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [fateOpen, setFateOpen] = useState(false);
  const [fateFocus, setFateFocus] = useState(false);
  const writer = useNextChapterWriter(controller, storyId, onGenerateNextChapter);
  const [storageError, setStorageError] = useState('');
  const readerStateRef = useRef<ReaderStoryState | undefined>(undefined);
  const persistEnabled = useRef(Boolean(readerStateRepository));
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const topRef = useRef<HTMLDivElement>(null);
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
  const openFate = (focusDirection = false) => { writer.reset(); setFateFocus(focusDirection); setFateOpen(true); };
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

  if (!story) return <p role="alert" className="p-4 text-sm text-amber-200">This story is no longer available.</p>;
  if (!readerState) return <main className="mx-auto w-full max-w-3xl px-4 py-6"><p role="status" className="text-sm text-neutral-400">Opening your place in the story…</p></main>;

  // One position for the writing screen in both views, so it can close smoothly.
  const writing = renderWriting?.({ active: writer.writing, chapterNumber: writer.writingChapter ?? upcoming });
  if (fateOpen) {
    return <>
      <main className="mx-auto w-full min-w-0 max-w-6xl">
        <FatePage state={state} storyId={storyId} controller={controller} onBack={() => setFateOpen(false)}
          onGenerateNextChapter={onGenerateNextChapter} writer={writer} focusDirection={fateFocus}
          onReadChapter={number => { openChapter(number); setFateOpen(false); }} />
      </main>
      {writing}
    </>;
  }

  const chapter = chapters.find(entry => entry.chapterNumber === selectedChapter) ?? chapters.at(-1);
  const index = chapter ? chapters.indexOf(chapter) : -1;
  const previous = index > 0 ? chapters[index - 1] : undefined;
  const later = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined;

  return <>
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 pb-12 pt-4" data-testid="harness-reader">
      <div ref={topRef} className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClose} className={`${navButton} border-white/15 text-neutral-200 hover:border-white/30`}>Back</button>
        <p className="min-w-0 flex-1 truncate text-center font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">{story.title}</p>
        <button type="button" aria-label="Open Fate" title="Fate: decide what happens next" onClick={() => openFate()}
          className={`${navButton} border-cyan-300/30 text-cyan-50 hover:border-cyan-300/60`}>Fate</button>
      </div>
      {storageError && <p role="alert" className="mt-3 text-sm text-amber-300">{storageError}</p>}

      {chapter
        ? <ChapterView chapter={chapter} locale={story.originalLanguage} />
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
    </main>
    {writing}
  </>;
}

/** One chapter: its title and its paragraphs on the engine, with the Sound Cues placed on their words. */
function ChapterView({ chapter, locale }: { chapter: HarnessWorkspaceState['chapters'][number]; locale?: string }) {
  const blocks = useMemo<TextHighlightBlock[]>(() => chapter.paragraphs.map((text, index) => ({
    id: harnessParagraphBlockId(chapter.chapterNumber, index), text,
  })), [chapter]);
  const cuesByBlock = useMemo(() => {
    const byBlock = new Map<string, SoundCueAttachment[]>();
    for (const cue of chapter.soundCues ?? []) byBlock.set(cue.anchor.blockId, [...(byBlock.get(cue.anchor.blockId) ?? []), cue]);
    return byBlock;
  }, [chapter]);
  return <article className="mt-6" data-chapter-number={chapter.chapterNumber} lang={locale} aria-labelledby={`harness-reader-chapter-${chapter.chapterNumber}`}>
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Chapter {chapter.chapterNumber}</p>
    <h1 id={`harness-reader-chapter-${chapter.chapterNumber}`} className="mt-1 font-display text-2xl text-white sm:text-3xl">{chapter.title}</h1>
    <TextHighlightEngine blocks={blocks} onBlocksChange={keepProse} editable={false} locale={locale}
      className="mt-6 font-serif text-[1.075rem] leading-8 text-neutral-200 [&_p]:mb-5"
      renderBlockText={block => {
        const cues = cuesByBlock.get(block.id);
        return cues?.length ? <InlineAudioText text={block.text} cues={cues} renderText={text => text} /> : block.text;
      }} />
  </article>;
}
