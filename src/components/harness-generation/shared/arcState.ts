import { stripReplyMarks } from './chapterSignals';
import { arcFirstChapter, arcGoalResolution, arcGoalResolved, arcGoalSegments, arcGenerationContext, arcMissedGoals, confirmArcGoal, createArcChapterPosition, normalizeArcLookahead, type ArcGenerationContext, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import type { HarnessArcContext, HarnessArcGoalReview, HarnessArcPlanningContext, HarnessGenerationAttempt, HarnessStory, HarnessStoryConclusion, HarnessStoryMode, HarnessWarning, HarnessWorkspaceState, StoryFoundationInput } from '../../../narrative/generation';

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
 * Each arc is planned when it begins. In a story with a planned length (every
 * story made from a World Blueprint) the reader begins each arc after the
 * first: its goals are planned then, from where the last arc left off, and the
 * reader reviews them (accepts or edits) before its first chapter, in both
 * modes.
 *
 * Fate Survival: the reader directs every chapter; each arc's goals are set
 * once, immediately before that arc begins, and locked when its generation
 * begins. Missing at least half of one arc's goals, or the final goal, breaks
 * the route, and the next chapter must bring the story to its end. A story
 * ends only when committed prose shows the ending, and a fatal ending the
 * writer shows ends it at once.
 */
export type { HarnessStoryMode };

export const harnessStoryMode = (foundation?: Pick<StoryFoundationInput, 'fateSurvival'>): HarnessStoryMode =>
  foundation?.fateSurvival?.enabled ? 'survival' : 'regular';

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
 * The arc a chapter belongs to: its own, except that the chapter ending a
 * broken route, and Regular Reader chapters past a missed final goal, stay with
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
 * After the route breaks, the chapter that must end the story keeps the arc it
 * broke in, even past that arc's planned end. After a missed final goal,
 * Regular Reader mode keeps that goal as its destination past the roadmap
 * instead of inventing another.
 */
export function harnessArcContext(story: HarnessStory, foundation: StoryFoundationInput, chapter: number): HarnessArcContext | undefined {
  const ending = foundation.destinedEnding ?? '';
  const broken = story.brokenRoute;
  if (broken && chapter > broken.chapterNumber) {
    const plan = harnessArcPlan(story, broken.arcNumber, broken.chapterNumber);
    if (!plan) return undefined;
    return {
      ...carriedContext(arcGenerationContext(plan, broken.chapterNumber, ending, story.goalCompletions, foundation.plannedArcCount),
        chapter, `Arc ${broken.arcNumber} — the route is broken; this chapter ends the story`),
      route: { status: 'broken', missedGoals: structuredClone(broken.missedGoals), brokenInChapter: broken.chapterNumber, reason: broken.reason },
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

/**
 * A chapter reply as its evidence is read: marks belong only in paragraphs, so
 * an evidence passage the writer copied with marks still matches the saved,
 * mark-free prose.
 */
export const readChapterReply = (raw: string): Record<string, unknown> => stripReplyMarks(readArcReply(raw));

/** The mode an attempt was prepared under, from its frozen packet. Packets frozen before modes reached the writer read as Regular. */
export const attemptStoryMode = (attempt: HarnessGenerationAttempt): HarnessStoryMode =>
  attempt.storyInformation.storyDirection.fateMode ?? 'regular';

/**
 * The writer's report that this chapter's prose completes the story's ending,
 * accepted only in Fate Survival and only with a continuous verbatim passage
 * from the chapter. An unsupported claim is never an ending. Returns the
 * evidence, or a warning when a report is set aside.
 */
export function readStoryEnding(attempt: HarnessGenerationAttempt): { evidence?: string; warning?: HarnessWarning } {
  const report = readChapterReply(attempt.rawProviderResponse ?? '').storyEnded as { ended?: unknown; evidence?: unknown } | undefined;
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
 * Fate Survival: once the route is broken, the next chapter must end the
 * story, and it commits only when its prose shows that ending (the writer's
 * report with a verbatim passage). Without it the chapter stays uncommitted,
 * with its reader direction intact, so the reader can try again; the HARNESS
 * never makes a recovery call on its own. Returns why the chapter cannot
 * commit, or nothing when it can.
 */
export function missingRequiredEnding(attempt: HarnessGenerationAttempt): { message: string; warnings: HarnessWarning[] } | undefined {
  const route = attempt.storyInformation.arc?.route;
  if (route?.status !== 'broken') return undefined;
  const ending = readStoryEnding(attempt);
  if (ending.evidence) return undefined;
  return {
    message: `The route to the Destined Ending broke in Chapter ${route.brokenInChapter}, so Chapter ${attempt.chapterNumber} must end the story, but its prose does not show that ending.`,
    warnings: ending.warning ? [ending.warning] : [],
  };
}

/**
 * Runs inside the existing atomic chapter commit, including persistence
 * retries. In both modes it records the active goal honestly: achieved with
 * verbatim evidence, or missed once its deadline chapter commits without it.
 * Then it applies the mode's consequence: the Destined Ending reached through
 * the final goal ends the story; in Fate Survival a missed goal may break the
 * route, and the story ends when the committed prose shows it ending. A
 * chapter count or a broken route alone never ends it. Returns warnings about
 * reports it set aside.
 */
export function commitHarnessArc(story: HarnessStory, attempt: HarnessGenerationAttempt, recordedAt: string): HarnessWarning[] {
  const context = attempt.storyInformation.arc;
  if (!context || !attempt.acceptedDraft) return [];
  const warnings: HarnessWarning[] = [];
  const survival = attemptStoryMode(attempt) === 'survival';
  const chapterNumber = attempt.chapterNumber;
  const reply = readChapterReply(attempt.rawProviderResponse ?? '');
  const route = context.route;
  let outcome: 'completed' | 'missed' | undefined;
  let evidence = '';
  // A broken route has no goal left to reach: the chapter after it only brings the story to its end.
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
        missedGoals, recordedAt };
    }
  }
  // Only prose that shows the ending ends the story, including a genuine ending in the chapter that broke the route.
  if (ending.evidence) conclude({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber, evidence: ending.evidence });
  return warnings;
}

/** Why no further chapter can be written, once the story has ended. */
export function storyConclusionGap(story: HarnessStory): string | undefined {
  const ended = story.conclusion;
  if (!ended) return undefined;
  if (ended.outcome === 'destined-ending-reached') return `The story reached its Destined Ending in Chapter ${ended.chapterNumber}. No further chapter is written.`;
  return `Fate failed in Chapter ${ended.chapterNumber}: the story ended there. No further chapter is written.`;
}

/** Whether a story reviews each arc's goals before the arc's first chapter: Fate Survival, and every story with a planned length. */
const reviewsEachArc = (foundation?: Pick<StoryFoundationInput, 'fateSurvival' | 'plannedArcCount'>) =>
  harnessStoryMode(foundation) === 'survival' || Boolean(foundation?.plannedArcCount);

/**
 * Whether the next chapter's arc still needs its goals planned. Each arc is
 * planned when it begins: a story with a planned length plans only within it,
 * and nothing is planned after the route breaks or the story ends.
 */
export function needsArcPlan(story: HarnessStory, foundation?: Pick<StoryFoundationInput, 'plannedArcCount'>): boolean {
  if (story.brokenRoute || story.conclusion) return false;
  const arc = arcOf(story.head.nextChapterNumber);
  if (foundation?.plannedArcCount && arc > foundation.plannedArcCount) return false;
  return !harnessArcPlan(story, arc);
}

/** Why the next chapter cannot be written yet because its arc still needs planning, in a story whose arcs are planned as the reader begins them. */
export function arcPlanGap(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'plannedArcCount'>): string | undefined {
  if (!foundation.plannedArcCount || !needsArcPlan(story, foundation)) return undefined;
  const { arcNumber: arc, chapterInArc } = createArcChapterPosition(story.head.nextChapterNumber);
  return chapterInArc === 1
    ? `Arc ${arc} begins with Chapter ${story.head.nextChapterNumber}. Plan its goals in the novel's Blueprint before that chapter is written.`
    : `Arc ${arc} has no saved plan. Plan its goals in the novel's Blueprint before Chapter ${story.head.nextChapterNumber} is written.`;
}

/** Why the next chapter cannot be written because every planned arc is written. */
export function routeCompleteGap(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'plannedArcCount' | 'fateSurvival'>): string | undefined {
  const count = foundation.plannedArcCount;
  // The chapter ending a broken route, and Regular Reader chapters past a missed final goal, continue the arc they belong to.
  if (!count || story.brokenRoute || regularFinalGoalMissed(story, foundation)) return undefined;
  const arc = arcOf(story.head.nextChapterNumber);
  if (arc <= count) return undefined;
  return `All ${count} planned ${count === 1 ? 'arc is' : 'arcs are'} written: the route to the Destined Ending is complete. Chapter ${story.head.nextChapterNumber} would begin Arc ${arc}, beyond the story's planned length.`;
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
  /**
   * Where this arc stands in its review before its first chapter (Fate
   * Survival, and stories with a planned length). In Fate Survival the review
   * is the arc's one-time edit.
   */
  review?: 'pending' | 'edited' | 'accepted' | 'locked' | 'not-yet';
  /** The arc's review is pending: its plan may be accepted as written instead of edited. */
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
export function arcGoalEditState(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'fateSurvival' | 'plannedArcCount'> | undefined, arcNumber: number): HarnessArcGoalEditState {
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
  if (story.brokenRoute) return denied(`The route broke in Chapter ${story.brokenRoute.chapterNumber}, and the next chapter ends the story. No arc's goals change now.`);
  if (status === 'completed') return denied(`Arc ${arcNumber} is complete. Its goals are part of the novel's history.`);
  if (lockedGoalIds.length === plan.goals.length) return denied(`Every goal in Arc ${arcNumber} is resolved.`);
  const review = arcGoalReview(story, arcNumber);

  if (mode === 'regular') {
    // A story with a planned length reviews each arc once, just before its first chapter.
    const reviewState: HarnessArcGoalEditState['review'] = !reviewsEachArc(foundation) ? undefined
      : review?.reviewedAt ? (review.edited ? 'edited' : 'accepted')
        : arcHasBegun(story, arcNumber) ? undefined
          : status === 'active' ? 'pending' : 'not-yet';
    const reviewFields = { ...(reviewState ? { review: reviewState } : {}), canAccept: reviewState === 'pending' };
    const visibility = story.visibility ?? 'private';
    if (visibility !== 'private') {
      return { arcNumber, mode, status, editable: false, reason: 'Arc Goals can be edited only while the novel is private.', ...reviewFields, lockedGoalIds, missedGoalIds };
    }
    return { arcNumber, mode, status, editable: true, ...reviewFields, lockedGoalIds, missedGoalIds };
  }

  if (review?.lockedAt || arcHasBegun(story, arcNumber)) return denied(`Arc ${arcNumber}'s goals were locked when its generation began.`, 'locked');
  if (review?.reviewedAt) {
    return denied(`Arc ${arcNumber}'s goals were set in its one-time review and lock when its first chapter is generated.`, review.edited ? 'edited' : 'accepted');
  }
  if (status === 'upcoming') return denied(`Fate Survival sets Arc ${arcNumber}'s goals once, immediately before it begins.`, 'not-yet');
  return { arcNumber, mode, status, editable: true, review: 'pending', canAccept: true, lockedGoalIds, missedGoalIds };
}

/**
 * Why the next chapter waits on its arc's review: in Fate Survival and in
 * every story with a planned length, the arc about to begin needs its goals
 * accepted or edited first. Arc 1 of a Blueprint story was reviewed in the
 * Blueprint before the story began.
 */
export function arcReviewGap(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'fateSurvival' | 'plannedArcCount'>): string | undefined {
  // The chapter that ends a broken route begins no arc, so it needs no review.
  if (!reviewsEachArc(foundation) || story.brokenRoute) return undefined;
  const arc = arcOf(story.head.nextChapterNumber);
  if (!harnessArcPlan(story, arc)) return undefined;
  const review = arcGoalReview(story, arc);
  if (review?.lockedAt || review?.reviewedAt || arcHasBegun(story, arc)) return undefined;
  return harnessStoryMode(foundation) === 'survival'
    ? `Set Arc ${arc}'s goals before it begins. Review its saved plan in the novel's Blueprint, then edit it once or accept it as written.`
    : `Review Arc ${arc}'s goals before Chapter ${story.head.nextChapterNumber} is written: accept them as written or edit them in the novel's Blueprint.`;
}

/** What the next chapter waits on at the start of an arc, if anything. */
export type HarnessNextArcStep =
  | { kind: 'plan'; arcNumber: number; status: 'needed' | 'planning' | 'failed'; message?: string }
  | { kind: 'review'; arcNumber: number };

/**
 * The one answer every surface shows before an arc's first chapter, read
 * from saved story state: the arc still needs its goals planned (or its
 * planning is running or failed), or they need the reader's review. Stories
 * without a planned length plan automatically and only ever wait on a review.
 */
export function nextArcStep(state: Pick<HarnessWorkspaceState, 'stories' | 'foundations' | 'arcPlanOperations'>, storyId: string): HarnessNextArcStep | undefined {
  const story = state.stories.find(entry => entry.id === storyId);
  if (!story || story.conclusion) return undefined;
  const input = state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input;
  if (!input) return undefined;
  const arcNumber = arcOf(story.head.nextChapterNumber);
  if (input.plannedArcCount && needsArcPlan(story, input)) {
    const operation = state.arcPlanOperations.filter(entry => entry.storyId === storyId && !['completed', 'abandoned'].includes(entry.status)).at(-1);
    if (operation?.status === 'request_started') return { kind: 'plan', arcNumber, status: 'planning' };
    if (operation?.status === 'failed' || operation?.status === 'provider_outcome_unknown') {
      return { kind: 'plan', arcNumber, status: 'failed',
        message: operation.status === 'failed' ? operation.failure ?? `Arc ${arcNumber}'s goals could not be planned.` : `Arc ${arcNumber}'s planning was interrupted before its answer arrived.` };
    }
    return { kind: 'plan', arcNumber, status: 'needed' };
  }
  return arcReviewGap(story, input) ? { kind: 'review', arcNumber } : undefined;
}

/** How many earlier arcs the arc planner sees in full; older arcs arrive as one tally. */
const PLANNER_HISTORY_ARCS = 3;

/**
 * What only the arc planner receives when it plans an arc: where the arc sits
 * in the story's length, how the earlier arcs went (every goal's outcome), and
 * the hidden look-ahead for this arc and the next.
 */
export function arcPlanningContext(story: HarnessStory, foundation: Pick<StoryFoundationInput, 'plannedArcCount'>, arcNumber: number): HarnessArcPlanningContext {
  const count = foundation.plannedArcCount;
  const history = Array.from({ length: arcNumber - 1 }, (_, index) => index + 1).flatMap(number => {
    const plan = harnessArcPlan(story, number);
    if (!plan) return [];
    return [{ arcNumber: number, goals: plan.goals.map(goal => {
      const resolution = arcGoalResolution(plan, goal, story.goalCompletions);
      return { text: goal.text, outcome: !resolution ? 'unresolved' as const : resolution.outcome === 'missed' ? 'missed' as const : 'completed' as const };
    }) }];
  });
  const earlier = history.slice(0, -PLANNER_HISTORY_ARCS);
  const tally = (outcome: 'completed' | 'missed') => earlier.reduce((sum, arc) => sum + arc.goals.filter(goal => goal.outcome === outcome).length, 0);
  return {
    arcNumber,
    ...(count ? { plannedArcCount: count } : {}),
    finalArc: Boolean(count && arcNumber >= count),
    previousArcs: history.slice(-PLANNER_HISTORY_ARCS),
    ...(earlier.length ? { earlierArcs: `Arcs ${earlier[0].arcNumber}–${earlier.at(-1)!.arcNumber}: ${tally('completed')} goals completed, ${tally('missed')} missed.` } : {}),
    lookahead: normalizeArcLookahead(story.arcLookahead, { afterArc: arcNumber - 1, plannedArcCount: count }),
  };
}
