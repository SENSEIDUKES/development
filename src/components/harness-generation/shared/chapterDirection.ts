import { isChapterFunction } from '../../../narrative/storyDirection';
import {
  CHAPTER_DIRECTION_TEXT_LIMIT,
  type ChapterDirectionChoice,
  type HarnessChapterPath,
  type HarnessGenerationAttempt,
  type HarnessStory,
  type HarnessStoryMode,
  type HarnessWorkspaceState,
} from '../../../narrative/generation';
import { harnessStoryMode, nextArcStep } from './arcState';

/**
 * Checks one reader choice for the next chapter and returns the clean value to
 * save. Both Fate modes offer the three chapter functions, each with the
 * writer's suggested idea, and the reader's own direction. The modes differ in
 * what happens without a choice: Regular Reader leaves the path to fate, while
 * Fate Survival writes nothing until the reader chooses. The mode stays in the
 * signature so a mode can narrow its paths later.
 */
export function validateChapterDirectionChoice(choice: ChapterDirectionChoice, mode: HarnessStoryMode): ChapterDirectionChoice {
  if (choice?.kind === 'reader') {
    const text = typeof choice.text === 'string' ? choice.text.trim() : '';
    if (!text) throw new Error('Write the direction for this chapter.');
    if (text.length > CHAPTER_DIRECTION_TEXT_LIMIT) throw new Error(`Keep the direction under ${CHAPTER_DIRECTION_TEXT_LIMIT.toLocaleString()} characters.`);
    return { kind: 'reader', text };
  }
  if (choice?.kind === 'chapter-function') {
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
 * Whether the story's next chapter waits on the reader before it can be
 * written: an ended story, an arc whose goals still need planning or the
 * reader's review, or a Fate Survival chapter without the reader's direction.
 * When nothing waits, a host may begin the chapter without being asked, as
 * the NovelExpanded app begins Chapter 1 the moment a story is made.
 */
export function nextChapterWaitsOnReader(state: Pick<HarnessWorkspaceState, 'stories' | 'foundations' | 'arcPlanOperations'>, storyId: string): boolean {
  const story = state.stories.find(entry => entry.id === storyId);
  if (!story || story.conclusion || nextArcStep(state, storyId)) return true;
  const foundation = state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input;
  return harnessStoryMode(foundation) === 'survival' && !pendingChapterDirection(story);
}

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
