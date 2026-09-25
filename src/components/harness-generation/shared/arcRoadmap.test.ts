import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, arcGoalEditState, type HarnessArcRequest, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type StoryFoundationInput } from '@seihouse/sen/harness-generation';
import { type ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

const ENDING = 'ENDING_Lin rebuilds the drowned archive and reopens it to the valley.';
const roadmap: ArcPlan[] = [
  { arcNumber: 1, goals: [
    { id: 'arc-1-flood', text: 'GOAL_A1G1 Survive the first flood.', chapters: 40 },
    { id: 'arc-1-map', text: 'GOAL_A1G2 Recover the archive map.', chapters: 60 },
  ] },
  { arcNumber: 2, goals: [
    { id: 'arc-2-dive', text: 'GOAL_A2G1 Dive to the sunken stacks.', chapters: 70 },
    { id: 'arc-2-reopen', text: 'GOAL_A2G2 Reopen the archive to the valley.', chapters: 30 },
  ] },
];
const reply = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });

const setup = async (overrides: Partial<StoryFoundationInput> = {}, visibility?: 'private' | 'public') => {
  const requests: HarnessGenerationRequest[] = [];
  let output: Record<string, unknown> = { paragraphs: ['Lin waded through the first flood.'] };
  const arcOperation = vi.fn(async (_request: HarnessArcRequest) => reply({ plan: roadmap[0], destinedEnding: 'PLANNER_ENDING' }));
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: async request => { requests.push(structuredClone(request)); return reply(output); },
    arcOperation,
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'An archivist races the rising river.', destinedEnding: ENDING, arcRoadmap: roadmap, plannedArcCount: 2, ...overrides,
  }, 'en', undefined, visibility ? { visibility } : {});
  /** Moves the story head, as the existing boundary tests do, instead of writing a hundred chapters. */
  const jumpTo = async (nextChapterNumber: number, completedGoals: Array<{ arcNumber: number; goalId: string; goalText: string; chapterNumber: number }> = []) => {
    const saved = controller.snapshot();
    saved.stories[0].head.nextChapterNumber = nextChapterNumber;
    saved.stories[0].goalCompletions = [...(saved.stories[0].goalCompletions ?? []), ...completedGoals.map(goal => ({ ...goal, evidence: 'evidence' }))];
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter });
    await reloaded.hydrate();
    return reloaded;
  };
  return { controller, repository, story, requests, arcOperation, jumpTo, setOutput: (value: Record<string, unknown>) => { output = value; } };
};

/** A reader's own direction for one chapter; Fate Survival writes nothing without one. */
const READER = { kind: 'reader' as const, text: 'Lin climbs the archive tower before the water rises.' };

const arc1Done = [
  { arcNumber: 1, goalId: 'arc-1-flood', goalText: roadmap[0].goals[0].text, chapterNumber: 40 },
];

describe('HARNESS arc roadmap from the Blueprint', () => {
  it('saves every arc at creation and sends only the Destined Ending and the active goal with its deadline', async () => {
    const run = await setup();
    expect(run.controller.snapshot().stories[0].arcPlans).toEqual([
      { plan: roadmap[0], effectiveChapter: 1, reason: 'initial' },
      { plan: roadmap[1], effectiveChapter: 101, reason: 'initial' },
    ]);
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.arcOperation).not.toHaveBeenCalled();
    const request = run.requests[0];
    expect(request.storyInformation.arc).toMatchObject({ arcNumber: 1, plannedArcCount: 2, finalArc: false, activeGoal: { id: 'arc-1-flood' }, completionDeadline: 40 });
    const prompt = buildHarnessGenerationPrompt(request);
    // The actual chapter request: the ending once, the active goal, never a later goal.
    expect(prompt.userPrompt.split(ENDING)).toHaveLength(2);
    expect(prompt.userPrompt).toContain('GOAL_A1G1');
    for (const later of ['GOAL_A1G2', 'GOAL_A2G1', 'GOAL_A2G2']) expect(prompt.userPrompt).not.toContain(later);
    expect(prompt.userPrompt).toContain('"plannedArcCount": 2');
    expect(prompt.userPrompt).toContain('"completionDeadline": 40');
    // The ending may be reached in prose; it is never rewritten.
    expect(prompt.systemInstruction).not.toMatch(/never modify, complete|never modify or complete/i);
    expect(prompt.userPrompt).not.toMatch(/never modify or complete/i);
    expect(prompt.systemInstruction).toContain('writing the ending into the prose is the intended outcome');
    expect(prompt.systemInstruction).toContain('never rewrite, replace, weaken, or contradict them');
  });

  it('crosses the first arc boundary on the saved Arc 2 plan without inventing a new one, and marks the final arc', async () => {
    const run = await setup();
    const atBoundary = await run.jumpTo(100, arc1Done);
    run.setOutput({ paragraphs: ['Lin unrolled the archive map at last.'], arcCompletion: { goalId: 'arc-1-map', completed: true, evidence: 'Lin unrolled the archive map at last.' } });
    await atBoundary.generateNextChapter(run.story.id, 'fixture');
    const afterBoundary = atBoundary.snapshot().stories[0];
    expect(afterBoundary.head.nextChapterNumber).toBe(101);
    expect(afterBoundary.arcPlans).toHaveLength(2);
    run.setOutput({ paragraphs: ['Lin dived toward the sunken stacks.'] });
    await atBoundary.generateNextChapter(run.story.id, 'fixture');
    expect(run.arcOperation).not.toHaveBeenCalled();
    const request = run.requests.at(-1)!;
    expect(request.storyInformation.arc).toMatchObject({ arcNumber: 2, chapterInArc: 1, finalArc: true, activeGoal: { id: 'arc-2-dive', startChapter: 101, endChapter: 170 } });
    expect(buildHarnessGenerationPrompt(request).userPrompt).toContain('"finalArc": true');
  });

  it('stops at the end of the planned route instead of planning an arc the Blueprint never had', async () => {
    const run = await setup();
    const past = await run.jumpTo(201);
    await expect(past.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('route to the Destined Ending is complete');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('Regular Reader: edits the active and upcoming arcs while private, never completed arcs or completed goals', async () => {
    const run = await setup();
    const arc2Edit: ArcPlan = { arcNumber: 2, goals: [roadmap[1].goals[0], { ...roadmap[1].goals[1], text: 'Open the archive and name Lin its keeper.' }] };
    await run.controller.editArcGoals(run.story.id, arc2Edit);
    const arc1Edit: ArcPlan = { arcNumber: 1, goals: [{ ...roadmap[0].goals[0], chapters: 50 }, { ...roadmap[0].goals[1], chapters: 50 }] };
    await run.controller.editArcGoals(run.story.id, arc1Edit);
    expect(run.controller.snapshot().stories[0].arcPlans?.slice(2)).toEqual([
      { plan: arc2Edit, effectiveChapter: 1, reason: 'edit' },
      { plan: arc1Edit, effectiveChapter: 1, reason: 'edit' },
    ]);
    await expect(run.controller.editArcGoals(run.story.id, { arcNumber: 2, goals: [{ id: 'arc-1-flood', text: 'Reuse.', chapters: 100 }] }))
      .rejects.toThrow('already belongs to another arc');
    const inArc2 = await run.jumpTo(101, [...arc1Done, { arcNumber: 1, goalId: 'arc-1-map', goalText: roadmap[0].goals[1].text, chapterNumber: 100 }]);
    await expect(inArc2.editArcGoals(run.story.id, arc1Edit)).rejects.toThrow('Arc 1 is complete');
    const state = inArc2.snapshot();
    expect(arcGoalEditState(state.stories[0], state.foundations[0].input, 2)).toMatchObject({ mode: 'regular', status: 'active', editable: true });

    const published = await setup({}, 'public');
    await expect(published.controller.editArcGoals(published.story.id, arc2Edit)).rejects.toThrow('only while the novel is private');
  });

  it('Fate Survival: sets each arc once immediately before it begins and locks it when generation begins', async () => {
    const run = await setup({ fateSurvival: { enabled: true } });
    // Arc 1 was reviewed in the Blueprint immediately before the story began.
    expect(run.controller.snapshot().stories[0].arcGoalReviews).toEqual([{ arcNumber: 1, reviewedAt: expect.any(String), edited: false, source: 'blueprint-creation' }]);
    await expect(run.controller.editArcGoals(run.story.id, roadmap[0])).rejects.toThrow('one-time review');
    await expect(run.controller.editArcGoals(run.story.id, roadmap[1])).rejects.toThrow('immediately before it begins');
    await run.controller.chooseChapterDirection(run.story.id, READER);
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.controller.snapshot().stories[0].arcGoalReviews?.[0].lockedAt).toBeTruthy();

    const atArc2 = await run.jumpTo(101, [...arc1Done, { arcNumber: 1, goalId: 'arc-1-map', goalText: roadmap[0].goals[1].text, chapterNumber: 100 }]);
    await expect(atArc2.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("Set Arc 2's goals before it begins");
    const edited: ArcPlan = { arcNumber: 2, goals: [{ ...roadmap[1].goals[0], text: 'Dive with the ferryman.' }, roadmap[1].goals[1]] };
    await atArc2.editArcGoals(run.story.id, edited);
    await expect(atArc2.editArcGoals(run.story.id, roadmap[1])).rejects.toThrow('one-time review');
    await expect(atArc2.acceptArcGoals(run.story.id, 2)).rejects.toThrow('one-time review');
    await atArc2.chooseChapterDirection(run.story.id, READER);
    await atArc2.generateNextChapter(run.story.id, 'fixture');
    const review = atArc2.snapshot().stories[0].arcGoalReviews?.find(entry => entry.arcNumber === 2);
    expect(review).toMatchObject({ edited: true, source: 'novel-blueprint', lockedAt: expect.any(String) });
    expect(run.requests.at(-1)!.storyInformation.arc?.activeGoal.text).toBe('Dive with the ferryman.');
    await expect(atArc2.editArcGoals(run.story.id, roadmap[1])).rejects.toThrow('locked when its generation began');
  });

  it('Fate Survival: accepting a plan as written uses the review without changing the plan', async () => {
    const run = await setup({ fateSurvival: { enabled: true } });
    const atArc2 = await run.jumpTo(101, [...arc1Done, { arcNumber: 1, goalId: 'arc-1-map', goalText: roadmap[0].goals[1].text, chapterNumber: 100 }]);
    await atArc2.acceptArcGoals(run.story.id, 2);
    await expect(atArc2.editArcGoals(run.story.id, roadmap[1])).rejects.toThrow('one-time review');
    expect(atArc2.snapshot().stories[0].arcPlans).toHaveLength(2);
    await atArc2.chooseChapterDirection(run.story.id, READER);
    await atArc2.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests.at(-1)!.storyInformation.arc?.activeGoal.id).toBe('arc-2-dive');
  });

  it('keeps the Destined Ending and arc count fixed across Foundation revisions', async () => {
    const run = await setup();
    const input = run.controller.snapshot().foundations[0].input;
    await expect(run.controller.saveFoundationRevision(run.story.id, { ...input, destinedEnding: 'A different ending.' })).rejects.toThrow('fixed destination');
    await expect(run.controller.saveFoundationRevision(run.story.id, { ...input, plannedArcCount: 3 })).rejects.toThrow('arc count is fixed');
    await run.controller.saveFoundationRevision(run.story.id, { ...input, worldFacts: 'The valley remembers the flood.' });
    expect(run.controller.snapshot().foundations.at(-1)!.input.destinedEnding).toBe(ENDING);
    expect(run.controller.snapshot().stories[0].arcPlans).toHaveLength(2);
  });
});
