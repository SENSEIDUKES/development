import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { createHarnessSenStory } from '@seihouse/sen/harness-generation';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { type HarnessArcRequest, type HarnessChapterPlanRequest, type HarnessGenerationRequest, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { type ArcPlan } from '@seihouse/sen/arc-goals';
import { planEveryChapter, plannedChapter } from '../../../test-utils/chapterPlan';
import { buildChapterPlannerPrompt } from '../../../server/harness-generation/chapterPlanner';

const plan: ArcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-first', text: 'Meet the invader.', chapters: 1 }, { id: 'arc-1-second', text: 'Defeat the invader.', chapters: 29 }] };
const response = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });

/** A chapter: what happens in its plan's one event, told as its prose, and whether that event reaches the Active Arc Goal. */
type Chapter = { prose: string; reachesGoal?: boolean };

const setup = async () => {
  const requests: HarnessGenerationRequest[] = [];
  const planRequests: HarnessChapterPlanRequest[] = [];
  let chapter: Chapter = { prose: 'She met the invader at the gate.', reachesGoal: true };
  const arcOperation = vi.fn(async (request: HarnessArcRequest) => response({
    plan: { ...plan, arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 30) + 1, goals: plan.goals.map(goal => ({ ...goal, id: `arc-${Math.floor((request.storyInformation.chapterNumber - 1) / 30) + 1}-${goal.id}` })) },
    destinedEnding: 'Unite the kingdoms.',
  }));
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
    generate: async request => { requests.push(request); return response(writtenChapter({ prose: chapter.prose })); },
    planChapter: async request => {
      planRequests.push(request);
      return plannedChapter({
        cast: [{ name: 'MC', kind: 'character' }],
        events: [{ kind: 'confrontation', actor: 'MC', targets: [], presses: [], how: chapter.prose, facts: [] }],
        arcGoalReached: chapter.reachesGoal ? { reached: true, event: 1 } : { reached: false },
        chapterFunction: 'conflict',
      });
    },
    arcOperation,
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier confronts an invader.', destinedEnding: 'Unite the kingdoms.', initialArcPlan: plan });
  return { controller, repository, story, requests, planRequests, arcOperation, setChapter: (value: Chapter) => { chapter = value; } };
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

  it('plans again on request when only the Destined Ending was missing and asking for it failed', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'An archivist reunites a divided kingdom.', initialArcPlan: plan });
    run.arcOperation.mockRejectedValueOnce(new Error('The planner is resting.'));
    await expect(run.controller.generateNextChapter(story.id, 'fixture')).rejects.toThrow('The planner is resting.');
    await expect(run.controller.generateNextChapter(story.id, 'fixture')).rejects.toThrow('The last Arc planning request failed');
    // Planning again sets the failed request aside and asks once more.
    await run.controller.planNextArc(story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(2);
    const state = run.controller.snapshot();
    const saved = state.stories.find(item => item.id === story.id)!;
    expect(state.foundations.find(item => item.id === saved.activeFoundationRevisionId)?.input.destinedEnding).toBe('Unite the kingdoms.');
    await run.controller.generateNextChapter(story.id, 'fixture');
    expect(run.requests).toHaveLength(1);
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
      generate: async () => response(writtenChapter({ prose: 'unused' })),
      planChapter: planEveryChapter(),
      arcOperation: run.arcOperation,
    } });
    await reloaded.hydrate();

    await expect(reloaded.generateNextChapter(story.id, 'fixture')).rejects.toThrow('Explicitly retry Arc planning');
    expect(run.arcOperation).not.toHaveBeenCalled();

    await reloaded.retryArcPlan(story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    expect(reloaded.snapshot().stories.find(item => item.id === story.id)?.arcPlans).toHaveLength(1);
  });

  it('hands a goal reached early to the next goal in the following chapter, and tells the writer its chapters are a budget', async () => {
    const run = await setup();
    const budgeted: ArcPlan = { arcNumber: 1, goals: [
      { id: 'arc-1-trust', text: 'Win the invader’s trust.', chapters: 10 },
      { id: 'arc-1-duel', text: 'Defeat the invader in the duel.', chapters: 20 },
    ] };
    const story = await run.controller.createStory({ premise: 'A courier confronts an invader.', destinedEnding: 'Unite the kingdoms.', initialArcPlan: budgeted });
    run.setChapter({ prose: 'She shared bread with the invader at the gate.' });
    await run.controller.generateNextChapter(story.id, 'fixture');
    // Chapter 2's plan reaches the first goal, eight chapters before its deadline.
    run.setChapter({ prose: 'The invader swore to stand beside her.', reachesGoal: true });
    await run.controller.generateNextChapter(story.id, 'fixture');
    expect(run.controller.snapshot().stories.find(item => item.id === story.id)?.goalCompletions)
      .toEqual([expect.objectContaining({ goalId: 'arc-1-trust', chapterNumber: 2, evidence: 'The invader swore to stand beside her.' })]);
    run.setChapter({ prose: 'The duel was called for dawn.' });
    await run.controller.generateNextChapter(story.id, 'fixture');
    // Chapter 3 already works toward the duel, which keeps its own deadline.
    expect(run.planRequests[2].storyInformation.arc).toMatchObject({
      activeGoal: { id: 'arc-1-duel', startChapter: 3, endChapter: 30 }, completionDeadline: 30, positionInSegment: 1, completionConfirmed: false,
    });
    // The planner, which decides when a goal is reached, is told its chapters are a budget.
    const planner = buildChapterPlannerPrompt(run.planRequests[2]).systemInstruction;
    expect(planner).toContain('Its chapters are a budget, not a quota: completionDeadline is the latest chapter it may take, never a length to fill.');
    expect(planner).toContain('once it is reached, the next goal begins in the following chapter');
    expect(planner).toContain('Every chapter changes the story\'s situation (a setback, a discovery, a decision, a gain, a loss or a turn) and never ends where the previous chapter ended or repeats its beat.');
    expect(planner).not.toContain('Respect positionInSegment');
    // The writer's next-chapter ideas move the story on.
    expect(buildHarnessGenerationPrompt(run.requests[2]).systemInstruction).toContain('Each moves the story on from where this chapter ends, never restating its situation.');
  });

  it('commits a deadline chapter that did not achieve its goal and records the goal as missed, never forcing success', async () => {
    const run = await setup();
    run.setChapter({ prose: 'She saw the invader and fled.' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const saved = run.controller.snapshot();
    expect(saved.chapters).toHaveLength(1);
    expect(saved.stories[0].head.nextChapterNumber).toBe(2);
    expect(saved.attempts[0].stage).toBe('committed');
    expect(saved.stories[0].goalCompletions).toEqual([expect.objectContaining({ goalId: 'arc-1-first', outcome: 'missed', chapterNumber: 1, evidence: '' })]);
    // The next goal begins.
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests[1].storyInformation.arc?.activeGoal.id).toBe('arc-1-second');
  });

  it('refuses an edit that puts an unfinished goal’s deadline before the next chapter; one moved to the next chapter is missed there', async () => {
    const run = await setup();
    const editablePlan: ArcPlan = {
      arcNumber: 1,
      goals: [
        { id: 'edited-first', text: 'Secure the invader’s trust.', chapters: 5 },
        { id: 'edited-second', text: 'Defeat the invader.', chapters: 25 },
      ],
    };
    const story = await run.controller.createStory({
      premise: 'A courier confronts an invader.', destinedEnding: 'Unite the kingdoms.', initialArcPlan: editablePlan,
    });
    run.setChapter({ prose: 'She watched the invader from the gate.' });
    await run.controller.generateNextChapter(story.id, 'fixture');
    await run.controller.generateNextChapter(story.id, 'fixture');
    const shortened = (chapters: number): ArcPlan => ({
      ...editablePlan,
      goals: [{ ...editablePlan.goals[0], chapters }, { ...editablePlan.goals[1], chapters: 30 - chapters }],
    });

    // Chapter 3 is next: the goal still being written toward cannot end in Chapter 2.
    await expect(run.controller.editArcGoals(story.id, shortened(2)))
      .rejects.toThrow('Chapter 3 is next, so “Secure the invader’s trust.” cannot have a deadline before Chapter 3.');
    expect(run.controller.snapshot().stories.find(item => item.id === story.id)?.arcPlans).toHaveLength(1);
    await run.controller.editArcGoals(story.id, shortened(3));
    await run.controller.generateNextChapter(story.id, 'fixture');

    const saved = run.controller.snapshot();
    expect(saved.stories.find(item => item.id === story.id)?.head.nextChapterNumber).toBe(4);
    expect(saved.stories.find(item => item.id === story.id)?.goalCompletions)
      .toEqual([expect.objectContaining({ goalId: 'edited-first', outcome: 'missed', chapterNumber: 3 })]);
  });

  it('freezes the authoritative goal context for the planner, and records the goal its plan reaches', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const context = run.planRequests[0].storyInformation.arc!;
    expect(context).toMatchObject({ destinedEnding: 'Unite the kingdoms.', arcNumber: 1, chapterInArc: 1, activeGoal: { id: 'arc-1-first', startChapter: 1, endChapter: 1 }, completionDeadline: 1, positionInSegment: 1 });
    // The planner reads the goal and says which event reaches it; the writer is never asked.
    const planner = buildChapterPlannerPrompt(run.planRequests[0]);
    expect(planner.userPrompt).toContain('ACTIVE ARC GOAL');
    expect(planner.responseJsonSchema.required).toContain('arcGoalReached');
    const writer = buildHarnessGenerationPrompt(run.requests[0]);
    expect(writer.userPrompt).not.toContain('ACTIVE ARC GOAL');
    expect(JSON.stringify(writer.responseJsonSchema)).not.toMatch(/arcCompletion|arcGoalReached|arcReconciliation/);
    expect(run.repository.snapshot().stories[0].goalCompletions).toEqual([
      expect.objectContaining({ goalId: 'arc-1-first', chapterNumber: 1, evidence: 'She met the invader at the gate.' }),
    ]);
  });

  it('stores edits as a future revision without mutating frozen history or completed goals', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    // The first goal completed in Chapter 1: it keeps its wording, allocation and place.
    await expect(run.controller.editArcGoals(run.story.id, { ...plan, goals: [
      { ...plan.goals[1], chapters: 12 }, { ...plan.goals[0], chapters: 18 },
    ] })).rejects.toThrow('Completed goals keep their wording');
    await expect(run.controller.editArcGoals(run.story.id, { ...plan, goals: [
      { ...plan.goals[0], text: 'Rewrite the past.' }, plan.goals[1],
    ] })).rejects.toThrow('Completed goals keep their wording');
    const edited: ArcPlan = { ...plan, goals: [
      plan.goals[0],
      { ...plan.goals[1], text: 'Expose the invader before the duel.', chapters: 17 },
      { id: 'arc-1-third', text: 'Defeat the invader.', chapters: 12 },
    ] };
    await run.controller.editArcGoals(run.story.id, edited);
    run.setChapter({ prose: 'The invader’s hidden patron was exposed.' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests[0].storyInformation.arc!.plan).toEqual(plan);
    expect(run.requests[1].storyInformation.arc!.plan).toEqual(edited);
    expect(run.repository.snapshot().stories[0].arcPlans).toMatchObject([{ effectiveChapter: 1 }, { effectiveChapter: 2, reason: 'edit', plan: edited }]);
  });

  it('automatically prepares the next plan after a completed boundary chapter', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const saved = run.controller.snapshot();
    saved.stories[0].head.nextChapterNumber = 30;
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
      planChapter: planEveryChapter(),
      arcOperation: run.arcOperation,
      generate: async () => response(writtenChapter({ prose: 'She defeated the invader.' })),
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
      generate: async () => response(writtenChapter({ prose: 'Never called.' })),
    } });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A new world begins.' });
    await expect(controller.generateNextChapter(story.id, 'fixture')).rejects.toThrow('cannot create the authoritative Arc Plan');
  });
});
