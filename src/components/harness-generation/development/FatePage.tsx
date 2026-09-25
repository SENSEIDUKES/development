import { useState } from 'react';
import type { HarnessWorkspaceState } from '../../../narrative/generation';
import type { HarnessGenerationController } from '../shared/controller';
import { harnessStoryMode } from '../shared/arcState';
import { chapterDirectionGap } from '../shared/chapterDirection';
import { FATE_MODE_LABELS, FateArcGoalCard, FateConclusion, FateDestinedEnding, FatePathChooser, describeChapterPath } from './FatePanel';

/**
 * The HARNESS Reader's Fate page: where the story is headed (the Destined
 * Ending and the active Arc Goal) and the path of the next chapter. Regular
 * Reader mode lets fate (Rhythm) choose or lets the reader take the path;
 * Fate Survival asks the reader to direct every chapter. Writing the chapter
 * is a host action, since the host owns the model choice.
 */
export function FatePage({ state, storyId, controller, onBack, onGenerateNextChapter, onReadChapter }: {
  state: HarnessWorkspaceState;
  storyId: string;
  controller: HarnessGenerationController;
  onBack: () => void;
  /** Writes the next chapter with the host's model. Absent when the host cannot generate here. */
  onGenerateNextChapter?: () => Promise<void>;
  /** Opens a chapter in the Reader. */
  onReadChapter?: (chapterNumber: number) => void;
}) {
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const [written, setWritten] = useState<number>();
  const story = state.stories.find(entry => entry.id === storyId);
  if (!story) return <p role="alert" className="p-4 text-sm text-amber-200">This story is no longer available.</p>;
  const foundation = state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input;
  const mode = harnessStoryMode(foundation);
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((a, b) => a.chapterNumber - b.chapterNumber);
  const lastChapter = chapters.at(-1);
  const nextChapter = story.head.nextChapterNumber;
  const gap = chapterDirectionGap(story, mode);

  const write = async () => {
    if (!onGenerateNextChapter) return;
    setWriting(true); setError(''); setWritten(undefined);
    try {
      await onGenerateNextChapter();
      const latest = controller.snapshot().stories.find(entry => entry.id === storyId);
      if (latest && latest.head.nextChapterNumber > nextChapter) setWritten(nextChapter);
      else setError(`Chapter ${nextChapter} was not saved. Its direction is kept, so you can try again.`);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'The chapter could not be written.'} Its direction is kept, so you can try again.`);
    } finally { setWriting(false); }
  };

  return (
    <section className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-3 py-4 sm:px-4" aria-labelledby="fate-page-title" data-testid="fate-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">{FATE_MODE_LABELS[mode]} · {story.title}</p>
          <h2 id="fate-page-title" className="mt-1 font-display text-2xl text-white">Fate</h2>
        </div>
        <button type="button" onClick={onBack} className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Back to reading</button>
      </div>

      <FateConclusion story={story} />
      <FateDestinedEnding foundation={foundation} />
      {!story.conclusion && <FateArcGoalCard story={story} foundation={foundation} generatedThrough={lastChapter?.chapterNumber ?? 0} />}
      {lastChapter?.path && (
        <p className="text-xs text-neutral-400" data-testid="fate-last-path">Chapter {lastChapter.chapterNumber} followed: {describeChapterPath(lastChapter.path)}</p>
      )}

      {!story.conclusion && (
        <FatePathChooser story={story} foundation={foundation} chapters={chapters} busy={writing}
          onChoose={async choice => { setWritten(undefined); await controller.chooseChapterDirection(storyId, choice); }} />
      )}

      {!story.conclusion && onGenerateNextChapter && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void write()} disabled={writing || Boolean(gap)}
            className="min-h-11 rounded-full border border-cyan-300/50 bg-cyan-400/15 px-5 text-sm font-semibold text-cyan-50 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-45">
            {writing ? `Writing Chapter ${nextChapter}…` : `Write Chapter ${nextChapter}`}
          </button>
          {gap && <p className="text-xs text-neutral-400">{gap}</p>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
      {written !== undefined && (
        <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-emerald-200">
          <span>Chapter {written} is written. Its direction was used and cleared.</span>
          {onReadChapter && <button type="button" onClick={() => onReadChapter(written)} className="min-h-11 rounded-full border border-emerald-300/40 px-4 text-sm text-emerald-50">Read Chapter {written}</button>}
        </div>
      )}
    </section>
  );
}
