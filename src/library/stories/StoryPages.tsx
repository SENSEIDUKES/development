import { useEffect, useState } from 'react';
import { findStory, HarnessReaderSession } from '@seihouse/sen/harness-generation';
import type { ReaderStateRepository } from '@seihouse/sen/reader-runtime';
import AILoadingVeil from '../../components/chapter-manifestation/development/AILoadingVeil';
import { StoryDetailScreen } from '../../components/light-novels-home/development/StoryDetailScreen';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import { harnessStoryDisplay } from './storyView';
import type { LibraryStories } from './useLibraryStories';

export interface StoryPagesProps {
  stories: LibraryStories;
  storyId: string;
  /** Which of the story's pages shows: its World Info page or the Reader. */
  page: 'info' | 'read';
  /** World Info's Start Story, Start Reading or Continue: show the Reader. */
  onOpenReader: () => void;
  /** The Reader's Back. */
  onCloseReader: () => void;
  /** World Info's Back. */
  onBack: () => void;
  /** The visible name of World Info's way back. */
  backLabel?: string;
  /** Host-owned durable Reader state: the reading place. */
  readerStateRepository?: ReaderStateRepository;
  /** The agent the Aura Veil shows while a chapter is written (the host owns agent art). Without it, Next says it is writing. */
  writingAgent?: LoadingAgentPresentation;
}

/** The veil stays open while a chapter is written; there is no minimized state here. */
const keepVeilOpen = () => undefined;

/**
 * One story's own pages: its World Info page (Start Story, Start Reading,
 * Continue) and the Reader, with the Aura Veil while a chapter is written.
 * The host decides which page shows and keeps this mounted, keyed by story,
 * as the reader moves between them, so Start Story still begins Chapter 1 once
 * the Reader opens.
 */
export function StoryPages({ stories, storyId, page, onOpenReader, onCloseReader, onBack, backLabel, readerStateRepository, writingAgent }: StoryPagesProps) {
  const { state, controller, loadError } = stories;
  /** Set by Start Story, so the Reader begins Chapter 1 as it opens. */
  const [startOnOpen, setStartOnOpen] = useState(false);
  const [readingPosition, setReadingPosition] = useState<{ chapterNumber: number }>();

  // World Info says Continue for a returning reader; the place is the host's Reader state.
  useEffect(() => {
    setReadingPosition(undefined);
    if (page !== 'info' || !readerStateRepository) return;
    let active = true;
    readerStateRepository.load(storyId).then(saved => {
      if (active && saved?.lastReadChapter) setReadingPosition({ chapterNumber: saved.lastReadChapter });
    }, () => undefined);
    return () => { active = false; };
  }, [page, storyId, readerStateRepository]);

  if (!state) return <main className="mx-auto max-w-3xl px-4 py-6">
    {loadError
      ? <LoadAlert message={loadError} onRetry={stories.retry} />
      : <p role="status" className="text-sm text-neutral-400">Opening your story…</p>}
  </main>;
  const display = findStory(state, storyId) ? harnessStoryDisplay(state, storyId) : undefined;
  if (!display) return <main className="mx-auto max-w-3xl px-4 py-6">
    <p role="alert" className="text-sm text-amber-200">This story is no longer available.</p>
  </main>;
  // The stories are open but the writer did not answer: reading still works.
  const writerAlert = loadError && <div className="mx-auto max-w-3xl px-4 pt-4"><LoadAlert message={loadError} onRetry={stories.retry} /></div>;

  if (page === 'read') return <>
    {writerAlert}
    <HarnessReaderSession state={state} storyId={storyId} controller={controller}
      readerStateRepository={readerStateRepository} startOnOpen={startOnOpen}
      onGenerateNextChapter={stories.canGenerate ? () => stories.generateNextChapter(storyId) : undefined}
      renderWriting={writingAgent ? writing => <AILoadingVeil agent={writingAgent} isGenerating={writing.active}
        generationPhase="chapter" generatingChapterNum={writing.chapterNumber} progress={null}
        generationProgressMessage={null} estimatedSecondsRemaining={null} activeAgentId="versa"
        streamingBlocksCount={0} isVeilMinimized={false} setIsVeilMinimized={keepVeilOpen} /> : undefined}
      onClose={() => { setStartOnOpen(false); onCloseReader(); }} />
  </>;

  return <>
    {writerAlert}
    <main className="px-4 pb-12 pt-4 sm:px-6 sm:pt-6" data-testid="harness-world-info">
      <StoryDetailScreen story={display} backLabel={backLabel} readingPosition={readingPosition}
        onBack={onBack}
        onRead={() => { setStartOnOpen(false); onOpenReader(); }}
        onStart={() => { setStartOnOpen(true); onOpenReader(); }} />
    </main>
  </>;
}

function LoadAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-amber-200">
    <span>{message}</span>
    <button type="button" onClick={onRetry}
      className="rounded-full border border-amber-200/40 px-3 py-1 text-xs font-semibold text-amber-100 hover:border-amber-200/70">Retry</button>
  </div>;
}
