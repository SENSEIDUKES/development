import { arcFirstChapter, arcGoalResolution, arcGoalResolved, arcGoalSegments, arcGenerationContext, arcMissedGoals, confirmArcGoal, createArcChapterPosition, type ArcGenerationContext, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import type { HarnessArcContext, HarnessArcGoalReview, HarnessGenerationAttempt, HarnessStory, HarnessStoryConclusion, HarnessStoryMode, HarnessWarning, StoryFoundationInput } from '../../../narrative/generation';

/**
 * Both modes record every Arc Goal honestly: achieved, with a verbatim
 * passage from the prose, or missed when its deadline chapter commits without
 * it. A chapter is never held back until the writer claims success.
 *
 * Regular Reader mode: Rhythm directs by default and the reader may direct any
 * chapter. The Destined Ending is guaranteed as the story's standing
 * direction: every chapter pursues it, a missed goal only puts the story off
 * track, and a missed final goal lets the story continue past its roadmap
 * toward the same ending. Arc Goals stay editable while the novel is private.
 *
 * Fate Survival: the reader directs every chapter; each arc's goals are set
 * once, immediately before that arc begins, and locked when its generation
 * begins. Missing at least half of one arc's goals, or the final goal, breaks
 * the route, and the story closes within a short closing stretch. A fatal
 * ending the writer shows ends the story at once.
 */
export type { HarnessStoryMode };

export const harnessStoryMode = (foundation?: Pick<StoryFoundationInput, 'fateSurvival'>): HarnessStoryMode =>
  foundation?.fateSurvival?.enabled ? 'survival' : 'regular';

/** Fate Survival: the most chapters a story may still write after its route breaks. */
export const SURVIVAL_CLOSING_CHAPTER_LIMIT = 5 as const;

/** Fate Survival's current rule: missing at least half of one arc's goals breaks the route, such as 3 of 5 or 2 of 4. */
export const goalsThatBreakRoute = (goalsInArc: number) => Math.max(1, Math.ceil(goalsInArc / 2));

export const missedGoalsBreakRoute = (missedInArc: number, goalsInArc: number) => missedInArc >= goalsThatBreakRoute(goalsInArc);

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

/**
 * Regular Reader mode: the roadmap's final goal, when it was missed. The story
 * then continues past its roadmap toward the same Destined Ending, with that
 * goal still its destination and no deadline.
 */
export function regularFinalGoalMissed(story: HarnessStory, foundation?: Pick<StoryFoundationInput, 'fateSurvival' | 'plannedArcCount'>) {
  const count = foundation?.plannedArcCount;
  if (!count || harnessStoryMode(foundation) !== 'regular') return undefined;
  const plan = harnessArcPlan(story, count);
  const goal = plan ? arcGoalSegments(plan).at(-1) : undefined;
  const resolution = plan && goal ? arcGoalResolution(plan, goal, story.goalCompletions) : undefined;
  return resolution?.outcome === 'missed' ? { plan: plan!, goal: goal!, missedInChapter: resolution.chapterNumber } : undefined;
}

/**
 * The arc a chapter belongs to: its own, except that a broken route's closing
 * chapters, and Regular Reader chapters past a missed final goal, stay with
 * the arc they continue even beyond its planned end. No arc begins after them.
 */
export function harnessChapterArc(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'fateSurvival' | 'plannedArcCount'> | undefined, chapterNumber: number): number {
  if (story.brokenRoute && chapterNumber > story.brokenRoute.chapterNumber) return story.brokenRoute.arcNumber;
  const pastFinal = regularFinalGoalMissed(story, foundation);
  return pastFinal && chapterNumber > pastFinal.goal.endChapter ? pastFinal.plan.arcNumber : arcOf(chapterNumber);
}

/** The same arc context, for a chapter beyond the goal it was built on: positions count on from that arc, and no new arc begins. */
const carriedContext = (context: ArcGenerationContext, chapter: number, display: string): ArcGenerationContext => ({
  ...context,
  arcNumber: context.plan.arcNumber,
  chapterInArc: chapter - arcFirstChapter(context.plan.arcNumber) + 1,
  positionInSegment: chapter - context.activeGoal.startChapter + 1,
  display,
});

/**
 * The Active Arc Goal for a chapter, with where the story stands on its route.
 * A broken route's closing chapters keep the arc it broke in, even past that
 * arc's planned end. After a missed final goal, Regular Reader mode keeps that
 * goal as its destination past the roadmap instead of inventing another.
 */
export function harnessArcContext(story: HarnessStory, foundation: StoryFoundationInput, chapter: number): HarnessArcContext | undefined {
  const ending = foundation.destinedEnding ?? '';
  const broken = story.brokenRoute;
  if (broken && chapter > broken.chapterNumber) {
    const plan = harnessArcPlan(story, broken.arcNumber, broken.chapterNumber);
    if (!plan) return undefined;
    const closingChapter = chapter - broken.chapterNumber;
    return {
      ...carriedContext(arcGenerationContext(plan, broken.chapterNumber, ending, story.goalCompletions, foundation.plannedArcCount),
        chapter, `Arc ${broken.arcNumber} — closing chapter ${closingChapter} of ${broken.closingChapterLimit}`),
      route: { status: 'broken', missedGoals: structuredClone(broken.missedGoals), brokenInChapter: broken.chapterNumber, reason: broken.reason,
        closingChapter, closingChapterLimit: broken.closingChapterLimit },
    };
  }
  const plan = harnessArcPlan(story, arcOf(chapter), chapter);
  if (plan) {
    const missedGoals = arcMissedGoals(plan, story.goalCompletions, chapter);
    return { ...arcGenerationContext(plan, chapter, ending, story.goalCompletions, foundation.plannedArcCount),
      route: missedGoals.length ? { status: 'off-track', missedGoals } : { status: 'on-track' } };
  }
  const pastFinal = regularFinalGoalMissed(story, foundation);
  if (pastFinal && chapter > pastFinal.goal.endChapter) {
    const past = chapter - pastFinal.goal.endChapter;
    return {
      ...carriedContext(arcGenerationContext(pastFinal.plan, pastFinal.goal.endChapter, ending, story.goalCompletions, foundation.plannedArcCount),
        chapter, `Arc ${pastFinal.plan.arcNumber} — ${past} ${past === 1 ? 'chapter' : 'chapters'} past its final goal`),
      route: { status: 'past-final-goal', missedGoals: arcMissedGoals(pastFinal.plan, story.goalCompletions), finalGoalMissedInChapter: pastFinal.missedInChapter },
    };
  }
  return undefined;
}

export function readArcReply(raw: string): Record<string, unknown> {
  try { const value = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}

/** The mode an attempt was prepared under, from its frozen packet. Packets frozen before modes reached the writer read as Regular. */
export const attemptStoryMode = (attempt: HarnessGenerationAttempt): HarnessStoryMode =>
  attempt.storyInformation.storyDirection.fateMode ?? 'regular';

/**
 * The writer's report that this chapter's prose completes the story's ending,
 * accepted only in Fate Survival and only with a continuous verbatim passage
 * from the chapter. Returns the evidence, or a warning when a report is set aside.
 */
export function readStoryEnding(attempt: HarnessGenerationAttempt): { evidence?: string; warning?: HarnessWarning } {
  const report = readArcReply(attempt.rawProviderResponse ?? '').storyEnded as { ended?: unknown; evidence?: unknown } | undefined;
  if (!report || report.ended !== true || !attempt.acceptedDraft) return {};
  const evidence = typeof report.evidence === 'string' ? report.evidence.trim() : '';
  if (attemptStoryMode(attempt) !== 'survival') {
    return { warning: { code: 'ignored_story_ending', message: 'The writer reported that the story ended, but Regular Reader mode never fails its fate: it ends only by reaching the Destined Ending. The report was set aside.' } };
  }
  if (!evidence || !attempt.acceptedDraft.prose.includes(evidence)) {
    return { warning: { code: 'ignored_story_ending', message: 'The writer reported that the story ended without a verbatim passage from the chapter. The story continues.' } };
  }
  return { evidence };
}

/**
 * Runs inside the existing atomic chapter commit, including persistence
 * retries. In both modes it records the active goal honestly: achieved with
 * verbatim evidence, or missed once its deadline chapter commits without it.
 * Then it applies the mode's consequence: the Destined Ending reached through
 * the final goal ends the story; in Fate Survival a missed goal may break the
 * route, the writer may show the story ending, and a broken route's closing
 * stretch ends it. Returns warnings about reports it set aside.
 */
export function commitHarnessArc(story: HarnessStory, attempt: HarnessGenerationAttempt, recordedAt: string): HarnessWarning[] {
  const context = attempt.storyInformation.arc;
  if (!context || !attempt.acceptedDraft) return [];
  const warnings: HarnessWarning[] = [];
  const survival = attemptStoryMode(attempt) === 'survival';
  const chapterNumber = attempt.chapterNumber;
  const reply = readArcReply(attempt.rawProviderResponse ?? '');
  const route = context.route;
  let outcome: 'completed' | 'missed' | undefined;
  let evidence = '';
  // A broken route has no goal left to reach: its closing chapters only bring the story to its end.
  if (route?.status !== 'broken') {
    const completion = confirmArcGoal(context, chapterNumber, attempt.acceptedDraft.prose, reply.arcCompletion);
    const claim = reply.arcCompletion as { completed?: unknown } | undefined;
    if (!completion && claim?.completed === true) {
      warnings.push({ code: 'unconfirmed_arc_completion', message: `The writer reported a goal achieved, but not the active goal “${context.activeGoal.text}” with a verbatim passage from this chapter, so nothing was recorded as achieved.` });
    }
    const recorded = (goalId: string, goalText: string) => (story.goalCompletions ?? [])
      .some(done => (done.arcNumber ?? context.plan.arcNumber) === context.plan.arcNumber && done.goalId === goalId && (!done.goalText || done.goalText === goalText));
    if (completion) {
      if (!recorded(completion.goalId, completion.goalText!)) story.goalCompletions = [...(story.goalCompletions ?? []), completion];
      outcome = 'completed';
      evidence = completion.evidence;
    } else if (chapterNumber >= context.completionDeadline && !arcGoalResolved(context.plan, context.activeGoal, story.goalCompletions, chapterNumber + 1)) {
      // The deadline passed unmet. In either mode the goal is missed, never claimed.
      story.goalCompletions = [...(story.goalCompletions ?? []), {
        arcNumber: context.plan.arcNumber, goalId: context.activeGoal.id, goalText: context.activeGoal.text,
        chapterNumber, evidence: '', outcome: 'missed',
      }];
      outcome = 'missed';
    }
  }
  const ending = readStoryEnding(attempt);
  if (ending.warning) warnings.push(ending.warning);
  if (story.conclusion) return warnings;
  const conclude = (conclusion: Omit<HarnessStoryConclusion, 'recordedAt'>) => { story.conclusion = { ...conclusion, recordedAt }; };

  if (context.finalGoal && outcome === 'completed') {
    conclude({ outcome: 'destined-ending-reached', reason: route?.status === 'past-final-goal' ? 'reached-after-final-goal-missed' : 'final-goal-completed', chapterNumber, evidence });
    return warnings;
  }
  // Regular Reader mode never fails its fate: a missed goal only puts the story off track.
  if (!survival) return warnings;
  if (outcome === 'missed' && !story.brokenRoute) {
    const missedGoals = arcMissedGoals(context.plan, story.goalCompletions);
    const reason = context.finalGoal ? 'final-goal-missed' as const
      : missedGoalsBreakRoute(missedGoals.length, context.plan.goals.length) ? 'arc-goals-missed' as const : undefined;
    if (reason) {
      story.brokenRoute = { chapterNumber, arcNumber: context.plan.arcNumber, reason, goalsInArc: context.plan.goals.length,
        missedGoals, closingChapterLimit: SURVIVAL_CLOSING_CHAPTER_LIMIT, recordedAt };
    }
  }
  if (ending.evidence) conclude({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber, evidence: ending.evidence });
  else if (route?.status === 'broken' && route.closingChapter >= route.closingChapterLimit) {
    conclude({ outcome: 'fate-failed', reason: 'closing-limit-reached', chapterNumber, evidence: '' });
  }
  return warnings;
}

/** Why no further chapter can be written, once the story has ended. */
export function storyConclusionGap(story: HarnessStory): string | undefined {
  const ended = story.conclusion;
  if (!ended) return undefined;
  if (ended.outcome === 'destined-ending-reached') return `The story reached its Destined Ending in Chapter ${ended.chapterNumber}. No further chapter is written.`;
  return ended.reason === 'closing-limit-reached'
    ? `Fate failed in Chapter ${ended.chapterNumber}: the route had broken, and that was the last of its closing chapters. No further chapter is written.`
    : `Fate failed in Chapter ${ended.chapterNumber}: the story ended there. No further chapter is written.`;
}

/**
 * Whether the automatic Arc planner must create a plan before the next
 * chapter. A story with a Blueprint roadmap planned every arc before it began,
 * so nothing is invented at a boundary; only stories without a roadmap plan
 * their next arc automatically.
 */
export function needsArcPlan(story: HarnessStory, foundation?: Pick<StoryFoundationInput, 'plannedArcCount'>): boolean {
  // A broken route's closing chapters never begin a new arc.
  if (story.brokenRoute || foundation?.plannedArcCount) return false;
  return !harnessArcPlan(story, arcOf(story.head.nextChapterNumber));
}

/** Why the next chapter has no saved plan in a roadmap story, if it has none. */
export function roadmapPlanGap(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'plannedArcCount' | 'fateSurvival'>): string | undefined {
  const count = foundation.plannedArcCount;
  // Closing chapters, and Regular Reader chapters past a missed final goal, need no further plan.
  if (!count || story.brokenRoute || regularFinalGoalMissed(story, foundation)) return undefined;
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
  /** Resolved goals (completed or missed) keep their wording, allocation and position. */
  lockedGoalIds: string[];
  /** Goals whose deadline passed unmet. They are among the locked goals. */
  missedGoalIds: string[];
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
  // Completed and missed goals are both history.
  const lockedGoalIds = plan ? plan.goals.filter(goal => arcGoalResolved(plan, goal, story.goalCompletions)).map(goal => goal.id) : [];
  const missedGoalIds = plan ? plan.goals.filter(goal => arcGoalResolution(plan, goal, story.goalCompletions)?.outcome === 'missed').map(goal => goal.id) : [];
  const denied = (reason: string, review?: HarnessArcGoalEditState['review']): HarnessArcGoalEditState =>
    ({ arcNumber, mode, status, editable: false, reason, ...(review ? { review } : {}), canAccept: false, lockedGoalIds, missedGoalIds });
  if (!plan) return denied(`Arc ${arcNumber} has no saved plan.`);
  if (story.brokenRoute) return denied(`The route broke in Chapter ${story.brokenRoute.chapterNumber}, and the story is closing. No arc's goals change now.`);
  if (status === 'completed') return denied(`Arc ${arcNumber} is complete. Its goals are part of the novel's history.`);
  if (lockedGoalIds.length === plan.goals.length) return denied(`Every goal in Arc ${arcNumber} is resolved.`);

  if (mode === 'regular') {
    const visibility = story.visibility ?? 'private';
    if (visibility !== 'private') return denied('Arc Goals can be edited only while the novel is private.');
    return { arcNumber, mode, status, editable: true, canAccept: false, lockedGoalIds, missedGoalIds };
  }

  const review = arcGoalReview(story, arcNumber);
  if (review?.lockedAt || arcHasBegun(story, arcNumber)) return denied(`Arc ${arcNumber}'s goals were locked when its generation began.`, 'locked');
  if (review?.reviewedAt) {
    return denied(`Arc ${arcNumber}'s goals were set in its one-time review and lock when its first chapter is generated.`, review.edited ? 'edited' : 'accepted');
  }
  if (status === 'upcoming') return denied(`Fate Survival sets Arc ${arcNumber}'s goals once, immediately before it begins.`, 'not-yet');
  return { arcNumber, mode, status, editable: true, review: 'pending', canAccept: true, lockedGoalIds, missedGoalIds };
}

/** Fate Survival: the arc about to be generated must have used its one-time review. */
export function survivalArcReviewGap(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'fateSurvival'>): string | undefined {
  // Closing chapters begin no arc, so they need no review.
  if (harnessStoryMode(foundation) !== 'survival' || story.brokenRoute) return undefined;
  const arc = arcOf(story.head.nextChapterNumber);
  const review = arcGoalReview(story, arc);
  if (review?.lockedAt || review?.reviewedAt || arcHasBegun(story, arc)) return undefined;
  return `Set Arc ${arc}'s goals before it begins. Review its saved plan in the novel's Blueprint, then edit it once or accept it as written.`;
}
