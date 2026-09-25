import { isChapterFunction } from '../../../narrative/storyDirection';
import {
  CHAPTER_DIRECTION_TEXT_LIMIT,
  type ChapterDirectionChoice,
  type HarnessChapterPath,
  type HarnessGenerationAttempt,
  type HarnessStory,
  type HarnessStoryMode,
} from '../../../narrative/generation';

/**
 * Checks one reader choice for the next chapter against the story's Fate mode
 * and returns the clean value to save. Regular Reader mode offers the three
 * chapter functions and the reader's own direction; Fate Survival offers only
 * the reader's own direction, because SEN never proposes the path there.
 */
export function validateChapterDirectionChoice(choice: ChapterDirectionChoice, mode: HarnessStoryMode): ChapterDirectionChoice {
  if (choice?.kind === 'reader') {
    const text = typeof choice.text === 'string' ? choice.text.trim() : '';
    if (!text) throw new Error('Write the direction for this chapter.');
    if (text.length > CHAPTER_DIRECTION_TEXT_LIMIT) throw new Error(`Keep the direction under ${CHAPTER_DIRECTION_TEXT_LIMIT.toLocaleString()} characters.`);
    return { kind: 'reader', text };
  }
  if (choice?.kind === 'chapter-function') {
    if (mode === 'survival') throw new Error('Fate Survival: you direct each chapter yourself, in your own words.');
    if (!isChapterFunction(choice.chapterFunction)) throw new Error('Choose Progression, World Building, or Conflict.');
    const suggestion = typeof choice.suggestion === 'string' ? choice.suggestion.trim() : '';
    return { kind: 'chapter-function', chapterFunction: choice.chapterFunction, ...(suggestion ? { suggestion } : {}) };
  }
  throw new Error('Choose a path for the next chapter.');
}

/** The reader's pending choice for the story's next chapter, if they made one. */
export const pendingChapterDirection = (story: HarnessStory) =>
  story.nextChapterDirection?.forChapter === story.head.nextChapterNumber ? story.nextChapterDirection : undefined;

/**
 * Why the next chapter cannot be requested yet in this mode, if it cannot.
 * Fate Survival never continues on its own: every chapter needs the reader's direction.
 */
export function chapterDirectionGap(story: HarnessStory, mode: HarnessStoryMode): string | undefined {
  if (mode !== 'survival' || pendingChapterDirection(story)) return undefined;
  return `Fate Survival: choose Chapter ${story.head.nextChapterNumber}'s direction on the Fate page before it is written.`;
}

/** How a committed chapter's path was decided, read from the attempt's frozen inputs. */
export function attemptChapterPath(attempt: HarnessGenerationAttempt): HarnessChapterPath | undefined {
  const direction = attempt.immediateChapterRequest.direction;
  if (direction) return { directionId: direction.id, ...structuredClone(direction.choice) };
  const rhythm = attempt.storyInformation.rhythm;
  return rhythm ? { kind: 'automatic', chapterFunction: rhythm.recommendedFunction, ...(rhythm.suggestion ? { suggestion: rhythm.suggestion } : {}) } : undefined;
}
