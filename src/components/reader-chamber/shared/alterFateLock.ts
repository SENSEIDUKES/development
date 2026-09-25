import type { Story } from '@seihouse/sen/reader-chamber';

/**
 * Reference-only support for the locked Reader Chamber replica's retired
 * Alter Fate (Branch) panel. No development surface or package export uses it:
 * the development Reader's Alter Fate opens the host's Fate page instead.
 *
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
