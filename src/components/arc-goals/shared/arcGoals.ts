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
/**
 * How a goal was resolved. `completed` (the default for records saved before
 * outcomes existed) carries verbatim evidence from the prose. `missed`: its
 * deadline chapter committed without the goal achieved, so the goal becomes
 * history and the next one begins. Goals are never claimed to meet a deadline.
 */
export interface ArcGoalCompletion { arcNumber?: number; goalText?: string; goalId: string; chapterNumber: number; evidence: string; outcome?: 'completed' | 'missed' }
export interface ArcPlanRevision { plan: ArcPlan; effectiveChapter: number; reason: 'initial' | 'edit' }
export interface ArcGenerationContext extends ArcChapterPosition {
  destinedEnding: string;
  plan: ArcPlan;
  activeGoal: ArcGoalSegment;
  completionDeadline: number;
  positionInSegment: number;
  completionConfirmed: boolean;
  /** The story's length in arcs. Absent for open-ended stories. */
  plannedArcCount?: number;
  /** True when this arc is the story's last: its final goal is the story reaching the Destined Ending. */
  finalArc?: boolean;
  /** True when the active goal is the final arc's last goal: reaching the Destined Ending itself. */
  finalGoal?: boolean;
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
/** The record that resolved this goal of this arc before a chapter, if any. */
export function arcGoalResolution(plan: ArcPlan, goal: ArcGoal, completions: ArcGoalCompletion[] = [], beforeChapter = Infinity) {
  return completions.find(done => done.goalId === goal.id && (!done.goalText || done.goalText === goal.text)
    && (done.arcNumber ?? createArcChapterPosition(done.chapterNumber).arcNumber) === plan.arcNumber && done.chapterNumber < beforeChapter);
}
/** Completed with verbatim evidence. A missed goal is resolved but never completed. */
export function arcGoalCompleted(plan: ArcPlan, goal: ArcGoal, completions: ArcGoalCompletion[] = [], beforeChapter = Infinity) {
  const resolution = arcGoalResolution(plan, goal, completions, beforeChapter);
  return Boolean(resolution) && resolution!.outcome !== 'missed';
}
/** Completed or missed: either way the goal is history. */
export function arcGoalResolved(plan: ArcPlan, goal: ArcGoal, completions: ArcGoalCompletion[] = [], beforeChapter = Infinity) {
  return Boolean(arcGoalResolution(plan, goal, completions, beforeChapter));
}
/** Resolution (completed or missed) AND the allocated segment boundary are required to advance. */
export function activeArcGoal(plan: ArcPlan, chapter: number, completions: ArcGoalCompletion[] = []): ArcGoalSegment {
  const segments = arcGoalSegments(plan);
  return segments.find(goal => chapter <= goal.endChapter || !arcGoalResolved(plan, goal, completions, chapter)) ?? segments[segments.length - 1];
}
export function arcGenerationContext(plan: ArcPlan, chapter: number, destinedEnding: string, completions: ArcGoalCompletion[] = [], plannedArcCount?: number): ArcGenerationContext {
  const activeGoal = activeArcGoal(plan, chapter, completions);
  return { ...createArcChapterPosition(chapter), destinedEnding, plan: structuredClone(plan), activeGoal,
    completionDeadline: activeGoal.endChapter, positionInSegment: chapter - activeGoal.startChapter + 1,
    completionConfirmed: arcGoalCompleted(plan, activeGoal, completions, chapter),
    ...(plannedArcCount ? { plannedArcCount, finalArc: plan.arcNumber >= plannedArcCount,
      finalGoal: plan.arcNumber >= plannedArcCount && activeGoal.id === plan.goals[plan.goals.length - 1].id } : {}) };
}
/** This arc's goals missed before a chapter, in plan order, with the chapter each was missed in. */
export function arcMissedGoals(plan: ArcPlan, completions: ArcGoalCompletion[] = [], beforeChapter = Infinity) {
  return plan.goals.flatMap(goal => {
    const resolution = arcGoalResolution(plan, goal, completions, beforeChapter);
    return resolution?.outcome === 'missed' ? [{ goalId: goal.id, text: goal.text, chapterNumber: resolution.chapterNumber }] : [];
  });
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

/** The longest a story may be planned to run, in arcs. */
export const MAX_ROADMAP_ARCS = 100 as const;

/** How many arcs ahead the hidden look-ahead reaches. */
export const MAX_ARC_LOOKAHEAD = 2 as const;
/** The longest one look-ahead direction may be, in characters. */
export const ARC_LOOKAHEAD_TEXT_LIMIT = 400 as const;

/**
 * One line of the hidden look-ahead: where the route goes in an arc that is
 * not planned yet. Only the model that plans arcs reads it; readers never see
 * it and the chapter writer never receives it.
 */
export interface ArcLookaheadEntry { arcNumber: number; direction: string }

/** Response schema for a look-ahead. */
export const ARC_LOOKAHEAD_SCHEMA = {
  type: 'array', maxItems: MAX_ARC_LOOKAHEAD, items: { type: 'object',
    properties: { arcNumber: { type: 'integer', minimum: 2 }, direction: { type: 'string' } },
    required: ['arcNumber', 'direction'] },
};

/**
 * Keeps the usable part of a look-ahead and never throws: one-line directions
 * for arcs after `afterArc` and within the story's planned length, the
 * nearest first, one per arc, at most `MAX_ARC_LOOKAHEAD`.
 */
export function normalizeArcLookahead(value: unknown, bounds: { afterArc: number; plannedArcCount?: number }): ArcLookaheadEntry[] {
  if (!Array.isArray(value)) return [];
  const byArc = new Map<number, string>();
  for (const entry of value) {
    const arcNumber = (entry as Partial<ArcLookaheadEntry> | null)?.arcNumber;
    const raw = (entry as Partial<ArcLookaheadEntry> | null)?.direction;
    if (!Number.isInteger(arcNumber) || typeof raw !== 'string') continue;
    if (arcNumber! <= bounds.afterArc || (bounds.plannedArcCount !== undefined && arcNumber! > bounds.plannedArcCount)) continue;
    const direction = raw.replace(/\s+/g, ' ').trim().slice(0, ARC_LOOKAHEAD_TEXT_LIMIT).trim();
    if (direction && !byArc.has(arcNumber!)) byArc.set(arcNumber!, direction);
  }
  return [...byArc].sort(([left], [right]) => left - right).slice(0, MAX_ARC_LOOKAHEAD)
    .map(([arcNumber, direction]) => ({ arcNumber, direction }));
}

/** A look-ahead drawn from saved arc plans (each arc's goals in one line), for plans made before arcs were planned as they begin. */
export const arcLookaheadFromPlans = (plans: readonly ArcPlan[], bounds: { afterArc: number; plannedArcCount?: number }): ArcLookaheadEntry[] =>
  normalizeArcLookahead(plans.map(plan => ({ arcNumber: plan.arcNumber, direction: plan.goals.map(goal => goal.text).join(' Then ') })), bounds);

/** One arc's goals as a planning model writes them: wording and chapters only. The HARNESS owns arc numbers and goal identities. */
export const ARC_PLAN_DRAFT_SCHEMA = {
  type: 'object', properties: { goals: {
    type: 'array', minItems: 1, maxItems: MAX_ARC_GOALS, items: { type: 'object',
      properties: { text: { type: 'string' }, chapters: { type: 'integer', minimum: 1, maximum: ARC_LENGTH } },
      required: ['text', 'chapters'] },
  } }, required: ['goals'],
};

/**
 * Turns a model's goal draft into an arc's plan. The arc number is the arc
 * being planned, and each goal is given the identity `arc-N-k`, never one
 * already used by another arc, whatever identity the draft carried.
 */
export function arcPlanFromDraft(draft: unknown, arcNumber: number, takenGoalIds: Iterable<string> = []): ArcPlan {
  const goals = (draft as { goals?: unknown } | null)?.goals;
  if (!Array.isArray(goals)) throw new Error('The planned arc has no goals.');
  const taken = new Set(takenGoalIds);
  const plan = {
    arcNumber,
    goals: goals.map((goal, index) => {
      let id = `arc-${arcNumber}-${index + 1}`;
      for (let suffix = 2; taken.has(id); suffix += 1) id = `arc-${arcNumber}-${index + 1}-${suffix}`;
      taken.add(id);
      const { text, chapters } = (goal ?? {}) as { text?: unknown; chapters?: unknown };
      return { id, text: typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : text, chapters } as ArcGoal;
    }),
  };
  return validateArcPlan(plan);
}
