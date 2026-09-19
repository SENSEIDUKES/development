import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from './controller';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { createHarnessSenStory } from './senAdapter';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import type { HarnessArcRequest, HarnessGenerationRequest, HarnessGenerationModelAdapter } from '../../../narrative/generation';
import type { ArcPlan } from '../../arc-goals/shared/arcGoals';

const plan: ArcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-first', text: 'Meet the invader.', chapters: 1 }, { id: 'arc-1-second', text: 'Defeat the invader.', chapters: 99 }] };
const response = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });

const setup = async () => {
  const requests: HarnessGenerationRequest[] = [];
  let output: Record<string, unknown> = { prose: 'She met the invader at the gate.', arcCompletion: { goalId: plan.goals[0].id, completed: true, evidence: 'She met the invader at the gate.' } };
  const arcOperation = vi.fn(async (request: HarnessArcRequest) => response({
    plan: { ...plan, arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: plan.goals.map(goal => ({ ...goal, id: `arc-${Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1}-${goal.id}` })) },
    destinedEnding: 'Unite the kingdoms.',
  }));
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
    generate: async request => { requests.push(request); return response(output); },
    arcOperation,
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier confronts an invader.', destinedEnding: 'Unite the kingdoms.', initialArcPlan: plan });
  return { controller, repository, story, requests, arcOperation, setOutput: (value: typeof output) => { output = value; } };
};

describe('HARNESS canonical arc integration', () => {
  it('automatically plans a premise-only story before freezing its first chapter request', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'An archivist reunites a divided kingdom.' });
    await run.controller.generateNextChapter(story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    expect(run.requests[0].storyInformation.arc).toMatchObject({ destinedEnding: 'Unite the kingdoms.', chapterInArc: 1, positionInSegment: 1 });
    expect(run.repository.snapshot().stories.find(item => item.id === story.id)?.arcPlans).toHaveLength(1);
  });

  it('requires an explicit retry after an interrupted Arc planning request', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'An archivist reunites a divided kingdom.' });
    const state = run.controller.snapshot();
    const foundation = state.foundations.find(item => item.id === story.activeFoundationRevisionId)!;
    state.arcPlanOperations.push({
      id: 'harc-interrupted', storyId: story.id, foundationRevisionId: foundation.id,
      startedAt: '2026-09-15T00:00:00Z', status: 'request_started',
      request: { operation: 'plan-arc', storyId: story.id, model: 'fixture', storyInformation: {} as never },
    });
    await run.repository.save(state);
    const reloaded = new HarnessGenerationController({ repository: run.repository, modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
      generate: async () => response({ prose: 'unused' }),
      arcOperation: run.arcOperation,
    } });
    await reloaded.hydrate();

    await expect(reloaded.generateNextChapter(story.id, 'fixture')).rejects.toThrow('Explicitly retry Arc planning');
    expect(run.arcOperation).not.toHaveBeenCalled();

    await reloaded.retryArcPlan(story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    expect(reloaded.snapshot().stories.find(item => item.id === story.id)?.arcPlans).toHaveLength(1);
  });

  it('fails an overdue chapter before commit when completion evidence is absent, leaving the head unchanged', async () => {
    const run = await setup();
    run.setOutput({ prose: 'She saw the invader and fled.', arcCompletion: { goalId: plan.goals[0].id, completed: false, evidence: '' } });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const failed = run.controller.snapshot();
    expect(failed.chapters).toHaveLength(0);
    expect(failed.stories[0].head.nextChapterNumber).toBe(1);
    expect(failed.attempts[0]).toMatchObject({ stage: 'generation_failed', failure: { stage: 'response' } });
    expect(failed.attempts[0].failure?.message).toContain('completion deadline');
  });

  it('blocks an uncompleted active goal when an edited allocation moves its deadline into the past', async () => {
    const run = await setup();
    const editablePlan: ArcPlan = {
      arcNumber: 1,
      goals: [
        { id: 'edited-first', text: 'Secure the invader’s trust.', chapters: 3 },
        { id: 'edited-second', text: 'Defeat the invader.', chapters: 97 },
      ],
    };
    const story = await run.controller.createStory({
      premise: 'A courier confronts an invader.', destinedEnding: 'Unite the kingdoms.', initialArcPlan: editablePlan,
    });
    run.setOutput({ prose: 'She watched the invader from the gate.' });
    await run.controller.generateNextChapter(story.id, 'fixture');
    await run.controller.generateNextChapter(story.id, 'fixture');

    await run.controller.editArcGoals(story.id, {
      ...editablePlan,
      goals: [
        { ...editablePlan.goals[0], chapters: 1 },
        { ...editablePlan.goals[1], chapters: 99 },
      ],
    });
    await run.controller.generateNextChapter(story.id, 'fixture');

    const failed = run.controller.snapshot();
    expect(failed.stories.find(item => item.id === story.id)?.head.nextChapterNumber).toBe(3);
    expect(failed.chapters.filter(chapter => chapter.storyId === story.id)).toHaveLength(2);
    expect(failed.attempts.at(-1)?.failure?.message).toContain('completion deadline');
  });

  it('freezes the authoritative goal context and persists evidenced completion', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const context = run.requests[0].storyInformation.arc!;
    expect(context).toMatchObject({ destinedEnding: 'Unite the kingdoms.', arcNumber: 1, chapterInArc: 1, activeGoal: { id: 'arc-1-first', startChapter: 1, endChapter: 1 }, completionDeadline: 1, positionInSegment: 1 });
    const prompt = buildHarnessGenerationPrompt(run.requests[0]);
    expect(prompt.userPrompt).toContain('ARC GOAL REQUIREMENT');
    expect(prompt.responseJsonSchema.required).toContain('arcCompletion');
    expect(JSON.stringify(prompt.responseJsonSchema)).not.toContain('arcReconciliation');
    expect(run.repository.snapshot().stories[0].goalCompletions).toHaveLength(1);
  });

  it('stores unrestricted edits as a future revision without mutating frozen history', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const edited: ArcPlan = { ...plan, goals: [
      { ...plan.goals[1], text: 'Expose the invader before the duel.', chapters: 40 },
      { ...plan.goals[0], text: 'Survive the first encounter.', chapters: 60 },
    ] };
    await run.controller.editArcGoals(run.story.id, edited);
    run.setOutput({ prose: 'The invader’s hidden patron was exposed.' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests[0].storyInformation.arc!.plan).toEqual(plan);
    expect(run.requests[1].storyInformation.arc!.plan).toEqual(edited);
    expect(run.repository.snapshot().stories[0].arcPlans).toMatchObject([{ effectiveChapter: 1 }, { effectiveChapter: 2, reason: 'edit', plan: edited }]);
  });

  it('automatically prepares the next plan after a completed boundary chapter', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const saved = run.controller.snapshot();
    saved.stories[0].head.nextChapterNumber = 100;
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
      arcOperation: run.arcOperation,
      generate: async () => response({ prose: 'She defeated the invader.', arcCompletion: { goalId: 'arc-1-second', completed: true, evidence: 'She defeated the invader.' } }),
    } });
    await reloaded.hydrate();
    await reloaded.generateNextChapter(run.story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    expect(reloaded.snapshot().stories[0].arcPlans?.at(-1)?.plan.arcNumber).toBe(2);
    expect(createHarnessSenStory(reloaded.snapshot(), run.story.id).arcs).toHaveLength(2);
  });

  it('rejects chapter generation when an adapter cannot create the required Arc Plan', async () => {
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
      generate: async () => response({ prose: 'Never called.' }),
    } });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A new world begins.' });
    await expect(controller.generateNextChapter(story.id, 'fixture')).rejects.toThrow('cannot create the authoritative Arc Plan');
  });
});
