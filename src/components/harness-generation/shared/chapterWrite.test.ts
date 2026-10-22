import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationResponse,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';

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
    arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' },
    recap: 'Mara returns.', chapterFunction: 'progression',
    nextProgression: 'Mara climbs.', nextWorldBuilding: 'The drowned law.', nextConflict: 'The wardens.',
  })),
  providerReceipt: receipt,
});

const setup = async (repository = new InMemoryHarnessGenerationRepository()) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate,
    arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
  };
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  return { controller, generate, repository };
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

  it('a request the browser closed on is asked for again by the next Write, and the story moves on', async () => {
    const first = await setup();
    const storyId = await newStory(first.controller);
    first.generate.mockReturnValueOnce(new Promise(() => undefined));
    void first.controller.generateNextChapter(storyId, 'fixture');
    await vi.waitFor(() => expect(first.repository.snapshot().attempts[0]?.stage).toBe('request_started'));

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
    expect(reopened.generate).toHaveBeenCalledTimes(1);
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
