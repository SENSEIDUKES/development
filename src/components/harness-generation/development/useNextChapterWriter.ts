import { useCallback, useState } from 'react';
import type { HarnessGenerationController } from '../shared/controller';
import { pendingChapterDirection } from '../shared/chapterDirection';

/** One story's next-chapter write, shared by every surface that can start it. */
export interface NextChapterWriter {
  writing: boolean;
  /** Why the last write did not save a chapter. A chosen direction is kept for the retry. */
  error: string;
  /** The chapter the last write saved. */
  written?: number;
  /** Writes the next chapter; resolves its number once it is saved. */
  write: () => Promise<number | undefined>;
  /** Forgets the last outcome. */
  reset: () => void;
}

/**
 * Writes a story's next chapter with the host's writer and reports what
 * happened. A failed write leaves the chapter's one-chapter choice in place,
 * so the same choice is used when the reader tries again; a saved chapter has
 * used it up.
 */
export function useNextChapterWriter(controller: HarnessGenerationController, storyId: string, generate?: () => Promise<void>): NextChapterWriter {
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const [written, setWritten] = useState<number>();

  const write = useCallback(async () => {
    const story = controller.snapshot().stories.find(entry => entry.id === storyId);
    if (!generate || !story) return undefined;
    const chapterNumber = story.head.nextChapterNumber;
    const retry = pendingChapterDirection(story) ? 'Its direction is kept, so you can try again.' : 'You can try again.';
    setWriting(true); setError(''); setWritten(undefined);
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

  const reset = useCallback(() => { setError(''); setWritten(undefined); }, []);
  return { writing, error, written, write, reset };
}
