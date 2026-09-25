import { HARNESS_CHAPTER_TARGET_MAX_WORDS, HARNESS_CHAPTER_TARGET_MIN_WORDS } from './chapterBody';
import type { HarnessStory, ImmediateChapterRequest } from '../../../narrative/generation';

/**
 * Builds the Immediate Chapter Request for one attempt. The HARNESS owns the
 * chapter number, the chapter-scale target, and the reader's choice for this
 * one chapter, when they made one on the Fate page.
 */
export const buildImmediateChapterRequest = (story: HarnessStory): ImmediateChapterRequest => {
  const direction = story.nextChapterDirection?.forChapter === story.head.nextChapterNumber ? story.nextChapterDirection : undefined;
  return {
    chapterNumber: story.head.nextChapterNumber,
    continuation: Boolean(story.head.lastCommittedChapterId),
    chapterScale: { minWords: HARNESS_CHAPTER_TARGET_MIN_WORDS, maxWords: HARNESS_CHAPTER_TARGET_MAX_WORDS },
    ...(direction ? { direction: structuredClone(direction) } : {}),
  };
};
