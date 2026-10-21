import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, createHarnessSenStory, type HarnessArcRequest, type HarnessChapterPlanRequest, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type StoryFoundationInput } from '@seihouse/sen/harness-generation';
import { arcFirstChapter, arcGoalSegments, type ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { plannedChapter } from '../../../test-utils/chapterPlan';
import { buildChapterPlannerPrompt } from '../../../server/harness-generation/chapterPlanner';

const ENDING = 'Lin reopens the drowned archive to the valley.';
/** One arc of four goals; the last is the final goal, the Destined Ending itself. */
const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-flood', text: 'Survive the first flood.', chapters: 3 },
  { id: 'arc-1-bridge', text: 'Rebuild the rope bridge.', chapters: 3 },
  { id: 'arc-1-tower', text: 'Climb the archive tower.', chapters: 3 },
  { id: 'arc-1-ending', text: 'Reopen the drowned archive to the valley.', chapters: 21 },
] };
/** A second arc, for a roadmap whose first arc ends before the final goal. */
const secondArc: ArcPlan = { arcNumber: 2, goals: [{ id: 'arc-2-valley', text: 'Carry the archive to the valley.', chapters: 30 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } };
/** The writer's reply: the chapter told, its recap and its three ideas for the next. */
const chapter = (text: string) => ({
  paragraphs: [text], recap: `Recap: ${text}`,
  nextProgression: 'Lin climbs the archive tower.', nextWorldBuilding: 'The flood reveals the old canals.', nextConflict: 'A river cult blocks the stair.',
});
/**
 * The planner's reply: one event, which is what the chapter tells, and whether
 * it reaches the Active Arc Goal or ends the story (SENSEI, 2026-10-20: the
 * plan decides both; the writer never does).
 */
const planOf = (how: string, { reaches = false, ends = false }: { reaches?: boolean; ends?: boolean } = {}) => ({
  cast: [{ name: 'MC', kind: 'character' }],
  events: [{ kind: ends ? 'loss' : 'decision', actor: 'MC', targets: [], presses: [], how, facts: ends ? [{ type: 'status', who: 'MC', state: 'dead' }] : [] }],
  arcGoalReached: reaches ? { reached: true, event: 1 } : { reached: false },
  ...(ends ? { storyEnds: { ends: true, event: 1 } } : {}),
  chapterFunction: 'progression',
});
const FATE_SKILL = 'seihouse.sen-fate-survival';

const setup = async (overrides: Partial<StoryFoundationInput> = {}, roadmap: ArcPlan[] = [plan]) => {
  const requests: HarnessGenerationRequest[] = [];
  const planRequests: HarnessChapterPlanRequest[] = [];
  const outputs: Array<Record<string, unknown> | Error> = [];
  const plans: object[] = [];
  const arcOperation = vi.fn(async (_request: HarnessArcRequest) => ({ rawProviderResponse: '{}', providerReceipt: receipt }));
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: async request => {
      requests.push(structuredClone(request));
      const next = outputs.shift() ?? chapter('Lin waded on.');
      if (next instanceof Error) throw next;
      return { rawProviderResponse: JSON.stringify(writtenChapter(next)), providerReceipt: receipt };
    },
    planChapter: async request => {
      planRequests.push(structuredClone(request));
      return plannedChapter(plans.shift() ?? planOf('Lin wades on.'));
    },
    arcOperation,
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'An archivist races the rising river.', destinedEnding: ENDING,
    initialArcPlan: roadmap[0], plannedArcCount: roadmap.length, fatePressure: 'heaven', ...overrides });
  /**
   * Moves the story head to a later chapter with earlier goals already
   * resolved at their deadlines, and with every arc before the one being
   * written already planned as it began.
   */
  const jumpTo = async (nextChapterNumber: number, resolved: Array<{ goalId: string; outcome?: 'missed' }> = []) => {
    const saved = controller.snapshot();
    saved.stories[0].head.nextChapterNumber = nextChapterNumber;
    saved.stories[0].arcPlans = roadmap.filter(entry => arcFirstChapter(entry.arcNumber) < nextChapterNumber || entry.arcNumber === 1)
      .map(entry => ({ plan: entry, effectiveChapter: arcFirstChapter(entry.arcNumber), reason: 'initial' as const }));
    saved.stories[0].goalCompletions = resolved.map(goal => {
      const arcPlan = roadmap.find(entry => entry.goals.some(item => item.id === goal.goalId))!;
      const segment = arcGoalSegments(arcPlan).find(item => item.id === goal.goalId)!;
      return { arcNumber: arcPlan.arcNumber, goalId: goal.goalId, goalText: segment.text, chapterNumber: segment.endChapter,
        evidence: goal.outcome ? '' : 'evidence', ...(goal.outcome ? { outcome: goal.outcome } : {}) };
    });
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter });
    await reloaded.hydrate();
    return reloaded;
  };
  /** The next chapter: what its plan says happens, and the writer telling it. */
  const next = (how: string, decided: { reaches?: boolean; ends?: boolean } = {}) => { plans.push(planOf(how, decided)); outputs.push(chapter(how)); };
  return { controller, story, requests, planRequests, outputs, plans, arcOperation, jumpTo, next };
};

const SURVIVAL = { fateSurvival: { enabled: true } } as const;
const direct = (text: string) => ({ kind: 'reader' as const, text });
/** Fate Survival writes a chapter only with the reader's direction. */
const directed = async (controller: HarnessGenerationController, storyId: string, text: string) => {
  await controller.chooseChapterDirection(storyId, direct(text));
  await controller.generateNextChapter(storyId, 'fixture');
};
const latestAttempt = (controller: HarnessGenerationController) => controller.snapshot().attempts.at(-1)!;

describe('Regular Reader mode', () => {
  it('continues automatically on Rhythm, takes one of the three ideas for one chapter, then returns to Rhythm', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    // Chapter 1: automatic. Rhythm travels in the packet, which the planner reads; the request carries no reader direction.
    expect(run.planRequests[0].storyInformation.rhythm?.fatePressure).toBe('heaven');
    expect(buildChapterPlannerPrompt(run.planRequests[0]).userPrompt).toContain('FATE PRESSURE RHYTHM DIRECTION');
    expect(buildHarnessGenerationPrompt(run.requests[0]).userPrompt).not.toContain('FATE PRESSURE RHYTHM DIRECTION');
    expect(run.requests[0].immediateChapterRequest.direction).toBeUndefined();
    expect(run.controller.snapshot().chapters[0].path).toMatchObject({ kind: 'automatic' });

    // The three ideas the writer returned are the choices; the reader takes World Building for Chapter 2.
    const ideas = run.controller.snapshot().chapters[0].rhythm!.nextChapterSuggestions!;
    await run.controller.chooseChapterDirection(run.story.id, { kind: 'chapter-function', chapterFunction: 'worldBuilding', suggestion: ideas.worldBuilding });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const chosen = run.requests[1];
    expect(chosen.storyInformation.rhythm).toBeUndefined();
    expect(chosen.immediateChapterRequest.direction?.choice).toEqual({ kind: 'chapter-function', chapterFunction: 'worldBuilding', suggestion: 'The flood reveals the old canals.' });
    // The planner carries it out; the writer is told it as context.
    expect(buildChapterPlannerPrompt(run.planRequests[1]).userPrompt).toContain('The reader chose this path: World Building, with this idea: The flood reveals the old canals.');
    expect(buildHarnessGenerationPrompt(chosen).userPrompt).toContain('The reader\'s direction for this chapter: World Building, with this idea: The flood reveals the old canals. The Chapter Plan carries it out.');

    // Consumed at commit: Chapter 3 is automatic again.
    const afterTwo = run.controller.snapshot();
    expect(afterTwo.stories[0].nextChapterDirection).toBeUndefined();
    expect(afterTwo.chapters[1].path).toMatchObject({ kind: 'chapter-function', chapterFunction: 'worldBuilding' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests[2].immediateChapterRequest.direction).toBeUndefined();
    expect(run.requests[2].storyInformation.rhythm).toBeDefined();
    // Regular Reader calls never carry the Fate Survival skill.
    expect(run.requests.every(sent => !sent.capaPrompt.skills.some(skill => skill.id === FATE_SKILL))).toBe(true);
    expect(buildHarnessGenerationPrompt(run.requests[0]).systemInstruction).not.toContain('CAPA SKILL [Fate]');
    expect(buildChapterPlannerPrompt(run.planRequests[0]).systemInstruction).not.toContain('CAPA SKILL [Fate]');
  });

  it('keeps the reader direction through a failed call and a retry, and uses it up only when the chapter commits', async () => {
    const run = await setup();
    await run.controller.chooseChapterDirection(run.story.id, direct('Lin seals the archive door behind her.'));
    run.outputs.push(new Error('Provider unavailable'));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const failed = run.controller.snapshot();
    expect(failed.attempts[0].stage).toBe('generation_failed');
    expect(failed.stories[0].nextChapterDirection?.choice).toEqual(direct('Lin seals the archive door behind her.'));

    await run.controller.retryModelRequest(failed.attempts[0].id);
    const retried = run.controller.snapshot();
    expect(run.requests).toHaveLength(2);
    expect(run.requests[1].immediateChapterRequest.direction?.choice).toEqual(direct('Lin seals the archive door behind her.'));
    expect(retried.chapters[0].path).toMatchObject({ kind: 'reader', text: 'Lin seals the archive door behind her.' });
    expect(retried.stories[0].nextChapterDirection).toBeUndefined();
  });

  it('rebuilds a retry when the reader changed the direction after the failure', async () => {
    const run = await setup();
    await run.controller.chooseChapterDirection(run.story.id, direct('First idea.'));
    run.outputs.push(new Error('Provider unavailable'));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.controller.snapshot().attempts[0].stage).toBe('generation_failed');
    await run.controller.chooseChapterDirection(run.story.id, direct('Second idea.'));
    await run.controller.retryModelRequest(run.controller.snapshot().attempts[0].id);
    expect(run.requests[1].immediateChapterRequest.direction?.choice).toEqual(direct('Second idea.'));
  });

  it('records a missed deadline honestly: the chapter saves, the story is off track, and fate never fails', async () => {
    const run = await setup();
    const atDeadline = await run.jumpTo(3);
    // A plan that reaches no goal at the deadline misses it; an ending it names outside Fate Survival is set aside.
    run.next('Lin waits out the storm on the roof.', { ends: true });
    await atDeadline.generateNextChapter(run.story.id, 'fixture');
    const saved = atDeadline.snapshot();
    expect(saved.stories[0].head.nextChapterNumber).toBe(4);
    expect(saved.stories[0].goalCompletions).toEqual([expect.objectContaining({ goalId: 'arc-1-flood', outcome: 'missed', chapterNumber: 3 })]);
    expect(latestAttempt(atDeadline).warnings.map(warning => warning.code)).toContain('plan_checked');
    expect(latestAttempt(atDeadline).chapterPlan!.checks).toContainEqual({ message: 'The plan says event 1 ends the story, but only Fate Survival can end in failure; it was set aside.' });
    expect(saved.chapters.at(-1)!.plan.storyEnds).toBeUndefined();
    expect(saved.stories[0].conclusion).toBeUndefined();
    expect(saved.stories[0].brokenRoute).toBeUndefined();

    // The next goal begins, and the planner is told the story is off track.
    await atDeadline.generateNextChapter(run.story.id, 'fixture');
    const next = run.planRequests.at(-1)!;
    expect(next.storyInformation.arc).toMatchObject({ activeGoal: { id: 'arc-1-bridge' },
      route: { status: 'off-track', missedGoals: [{ goalId: 'arc-1-flood', text: 'Survive the first flood.', chapterNumber: 3 }] } });
    const prompt = buildChapterPlannerPrompt(next);
    expect(prompt.userPrompt).toContain('"status": "off-track"');
    expect(prompt.systemInstruction).toContain('regular: the Destined Ending is guaranteed as the story\'s standing direction');
    expect(prompt.systemInstruction).toContain('nothing forces it by a deadline');
    expect(prompt.systemInstruction).not.toContain('firm pacing requirement');
  });

  it('ends the story when its plan reaches the Destined Ending through the final goal', async () => {
    const run = await setup();
    const atFinal = await run.jumpTo(30, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    run.next('The archive doors open to the valley at last.', { reaches: true });
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    expect(run.planRequests.at(-1)!.storyInformation.arc).toMatchObject({ finalArc: true, finalGoal: true, route: { status: 'on-track' } });
    expect(atFinal.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'destined-ending-reached', reason: 'final-goal-completed', chapterNumber: 30 });
    await expect(atFinal.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('reached its Destined Ending');
    await expect(atFinal.chooseChapterDirection(run.story.id, direct('One more chapter.'))).rejects.toThrow('reached its Destined Ending');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('continues past a missed final goal toward the same Destined Ending, inventing no arc, until a plan reaches it', async () => {
    const run = await setup();
    const atFinal = await run.jumpTo(30, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge', outcome: 'missed' }, { goalId: 'arc-1-tower' }]);
    run.next('The archive stays sealed as the river rises.');
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    const missed = atFinal.snapshot().stories[0];
    // Recorded honestly: missed, not reached, and not a failure.
    expect(missed.goalCompletions?.at(-1)).toMatchObject({ goalId: 'arc-1-ending', outcome: 'missed', chapterNumber: 30 });
    expect(missed.conclusion).toBeUndefined();
    expect(missed.brokenRoute).toBeUndefined();

    // Chapter 31 is past the one planned arc: no roadmap gap, no new arc, the same destination.
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    const past = run.planRequests.at(-1)!;
    expect(past.immediateChapterRequest.chapterNumber).toBe(31);
    expect(past.storyInformation.arc).toMatchObject({ arcNumber: 1, finalGoal: true, activeGoal: { id: 'arc-1-ending' },
      route: { status: 'past-final-goal', finalGoalMissedInChapter: 30, missedGoals: [{ goalId: 'arc-1-bridge' }, { goalId: 'arc-1-ending' }] } });
    expect(past.storyInformation.rhythm).toBeDefined();
    const prompt = buildChapterPlannerPrompt(past);
    expect(prompt.userPrompt).toContain('the final goal was missed; the story keeps pursuing the Destined Ending past its roadmap');
    expect(prompt.userPrompt).toContain(ENDING);
    expect(prompt.userPrompt).not.toContain('completionDeadline');
    expect(run.arcOperation).not.toHaveBeenCalled();
    expect(atFinal.snapshot().stories[0].arcPlans).toHaveLength(1);
    // The Reader keeps Chapter 31 in Arc 1: no Arc 2 appears.
    expect(createHarnessSenStory(atFinal.snapshot(), run.story.id).arcs.map(arc => [arc.title, arc.chapters.map(item => item.number)]))
      .toEqual([['Arc 1', [30, 31]]]);

    // When a plan reaches it, the story ends, and the final goal's miss stays on record.
    run.next('At last the archive doors open to the valley.', { reaches: true });
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    const reached = atFinal.snapshot().stories[0];
    expect(reached.conclusion).toMatchObject({ outcome: 'destined-ending-reached', reason: 'reached-after-final-goal-missed', chapterNumber: 32,
      evidence: 'At last the archive doors open to the valley.' });
    expect(reached.goalCompletions?.filter(goal => goal.goalId === 'arc-1-ending')).toEqual([expect.objectContaining({ outcome: 'missed', chapterNumber: 30 })]);
  });
});

describe('Fate Survival', () => {
  it('writes nothing until the reader chooses the chapter\'s path, offers the writer\'s suggested paths beside the reader\'s own, sends no Rhythm, and always loads the Fate Survival skill into both calls', async () => {
    const run = await setup(SURVIVAL);
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("choose Chapter 1's direction");
    // A suggested path is a choice like the reader's own words; the reader changes their mind before writing.
    await run.controller.chooseChapterDirection(run.story.id, { kind: 'chapter-function', chapterFunction: 'conflict' });
    expect(run.controller.snapshot().stories[0].nextChapterDirection?.choice).toEqual({ kind: 'chapter-function', chapterFunction: 'conflict' });
    await expect(run.controller.startBatch(run.story.id, 'fixture', 3)).rejects.toThrow('one reader-directed chapter at a time');
    await directed(run.controller, run.story.id, 'Lin swims for the archive tower.');
    const request = run.planRequests[0];
    expect(request.storyInformation.rhythm).toBeUndefined();
    expect(request.storyInformation.storyDirection.fateMode).toBe('survival');
    // The planner, which is Fate, pursues the reader's direction toward the goal and the ending.
    const planner = buildChapterPlannerPrompt(request);
    expect(planner.systemInstruction).toContain('survival: the reader directs the main character and the Destined Ending is not guaranteed');
    expect(planner.userPrompt).toContain('The reader\'s direction for this chapter: Lin swims for the archive tower.');
    expect(planner.userPrompt).not.toContain('FATE PRESSURE RHYTHM DIRECTION');
    expect(planner.userPrompt).toContain(ENDING);
    expect(planner.userPrompt).toContain('Survive the first flood.');
    expect(planner.systemInstruction).toContain('CAPA SKILL [Fate] — SEN Fate Survival');
    expect(planner.systemInstruction).toContain('Do not protect the main character from consequences.');
    // The writer carries the same skill's writing half in its CAPA Prompt, and never the ending or the goal.
    const writer = buildHarnessGenerationPrompt(run.requests[0]);
    expect(run.requests[0].capaPrompt.skills.map(skill => skill.id)).toEqual(['seihouse.sen-novel-author', FATE_SKILL, 'seihouse.sen-speakers']);
    expect(writer.systemInstruction).toContain('CAPA SKILL [Fate] — SEN Fate Survival');
    expect(writer.systemInstruction).toContain('Make the reader\'s direction land on the page through the main character\'s own choices and actions.');
    expect(writer.systemInstruction).not.toContain('Do not protect the main character from consequences.');
    for (const planners of [ENDING, 'Survive the first flood.']) expect(writer.userPrompt).not.toContain(planners);
    // The next chapter needs a new choice, and carries the skill again. This time the reader takes one of the
    // writer's suggested paths: it reaches the writer as the reader's direction, still with no Rhythm.
    expect(run.controller.snapshot().stories[0].nextChapterDirection).toBeUndefined();
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("choose Chapter 2's direction");
    await run.controller.chooseChapterDirection(run.story.id, { kind: 'chapter-function', chapterFunction: 'progression', suggestion: 'Lin climbs the tower stairs.' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const suggested = run.planRequests.at(-1)!;
    expect(suggested.immediateChapterRequest.direction?.choice).toEqual({ kind: 'chapter-function', chapterFunction: 'progression', suggestion: 'Lin climbs the tower stairs.' });
    expect(suggested.storyInformation.rhythm).toBeUndefined();
    expect(buildChapterPlannerPrompt(suggested).userPrompt).toContain('The reader chose this path: Progression, with this idea: Lin climbs the tower stairs.');
    expect(run.controller.snapshot().chapters.at(-1)!.path).toMatchObject({ kind: 'chapter-function', chapterFunction: 'progression' });
    expect(run.requests.every(sent => sent.capaPrompt.skills.some(skill => skill.id === FATE_SKILL))).toBe(true);
  });

  it('records a miss and moves on while fewer than half of the arc\'s goals are missed', async () => {
    const run = await setup(SURVIVAL);
    const atDeadline = await run.jumpTo(3);
    run.next('Lin lets the wall fall and pulls the stranger from the current.');
    await directed(atDeadline, run.story.id, 'Lin abandons the flood wall to save a stranger.');
    const saved = atDeadline.snapshot().stories[0];
    expect(saved.head.nextChapterNumber).toBe(4);
    expect(saved.goalCompletions).toEqual([expect.objectContaining({ goalId: 'arc-1-flood', outcome: 'missed', chapterNumber: 3 })]);
    expect(saved.brokenRoute).toBeUndefined();
    expect(saved.conclusion).toBeUndefined();
    await directed(atDeadline, run.story.id, 'Lin follows the stranger to the lower stacks.');
    expect(run.planRequests.at(-1)!.storyInformation.arc).toMatchObject({ activeGoal: { id: 'arc-1-bridge' }, route: { status: 'off-track' } });
  });

  it('ends the story in the chapter that breaks the route when that chapter\'s plan already ends it', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(6, [{ goalId: 'arc-1-flood', outcome: 'missed' }]);
    run.next('The bridge gives way beneath her, and the river keeps Lin.', { ends: true });
    await directed(story, run.story.id, 'Lin crosses the broken bridge.');
    const saved = story.snapshot().stories[0];
    expect(saved.brokenRoute).toMatchObject({ chapterNumber: 6, reason: 'arc-goals-missed' });
    expect(saved.conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 6,
      evidence: 'The bridge gives way beneath her, and the river keeps Lin.' });
    await expect(story.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 6');
    expect(run.requests).toHaveLength(1);
  });

  it('breaks the route when half of an arc\'s goals are missed, and the next chapter ends the story when its plan ends it', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(6, [{ goalId: 'arc-1-flood', outcome: 'missed' }]);
    run.next('The bridge ropes snap and Lin watches them drift away.');
    await directed(story, run.story.id, 'Lin lets the bridge go to save the lantern.');
    // 2 of 4 missed: the route breaks. That alone ends nothing.
    const broken = story.snapshot().stories[0];
    expect(broken.brokenRoute).toEqual({ chapterNumber: 6, arcNumber: 1, reason: 'arc-goals-missed', goalsInArc: 4, recordedAt: expect.any(String),
      missedGoals: [expect.objectContaining({ goalId: 'arc-1-flood', chapterNumber: 3 }), expect.objectContaining({ goalId: 'arc-1-bridge', chapterNumber: 6 })] });
    expect(broken.conclusion).toBeUndefined();
    await expect(story.editArcGoals(run.story.id, plan)).rejects.toThrow('The route broke in Chapter 6');

    // The next chapter still waits on the reader's direction, and its context says the route is broken.
    await expect(story.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("choose Chapter 7's direction");
    // A goal a plan reaches after the route broke is never recorded: there is no goal left to reach.
    run.next('The flood takes the bridge, the lantern and Lin together, and the archive stays dark.', { reaches: true, ends: true });
    await directed(story, run.story.id, 'Lin goes back into the flood for the lantern.');
    const last = run.planRequests.at(-1)!;
    expect(last.storyInformation.arc?.route).toEqual({ status: 'broken', brokenInChapter: 6, reason: 'arc-goals-missed',
      missedGoals: [expect.objectContaining({ goalId: 'arc-1-flood' }), expect.objectContaining({ goalId: 'arc-1-bridge' })] });
    const prompt = buildChapterPlannerPrompt(last);
    expect(prompt.userPrompt).toContain('none: the route to the Destined Ending is broken, so this chapter must end the story');
    expect(prompt.userPrompt).not.toContain('completionDeadline');
    expect(prompt.systemInstruction).toContain('this chapter is the last: carry out the reader\'s direction and end the story in it');
    expect(prompt.systemInstruction).not.toMatch(/closing chapter|closingChapter|closing stretch/i);
    expect(latestAttempt(story).chapterPlan!.checks).toContainEqual({
      message: 'The plan says event 1 reaches the Active Arc Goal, but the route to the Destined Ending is broken, so no goal is left to reach; it was set aside.',
    });

    const saved = story.snapshot().stories[0];
    expect(saved.conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 7,
      evidence: 'The flood takes the bridge, the lantern and Lin together, and the archive stays dark.' });
    expect(saved.goalCompletions?.some(goal => goal.goalId === 'arc-1-tower')).toBe(false);
    expect(saved.nextChapterDirection).toBeUndefined();
    await expect(story.chooseChapterDirection(run.story.id, direct('One more chapter.'))).rejects.toThrow('Fate failed in Chapter 7');
    await expect(story.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 7');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('never locks the story on a missing ending: a plan that does not end it is never written, its direction stays, and a retry can end it', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(6, [{ goalId: 'arc-1-flood', outcome: 'missed' }]);
    await directed(story, run.story.id, 'Lin lets the bridge go.');
    const committed = story.snapshot().chapters.length;
    expect(run.requests).toHaveLength(1);

    // A plan with no ending fails before the writer is called: nothing is saved, and nothing is marked ended.
    run.plans.push(planOf('Lin climbs into the dark and keeps climbing.'));
    await directed(story, run.story.id, 'Lin climbs into the dark.');
    const missing = story.snapshot();
    expect(missing.attempts.at(-1)).toMatchObject({ stage: 'generation_failed', chapterNumber: 7,
      failure: { stage: 'response', message: 'The route to the Destined Ending broke in Chapter 6, so Chapter 7 must end the story, but its plan does not end it.' } });
    expect(run.requests).toHaveLength(1);
    expect(missing.chapters).toHaveLength(committed);
    expect(missing.stories[0].head.nextChapterNumber).toBe(7);
    expect(missing.stories[0].conclusion).toBeUndefined();
    expect(missing.stories[0].nextChapterDirection?.choice).toEqual(direct('Lin climbs into the dark.'));

    // The reader's retry plans again with the same direction, and a plan that ends the story is written and ends it.
    run.next('Lin lets go of the stair, and the dark water closes over the last light of the valley.', { ends: true });
    await story.retryModelRequest(missing.attempts.at(-1)!.id);
    expect(run.planRequests.at(-1)!.immediateChapterRequest.direction?.choice).toEqual(direct('Lin climbs into the dark.'));
    expect(run.requests).toHaveLength(2);
    const done = story.snapshot();
    expect(done.chapters).toHaveLength(committed + 1);
    expect(done.chapters.at(-1)!.path).toMatchObject({ kind: 'reader', text: 'Lin climbs into the dark.' });
    expect(done.stories[0].conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 7 });
    expect(done.stories[0].nextChapterDirection).toBeUndefined();
  });

  it('ends at once when its plan ends the story, even while the route holds', async () => {
    const run = await setup(SURVIVAL);
    run.next('The river closes over Lin, and the archive keeps its silence forever.', { ends: true });
    await directed(run.controller, run.story.id, 'Lin dives without a rope.');
    const saved = run.controller.snapshot().stories[0];
    expect(saved.brokenRoute).toBeUndefined();
    expect(saved.conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 1 });
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 1');
  });

  it('ends at the event that leaves the main character dead when the plan forgets to end the story', async () => {
    const run = await setup(SURVIVAL);
    const { storyEnds: _forgotten, ...plan } = planOf('The river closes over Lin.', { ends: true });
    run.plans.push(plan);
    run.outputs.push(chapter('The river closes over Lin.'));
    await directed(run.controller, run.story.id, 'Lin dives without a rope.');
    expect(latestAttempt(run.controller).chapterPlan?.checks.map(found => found.message))
      .toEqual(['Event 1: the main character is dead, which ends a Fate Survival story, but the plan did not say so; the story ends there.']);
    expect(run.controller.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 1 });
  });

  it('breaks the route on a missed final goal; the ending chapter passes the planned end without another arc, and claiming the goal is no ending', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(30, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    await directed(story, run.story.id, 'Lin turns back from the archive.');
    expect(story.snapshot().stories[0].brokenRoute).toMatchObject({ chapterNumber: 30, reason: 'final-goal-missed', missedGoals: [{ goalId: 'arc-1-ending' }] });
    expect(story.snapshot().stories[0].conclusion).toBeUndefined();
    // Chapter 31 lies past the one planned arc. A plan reaching the final goal there neither
    // reaches the Destined Ending nor is the ending the broken route requires.
    run.plans.push(planOf('The archive doors open to the valley at last.', { reaches: true }));
    await directed(story, run.story.id, 'Lin walks into the flood plain.');
    expect(run.planRequests.at(-1)!.storyInformation.arc).toMatchObject({ arcNumber: 1, route: { status: 'broken', reason: 'final-goal-missed' } });
    const refused = story.snapshot();
    expect(refused.attempts.at(-1)).toMatchObject({ stage: 'generation_failed', failure: { stage: 'response' } });
    expect(refused.stories[0].conclusion).toBeUndefined();
    expect(refused.stories[0].head.nextChapterNumber).toBe(31);
    expect(refused.stories[0].goalCompletions?.filter(goal => goal.goalId === 'arc-1-ending')).toEqual([expect.objectContaining({ outcome: 'missed' })]);

    // Even beside a genuine ending, reaching the final goal cannot turn the broken route into the Destined Ending.
    run.next('Lin walks into the flood plain and does not come back.', { reaches: true, ends: true });
    await story.generateNextChapter(run.story.id, 'fixture');
    const after = story.snapshot().stories[0];
    expect(after.conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 31 });
    expect(after.goalCompletions?.filter(goal => goal.goalId === 'arc-1-ending')).toEqual([expect.objectContaining({ outcome: 'missed' })]);
    expect(after.arcPlans).toHaveLength(1);
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('ends across an arc boundary without reviewing, locking or writing the next arc', async () => {
    const run = await setup(SURVIVAL, [plan, secondArc]);
    // Arc 1's last goal is not the final goal here: missing it makes 2 of 4.
    const story = await run.jumpTo(30, [{ goalId: 'arc-1-flood', outcome: 'missed' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    await directed(story, run.story.id, 'Lin leaves the archive sealed.');
    expect(story.snapshot().stories[0].brokenRoute).toMatchObject({ chapterNumber: 30, reason: 'arc-goals-missed' });
    // Arc 2 was never reviewed, yet the chapter that ends the story may lie in its range.
    run.next('Lin rows into the rain toward the valley, and no one sees her again.', { ends: true });
    await directed(story, run.story.id, 'Lin rows toward the valley.');
    expect(run.planRequests.at(-1)!.storyInformation.arc).toMatchObject({ arcNumber: 1, route: { status: 'broken' } });
    expect(run.planRequests.at(-1)!.storyInformation.arc?.activeGoal.id).not.toBe('arc-2-valley');
    expect(story.snapshot().stories[0].conclusion).toMatchObject({ reason: 'story-ended', chapterNumber: 31 });
    expect(story.snapshot().stories[0].arcGoalReviews?.map(review => review.arcNumber)).toEqual([1]);
    expect(createHarnessSenStory(story.snapshot(), run.story.id).arcs.map(arc => arc.title)).toEqual(['Arc 1']);
  });

  it('never plans a new arc for the ending chapter in a story without a roadmap', async () => {
    const run = await setup({ ...SURVIVAL, plannedArcCount: undefined, initialArcPlan: plan });
    const story = await run.jumpTo(30, [{ goalId: 'arc-1-flood', outcome: 'missed' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    await directed(story, run.story.id, 'Lin leaves the archive sealed.');
    expect(story.snapshot().stories[0].brokenRoute).toMatchObject({ chapterNumber: 30, reason: 'arc-goals-missed' });
    // Chapter 31 would begin Arc 2, which the Arc planner would normally create first.
    run.next('Lin rows into the rain toward the valley, and no one sees her again.', { ends: true });
    await directed(story, run.story.id, 'Lin rows toward the valley.');
    expect(run.planRequests.at(-1)!.storyInformation.arc).toMatchObject({ arcNumber: 1, route: { status: 'broken' } });
    expect(run.arcOperation).not.toHaveBeenCalled();
    expect(story.snapshot().stories[0].arcPlans).toHaveLength(1);
    expect(story.snapshot().attempts.flatMap(attempt => attempt.warnings.map(warning => warning.code))).not.toContain('arc_plan_pending');
  });

  it('reaches the Destined Ending when the final goal is achieved', async () => {
    const run = await setup(SURVIVAL);
    const atEnd = await run.jumpTo(30, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    run.next('The archive doors open to the valley at last.', { reaches: true });
    await directed(atEnd, run.story.id, 'Lin opens the doors.');
    expect(atEnd.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'destined-ending-reached', reason: 'final-goal-completed', chapterNumber: 30 });
  });
});
