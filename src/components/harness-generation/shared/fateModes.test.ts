import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, createHarnessSenStory, type HarnessArcRequest, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type StoryFoundationInput } from '@seihouse/sen/harness-generation';
import { arcGoalSegments, type ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

const ENDING = 'Lin reopens the drowned archive to the valley.';
/** One arc of four goals; the last is the final goal, the Destined Ending itself. */
const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-flood', text: 'Survive the first flood.', chapters: 10 },
  { id: 'arc-1-bridge', text: 'Rebuild the rope bridge.', chapters: 10 },
  { id: 'arc-1-tower', text: 'Climb the archive tower.', chapters: 10 },
  { id: 'arc-1-ending', text: 'Reopen the drowned archive to the valley.', chapters: 70 },
] };
/** A second arc, for a roadmap whose first arc ends before the final goal. */
const secondArc: ArcPlan = { arcNumber: 2, goals: [{ id: 'arc-2-valley', text: 'Carry the archive to the valley.', chapters: 100 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } };
const chapter = (text: string, extra: Record<string, unknown> = {}) => ({
  paragraphs: [text], recap: `Recap: ${text}`, chapterFunction: 'progression',
  nextProgression: 'Lin climbs the archive tower.', nextWorldBuilding: 'The flood reveals the old canals.', nextConflict: 'A river cult blocks the stair.',
  arcCompletion: { goalId: 'none', completed: false, evidence: '' }, ...extra,
});
const achieved = (goalId: string, text: string) => chapter(text, { arcCompletion: { goalId, completed: true, evidence: text } });
const ended = (text: string) => chapter(text, { storyEnded: { ended: true, evidence: text } });

const setup = async (overrides: Partial<StoryFoundationInput> = {}, roadmap: ArcPlan[] = [plan]) => {
  const requests: HarnessGenerationRequest[] = [];
  const outputs: Array<Record<string, unknown> | Error> = [];
  const arcOperation = vi.fn(async (_request: HarnessArcRequest) => ({ rawProviderResponse: '{}', providerReceipt: receipt }));
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: async request => {
      requests.push(structuredClone(request));
      const next = outputs.shift() ?? chapter('Lin waded on.');
      if (next instanceof Error) throw next;
      return { rawProviderResponse: JSON.stringify(next), providerReceipt: receipt };
    },
    arcOperation,
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'An archivist races the rising river.', destinedEnding: ENDING,
    arcRoadmap: roadmap, plannedArcCount: roadmap.length, fatePressure: 'heaven', ...overrides });
  /** Moves the story head to a later chapter with earlier goals already resolved at their deadlines. */
  const jumpTo = async (nextChapterNumber: number, resolved: Array<{ goalId: string; outcome?: 'missed' }> = []) => {
    const saved = controller.snapshot();
    saved.stories[0].head.nextChapterNumber = nextChapterNumber;
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
  return { controller, story, requests, outputs, arcOperation, jumpTo };
};

const SURVIVAL = { fateSurvival: { enabled: true } } as const;
const direct = (text: string) => ({ kind: 'reader' as const, text });
/** Fate Survival writes a chapter only with the reader's direction. */
const directed = async (controller: HarnessGenerationController, storyId: string, text: string) => {
  await controller.chooseChapterDirection(storyId, direct(text));
  await controller.generateNextChapter(storyId, 'fixture');
};
const warningCodes = (controller: HarnessGenerationController) => controller.snapshot().attempts.at(-1)!.warnings.map(warning => warning.code);

describe('Regular Reader mode', () => {
  it('continues automatically on Rhythm, takes one of the three ideas for one chapter, then returns to Rhythm', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    // Chapter 1: automatic. Rhythm travels in the packet; the request carries no reader direction.
    expect(run.requests[0].storyInformation.rhythm?.fatePressure).toBe('heaven');
    expect(run.requests[0].immediateChapterRequest.direction).toBeUndefined();
    expect(run.controller.snapshot().chapters[0].path).toMatchObject({ kind: 'automatic' });

    // The three ideas the writer returned are the choices; the reader takes World Building for Chapter 2.
    const ideas = run.controller.snapshot().chapters[0].rhythm!.nextChapterSuggestions!;
    await run.controller.chooseChapterDirection(run.story.id, { kind: 'chapter-function', chapterFunction: 'worldBuilding', suggestion: ideas.worldBuilding });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const chosen = run.requests[1];
    expect(chosen.storyInformation.rhythm).toBeUndefined();
    expect(chosen.immediateChapterRequest.direction?.choice).toEqual({ kind: 'chapter-function', chapterFunction: 'worldBuilding', suggestion: 'The flood reveals the old canals.' });
    expect(buildHarnessGenerationPrompt(chosen).userPrompt).toContain('CHAPTER PATH CHOSEN BY THE READER: World Building — The flood reveals the old canals.');

    // Consumed at commit: Chapter 3 is automatic again.
    const afterTwo = run.controller.snapshot();
    expect(afterTwo.stories[0].nextChapterDirection).toBeUndefined();
    expect(afterTwo.chapters[1].path).toMatchObject({ kind: 'chapter-function', chapterFunction: 'worldBuilding' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests[2].immediateChapterRequest.direction).toBeUndefined();
    expect(run.requests[2].storyInformation.rhythm).toBeDefined();
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
    const atDeadline = await run.jumpTo(10);
    // A claimed success without a passage from the chapter is not a success.
    run.outputs.push(chapter('Lin waited out the storm on the roof.', {
      arcCompletion: { goalId: 'arc-1-flood', completed: true, evidence: 'Lin held back the flood.' },
      storyEnded: { ended: true, evidence: 'Lin waited out the storm on the roof.' },
    }));
    await atDeadline.generateNextChapter(run.story.id, 'fixture');
    const saved = atDeadline.snapshot();
    expect(saved.stories[0].head.nextChapterNumber).toBe(11);
    expect(saved.stories[0].goalCompletions).toEqual([expect.objectContaining({ goalId: 'arc-1-flood', outcome: 'missed', chapterNumber: 10 })]);
    expect(warningCodes(atDeadline)).toEqual(expect.arrayContaining(['unconfirmed_arc_completion', 'ignored_story_ending']));
    expect(saved.stories[0].conclusion).toBeUndefined();
    expect(saved.stories[0].brokenRoute).toBeUndefined();

    // The next goal begins, and the writer is told the story is off track.
    await atDeadline.generateNextChapter(run.story.id, 'fixture');
    const next = run.requests.at(-1)!;
    expect(next.storyInformation.arc).toMatchObject({ activeGoal: { id: 'arc-1-bridge' },
      route: { status: 'off-track', missedGoals: [{ goalId: 'arc-1-flood', text: 'Survive the first flood.', chapterNumber: 10 }] } });
    const prompt = buildHarnessGenerationPrompt(next);
    expect(prompt.userPrompt).toContain('"status": "off-track"');
    expect(prompt.userPrompt).toContain('guaranteed as the story\'s standing direction');
    expect(prompt.systemInstruction).toContain('nothing forces the prose to reach it by a deadline');
    expect(prompt.systemInstruction).not.toContain('firm pacing requirement');
  });

  it('ends the story when the prose reaches the Destined Ending through the final goal', async () => {
    const run = await setup();
    const atFinal = await run.jumpTo(100, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    run.outputs.push(achieved('arc-1-ending', 'The archive doors opened to the valley at last.'));
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests.at(-1)!.storyInformation.arc).toMatchObject({ finalArc: true, finalGoal: true, route: { status: 'on-track' } });
    expect(atFinal.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'destined-ending-reached', reason: 'final-goal-completed', chapterNumber: 100 });
    await expect(atFinal.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('reached its Destined Ending');
    await expect(atFinal.chooseChapterDirection(run.story.id, direct('One more chapter.'))).rejects.toThrow('reached its Destined Ending');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('continues past a missed final goal toward the same Destined Ending, inventing no arc, until the prose reaches it', async () => {
    const run = await setup();
    const atFinal = await run.jumpTo(100, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge', outcome: 'missed' }, { goalId: 'arc-1-tower' }]);
    run.outputs.push(chapter('The archive stayed sealed as the river rose.'));
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    const missed = atFinal.snapshot().stories[0];
    // Recorded honestly: missed, not reached, and not a failure.
    expect(missed.goalCompletions?.at(-1)).toMatchObject({ goalId: 'arc-1-ending', outcome: 'missed', chapterNumber: 100 });
    expect(missed.conclusion).toBeUndefined();
    expect(missed.brokenRoute).toBeUndefined();

    // Chapter 101 is past the one planned arc: no roadmap gap, no new arc, the same destination.
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    const past = run.requests.at(-1)!;
    expect(past.immediateChapterRequest.chapterNumber).toBe(101);
    expect(past.storyInformation.arc).toMatchObject({ arcNumber: 1, finalGoal: true, activeGoal: { id: 'arc-1-ending' },
      route: { status: 'past-final-goal', finalGoalMissedInChapter: 100, missedGoals: [{ goalId: 'arc-1-bridge' }, { goalId: 'arc-1-ending' }] } });
    expect(past.storyInformation.rhythm).toBeDefined();
    const prompt = buildHarnessGenerationPrompt(past);
    expect(prompt.userPrompt).toContain('the final goal was missed; the story keeps pursuing the Destined Ending past its roadmap');
    expect(prompt.userPrompt).toContain(ENDING);
    expect(prompt.userPrompt).not.toContain('completionDeadline');
    expect(run.arcOperation).not.toHaveBeenCalled();
    expect(atFinal.snapshot().stories[0].arcPlans).toHaveLength(1);
    // The Reader keeps Chapter 101 in Arc 1: no Arc 2 appears.
    expect(createHarnessSenStory(atFinal.snapshot(), run.story.id).arcs.map(arc => [arc.title, arc.chapters.map(item => item.number)]))
      .toEqual([['Arc 1', [100, 101]]]);

    // When the prose reaches it, the story ends, and the final goal's miss stays on record.
    run.outputs.push(achieved('arc-1-ending', 'At last the archive doors opened to the valley.'));
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    const reached = atFinal.snapshot().stories[0];
    expect(reached.conclusion).toMatchObject({ outcome: 'destined-ending-reached', reason: 'reached-after-final-goal-missed', chapterNumber: 102,
      evidence: 'At last the archive doors opened to the valley.' });
    expect(reached.goalCompletions?.filter(goal => goal.goalId === 'arc-1-ending')).toEqual([expect.objectContaining({ outcome: 'missed', chapterNumber: 100 })]);
  });
});

describe('Fate Survival', () => {
  it('writes nothing until the reader directs the chapter, offers no generated paths, and sends no Rhythm', async () => {
    const run = await setup(SURVIVAL);
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("choose Chapter 1's direction");
    await expect(run.controller.chooseChapterDirection(run.story.id, { kind: 'chapter-function', chapterFunction: 'conflict' }))
      .rejects.toThrow('in your own words');
    await expect(run.controller.startBatch(run.story.id, 'fixture', 3)).rejects.toThrow('one reader-directed chapter at a time');
    await directed(run.controller, run.story.id, 'Lin swims for the archive tower.');
    const request = run.requests[0];
    expect(request.storyInformation.rhythm).toBeUndefined();
    expect(request.storyInformation.storyDirection.fateMode).toBe('survival');
    const prompt = buildHarnessGenerationPrompt(request);
    expect(prompt.userPrompt).toContain('the Destined Ending is not guaranteed');
    expect(prompt.userPrompt).toContain('READER DIRECTION FOR THIS CHAPTER: Lin swims for the archive tower.');
    expect(prompt.userPrompt).not.toContain('FATE PRESSURE RHYTHM DIRECTION');
    // The goal and the ending still reach the writer.
    expect(prompt.userPrompt).toContain(ENDING);
    expect(prompt.userPrompt).toContain('Survive the first flood.');
    // The next chapter needs a new direction.
    expect(run.controller.snapshot().stories[0].nextChapterDirection).toBeUndefined();
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("choose Chapter 2's direction");
  });

  it('records a miss and moves on while fewer than half of the arc\'s goals are missed', async () => {
    const run = await setup(SURVIVAL);
    const atDeadline = await run.jumpTo(10);
    run.outputs.push(chapter('Lin let the wall fall and pulled the stranger from the current.'));
    await directed(atDeadline, run.story.id, 'Lin abandons the flood wall to save a stranger.');
    const saved = atDeadline.snapshot().stories[0];
    expect(saved.head.nextChapterNumber).toBe(11);
    expect(saved.goalCompletions).toEqual([expect.objectContaining({ goalId: 'arc-1-flood', outcome: 'missed', chapterNumber: 10 })]);
    expect(saved.brokenRoute).toBeUndefined();
    expect(saved.conclusion).toBeUndefined();
    await directed(atDeadline, run.story.id, 'Lin follows the stranger to the lower stacks.');
    expect(run.requests.at(-1)!.storyInformation.arc).toMatchObject({ activeGoal: { id: 'arc-1-bridge' }, route: { status: 'off-track' } });
  });

  it('breaks the route when half of an arc\'s goals are missed, then closes within five reader-directed chapters', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(20, [{ goalId: 'arc-1-flood', outcome: 'missed' }]);
    run.outputs.push(chapter('The bridge ropes snapped and Lin watched them drift away.'));
    await directed(story, run.story.id, 'Lin lets the bridge go to save the lantern.');
    // 2 of 4 missed: the route breaks, but the story is not over yet.
    const broken = story.snapshot().stories[0];
    expect(broken.brokenRoute).toMatchObject({ chapterNumber: 20, arcNumber: 1, reason: 'arc-goals-missed', goalsInArc: 4, closingChapterLimit: 5,
      missedGoals: [{ goalId: 'arc-1-flood', chapterNumber: 10 }, { goalId: 'arc-1-bridge', chapterNumber: 20 }] });
    expect(broken.conclusion).toBeUndefined();
    await expect(story.editArcGoals(run.story.id, plan)).rejects.toThrow('The route broke in Chapter 20');

    // Each closing chapter still waits on the reader's direction, and carries the failed route to the writer.
    await expect(story.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("choose Chapter 21's direction");
    // A goal claimed after the route broke is not recorded: there is no goal left to reach.
    run.outputs.push(achieved('arc-1-tower', 'Lin reached the top of the archive tower.'));
    await directed(story, run.story.id, 'Lin climbs the tower anyway.');
    const closing = run.requests.at(-1)!;
    expect(closing.storyInformation.arc?.route).toEqual({ status: 'broken', brokenInChapter: 20, reason: 'arc-goals-missed', closingChapter: 1, closingChapterLimit: 5,
      missedGoals: [expect.objectContaining({ goalId: 'arc-1-flood' }), expect.objectContaining({ goalId: 'arc-1-bridge' })] });
    const prompt = buildHarnessGenerationPrompt(closing);
    expect(prompt.userPrompt).toContain('none: the route to the Destined Ending is broken, and the story is closing');
    expect(prompt.userPrompt).not.toContain('completionDeadline');
    expect(prompt.systemInstruction).toContain('Bring the story to its honest end as soon as the prose earns it');
    expect(story.snapshot().stories[0].goalCompletions?.some(goal => goal.goalId === 'arc-1-tower')).toBe(false);

    // Closing chapters 2 to 4 do not end it; the fifth is the last.
    for (const number of [22, 23, 24]) {
      await directed(story, run.story.id, `Lin keeps climbing in Chapter ${number}.`);
      expect(story.snapshot().stories[0].conclusion).toBeUndefined();
    }
    await directed(story, run.story.id, 'Lin sits down at the top of the tower.');
    expect(run.requests.at(-1)!.storyInformation.arc?.route).toMatchObject({ status: 'broken', closingChapter: 5 });
    expect(story.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'closing-limit-reached', chapterNumber: 25, evidence: '' });
    await expect(story.chooseChapterDirection(run.story.id, direct('One more chapter.'))).rejects.toThrow('Fate failed in Chapter 25');
    await expect(story.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 25');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('lets the writer end the story naturally within the closing stretch, with a verbatim passage', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(20, [{ goalId: 'arc-1-flood', outcome: 'missed' }]);
    await directed(story, run.story.id, 'Lin lets the bridge go.');
    // A reported ending without a passage from the chapter is set aside.
    run.outputs.push(chapter('Lin climbed into the dark.', { storyEnded: { ended: true, evidence: 'Lin was never seen again.' } }));
    await directed(story, run.story.id, 'Lin climbs into the dark.');
    expect(warningCodes(story)).toContain('ignored_story_ending');
    expect(story.snapshot().stories[0].conclusion).toBeUndefined();
    run.outputs.push(ended('The water took the last lantern, and Lin with it.'));
    await directed(story, run.story.id, 'Lin goes back for the lantern.');
    expect(story.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 22,
      evidence: 'The water took the last lantern, and Lin with it.' });
    await expect(story.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 22');
  });

  it('needs no closing chapters when the chapter that breaks the route already ends the story', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(20, [{ goalId: 'arc-1-flood', outcome: 'missed' }]);
    run.outputs.push(ended('The bridge gave way beneath her, and the river kept Lin.'));
    await directed(story, run.story.id, 'Lin crosses the broken bridge.');
    const saved = story.snapshot().stories[0];
    expect(saved.brokenRoute).toMatchObject({ chapterNumber: 20, reason: 'arc-goals-missed' });
    expect(saved.conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 20 });
    await expect(story.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 20');
  });

  it('ends at once in a fatal ending the writer shows, even while the route holds', async () => {
    const run = await setup(SURVIVAL);
    run.outputs.push(ended('The river closed over Lin, and the archive kept its silence forever.'));
    await directed(run.controller, run.story.id, 'Lin dives without a rope.');
    const saved = run.controller.snapshot().stories[0];
    expect(saved.brokenRoute).toBeUndefined();
    expect(saved.conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'story-ended', chapterNumber: 1 });
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 1');
  });

  it('breaks the route on a missed final goal, and closes past the planned end without beginning another arc', async () => {
    const run = await setup(SURVIVAL);
    const story = await run.jumpTo(100, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    await directed(story, run.story.id, 'Lin turns back from the archive.');
    expect(story.snapshot().stories[0].brokenRoute).toMatchObject({ chapterNumber: 100, reason: 'final-goal-missed', missedGoals: [{ goalId: 'arc-1-ending' }] });
    expect(story.snapshot().stories[0].conclusion).toBeUndefined();
    // Chapter 101 lies past the one planned arc; it closes the story instead. Claiming
    // the final goal there cannot turn the broken route back into the Destined Ending.
    run.outputs.push(achieved('arc-1-ending', 'The archive doors opened to the valley at last.'));
    await directed(story, run.story.id, 'Lin walks into the flood plain.');
    expect(run.requests.at(-1)!.storyInformation.arc).toMatchObject({ arcNumber: 1, route: { status: 'broken', reason: 'final-goal-missed', closingChapter: 1 } });
    const after = story.snapshot().stories[0];
    expect(after.conclusion).toBeUndefined();
    expect(after.goalCompletions?.filter(goal => goal.goalId === 'arc-1-ending')).toEqual([expect.objectContaining({ outcome: 'missed' })]);
    expect(after.head.nextChapterNumber).toBe(102);
    expect(after.arcPlans).toHaveLength(1);
    expect(run.arcOperation).not.toHaveBeenCalled();
  });

  it('closes across an arc boundary without reviewing, locking or writing the next arc', async () => {
    const run = await setup(SURVIVAL, [plan, secondArc]);
    // Arc 1's last goal is not the final goal here: missing it makes 2 of 4.
    const story = await run.jumpTo(100, [{ goalId: 'arc-1-flood', outcome: 'missed' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    await directed(story, run.story.id, 'Lin leaves the archive sealed.');
    expect(story.snapshot().stories[0].brokenRoute).toMatchObject({ chapterNumber: 100, reason: 'arc-goals-missed' });
    // Arc 2 was never reviewed, yet its range can hold closing chapters.
    await directed(story, run.story.id, 'Lin rows toward the valley.');
    expect(run.requests.at(-1)!.storyInformation.arc).toMatchObject({ arcNumber: 1, route: { status: 'broken', closingChapter: 1 } });
    expect(run.requests.at(-1)!.storyInformation.arc?.activeGoal.id).not.toBe('arc-2-valley');
    expect(story.snapshot().stories[0].arcGoalReviews?.map(review => review.arcNumber)).toEqual([1]);
    expect(createHarnessSenStory(story.snapshot(), run.story.id).arcs.map(arc => arc.title)).toEqual(['Arc 1']);
  });

  it('never plans a new arc for closing chapters in a story without a roadmap', async () => {
    const run = await setup({ ...SURVIVAL, arcRoadmap: undefined, plannedArcCount: undefined, initialArcPlan: plan });
    const story = await run.jumpTo(100, [{ goalId: 'arc-1-flood', outcome: 'missed' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    await directed(story, run.story.id, 'Lin leaves the archive sealed.');
    expect(story.snapshot().stories[0].brokenRoute).toMatchObject({ chapterNumber: 100, reason: 'arc-goals-missed' });
    // Chapter 101 would begin Arc 2, which the Arc planner would normally create first.
    await directed(story, run.story.id, 'Lin rows toward the valley.');
    expect(run.requests.at(-1)!.storyInformation.arc).toMatchObject({ arcNumber: 1, route: { status: 'broken', closingChapter: 1 } });
    expect(run.arcOperation).not.toHaveBeenCalled();
    expect(story.snapshot().stories[0].arcPlans).toHaveLength(1);
    expect(story.snapshot().attempts.flatMap(attempt => attempt.warnings.map(warning => warning.code))).not.toContain('arc_plan_pending');
  });

  it('reaches the Destined Ending when the final goal is achieved', async () => {
    const run = await setup(SURVIVAL);
    const atEnd = await run.jumpTo(100, [{ goalId: 'arc-1-flood' }, { goalId: 'arc-1-bridge' }, { goalId: 'arc-1-tower' }]);
    run.outputs.push(achieved('arc-1-ending', 'The archive doors opened to the valley at last.'));
    await directed(atEnd, run.story.id, 'Lin opens the doors.');
    expect(atEnd.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'destined-ending-reached', reason: 'final-goal-completed', chapterNumber: 100 });
  });
});
