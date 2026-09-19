import { arcGoalCompleted, arcGenerationContext, confirmArcGoal, createArcChapterPosition, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import type { HarnessGenerationAttempt, HarnessStory, StoryFoundationInput } from '../../../narrative/generation';

export function harnessArcContext(story: HarnessStory, foundation: StoryFoundationInput, chapter: number) {
  const revisions = (story.arcPlans ?? []).filter(revision => revision.effectiveChapter <= chapter);
  const plan = revisions.at(-1)?.plan;
  return plan ? arcGenerationContext(plan, chapter, foundation.destinedEnding ?? '', story.goalCompletions) : undefined;
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

export function needsArcPlan(story: HarnessStory): boolean {
  const arc = createArcChapterPosition(story.head.nextChapterNumber).arcNumber;
  const plan: ArcPlan | undefined = story.arcPlans?.at(-1)?.plan;
  if (!plan) return true;
  if (plan.arcNumber === arc) return false;
  // A later plan is created only after the completed prior arc reaches its boundary.
  return plan.goals.every(goal => arcGoalCompleted(plan, goal, story.goalCompletions));
}
