import { HARNESS_CHAPTER_TARGET_MAX_WORDS, HARNESS_CHAPTER_TARGET_MIN_WORDS, harnessChapterParagraphTarget } from './chapterBody';
import type { HarnessChapterRewrite, HarnessStory, ImmediateChapterRequest } from '../../../narrative/generation';

/**
 * Builds the Immediate Chapter Request for one attempt. The HARNESS owns the
 * chapter number, the chapter-scale target (with this chapter's exact
 * paragraph count), and the reader's choice for this
 * one chapter, when they made one on the Fate page. A rewrite of the latest
 * chapter is built from the story as it stood before that chapter, and
 * carries the reader's request beside it.
 */
export const buildImmediateChapterRequest = (story: HarnessStory, rewrite?: HarnessChapterRewrite): ImmediateChapterRequest => {
  const direction = story.nextChapterDirection?.forChapter === story.head.nextChapterNumber ? story.nextChapterDirection : undefined;
  return {
    chapterNumber: story.head.nextChapterNumber,
    continuation: Boolean(story.head.lastCommittedChapterId),
    chapterScale: {
      minWords: HARNESS_CHAPTER_TARGET_MIN_WORDS,
      maxWords: HARNESS_CHAPTER_TARGET_MAX_WORDS,
      paragraphs: harnessChapterParagraphTarget(story.id, story.head.nextChapterNumber),
    },
    ...(direction ? { direction: structuredClone(direction) } : {}),
    ...(rewrite ? { rewrite: structuredClone(rewrite) } : {}),
  };
};
