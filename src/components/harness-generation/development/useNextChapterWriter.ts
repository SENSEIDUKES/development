import { useCallback, useState } from 'react';
import type { HarnessGenerationController } from '../shared/controller';
import { pendingChapterDirection } from '../shared/chapterDirection';
import { latestStoryChapter } from '../shared/chapterRewrite';

/** One story's next-chapter write, shared by every surface that can start it. */
export interface NextChapterWriter {
  writing: boolean;
  /** The chapter being written. It stays set after the write, so a closing screen keeps its number. */
  writingChapter?: number;
  /** Why the last write did not save a chapter. A chosen direction is kept for the retry. */
  error: string;
  /** The chapter the last write saved. */
  written?: number;
  /** Writes the next chapter; resolves its number once it is saved. */
  write: () => Promise<number | undefined>;
  /** Writes the latest chapter again, with the reader's optional note; resolves its number once the new version is saved. */
  rewrite: (note?: string) => Promise<number | undefined>;
  /** Forgets the last outcome. */
  reset: () => void;
}

/**
 * Writes a story's next chapter with the host's writer and reports what
 * happened. A failed write leaves the chapter's one-chapter choice in place,
 * so the same choice is used when the reader tries again; a saved chapter has
 * used it up. A rewrite of the latest chapter reports the same way; when it
 * fails, the chapter is unchanged.
 */
export function useNextChapterWriter(
  controller: HarnessGenerationController,
  storyId: string,
  generate?: () => Promise<void>,
  rewriteLatest?: (note?: string) => Promise<void>,
): NextChapterWriter {
  const [writing, setWriting] = useState(false);
  const [writingChapter, setWritingChapter] = useState<number>();
  const [error, setError] = useState('');
  const [written, setWritten] = useState<number>();

  const write = useCallback(async () => {
    const story = controller.snapshot().stories.find(entry => entry.id === storyId);
    if (!generate || !story) return undefined;
    const chapterNumber = story.head.nextChapterNumber;
    const retry = pendingChapterDirection(story) ? 'Its direction is kept, so you can try again.' : 'You can try again.';
    setWriting(true); setWritingChapter(chapterNumber); setError(''); setWritten(undefined);
    try {
      await generate();
      const latest = controller.snapshot();
      if ((latest.stories.find(entry => entry.id === storyId)?.head.nextChapterNumber ?? 0) > chapterNumber) {
        setWritten(chapterNumber);
        return chapterNumber;
      }
      const failure = latest.attempts.filter(attempt => attempt.storyId === storyId && attempt.chapterNumber === chapterNumber).at(-1)?.failure?.message;
      setError(`Chapter ${chapterNumber} was not saved.${failure ? ` ${failure}` : ''} ${retry}`);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'The chapter could not be written.'} ${retry}`);
    } finally {
      setWriting(false);
    }
    return undefined;
  }, [controller, generate, storyId]);

  const rewrite = useCallback(async (note?: string) => {
    const replaced = latestStoryChapter(controller.snapshot(), storyId);
    if (!rewriteLatest || !replaced) return undefined;
    const chapterNumber = replaced.chapterNumber;
    const unchanged = `Chapter ${chapterNumber} is unchanged.`;
    setWriting(true); setWritingChapter(chapterNumber); setError(''); setWritten(undefined);
    try {
      await rewriteLatest(note);
      const latest = controller.snapshot();
      const now = latestStoryChapter(latest, storyId);
      if (now && now.id !== replaced.id && now.chapterNumber === chapterNumber) {
        setWritten(chapterNumber);
        return chapterNumber;
      }
      const failure = latest.attempts.filter(attempt => attempt.storyId === storyId
        && attempt.immediateChapterRequest.rewrite?.replacesChapterId === replaced.id).at(-1)?.failure?.message;
      setError(`Chapter ${chapterNumber} was not rewritten.${failure ? ` ${failure}` : ''} ${unchanged}`);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'The chapter could not be rewritten.'} ${unchanged}`);
    } finally {
      setWriting(false);
    }
    return undefined;
  }, [controller, rewriteLatest, storyId]);

  const reset = useCallback(() => { setError(''); setWritten(undefined); }, []);
  return { writing, writingChapter, error, written, write, rewrite, reset };
}
