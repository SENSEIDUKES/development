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
export interface ArcPlanRevision { plan: ArcPlan; effectiveChapter: number; reason: 'initial' | 'edit' | 'alter-fate' }
export interface ArcGenerationContext extends ArcChapterPosition {
  destinedEnding: string;
  plan: ArcPlan;
  activeGoal: ArcGoalSegment;
  completionDeadline: number;
  positionInSegment: number;
  completionConfirmed: boolean;
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
export function arcGenerationContext(plan: ArcPlan, chapter: number, destinedEnding: string, completions: ArcGoalCompletion[] = []): ArcGenerationContext {
  const activeGoal = activeArcGoal(plan, chapter, completions);
  return { ...createArcChapterPosition(chapter), destinedEnding, plan: structuredClone(plan), activeGoal,
    completionDeadline: activeGoal.endChapter, positionInSegment: chapter - activeGoal.startChapter + 1,
    completionConfirmed: arcGoalCompleted(plan, activeGoal, completions, chapter) };
}
/** Generated chapters retain their allocation owner; changed wording lives in a new revision. */
export function editArcPlan(previous: ArcPlan, proposed: ArcPlan, generatedThrough: number, activeGoalId?: string): ArcPlan {
  const next = validateArcPlan(proposed);
  if (next.arcNumber !== previous.arcNumber) throw new Error('Editing cannot move goals to another arc.');
  const oldSegments = arcGoalSegments(previous), newSegments = arcGoalSegments(next);
  for (const old of oldSegments) {
    if (old.startChapter > generatedThrough) continue;
    const replacement = newSegments.find(goal => goal.id === old.id);
    if (!replacement || replacement.startChapter !== old.startChapter || replacement.endChapter < Math.min(old.endChapter, generatedThrough)
      || (old.endChapter <= generatedThrough && (replacement.endChapter !== old.endChapter || (old.id !== activeGoalId && replacement.text !== old.text)))) {
      throw new Error('Already-generated chapters cannot be reallocated or completed historical goals edited.');
    }
  }
  return next;
}
export function confirmArcGoal(context: ArcGenerationContext, chapterNumber: number, prose: string, value: unknown): ArcGoalCompletion | undefined {
  const result = value as { goalId?: string; completed?: boolean; evidence?: string } | undefined;
  if (!result || result.goalId !== context.activeGoal.id || result.completed !== true || (typeof result.evidence !== 'string' || !result.evidence.trim())
    || !prose.includes(result.evidence) || chapterNumber < context.activeGoal.startChapter) return undefined;
  return { arcNumber: context.plan.arcNumber, goalId: result.goalId, goalText: context.activeGoal.text, chapterNumber, evidence: result.evidence };
}
export function reconcileArcGoal(plan: ArcPlan, context: ArcGenerationContext, chapter: number, prose: string, value: unknown): ArcPlan | undefined {
  const result = value as { goalId?: string; impossible?: boolean; evidence?: string; replacement?: string } | undefined;
  if (!result || result.impossible !== true || result.goalId !== context.activeGoal.id || (typeof result.evidence !== 'string' || !result.evidence.trim())
    || !prose.includes(result.evidence) || (typeof result.replacement !== 'string' || !result.replacement.trim() || /[\r\n]/.test(result.replacement))) return undefined;
  if (chapter < context.activeGoal.startChapter) return undefined;
  return validateArcPlan({ ...plan, goals: plan.goals.map(goal => goal.id === result.goalId ? { ...goal, text: result.replacement! } : goal) });
}
