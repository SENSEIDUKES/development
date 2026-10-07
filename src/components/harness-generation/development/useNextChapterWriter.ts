import { useCallback, useEffect, useRef, useState } from 'react';
import type { HarnessChapterWrite, HarnessGenerationController } from '../shared/controller';
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

type WriteRecord = Pick<HarnessChapterWrite, 'chapterNumber' | 'kind' | 'replacesChapterId'>;

/**
 * Writes a story's next chapter with the host's writer and reports what
 * happened. A failed write leaves the chapter's one-chapter choice in place,
 * so the same choice is used when the reader tries again; a saved chapter has
 * used it up. A rewrite of the latest chapter reports the same way; when it
 * fails, the chapter is unchanged.
 *
 * The write itself belongs to the controller, not to this surface: one begun
 * elsewhere (Chapter 1 started as the story was made, or a chapter the reader
 * left the Reader during) shows here as writing, is never started twice, and
 * is reported here when it ends.
 */
export function useNextChapterWriter(
  controller: HarnessGenerationController,
  storyId: string,
  generate?: () => Promise<void>,
  rewriteLatest?: (note?: string) => Promise<void>,
): NextChapterWriter {
  // The write this surface is starting: covers the host's own steps before the controller's write begins.
  const [starting, setStarting] = useState<WriteRecord>();
  const [writingChapter, setWritingChapter] = useState<number>();
  const [error, setError] = useState('');
  const [written, setWritten] = useState<number>();
  // Read on every render: the host renders again whenever the controller announces a change.
  const active = controller.chapterWrite(storyId);
  const startingRef = useRef(starting);
  startingRef.current = starting;

  /** What a finished write left: the chapter it saved, or why it saved none. */
  const report = useCallback((write: WriteRecord): number | undefined => {
    const latest = controller.snapshot();
    const { chapterNumber } = write;
    if (write.kind === 'rewrite') {
      const now = latestStoryChapter(latest, storyId);
      if (now && now.id !== write.replacesChapterId && now.chapterNumber === chapterNumber) {
        setWritten(chapterNumber);
        return chapterNumber;
      }
      const failure = latest.attempts.filter(attempt => attempt.storyId === storyId
        && attempt.immediateChapterRequest.rewrite?.replacesChapterId === write.replacesChapterId).at(-1)?.failure?.message;
      setError(`Chapter ${chapterNumber} was not rewritten.${failure ? ` ${failure}` : ''} Chapter ${chapterNumber} is unchanged.`);
      return undefined;
    }
    const story = latest.stories.find(entry => entry.id === storyId);
    if ((story?.head.nextChapterNumber ?? 0) > chapterNumber) {
      setWritten(chapterNumber);
      return chapterNumber;
    }
    const retry = story && pendingChapterDirection(story) ? 'Its direction is kept, so you can try again.' : 'You can try again.';
    const failure = latest.attempts.filter(attempt => attempt.storyId === storyId && attempt.chapterNumber === chapterNumber).at(-1)?.failure?.message;
    setError(`Chapter ${chapterNumber} was not saved.${failure ? ` ${failure}` : ''} ${retry}`);
    return undefined;
  }, [controller, storyId]);

  // A write this surface did not start: show it, and report it when it ends.
  const activeDone = active?.done;
  useEffect(() => {
    const write = controller.chapterWrite(storyId);
    if (!write || startingRef.current) return undefined;
    let current = true;
    setWritingChapter(write.chapterNumber); setError(''); setWritten(undefined);
    void write.done.then(() => { if (current && !startingRef.current) report(write); });
    return () => { current = false; };
  }, [activeDone, controller, report, storyId]);

  const write = useCallback(async () => {
    const story = controller.snapshot().stories.find(entry => entry.id === storyId);
    // Already being written: the write in progress reports itself.
    if (!generate || !story || controller.chapterWrite(storyId)) return undefined;
    const record: WriteRecord = { kind: 'next', chapterNumber: story.head.nextChapterNumber };
    setStarting(record); setWritingChapter(record.chapterNumber); setError(''); setWritten(undefined);
    try {
      await generate();
      return report(record);
    } catch (cause) {
      const retry = pendingChapterDirection(story) ? 'Its direction is kept, so you can try again.' : 'You can try again.';
      setError(`${cause instanceof Error ? cause.message : 'The chapter could not be written.'} ${retry}`);
    } finally {
      setStarting(undefined);
    }
    return undefined;
  }, [controller, generate, report, storyId]);

  const rewrite = useCallback(async (note?: string) => {
    const replaced = latestStoryChapter(controller.snapshot(), storyId);
    if (!rewriteLatest || !replaced || controller.chapterWrite(storyId)) return undefined;
    const record: WriteRecord = { kind: 'rewrite', chapterNumber: replaced.chapterNumber, replacesChapterId: replaced.id };
    setStarting(record); setWritingChapter(record.chapterNumber); setError(''); setWritten(undefined);
    try {
      await rewriteLatest(note);
      return report(record);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'The chapter could not be rewritten.'} Chapter ${record.chapterNumber} is unchanged.`);
    } finally {
      setStarting(undefined);
    }
    return undefined;
  }, [controller, report, rewriteLatest, storyId]);

  const reset = useCallback(() => { setError(''); setWritten(undefined); }, []);
  return { writing: Boolean(active || starting), writingChapter, error, written, write, rewrite, reset };
}
