import { arcFirstChapter, arcGoalCompleted, arcGenerationContext, confirmArcGoal, createArcChapterPosition, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import type { HarnessArcGoalReview, HarnessGenerationAttempt, HarnessStory, StoryFoundationInput } from '../../../narrative/generation';

/**
 * Regular Reader mode: Rhythm directs by default and Arc Goals stay editable
 * while the novel is private. Fate Survival: each arc's goals are set once,
 * immediately before that arc begins, and locked when its generation begins.
 */
export type HarnessStoryMode = 'regular' | 'survival';

export const harnessStoryMode = (foundation?: Pick<StoryFoundationInput, 'fateSurvival'>): HarnessStoryMode =>
  foundation?.fateSurvival?.enabled ? 'survival' : 'regular';

const arcOf = (chapterNumber: number) => createArcChapterPosition(chapterNumber).arcNumber;

/** An arc has begun once any of its chapters is committed. */
const arcHasBegun = (story: HarnessStory, arcNumber: number) => story.head.nextChapterNumber > arcFirstChapter(arcNumber);

/**
 * The saved plan for one arc as of a chapter: the newest revision of that arc
 * made effective by then. Every arc keeps its own revision history, so an edit
 * to a later arc never displaces the active one, and earlier chapters keep the
 * plan they were written against.
 */
export function harnessArcPlan(story: HarnessStory, arcNumber: number, asOfChapter = Infinity): ArcPlan | undefined {
  return (story.arcPlans ?? [])
    .filter(revision => revision.plan.arcNumber === arcNumber && revision.effectiveChapter <= asOfChapter)
    .at(-1)?.plan;
}

export function harnessArcContext(story: HarnessStory, foundation: StoryFoundationInput, chapter: number) {
  const plan = harnessArcPlan(story, arcOf(chapter), chapter);
  return plan ? arcGenerationContext(plan, chapter, foundation.destinedEnding ?? '', story.goalCompletions, foundation.plannedArcCount) : undefined;
}

export function readArcReply(raw: string): Record<string, unknown> {
  try { const value = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}

/** A deadline failure is a failed attempt, never a chapter commit or plan extension. */
export function arcDeadlineFailure(attempt: HarnessGenerationAttempt): string | undefined {
  const context = attempt.storyInformation.arc;
  if (!context || !attempt.acceptedDraft) return 'The frozen Story Information Packet has no authoritative Arc Plan.';
  if (attempt.chapterNumber < context.completionDeadline) return undefined;
  const completion = confirmArcGoal(context, attempt.chapterNumber, attempt.acceptedDraft.prose,
    readArcReply(attempt.rawProviderResponse ?? '').arcCompletion);
  return completion ? undefined : `Chapter ${attempt.chapterNumber} is the completion deadline for “${context.activeGoal.text}”. The chapter cannot commit until the model reports completion with verbatim evidence from its prose.`;
}

/** Runs inside the existing atomic chapter commit, including persistence retries. */
export function commitHarnessArc(story: HarnessStory, attempt: HarnessGenerationAttempt) {
  const context = attempt.storyInformation.arc;
  if (!context || !attempt.acceptedDraft) return;
  const completion = confirmArcGoal(context, attempt.chapterNumber, attempt.acceptedDraft.prose,
    readArcReply(attempt.rawProviderResponse ?? '').arcCompletion);
  if (completion && !(story.goalCompletions ?? []).some(done => done.arcNumber === completion.arcNumber && done.goalId === completion.goalId && done.goalText === completion.goalText)) {
    story.goalCompletions = [...(story.goalCompletions ?? []), completion];
  }
}

/**
 * Whether the automatic Arc planner must create a plan before the next
 * chapter. A story with a Blueprint roadmap planned every arc before it began,
 * so nothing is invented at a boundary; only stories without a roadmap plan
 * their next arc automatically.
 */
export function needsArcPlan(story: HarnessStory, foundation?: Pick<StoryFoundationInput, 'plannedArcCount'>): boolean {
  if (foundation?.plannedArcCount) return false;
  return !harnessArcPlan(story, arcOf(story.head.nextChapterNumber));
}

/** Why the next chapter has no saved plan in a roadmap story, if it has none. */
export function roadmapPlanGap(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'plannedArcCount'>): string | undefined {
  const count = foundation.plannedArcCount;
  if (!count) return undefined;
  const arc = arcOf(story.head.nextChapterNumber);
  if (arc > count) return `All ${count} planned ${count === 1 ? 'arc is' : 'arcs are'} written: the route to the Destined Ending is complete. Chapter ${story.head.nextChapterNumber} would begin Arc ${arc}, which the novel's Blueprint never planned.`;
  return harnessArcPlan(story, arc) ? undefined : `Arc ${arc} has no saved plan in this novel's roadmap.`;
}

export const arcGoalReview = (story: HarnessStory, arcNumber: number): HarnessArcGoalReview | undefined =>
  (story.arcGoalReviews ?? []).find(review => review.arcNumber === arcNumber);

/** Replaces one arc's review record, keeping the others in arc order. */
export const withArcGoalReview = (story: HarnessStory, review: HarnessArcGoalReview): HarnessArcGoalReview[] =>
  [...(story.arcGoalReviews ?? []).filter(entry => entry.arcNumber !== review.arcNumber), review]
    .sort((left, right) => left.arcNumber - right.arcNumber);

export interface HarnessArcGoalEditState {
  arcNumber: number;
  mode: HarnessStoryMode;
  status: 'completed' | 'active' | 'upcoming';
  /** Whether the user may save an edit to this arc's goals now. */
  editable: boolean;
  /** Why the arc cannot be edited now, in plain language. */
  reason?: string;
  /** Fate Survival: where this arc stands in its one-time review. */
  review?: 'pending' | 'edited' | 'accepted' | 'locked' | 'not-yet';
  /** Fate Survival: the plan may be accepted as written instead of edited. */
  canAccept: boolean;
  /** Completed goals keep their wording, allocation and position. */
  lockedGoalIds: string[];
}

/**
 * The single rule for who may change which Arc Goals, shared by the
 * controller (which enforces it) and every surface that offers an edit.
 * Completed arcs are history in both modes.
 */
export function arcGoalEditState(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'fateSurvival'> | undefined, arcNumber: number): HarnessArcGoalEditState {
  const mode = harnessStoryMode(foundation);
  const currentArc = arcOf(story.head.nextChapterNumber);
  const status = arcNumber < currentArc ? 'completed' : arcNumber === currentArc ? 'active' : 'upcoming';
  const plan = harnessArcPlan(story, arcNumber);
  const lockedGoalIds = plan ? plan.goals.filter(goal => arcGoalCompleted(plan, goal, story.goalCompletions)).map(goal => goal.id) : [];
  const denied = (reason: string, review?: HarnessArcGoalEditState['review']): HarnessArcGoalEditState =>
    ({ arcNumber, mode, status, editable: false, reason, ...(review ? { review } : {}), canAccept: false, lockedGoalIds });
  if (!plan) return denied(`Arc ${arcNumber} has no saved plan.`);
  if (status === 'completed') return denied(`Arc ${arcNumber} is complete. Its goals are part of the novel's history.`);
  if (lockedGoalIds.length === plan.goals.length) return denied(`Every goal in Arc ${arcNumber} is complete.`);

  if (mode === 'regular') {
    const visibility = story.visibility ?? 'private';
    if (visibility !== 'private') return denied('Arc Goals can be edited only while the novel is private.');
    return { arcNumber, mode, status, editable: true, canAccept: false, lockedGoalIds };
  }

  const review = arcGoalReview(story, arcNumber);
  if (review?.lockedAt || arcHasBegun(story, arcNumber)) return denied(`Arc ${arcNumber}'s goals were locked when its generation began.`, 'locked');
  if (review?.reviewedAt) {
    return denied(`Arc ${arcNumber}'s goals were set in its one-time review and lock when its first chapter is generated.`, review.edited ? 'edited' : 'accepted');
  }
  if (status === 'upcoming') return denied(`Fate Survival sets Arc ${arcNumber}'s goals once, immediately before it begins.`, 'not-yet');
  return { arcNumber, mode, status, editable: true, review: 'pending', canAccept: true, lockedGoalIds };
}

/** Fate Survival: the arc about to be generated must have used its one-time review. */
export function survivalArcReviewGap(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'fateSurvival'>): string | undefined {
  if (harnessStoryMode(foundation) !== 'survival') return undefined;
  const arc = arcOf(story.head.nextChapterNumber);
  const review = arcGoalReview(story, arc);
  if (review?.lockedAt || review?.reviewedAt || arcHasBegun(story, arc)) return undefined;
  return `Set Arc ${arc}'s goals before it begins. Review its saved plan in the novel's Blueprint, then edit it once or accept it as written.`;
}
