import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, type HarnessArcRequest, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type StoryFoundationInput } from '@seihouse/sen/harness-generation';
import { type ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

const ENDING = 'Lin reopens the drowned archive to the valley.';
/** One arc: a ten-chapter opening goal, then the final goal, which is the Destined Ending itself. */
const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-flood', text: 'Survive the first flood.', chapters: 10 },
  { id: 'arc-1-ending', text: 'Reopen the drowned archive to the valley.', chapters: 90 },
] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } };
const chapter = (text: string, extra: Record<string, unknown> = {}) => ({
  paragraphs: [text], recap: `Recap: ${text}`, chapterFunction: 'progression',
  nextProgression: 'Lin climbs the archive tower.', nextWorldBuilding: 'The flood reveals the old canals.', nextConflict: 'A river cult blocks the stair.',
  arcCompletion: { goalId: 'none', completed: false, evidence: '' }, ...extra,
});

const setup = async (overrides: Partial<StoryFoundationInput> = {}) => {
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
    arcRoadmap: [plan], plannedArcCount: 1, fatePressure: 'heaven', ...overrides });
  /** Moves the story head to a later chapter, as the arc boundary tests do. */
  const jumpTo = async (nextChapterNumber: number, resolved: Array<{ goalId: string; outcome?: 'missed' }> = []) => {
    const saved = controller.snapshot();
    saved.stories[0].head.nextChapterNumber = nextChapterNumber;
    saved.stories[0].goalCompletions = resolved.map(goal => ({ arcNumber: 1, goalId: goal.goalId, goalText: plan.goals.find(item => item.id === goal.goalId)!.text,
      chapterNumber: 10, evidence: goal.outcome ? '' : 'evidence', ...(goal.outcome ? { outcome: goal.outcome } : {}) }));
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter });
    await reloaded.hydrate();
    return reloaded;
  };
  return { controller, story, requests, outputs, arcOperation, jumpTo };
};

const SURVIVAL = { fateSurvival: { enabled: true } } as const;
const direct = (text: string) => ({ kind: 'reader' as const, text });

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

  it('guarantees the Destined Ending: a goal deadline still blocks the chapter, and the final goal ends the story', async () => {
    const run = await setup();
    const atDeadline = await run.jumpTo(10);
    run.outputs.push(chapter('Lin waited out the storm.'));
    await atDeadline.generateNextChapter(run.story.id, 'fixture');
    expect(atDeadline.snapshot().attempts.at(-1)!.failure?.message).toContain('cannot commit until the model reports completion');
    expect(atDeadline.snapshot().stories[0].head.nextChapterNumber).toBe(10);

    const atFinal = await run.jumpTo(100, [{ goalId: 'arc-1-flood' }]);
    expect(run.requests.length).toBe(1);
    run.outputs.push(chapter('The archive doors opened to the valley at last.', {
      arcCompletion: { goalId: 'arc-1-ending', completed: true, evidence: 'The archive doors opened to the valley at last.' },
      // Regular Reader mode never accepts a failed fate.
      fateFailure: { failed: true, evidence: 'The archive doors opened to the valley at last.' },
    }));
    await atFinal.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests.at(-1)!.storyInformation.arc).toMatchObject({ finalArc: true, finalGoal: true });
    const ended = atFinal.snapshot();
    expect(ended.stories[0].conclusion).toMatchObject({ outcome: 'destined-ending-reached', reason: 'final-goal-completed', chapterNumber: 100 });
    expect(ended.attempts.at(-1)!.warnings.map(warning => warning.code)).toContain('ignored_fate_failure');
    await expect(atFinal.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('reached its Destined Ending');
    await expect(atFinal.chooseChapterDirection(run.story.id, direct('One more chapter.'))).rejects.toThrow('reached its Destined Ending');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });
});

describe('Fate Survival', () => {
  it('writes nothing until the reader directs the chapter, offers no generated paths, and sends no Rhythm', async () => {
    const run = await setup(SURVIVAL);
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow("choose Chapter 1's direction");
    await expect(run.controller.chooseChapterDirection(run.story.id, { kind: 'chapter-function', chapterFunction: 'conflict' }))
      .rejects.toThrow('in your own words');
    await expect(run.controller.startBatch(run.story.id, 'fixture', 3)).rejects.toThrow('one reader-directed chapter at a time');
    await run.controller.chooseChapterDirection(run.story.id, direct('Lin swims for the archive tower.'));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
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

  it('never forces success at a deadline: the unmet goal is missed, the chapter saves, and the next goal begins', async () => {
    const run = await setup(SURVIVAL);
    const atDeadline = await run.jumpTo(10);
    await atDeadline.chooseChapterDirection(run.story.id, direct('Lin abandons the flood wall to save a stranger.'));
    run.outputs.push(chapter('Lin let the wall fall and pulled the stranger from the current.'));
    await atDeadline.generateNextChapter(run.story.id, 'fixture');
    const saved = atDeadline.snapshot();
    expect(saved.stories[0].head.nextChapterNumber).toBe(11);
    expect(saved.stories[0].goalCompletions).toEqual([expect.objectContaining({ goalId: 'arc-1-flood', outcome: 'missed', chapterNumber: 10 })]);
    expect(saved.stories[0].conclusion).toBeUndefined();
    await atDeadline.chooseChapterDirection(run.story.id, direct('Lin follows the stranger to the lower stacks.'));
    await atDeadline.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests.at(-1)!.storyInformation.arc?.activeGoal.id).toBe('arc-1-ending');
  });

  it('ends in failure when the writer shows the ending became impossible, with a verbatim passage', async () => {
    const run = await setup(SURVIVAL);
    await run.controller.chooseChapterDirection(run.story.id, direct('Lin dives without a rope.'));
    // A report without a passage from the chapter is set aside.
    run.outputs.push(chapter('Lin dived into the black water.', { fateFailure: { failed: true, evidence: 'Lin drowned.' } }));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.controller.snapshot().stories[0].conclusion).toBeUndefined();
    expect(run.controller.snapshot().attempts.at(-1)!.warnings.map(warning => warning.code)).toContain('ignored_fate_failure');

    await run.controller.chooseChapterDirection(run.story.id, direct('Lin refuses to surface.'));
    run.outputs.push(chapter('The river closed over Lin, and the archive kept its silence forever.', {
      fateFailure: { failed: true, evidence: 'The river closed over Lin, and the archive kept its silence forever.' },
    }));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.controller.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'writer-reported-fate-failure', chapterNumber: 2 });
    await expect(run.controller.chooseChapterDirection(run.story.id, direct('Try again.'))).rejects.toThrow('Fate failed in Chapter 2');
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture')).rejects.toThrow('Fate failed in Chapter 2');
  });

  it('fails the Destined Ending when its final goal is missed, and reaches it when the final goal is achieved', async () => {
    const missed = await setup(SURVIVAL);
    const atFinal = await missed.jumpTo(100, [{ goalId: 'arc-1-flood', outcome: 'missed' }]);
    await atFinal.chooseChapterDirection(missed.story.id, direct('Lin turns back from the archive.'));
    await atFinal.generateNextChapter(missed.story.id, 'fixture');
    expect(atFinal.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'fate-failed', reason: 'final-goal-missed', chapterNumber: 100 });

    const reached = await setup(SURVIVAL);
    const atEnd = await reached.jumpTo(100, [{ goalId: 'arc-1-flood' }]);
    await atEnd.chooseChapterDirection(reached.story.id, direct('Lin opens the doors.'));
    reached.outputs.push(chapter('The archive doors opened to the valley at last.', {
      arcCompletion: { goalId: 'arc-1-ending', completed: true, evidence: 'The archive doors opened to the valley at last.' },
    }));
    await atEnd.generateNextChapter(reached.story.id, 'fixture');
    expect(atEnd.snapshot().stories[0].conclusion).toMatchObject({ outcome: 'destined-ending-reached', chapterNumber: 100 });
  });
});
