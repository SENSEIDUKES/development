import type { HarnessWorkspaceState } from '../../../narrative/generation';
import type { HarnessGenerationController } from '../shared/controller';
import { harnessStoryMode } from '../shared/arcState';
import { chapterDirectionGap } from '../shared/chapterDirection';
import { FATE_MODE_LABELS, FateArcGoalCard, FateConclusion, FateDestinedEnding, FatePathChooser, describeChapterPath } from './FatePanel';
import { useNextChapterWriter, type NextChapterWriter } from './useNextChapterWriter';

/**
 * The HARNESS Reader's Fate page: where the story is headed (the Destined
 * Ending, the active Arc Goal and where the route stands) and the path of the
 * next chapter. Regular Reader mode lets fate (Rhythm) decide by default, with
 * four paths to intervene; Fate Survival asks the reader to direct every
 * chapter. Writing the chapter is a host action, since the host owns the model.
 */
export function FatePage({ state, storyId, controller, onBack, onGenerateNextChapter, onReadChapter, writer: sharedWriter, focusDirection = false }: {
  state: HarnessWorkspaceState;
  storyId: string;
  controller: HarnessGenerationController;
  onBack: () => void;
  /** Writes the next chapter with the host's model. Absent when the host cannot generate here. */
  onGenerateNextChapter?: () => Promise<void>;
  /** Opens a chapter in the Reader. */
  onReadChapter?: (chapterNumber: number) => void;
  /** The session's writer, when another surface can also start the write. */
  writer?: NextChapterWriter;
  /** Opened as the step the next chapter waits on: the reader's own direction. */
  focusDirection?: boolean;
}) {
  const ownWriter = useNextChapterWriter(controller, storyId, onGenerateNextChapter);
  const { writing, error, written, write, reset } = sharedWriter ?? ownWriter;
  const story = state.stories.find(entry => entry.id === storyId);
  if (!story) return <p role="alert" className="p-4 text-sm text-amber-200">This story is no longer available.</p>;
  const foundation = state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input;
  const mode = harnessStoryMode(foundation);
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((a, b) => a.chapterNumber - b.chapterNumber);
  const lastChapter = chapters.at(-1);
  const nextChapter = story.head.nextChapterNumber;
  const gap = chapterDirectionGap(story, mode);
  const writtenPath = chapters.find(chapter => chapter.chapterNumber === written)?.path;

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
        <FatePathChooser story={story} foundation={foundation} chapters={chapters} busy={writing} focusDirection={focusDirection}
          onChoose={async choice => { reset(); await controller.chooseChapterDirection(storyId, choice); }} />
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
          <span>Chapter {written} is written.{writtenPath && writtenPath.kind !== 'automatic' ? ' Its direction was used and cleared.' : ''}</span>
          {onReadChapter && <button type="button" onClick={() => onReadChapter(written)} className="min-h-11 rounded-full border border-emerald-300/40 px-4 text-sm text-emerald-50">Read Chapter {written}</button>}
        </div>
      )}
    </section>
  );
}
