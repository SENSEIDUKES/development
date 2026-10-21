import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationResponse,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { planEveryChapter, plannedChapter, TEST_CHAPTER_PLAN } from '../../../test-utils/chapterPlan';

/**
 * The chapter being written belongs to the controller, not to a screen: every
 * surface sees the same write, a second one is refused, and a chapter a closed
 * browser interrupted is finished by the reader's next Write.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-06T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const answer = (): HarnessGenerationResponse => ({
  rawProviderResponse: writtenChapterReply(JSON.stringify({
    title: 'Low Tide', paragraphs: ['The tide pulled back from the drowned gate.'],
    recap: 'Mara returns.',
    nextProgression: 'Mara climbs.', nextWorldBuilding: 'The drowned law.', nextConflict: 'The wardens.',
  })),
  providerReceipt: receipt,
});

const setup = async (repository = new InMemoryHarnessGenerationRepository()) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  const planChapter = vi.fn<NonNullable<HarnessGenerationModelAdapter['planChapter']>>(planEveryChapter());
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate,
    planChapter,
    arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
  };
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  return { controller, generate, planChapter, repository };
};
const newStory = async (controller: HarnessGenerationController) => (await controller.createStory({
  premise: 'A courier returns to the drowned city that erased her name.', destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL,
})).id;

describe('The chapter being written', () => {
  it('is one write every surface sees, from its start until it ends, and a second write is refused', async () => {
    const { controller, generate } = await setup();
    const storyId = await newStory(controller);
    let release: (value: HarnessGenerationResponse) => void = () => undefined;
    generate.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
    const heard: Array<number | undefined> = [];
    controller.subscribe(() => heard.push(controller.chapterWrite(storyId)?.chapterNumber));

    const writing = controller.generateNextChapter(storyId, 'fixture');
    expect(controller.chapterWrite(storyId)).toMatchObject({ storyId, chapterNumber: 1, kind: 'next' });
    expect(controller.chapterWrite('another-story')).toBeUndefined();
    // Listeners hear of it at once, before the model answers.
    expect(heard.at(-1)).toBe(1);
    await expect(controller.generateNextChapter(storyId, 'fixture')).rejects.toThrow('A Harness chapter request is already running.');
    await expect(controller.writeNextChapter(storyId, 'fixture')).rejects.toThrow('A Harness chapter request is already running.');

    const { done } = controller.chapterWrite(storyId)!;
    release(answer());
    await writing;
    await done;
    expect(controller.chapterWrite(storyId)).toBeUndefined();
    expect(heard.at(-1)).toBeUndefined();
    expect(controller.snapshot().chapters).toHaveLength(1);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('a chapter the browser closed on while it was being planned is planned again by the next Write, and the story moves on', async () => {
    const first = await setup();
    const storyId = await newStory(first.controller);
    first.planChapter.mockReturnValueOnce(new Promise(() => undefined));
    void first.controller.generateNextChapter(storyId, 'fixture');
    await vi.waitFor(() => expect(first.planChapter).toHaveBeenCalled());
    expect(first.repository.snapshot().attempts[0].stage).toBe('request_started');

    // The browser closes; the story opens again.
    const reopened = await setup(first.repository);
    expect(reopened.controller.snapshot().attempts[0].stage).toBe('provider_outcome_unknown');
    reopened.generate.mockResolvedValueOnce(answer());
    const writing = reopened.controller.writeNextChapter(storyId, 'fixture');
    expect(reopened.controller.chapterWrite(storyId)).toMatchObject({ chapterNumber: 1, kind: 'next' });
    await writing;
    const state = reopened.controller.snapshot();
    expect(state.attempts.map(attempt => attempt.stage)).toEqual(['abandoned', 'committed']);
    expect(state.chapters.map(chapter => chapter.chapterNumber)).toEqual([1]);
    expect(reopened.planChapter).toHaveBeenCalledTimes(1);
    expect(reopened.generate).toHaveBeenCalledTimes(1);
  });

  it('a chapter the browser closed on while it was being written keeps its plan: the next Write calls only the writer', async () => {
    const first = await setup();
    const storyId = await newStory(first.controller);
    const plan = { ...TEST_CHAPTER_PLAN, events: [{ ...TEST_CHAPTER_PLAN.events[0], how: 'Mara swims for the drowned gate.' }] };
    first.planChapter.mockResolvedValueOnce(plannedChapter(plan));
    first.generate.mockReturnValueOnce(new Promise(() => undefined));
    void first.controller.generateNextChapter(storyId, 'fixture');
    await vi.waitFor(() => expect(first.generate).toHaveBeenCalled());
    const planned = first.repository.snapshot().attempts[0];
    expect(planned.stage).toBe('planned');
    expect(planned.plannerCall?.rawProviderResponse).toBe(JSON.stringify(plan));

    const reopened = await setup(first.repository);
    expect(reopened.controller.snapshot().attempts[0].stage).toBe('provider_outcome_unknown');
    reopened.generate.mockResolvedValueOnce(answer());
    await reopened.controller.writeNextChapter(storyId, 'fixture');
    const state = reopened.controller.snapshot();
    expect(state.attempts.map(attempt => attempt.stage)).toEqual(['abandoned', 'committed']);
    expect(reopened.planChapter).not.toHaveBeenCalled();
    expect(reopened.generate.mock.calls[0][0].chapterPlan.events[0].how).toBe('Mara swims for the drowned gate.');
    // The new attempt says whose plan it kept; the chapter is that plan's.
    expect(state.attempts[1].chapterPlan).toMatchObject({ reusedFrom: planned.id });
    expect(state.chapters[0].plan.events[0].how).toBe('Mara swims for the drowned gate.');
  });

  it('fails the chapter before the writer when the planner fails or returns no plan, and keeps the planner\'s reply', async () => {
    const { controller, generate, planChapter } = await setup();
    const storyId = await newStory(controller);
    planChapter.mockRejectedValueOnce(new Error('The provider is resting.'));
    await controller.generateNextChapter(storyId, 'fixture');
    expect(controller.snapshot().attempts[0]).toMatchObject({ stage: 'generation_failed', failure: { stage: 'provider', message: 'The planner could not plan Chapter 1: The provider is resting.' } });

    planChapter.mockResolvedValueOnce({ rawProviderResponse: 'The chapter opens at dawn.', providerReceipt: receipt });
    await controller.generateNextChapter(storyId, 'fixture');
    expect(controller.snapshot().attempts[1]).toMatchObject({
      stage: 'generation_failed', plannerCall: { rawProviderResponse: 'The chapter opens at dawn.' },
      failure: { stage: 'response', message: 'The planner\'s reply was not a plan the HARNESS could read. Chapter 1 was not written.' },
    });
    expect(generate).not.toHaveBeenCalled();
    expect(controller.snapshot().chapters).toEqual([]);
  });

  it('a chapter whose reply was saved is finished by the next Write without asking the model again', async () => {
    class FailFirstCommit extends InMemoryHarnessGenerationRepository {
      failed = false;
      override async save(state: Awaited<ReturnType<InMemoryHarnessGenerationRepository['load']>>) {
        if (!this.failed && state.chapters.length === 1) { this.failed = true; throw new Error('Simulated commit failure.'); }
        await super.save(state);
      }
    }
    const first = await setup(new FailFirstCommit());
    const storyId = await newStory(first.controller);
    first.generate.mockResolvedValueOnce(answer());
    await first.controller.generateNextChapter(storyId, 'fixture');
    expect(first.controller.snapshot().attempts[0]).toMatchObject({ stage: 'accepted_not_durable', recoveryStage: 'committed' });
    expect(first.controller.snapshot().chapters).toHaveLength(0);

    const reopened = await setup(first.repository);
    await reopened.controller.writeNextChapter(storyId, 'fixture');
    expect(reopened.controller.snapshot().chapters.map(chapter => chapter.chapterNumber)).toEqual([1]);
    expect(reopened.generate).not.toHaveBeenCalled();
    expect(reopened.controller.chapterWrite(storyId)).toBeUndefined();
  });
});
