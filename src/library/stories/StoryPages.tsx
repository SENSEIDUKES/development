import { useEffect, useState } from 'react';
import { findStory, HarnessReaderSession } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage, ReaderStateRepository } from '@seihouse/sen/reader-runtime';
import AILoadingVeil from '../../components/chapter-manifestation/development/AILoadingVeil';
import { StoryDetailScreen } from '../../components/light-novels-home/development/StoryDetailScreen';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import { LIBRARY_READ_ALOUD_VOICES } from './readAloudVoices';
import { downloadHarnessStory } from './storyExport';
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
  /** Host-owned device preferences: the reader's narration voices and speed. */
  readerPreferences?: ReaderPreferenceStorage;
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
export function StoryPages({ stories, storyId, page, onOpenReader, onCloseReader, onBack, backLabel, readerStateRepository, readerPreferences, writingAgent }: StoryPagesProps) {
  const { state, controller, loadError } = stories;
  /** Set by Start Story, so the Reader begins Chapter 1 as it opens. */
  const [startOnOpen, setStartOnOpen] = useState(false);
  const [readingPosition, setReadingPosition] = useState<{ chapterNumber: number }>();
  const [exportProblem, setExportProblem] = useState<string>();

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
      readerPreferences={readerPreferences} readAloudVoices={LIBRARY_READ_ALOUD_VOICES}
      onGenerateNextChapter={stories.canGenerate ? () => stories.generateNextChapter(storyId) : undefined}
      onRewriteChapter={stories.canGenerate ? note => stories.rewriteLatestChapter(storyId, note) : undefined}
      onPlanArc={stories.canGenerate ? () => stories.planArc(storyId) : undefined}
      renderWriting={writingAgent ? writing => <AILoadingVeil agent={writingAgent} isGenerating={writing.active}
        generationPhase="chapter" generatingChapterNum={writing.chapterNumber} progress={null}
        generationProgressMessage={null} estimatedSecondsRemaining={null} activeAgentId="versa"
        streamingBlocksCount={0} isVeilMinimized={false} setIsVeilMinimized={keepVeilOpen} /> : undefined}
      onClose={() => { setStartOnOpen(false); onCloseReader(); }} />
  </>;

  const exportStory = () => {
    try {
      downloadHarnessStory(state, storyId);
      setExportProblem(undefined);
    } catch (error) {
      setExportProblem(error instanceof Error ? error.message : 'The story could not be exported.');
    }
  };

  return <>
    {writerAlert}
    <main className="px-4 pb-12 pt-4 sm:px-6 sm:pt-6" data-testid="harness-world-info">
      <StoryDetailScreen story={display} backLabel={backLabel} readingPosition={readingPosition}
        onBack={onBack}
        onRead={() => { setStartOnOpen(false); onOpenReader(); }}
        onStart={() => { setStartOnOpen(true); onOpenReader(); }} />
      {/* For testing: the whole story as one file, so a test can be shared. */}
      <div className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-4" data-testid="story-export">
        <button type="button" onClick={exportStory}
          className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Export story</button>
        <p className="min-w-0 flex-1 text-xs text-neutral-500">Saves a file with every chapter and what the writer was given for it, so a test can be shared.</p>
        {exportProblem && <p role="alert" className="w-full text-xs text-amber-200">{exportProblem}</p>}
      </div>
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
