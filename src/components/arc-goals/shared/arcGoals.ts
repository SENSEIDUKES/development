/** Provider-neutral SEN authority. No host, persistence, or generation dependencies. */
export const ARC_LENGTH = 100 as const;
export const MAX_ARC_GOALS = 5 as const;
export interface ArcChapterPosition {
  arcNumber: number; chapterInArc: number; chaptersInArc: number; display: string;
}
export function createArcChapterPosition(chapterNumber: number, chaptersInArc: number = ARC_LENGTH): ArcChapterPosition {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) throw new Error('chapterNumber must be a positive integer.');
  if (!Number.isInteger(chaptersInArc) || chaptersInArc < 1) throw new Error('chaptersInArc must be a positive integer.');
  if (chaptersInArc !== ARC_LENGTH) throw new Error(`Every arc is exactly ${ARC_LENGTH} chapters.`);
  const arcNumber = Math.floor((chapterNumber - 1) / ARC_LENGTH) + 1;
  const chapterInArc = ((chapterNumber - 1) % ARC_LENGTH) + 1;
  return { arcNumber, chapterInArc, chaptersInArc: ARC_LENGTH, display: `Arc ${arcNumber} — Chapter ${chapterInArc}/${ARC_LENGTH}` };
}
export interface ArcGoal { id: string; text: string; chapters: number }
export interface ArcPlan { arcNumber: number; goals: ArcGoal[] }
export interface ArcGoalSegment extends ArcGoal { startChapter: number; endChapter: number }
export interface ArcGoalCompletion { arcNumber?: number; goalText?: string; goalId: string; chapterNumber: number; evidence: string }
export interface ArcPlanRevision { plan: ArcPlan; effectiveChapter: number; reason: 'initial' | 'edit' }
export interface ArcGenerationContext extends ArcChapterPosition {
  destinedEnding: string;
  plan: ArcPlan;
  activeGoal: ArcGoalSegment;
  completionDeadline: number;
  positionInSegment: number;
  completionConfirmed: boolean;
  /** How many arcs the saved roadmap plans. Absent for stories without a roadmap. */
  plannedArcCount?: number;
  /** True when this arc is the roadmap's last: its goals carry the story to the Destined Ending. */
  finalArc?: boolean;
}
export const ARC_PLAN_SCHEMA = {
  type: 'object', properties: { arcNumber: { type: 'integer', minimum: 1 }, goals: {
    type: 'array', minItems: 1, maxItems: MAX_ARC_GOALS, items: { type: 'object',
      properties: { id: { type: 'string' }, text: { type: 'string' }, chapters: { type: 'integer', minimum: 1, maximum: ARC_LENGTH } },
      required: ['id', 'text', 'chapters'] },
  } }, required: ['arcNumber', 'goals'],
};
export function validateArcPlan(value: unknown): ArcPlan {
  const plan = value as ArcPlan;
  if (!plan || !Number.isInteger(plan.arcNumber) || plan.arcNumber < 1 || !Array.isArray(plan.goals)
    || plan.goals.length < 1 || plan.goals.length > MAX_ARC_GOALS) throw new Error('An arc needs one through five goals.');
  const ids = new Set<string>();
  for (const goal of plan.goals) {
    if (!goal || typeof goal.id !== 'string' || !goal.id.trim() || ids.has(goal.id)
      || typeof goal.text !== 'string' || !goal.text.trim() || /[\r\n]/.test(goal.text)
      || !Number.isInteger(goal.chapters) || goal.chapters < 1) throw new Error('Goals need unique IDs, one-line wording, and positive whole chapter allocations.');
    ids.add(goal.id);
  }
  if (plan.goals.reduce((sum, goal) => sum + goal.chapters, 0) !== ARC_LENGTH) throw new Error(`Goal allocations must total ${ARC_LENGTH} chapters.`);
  return structuredClone(plan);
}
export function arcGoalSegments(plan: ArcPlan): ArcGoalSegment[] {
  validateArcPlan(plan);
  let start = (plan.arcNumber - 1) * ARC_LENGTH + 1;
  return plan.goals.map(goal => { const segment = { ...goal, startChapter: start, endChapter: start + goal.chapters - 1 }; start += goal.chapters; return segment; });
}
export function arcGoalCompleted(plan: ArcPlan, goal: ArcGoal, completions: ArcGoalCompletion[] = [], beforeChapter = Infinity) {
  return completions.some(done => done.goalId === goal.id && (!done.goalText || done.goalText === goal.text)
    && (done.arcNumber ?? createArcChapterPosition(done.chapterNumber).arcNumber) === plan.arcNumber && done.chapterNumber < beforeChapter);
}
/** Confirmation AND the allocated segment boundary are required to advance. */
export function activeArcGoal(plan: ArcPlan, chapter: number, completions: ArcGoalCompletion[] = []): ArcGoalSegment {
  const segments = arcGoalSegments(plan);
  return segments.find(goal => chapter <= goal.endChapter || !arcGoalCompleted(plan, goal, completions, chapter)) ?? segments[segments.length - 1];
}
export function arcGenerationContext(plan: ArcPlan, chapter: number, destinedEnding: string, completions: ArcGoalCompletion[] = [], plannedArcCount?: number): ArcGenerationContext {
  const activeGoal = activeArcGoal(plan, chapter, completions);
  return { ...createArcChapterPosition(chapter), destinedEnding, plan: structuredClone(plan), activeGoal,
    completionDeadline: activeGoal.endChapter, positionInSegment: chapter - activeGoal.startChapter + 1,
    completionConfirmed: arcGoalCompleted(plan, activeGoal, completions, chapter),
    ...(plannedArcCount ? { plannedArcCount, finalArc: plan.arcNumber >= plannedArcCount } : {}) };
}
/** The HARNESS stores an edit as a future revision; earlier frozen packets remain unchanged. */
export function editArcPlan(previous: ArcPlan, proposed: ArcPlan): ArcPlan {
  const next = validateArcPlan(proposed);
  if (next.arcNumber !== previous.arcNumber) throw new Error('Editing cannot move goals to another arc.');
  return next;
}
export function confirmArcGoal(context: ArcGenerationContext, chapterNumber: number, prose: string, value: unknown): ArcGoalCompletion | undefined {
  const result = value as { goalId?: string; completed?: boolean; evidence?: string } | undefined;
  if (!result || result.goalId !== context.activeGoal.id || result.completed !== true || (typeof result.evidence !== 'string' || !result.evidence.trim())
    || !prose.includes(result.evidence) || chapterNumber < context.activeGoal.startChapter) return undefined;
  return { arcNumber: context.plan.arcNumber, goalId: result.goalId, goalText: context.activeGoal.text, chapterNumber, evidence: result.evidence };
}

/** Story Seed supplies one initial goal; the existing plan/deadline contract remains authoritative. */
export const createInitialArcPlan = (goal: ArcGoal): ArcPlan => validateArcPlan({ arcNumber: 1, goals: [goal] });

/** The first chapter of an arc. */
export const arcFirstChapter = (arcNumber: number): number => (arcNumber - 1) * ARC_LENGTH + 1;

/** The upper bound on arcs one roadmap may plan. The Blueprint model's output budget may allow fewer. */
export const MAX_ROADMAP_ARCS = 100 as const;

/**
 * An arc roadmap: one saved plan per arc, Arc 1 through Arc N, in order. Every
 * plan keeps the existing sequential goal, allocation, and deadline contract;
 * goal identities are unique across the whole roadmap so a completion can never
 * be claimed by a goal in another arc.
 */
export function validateArcRoadmap(value: unknown, arcCount?: number): ArcPlan[] {
  if (!Array.isArray(value) || value.length < 1) throw new Error('An arc roadmap needs a plan for at least one arc.');
  if (value.length > MAX_ROADMAP_ARCS) throw new Error(`An arc roadmap plans at most ${MAX_ROADMAP_ARCS} arcs.`);
  if (arcCount !== undefined && value.length !== arcCount) {
    throw new Error(`The arc roadmap plans ${value.length} of ${arcCount} arcs. Every arc needs a saved plan.`);
  }
  const ids = new Set<string>();
  return value.map((entry, index) => {
    const plan = validateArcPlan(entry);
    if (plan.arcNumber !== index + 1) throw new Error(`Arc plans must run in order; entry ${index + 1} is Arc ${plan.arcNumber}.`);
    for (const goal of plan.goals) {
      if (ids.has(goal.id)) throw new Error(`Goal identity “${goal.id}” appears in more than one arc.`);
      ids.add(goal.id);
    }
    return plan;
  });
}

/** Response schema for a complete roadmap generated in one call. */
export const arcRoadmapSchema = (maxArcs: number) => ({
  type: 'array', minItems: 1, maxItems: maxArcs, items: ARC_PLAN_SCHEMA,
});
