import { HARNESS_CHAPTER_TARGET_MAX_WORDS, HARNESS_CHAPTER_TARGET_MIN_WORDS } from './chapterBody';
import type { HarnessStory, ImmediateChapterRequest } from '../../../narrative/generation';

/**
 * Builds the Immediate Chapter Request for one attempt. The HARNESS owns the
 * chapter number, the chapter-scale target, and which persistent direction the
 * model must act on now; the full steering history remains story information
 * in the packet.
 */
export const buildImmediateChapterRequest = (story: HarnessStory): ImmediateChapterRequest => {
  const latest = story.steering?.at(-1);
  return {
    chapterNumber: story.head.nextChapterNumber,
    continuation: Boolean(story.head.lastCommittedChapterId),
    chapterScale: { minWords: HARNESS_CHAPTER_TARGET_MIN_WORDS, maxWords: HARNESS_CHAPTER_TARGET_MAX_WORDS },
    ...(latest ? { assignment: latest.direction } : {}),
  };
};
