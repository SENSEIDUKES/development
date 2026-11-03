import { ARC_LENGTH, arcGoalResolution, arcGoalSegments, createArcChapterPosition } from '@seihouse/sen/arc-goals';
import { findStory, harnessArcPlan, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import type { WorldInfoArc, WorldInfoChapter } from '@seihouse/library/home';

/**
 * World Info's chapter selector for a HARNESS story: every written chapter, with the reader's
 * own read chapters, and the story's arcs with each goal where it falls and the chapter the story
 * reached (or missed) it in. The selector decides what the reader may see of that.
 */
export function worldInfoChapterMap(state: HarnessWorkspaceState, storyId: string, readChapters: readonly number[] = []): {
  chapters: WorldInfoChapter[]; arcs: WorldInfoArc[];
} {
  const read = new Set(readChapters);
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId)
    .map(chapter => ({ number: chapter.chapterNumber, title: chapter.title, ...(read.has(chapter.chapterNumber) ? { read: true } : {}) }));
  const story = findStory(state, storyId);
  if (!story) return { chapters, arcs: [] };
  // Every arc that holds a chapter or has a plan, in order.
  const arcNumbers = new Set([
    ...chapters.map(chapter => createArcChapterPosition(chapter.number).arcNumber),
    ...(story.arcPlans ?? []).map(revision => revision.plan.arcNumber),
  ]);
  const arcs = [...arcNumbers].sort((left, right) => left - right).map((arcNumber): WorldInfoArc => {
    const plan = harnessArcPlan(story, arcNumber);
    const firstChapter = (arcNumber - 1) * ARC_LENGTH + 1;
    return {
      number: arcNumber, firstChapter, lastChapter: firstChapter + ARC_LENGTH - 1,
      goals: plan ? arcGoalSegments(plan).map(goal => {
        const resolution = arcGoalResolution(plan, goal, story.goalCompletions);
        return {
          text: goal.text, startChapter: goal.startChapter, endChapter: goal.endChapter,
          ...(resolution ? { resolved: { chapterNumber: resolution.chapterNumber, outcome: resolution.outcome === 'missed' ? 'missed' as const : 'reached' as const } } : {}),
        };
      }) : [],
    };
  });
  return { chapters, arcs };
}
