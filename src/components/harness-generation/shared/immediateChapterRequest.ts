import type { HarnessStory, ImmediateChapterRequest } from '../../../narrative/generation';

/**
 * Builds the Immediate Chapter Request for one attempt. The HARNESS owns the
 * chapter number and decides which persistent direction the model must act on
 * now; the full steering history remains story information in the packet.
 */
export const buildImmediateChapterRequest = (story: HarnessStory): ImmediateChapterRequest => {
  const latest = story.steering?.at(-1);
  return {
    chapterNumber: story.head.nextChapterNumber,
    continuation: Boolean(story.head.lastCommittedChapterId),
    ...(latest ? { assignment: latest.direction } : {}),
  };
};
