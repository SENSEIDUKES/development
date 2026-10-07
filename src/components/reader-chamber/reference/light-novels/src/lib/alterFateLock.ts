import type { Story } from '../types';

/**
 * Returns the reader-safe explanation for why a chapter cannot be used as a
 * Fate branch point, or null when the chapter is safe to branch from.
 */
export const getFateLockMessage = (story: Story, chapterNumber: number) => {
  const batch = story.chapterGenerationBatch;
  if (!batch) return null;

  // A stopped run is no longer changing the source timeline. Its already
  // committed chapters are safe branch points; unfinished chapters remain
  // protected until the user resumes or starts a new run later.
  if (
    (batch.status === 'failed' || batch.status === 'paused')
    && batch.completedChapterNumbers.includes(chapterNumber)
  ) {
    return null;
  }

  const endpoint = batch.chapterNumbers[batch.chapterNumbers.length - 1];
  if (batch.status !== 'completed' || chapterNumber !== endpoint) {
    return `Fate may be altered after Chapter ${endpoint}.`;
  }

  return null;
};
