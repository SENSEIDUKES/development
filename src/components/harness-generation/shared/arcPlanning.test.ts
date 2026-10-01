import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, arcGoalEditState, nextArcStep, type HarnessArcRequest, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type StoryFoundationInput } from '@seihouse/sen/harness-generation';
import { type ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessArcPrompt, buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

const ENDING = 'ENDING_Lin rebuilds the drowned archive and reopens it to the valley.';
const arcOne: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-flood', text: 'GOAL_A1G1 Survive the first flood.', chapters: 40 },
  { id: 'arc-1-map', text: 'GOAL_A1G2 Recover the archive map.', chapters: 60 },
] };
const LOOKAHEAD = 'LOOKAHEAD_A2 Lin dives for the sunken stacks and opens the archive.';
/** The planner's draft for Arc 2: wording and chapters only, plus identities the HARNESS replaces. */
const arcTwoDraft = { goals: [
  { id: 'arc-1-flood', text: 'GOAL_A2G1 Dive to the sunken stacks.', chapters: 70 },
  { text: 'GOAL_A2G2 Reopen the archive to the valley.', chapters: 30 },
] };
const reply = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });

const setup = async (overrides: Partial<StoryFoundationInput> = {}, visibility?: 'private' | 'public') => {
  const requests: HarnessGenerationRequest[] = [];
  let output: Record<string, unknown> = { paragraphs: ['Lin waded through the first flood.'] };
  const arcOperation = vi.fn(async (_request: HarnessArcRequest) => reply({ plan: arcTwoDraft, lookahead: [], destinedEnding: ENDING }));
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: async request => { requests.push(structuredClone(request)); return reply(output); },
    arcOperation,
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'An archivist races the rising river.', destinedEnding: ENDING, initialArcPlan: arcOne, plannedArcCount: 2,
    initialArcLookahead: [{ arcNumber: 2, direction: LOOKAHEAD }], ...overrides,
  }, 'en', undefined, visibility ? { visibility } : {});
  /** Moves the story head, as the existing boundary tests do, instead of writing a hundred chapters. */
  const jumpTo = async (nextChapterNumber: number, resolved: Array<{ arcNumber: number; goalId: string; goalText: string; chapterNumber: number; outcome?: 'missed' }> = []) => {
    const saved = controller.snapshot();
    saved.stories[0].head.nextChapterNumber = nextChapterNumber;
    saved.stories[0].goalCompletions = [...(saved.stories[0].goalCompletions ?? []), ...resolved.map(goal => ({ ...goal, evidence: goal.outcome ? '' : 'evidence' }))];
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter });
    await reloaded.hydrate();
    return reloaded;
  };
  return { controller, repository, story, requests, arcOperation, jumpTo, setOutput: (value: Record<string, unknown>) => { output = value; } };
};

/** A reader's own direction for one chapter; Fate Survival writes nothing without one. */
const READER = { kind: 'reader' as const, text: 'Lin climbs the archive tower before the water rises.' };
/** Arc 1 finished: its first goal achieved, its second missed at its deadline. */
const arcOneDone = [
  { arcNumber: 1, goalId: 'arc-1-flood', goalText: arcOne.goals[0].text, chapterNumber: 40 },
  { arcNumber: 1, goalId: 'arc-1-map', goalText: arcOne.goals[1].text, chapterNumber: 100, outcome: 'missed' as const },
];

describe('HARNESS plans each arc when it begins', () => {
  it('starts with only Arc 1 and the hidden look-ahead, and the writer sees only the ending and the active goal', async () => {
    const run = await setup();
    const story = run.controller.snapshot().stories[0];
    expect(story.arcPlans).toEqual([{ plan: arcOne, effectiveChapter: 1, reason: 'initial' }]);
    expect(story.arcLookahead).toEqual([{ arcNumber: 2, direction: LOOKAHEAD }]);
    // Arc 1 was reviewed in the Blueprint before the story began, in Regular Reader mode too.
    expect(story.arcGoalReviews).toEqual([{ arcNumber: 1, reviewedAt: expect.any(String), edited: false, source: 'blueprint-creation' }]);
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.arcOperation).not.toHaveBeenCalled();
    const request = run.requests[0];
    expect(request.storyInformation.arc).toMatchObject({ arcNumber: 1, plannedArcCount: 2, finalArc: false, activeGoal: { id: 'arc-1-flood' }, completionDeadline: 40 });
    const prompt = buildHarnessGenerationPrompt(request);
    expect(prompt.userPrompt.split(ENDING)).toHaveLength(2);
    expect(prompt.userPrompt).toContain('GOAL_A1G1');
    // Never a later goal, and never the look-ahead: only the arc planner reads it.
    for (const hidden of ['GOAL_A1G2', 'LOOKAHEAD_A2']) {
      expect(prompt.userPrompt).not.toContain(hidden);
      expect(prompt.systemInstruction).not.toContain(hidden);
    }
  });

  it('Regular Reader: plans Arc 2 only when the reader begins it, from how Arc 1 went, then waits for its review', async () => {
    const run = await setup();
    const atArc2 = await run.jumpTo(101, arcOneDone);
    // A chapter write never plans an arc in a story with a planned length.
    await expect(atArc2.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("Arc 2 begins with Chapter 101. Plan its goals in the novel's Blueprint");
    expect(run.arcOperation).not.toHaveBeenCalled();
    expect(nextArcStep(atArc2.snapshot(), run.story.id)).toEqual({ kind: 'plan', arcNumber: 2, status: 'needed' });

    await atArc2.planNextArc(run.story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    const sent = run.arcOperation.mock.calls[0][0];
    expect(sent.planning).toEqual({
      arcNumber: 2, plannedArcCount: 2, finalArc: true,
      previousArcs: [{ arcNumber: 1, goals: [{ text: arcOne.goals[0].text, outcome: 'completed' }, { text: arcOne.goals[1].text, outcome: 'missed' }] }],
      lookahead: [{ arcNumber: 2, direction: LOOKAHEAD }],
    });
    const planner = buildHarnessArcPrompt(sent);
    expect(planner.userPrompt).toContain('LOOKAHEAD_A2');
    expect(planner.systemInstruction).toContain('When planning.finalArc is true, this is the story\'s last arc: its last goal is the story reaching its Destined Ending.');
    // The HARNESS owns identities: the planner's draft carries none.
    expect(JSON.stringify(planner.responseJsonSchema)).not.toContain('"id"');

    const planned = atArc2.snapshot().stories[0];
    expect(planned.arcPlans?.at(-1)).toEqual({ plan: { arcNumber: 2, goals: [
      { id: 'arc-2-1', text: 'GOAL_A2G1 Dive to the sunken stacks.', chapters: 70 },
      { id: 'arc-2-2', text: 'GOAL_A2G2 Reopen the archive to the valley.', chapters: 30 },
    ] }, effectiveChapter: 101, reason: 'initial' });
    // The final arc has nothing after it to look ahead to.
    expect(planned.arcLookahead).toBeUndefined();
    expect(nextArcStep(atArc2.snapshot(), run.story.id)).toEqual({ kind: 'review', arcNumber: 2 });
    await expect(atArc2.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("Review Arc 2's goals before Chapter 101 is written");

    await atArc2.acceptArcGoals(run.story.id, 2);
    expect(nextArcStep(atArc2.snapshot(), run.story.id)).toBeUndefined();
    await atArc2.generateNextChapter(run.story.id, 'fixture');
    const request = run.requests.at(-1)!;
    expect(request.storyInformation.arc).toMatchObject({ arcNumber: 2, chapterInArc: 1, finalArc: true, activeGoal: { id: 'arc-2-1', startChapter: 101, endChapter: 170 } });
    expect(buildHarnessGenerationPrompt(request).userPrompt).not.toContain('LOOKAHEAD_A2');
  });

  it('Regular Reader: an edit made while the review is pending is the review; a public novel can still accept', async () => {
    const run = await setup();
    const atArc2 = await run.jumpTo(101, arcOneDone);
    await atArc2.planNextArc(run.story.id, 'fixture');
    const edited = atArc2.snapshot().stories[0].arcPlans!.at(-1)!.plan;
    await atArc2.editArcGoals(run.story.id, { ...edited, goals: [{ ...edited.goals[0], text: 'Dive with the ferryman.' }, edited.goals[1]] });
    expect(atArc2.snapshot().stories[0].arcGoalReviews?.find(review => review.arcNumber === 2)).toMatchObject({ edited: true, source: 'novel-blueprint' });
    await atArc2.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests.at(-1)!.storyInformation.arc?.activeGoal.text).toBe('Dive with the ferryman.');

    const published = await setup({}, 'public');
    const publicArc2 = await published.jumpTo(101, arcOneDone);
    await publicArc2.planNextArc(published.story.id, 'fixture');
    const state = publicArc2.snapshot();
    expect(arcGoalEditState(state.stories[0], state.foundations[0].input, 2)).toMatchObject({ editable: false, review: 'pending', canAccept: true });
    await publicArc2.acceptArcGoals(published.story.id, 2);
    await publicArc2.generateNextChapter(published.story.id, 'fixture');
    expect(published.requests).toHaveLength(1);
  });

  it('Regular Reader: edits the active arc while private, never completed arcs or completed goals', async () => {
    const run = await setup();
    const arc1Edit: ArcPlan = { arcNumber: 1, goals: [{ ...arcOne.goals[0], chapters: 50 }, { ...arcOne.goals[1], chapters: 50 }] };
    await run.controller.editArcGoals(run.story.id, arc1Edit);
    expect(run.controller.snapshot().stories[0].arcPlans?.at(-1)).toEqual({ plan: arc1Edit, effectiveChapter: 1, reason: 'edit' });
    // Arc 2 is not planned yet, so there is nothing to edit.
    await expect(run.controller.editArcGoals(run.story.id, { arcNumber: 2, goals: [{ id: 'arc-2-x', text: 'Too early.', chapters: 100 }] }))
      .rejects.toThrow('no saved plan for that arc yet');
    const inArc2 = await run.jumpTo(101, arcOneDone);
    await expect(inArc2.editArcGoals(run.story.id, arc1Edit)).rejects.toThrow('Arc 1 is complete');
    await inArc2.planNextArc(run.story.id, 'fixture');
    await expect(inArc2.editArcGoals(run.story.id, { arcNumber: 2, goals: [{ id: 'arc-1-flood', text: 'Reuse.', chapters: 100 }] }))
      .rejects.toThrow('already belongs to another arc');
    const published = await setup({}, 'public');
    await expect(published.controller.editArcGoals(published.story.id, arc1Edit)).rejects.toThrow('only while the novel is private');
  });

  it('Fate Survival: plans Arc 2 when begun; its one-time review edits or accepts it, and it locks when generation begins', async () => {
    const run = await setup({ fateSurvival: { enabled: true } });
    expect(run.controller.snapshot().stories[0].arcGoalReviews).toEqual([{ arcNumber: 1, reviewedAt: expect.any(String), edited: false, source: 'blueprint-creation' }]);
    await expect(run.controller.editArcGoals(run.story.id, arcOne)).rejects.toThrow('one-time review');
    await run.controller.chooseChapterDirection(run.story.id, READER);
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.controller.snapshot().stories[0].arcGoalReviews?.[0].lockedAt).toBeTruthy();

    const atArc2 = await run.jumpTo(101, arcOneDone.slice(0, 1).concat([{ ...arcOneDone[1], outcome: undefined as never }]));
    await atArc2.planNextArc(run.story.id, 'fixture');
    await atArc2.chooseChapterDirection(run.story.id, READER);
    await expect(atArc2.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("Set Arc 2's goals before it begins");
    const planned = atArc2.snapshot().stories[0].arcPlans!.at(-1)!.plan;
    await atArc2.editArcGoals(run.story.id, { ...planned, goals: [{ ...planned.goals[0], text: 'Dive with the ferryman.' }, planned.goals[1]] });
    await expect(atArc2.editArcGoals(run.story.id, planned)).rejects.toThrow('one-time review');
    await expect(atArc2.acceptArcGoals(run.story.id, 2)).rejects.toThrow('one-time review');
    await atArc2.generateNextChapter(run.story.id, 'fixture');
    expect(atArc2.snapshot().stories[0].arcGoalReviews?.find(entry => entry.arcNumber === 2)).toMatchObject({ edited: true, source: 'novel-blueprint', lockedAt: expect.any(String) });
    expect(run.requests.at(-1)!.storyInformation.arc?.activeGoal.text).toBe('Dive with the ferryman.');
    await expect(atArc2.editArcGoals(run.story.id, planned)).rejects.toThrow('locked when its generation began');
  });

  it('says plainly when planning failed, and plans again on request', async () => {
    const run = await setup();
    const atArc2 = await run.jumpTo(101, arcOneDone);
    run.arcOperation.mockRejectedValueOnce(new Error('The planner is busy.'));
    await expect(atArc2.planNextArc(run.story.id, 'fixture')).rejects.toThrow('The planner is busy.');
    expect(nextArcStep(atArc2.snapshot(), run.story.id)).toEqual({ kind: 'plan', arcNumber: 2, status: 'failed', message: 'The planner is busy.' });
    await atArc2.planNextArc(run.story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(2);
    expect(nextArcStep(atArc2.snapshot(), run.story.id)).toEqual({ kind: 'review', arcNumber: 2 });
    expect(atArc2.snapshot().arcPlanOperations.map(operation => operation.status)).toEqual(['abandoned', 'completed']);
  });

  it('keeps the planner\'s fresh look-ahead within the story\'s length', async () => {
    const run = await setup({ plannedArcCount: 4, initialArcLookahead: [{ arcNumber: 2, direction: LOOKAHEAD }, { arcNumber: 3, direction: 'Arc three.' }] });
    run.arcOperation.mockResolvedValueOnce(reply({ plan: arcTwoDraft, destinedEnding: ENDING, lookahead: [
      { arcNumber: 2, direction: 'Already planned.' }, { arcNumber: 3, direction: 'The valley rises.' }, { arcNumber: 4, direction: 'Lin reopens the archive.' }, { arcNumber: 5, direction: 'Past the end.' },
    ] }));
    const atArc2 = await run.jumpTo(101, arcOneDone);
    await atArc2.planNextArc(run.story.id, 'fixture');
    expect(run.arcOperation.mock.calls[0][0].planning).toMatchObject({ plannedArcCount: 4, finalArc: false });
    expect(atArc2.snapshot().stories[0].arcLookahead).toEqual([{ arcNumber: 3, direction: 'The valley rises.' }, { arcNumber: 4, direction: 'Lin reopens the archive.' }]);
  });

  it('stops at the end of the planned route instead of planning an arc beyond it', async () => {
    const run = await setup();
    const past = await run.jumpTo(201);
    await expect(past.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('route to the Destined Ending is complete');
    expect(nextArcStep(past.snapshot(), run.story.id)).toBeUndefined();
    await past.planNextArc(run.story.id, 'fixture');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('pauses a batch at an arc that waits on the reader instead of leaving it running', async () => {
    const run = await setup();
    const atEnd = await run.jumpTo(100, arcOneDone.slice(0, 1));
    await atEnd.startBatch(run.story.id, 'fixture', 3);
    const batch = atEnd.snapshot().batches[0];
    expect(batch.completedChapterIds).toHaveLength(1);
    expect(batch).toMatchObject({ status: 'paused', failure: expect.stringContaining('Arc 2 begins with Chapter 101') });
  });

  it('keeps the Destined Ending and arc count fixed across Foundation revisions', async () => {
    const run = await setup();
    const input = run.controller.snapshot().foundations[0].input;
    await expect(run.controller.saveFoundationRevision(run.story.id, { ...input, destinedEnding: 'A different ending.' })).rejects.toThrow('fixed destination');
    await expect(run.controller.saveFoundationRevision(run.story.id, { ...input, plannedArcCount: 3 })).rejects.toThrow('arc count is fixed');
    await run.controller.saveFoundationRevision(run.story.id, { ...input, worldFacts: 'The valley remembers the flood.' });
    expect(run.controller.snapshot().foundations.at(-1)!.input.destinedEnding).toBe(ENDING);
    expect(run.controller.snapshot().stories[0].arcPlans).toHaveLength(1);
  });
});
