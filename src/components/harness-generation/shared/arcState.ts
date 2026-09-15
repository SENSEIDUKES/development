import { arcGoalCompleted, arcGenerationContext, confirmArcGoal, createArcChapterPosition, reconcileArcGoal, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import { cloneHarnessValue, type HarnessRuntime } from './ids';
import type { HarnessGenerationAttempt, HarnessStory, HarnessWorkspaceState, StoryFoundationInput } from './types';

export function harnessArcContext(story: HarnessStory, foundation: StoryFoundationInput, chapter: number) {
  const revisions = (story.arcPlans ?? []).filter(revision => revision.effectiveChapter <= chapter);
  const plan = revisions.at(-1)?.plan;
  return plan ? arcGenerationContext(plan, chapter, foundation.destinedEnding ?? '', story.goalCompletions) : undefined;
}

export function readArcReply(raw: string): Record<string, unknown> {
  try { const value = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}

/** Runs inside the existing atomic chapter commit, including persistence retries. */
export function commitHarnessArc(story: HarnessStory, attempt: HarnessGenerationAttempt) {
  const context = attempt.storyInformation.arc;
  if (!context || !attempt.acceptedDraft) return;
  const reply = readArcReply(attempt.rawProviderResponse ?? '');
  const prose = attempt.acceptedDraft.prose;
  if (attempt.storyInformation.alterFate && story.branch && !story.branch.reconciled) {
    const rerouted = reconcileArcGoal(context.plan, context, attempt.chapterNumber, prose, reply.arcReconciliation);
    if (rerouted) {
      story.arcPlans = [...(story.arcPlans ?? []), { plan: rerouted, effectiveChapter: attempt.chapterNumber, reason: 'alter-fate' }];
    }
    const assessment = reply.arcReconciliation as { impossible?: boolean } | undefined;
    if (!assessment || typeof assessment.impossible !== 'boolean' || (assessment.impossible && !rerouted)) {
      attempt.warnings.push({ code: 'arc_reconciliation_unconfirmed', message: 'The chapter is saved, but Alter Fate goal reconciliation could not be confirmed from the model evidence. The existing goal is preserved; inspect the canon before changing its route.' });
    }
    story.branch.reconciled = true;
    // Completion of the old goal cannot complete a replacement with the same route identity.
    if (rerouted) return;
  }
  const completion = confirmArcGoal(context, attempt.chapterNumber, prose, reply.arcCompletion);
  if (completion && !(story.goalCompletions ?? []).some(done => done.arcNumber === completion.arcNumber && done.goalId === completion.goalId && done.goalText === completion.goalText)) {
    story.goalCompletions = [...(story.goalCompletions ?? []), completion];
  }
}

/** Selected chapter is rewritten; only earlier chapters enter the alternate canon. */
export function forkHarnessStory(state: HarnessWorkspaceState, storyId: string, chapterNumber: number, instruction: string, runtime: HarnessRuntime) {
  const original = state.stories.find(story => story.id === storyId);
  const selected = state.chapters.find(chapter => chapter.storyId === storyId && chapter.chapterNumber === chapterNumber);
  if (!original || !selected || !instruction.trim()) throw new Error('Choose a saved branch chapter and describe the change.');
  const selectedAttempt = state.attempts.find(attempt => attempt.id === selected.attemptId);
  const foundationId = selected.foundationRevisionId;
  const priorChapters = state.chapters.filter(chapter => chapter.storyId === storyId && chapter.chapterNumber < chapterNumber).sort((a, b) => a.chapterNumber - b.chapterNumber);
  const cutoff = selectedAttempt?.startedAt ?? selected.createdAt;
  const frozenCorrections = selectedAttempt?.storyInformation.canonicalContext?.corrections;
  const frozenCorrectionIds = frozenCorrections && new Set(frozenCorrections.map(correction => correction.id));
  const corrections = state.corrections.filter(correction => correction.storyId === storyId
    && (frozenCorrectionIds ? frozenCorrectionIds.has(correction.id) : correction.createdAt < cutoff));
  const correctionIds = new Set(corrections.map(correction => correction.id));
  const chapterIds = new Set(priorChapters.map(chapter => chapter.id));
  const branch = cloneHarnessValue(original);
  branch.activeFoundationRevisionId = foundationId;
  branch.foundationRevisionIds = original.foundationRevisionIds.filter(id => state.foundations.find(f => f.id === id)!.revision <= state.foundations.find(f => f.id === foundationId)!.revision);
  branch.arcPlans = (branch.arcPlans ?? []).filter(revision => revision.effectiveChapter < chapterNumber);
  const historicalPlan = selectedAttempt?.storyInformation.arc?.plan;
  if (historicalPlan) branch.arcPlans.push({ plan: cloneHarnessValue(historicalPlan), effectiveChapter: chapterNumber, reason: 'initial' });
  branch.goalCompletions = (branch.goalCompletions ?? []).filter(done => done.chapterNumber < chapterNumber);
  branch.steering = (branch.steering ?? []).filter(direction => direction.effectiveChapter < chapterNumber);
  const last = priorChapters.at(-1);
  branch.head = { nextChapterNumber: chapterNumber, lastCommittedChapterId: last?.id, lastCommittedAt: last?.committedAt };
  branch.title = `${original.title} · Alternate world`;
  branch.createdAt = branch.updatedAt = runtime.now();
  const foundationIds = new Set(branch.foundationRevisionIds);
  const beforeBranch = (value: { storyId: string; chapterId?: string }) => value.storyId === storyId && !!value.chapterId && chapterIds.has(value.chapterId);
  const payload = {
    stories: [branch],
    foundations: state.foundations.filter(f => foundationIds.has(f.id)),
    chapters: priorChapters,
    attempts: state.attempts.filter(attempt => attempt.storyId === storyId && !!attempt.committedChapterId && chapterIds.has(attempt.committedChapterId)),
    events: state.events.filter(beforeBranch),
    canonicalRecords: state.canonicalRecords.filter(record => beforeBranch(record)
      || (record.storyId === storyId && !!record.sourceFoundationRevisionId && foundationIds.has(record.sourceFoundationRevisionId))
      || (!!record.sourceCorrectionId && correctionIds.has(record.sourceCorrectionId)))
      .map(record => record.supersededAt && (record.supersededByCorrectionId
        ? !correctionIds.has(record.supersededByCorrectionId) : record.supersededAt >= cutoff)
        ? { ...record, supersededAt: undefined, supersededByCorrectionId: undefined, supersededByRecordId: undefined } : record),
    capabilityReceipts: state.capabilityReceipts.filter(beforeBranch),
    projections: state.projections.filter(beforeBranch),
    corrections,
  };
  // Remap object identities and references together; quoted prose is never string-replaced.
  const ids = new Map<string, string>([[storyId, runtime.createId('hst')]]);
  for (const records of Object.values(payload)) for (const record of records) {
    if (!ids.has(record.id)) ids.set(record.id, runtime.createId('hbranch'));
  }
  for (const record of payload.canonicalRecords) if (record.entityId && !ids.has(record.entityId)) ids.set(record.entityId, runtime.createId('hentity'));
  const remap = (value: unknown): unknown => {
    if (typeof value === 'string') return ids.get(value) ?? value;
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, remap(child)]));
    return value;
  };
  const copied = remap(payload) as typeof payload;
  copied.stories[0].branch = { sourceStoryId: storyId, chapterNumber, instruction: instruction.trim() };
  const candidate = cloneHarnessValue(state);
  for (const key of Object.keys(copied) as Array<keyof typeof copied>) (candidate[key] as unknown[]).push(...copied[key]);
  return { state: candidate, story: copied.stories[0] };
}

export function needsArcPlan(story: HarnessStory): boolean {
  const arc = createArcChapterPosition(story.head.nextChapterNumber).arcNumber;
  const plan: ArcPlan | undefined = story.arcPlans?.at(-1)?.plan;
  if (!plan) return true;
  if (plan.arcNumber === arc) return false;
  // No invented failure policy: an unresolved deadline stays unresolved, without a new plan.
  return plan.goals.every(goal => arcGoalCompleted(plan, goal, story.goalCompletions));
}
