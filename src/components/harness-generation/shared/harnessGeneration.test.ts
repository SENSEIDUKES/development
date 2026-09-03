import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationWorkspace } from '../development/HarnessGenerationWorkspace';
import { compileHarnessContext } from './context';
import { HarnessGenerationController } from './controller';
import type { HarnessRuntime } from './ids';
import { InMemoryHarnessGenerationRepository } from './repository';
import type {
  HarnessGenerationModelAdapter,
  HarnessGenerationRequest,
  HarnessGenerationResponse,
} from './types';

const runtime = (): HarnessRuntime => {
  let id = 0;
  let time = 0;
  return {
    createId: prefix => `${prefix}_${++id}`,
    now: () => new Date(Date.UTC(2026, 7, 29, 12, 0, time++)).toISOString(),
  };
};

const response = (
  rawProviderResponse: string,
  usage: HarnessGenerationResponse['providerReceipt']['usage']['source'] = 'reported',
): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: {
    provider: 'gemini',
    model: 'google/gemini-3.1-flash-lite',
    generatedAt: '2026-08-29T12:00:00.000Z',
    durationMs: 42,
    usage: usage === 'unavailable'
      ? { source: 'unavailable' }
      : { source: usage, inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});

const adapter = (...outputs: Array<HarnessGenerationResponse | Error>) => {
  const generate = vi.fn(async (_request: HarnessGenerationRequest) => {
    const output = outputs.shift();
    if (!output) throw new Error('No test provider response remains.');
    if (output instanceof Error) throw output;
    return output;
  });
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({
      provider: 'gemini',
      configured: true,
      models: [{ id: 'google/gemini-3.1-flash-lite', label: 'Gemini' }],
      defaultModel: 'google/gemini-3.1-flash-lite',
    }),
    generate,
  };
  return { value, generate };
};

const createStory = async (
  controller: HarnessGenerationController,
  premise = 'A courier returns to the drowned city that erased her name.',
) => controller.createStory({ premise });

describe('Harness Generation Phase 2 novel core', () => {
  it('mounts the new workspace independently', () => {
    const markup = renderToStaticMarkup(createElement(HarnessGenerationWorkspace, {
      repository: new InMemoryHarnessGenerationRepository(),
      modelAdapter: adapter(response(JSON.stringify({ prose: 'Unused.' }))).value,
    }));
    expect(markup).toContain('Harness Generation');
    expect(markup).toContain('Deterministic story harness');
  });

  it('creates a premise-only Foundation and commits prose with harness-owned identity, ordering, and fallback title', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({
      id: 'model-story-id',
      chapterNumber: 999,
      prose: 'The tide came in beneath the locked city gate, carrying a bell with no clapper.',
    })));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const state = controller.snapshot();
    expect(state.foundations).toHaveLength(1);
    expect(state.chapters).toHaveLength(1);
    expect(state.chapters[0]).toMatchObject({
      storyId: story.id,
      chapterNumber: 1,
      title: 'Chapter 1',
      titleSource: 'harness-fallback',
      prose: expect.stringContaining('tide came in'),
    });
    expect(state.chapters[0].id).not.toBe('model-story-id');
    expect(state.stories[0].head.nextChapterNumber).toBe(2);
    expect(state.attempts[0].warnings.some(warning => warning.code === 'ignored_model_identity')).toBe(true);
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(provider.generate.mock.calls[0][0].foundation.input.premise).toContain('courier');
  });

  it('freezes an injected Story Seed snapshot inside the Harness-owned Foundation and generation context', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({ prose: 'The archive door opened beneath the tide.' })));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const sourceSnapshot = {
      kind: 'story-seed' as const,
      sourceId: 'seed-1',
      sourceUpdatedAt: '2026-09-03T12:00:00.000Z',
      schemaVersion: 3,
      seed: { story: { required: { premise: 'Original seed premise.' } } },
      blueprint: { title: 'The Drowned Archive' },
    };
    const story = await controller.createStory({ premise: 'Original seed premise.', sourceSnapshot });
    (sourceSnapshot.seed as { story: { required: { premise: string } } }).story.required.premise = 'Mutated outside the Harness.';

    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const request = provider.generate.mock.calls[0][0] as HarnessGenerationRequest;
    const frozenSeed = request.foundation.input.sourceSnapshot?.seed as { story: { required: { premise: string } } };
    expect(frozenSeed.story.required.premise).toBe('Original seed premise.');
    expect(request.context.foundationRevision.input.sourceSnapshot?.sourceId).toBe('seed-1');
  });

  it('preserves valid semantic events, including a description-only and unknown-category event', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({
      prose: 'Arin found the first dry stair beneath the flood line.',
      events: [
        { description: 'Arin finds a dry stair under the flood line.' },
        { description: 'The city bell changes its rhythm.', category: 'unfamiliar-signal', subjects: ['city bell'] },
      ],
    })));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const state = controller.snapshot();
    expect(state.events).toHaveLength(2);
    expect(state.events[0]).toMatchObject({
      capability: 'general-narrative-event',
      description: 'Arin finds a dry stair under the flood line.',
    });
    expect(state.events[1]).toMatchObject({ category: 'unfamiliar-signal', subjects: ['city bell'] });
  });

  it('keeps prose when malformed optional events are rejected', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({
      prose: 'The river lantern went dark just as Jun reached the quay.',
      events: [
        { description: 'Jun reaches the quay.', category: 'location' },
        { category: 'missing-description' },
        42,
      ],
    })));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const state = controller.snapshot();
    expect(state.chapters).toHaveLength(1);
    expect(state.events).toHaveLength(1);
    expect(state.attempts[0].rejectedEvents).toHaveLength(2);
    expect(state.attempts[0].warnings.some(warning => warning.code === 'optional_event_rejected')).toBe(true);
  });

  it('uses plain-prose recovery when invalid JSON still contains readable chapter prose', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response('The rain receded from the archive steps, exposing a door that had not been there at dusk.'));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const state = controller.snapshot();
    expect(state.chapters[0]).toMatchObject({ responseMode: 'plain-prose-recovery', title: 'Chapter 1' });
    expect(state.attempts[0].warnings.some(warning => warning.code === 'plain_prose_recovery')).toBe(true);
  });

  it('keeps a raw refusal as a failed attempt without changing committed story state', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({ prose: 'I cannot help with that request.' })));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    expect(controller.snapshot().chapters).toHaveLength(0);
    expect(controller.snapshot().stories[0].head.nextChapterNumber).toBe(1);
    expect(controller.snapshot().attempts[0]).toMatchObject({
      stage: 'generation_failed',
      rawProviderResponse: expect.stringContaining('cannot help'),
    });
  });

  it('commits prose through an optional event-preservation failure, then replays events without another provider call', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({
      prose: 'Mae left the lantern burning for the person who had not returned.',
      events: [{ description: 'Mae leaves a lantern burning.' }],
    })));
    const controller = new HarnessGenerationController({
      repository,
      modelAdapter: provider.value,
      runtime: runtime(),
      preserveEvents: () => { throw new Error('Simulated optional event stage failure.'); },
    });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    expect(controller.snapshot().attempts[0]).toMatchObject({
      stage: 'committed',
      rawProviderResponse: expect.stringContaining('lantern'),
      acceptedDraft: { prose: expect.stringContaining('lantern') },
    });
    expect(controller.snapshot().chapters).toHaveLength(1);
    expect(controller.snapshot().events).toHaveLength(0);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await reloaded.hydrate();
    expect(reloaded.snapshot().attempts[0].warnings.some(warning => warning.code === 'event_preservation_retry_required')).toBe(true);
    await reloaded.replayStory(story.id);
    expect(reloaded.snapshot().chapters).toHaveLength(1);
    expect(reloaded.snapshot().events).toHaveLength(1);
    expect(provider.generate).toHaveBeenCalledTimes(1);
  });

  it('retries an interrupted commit without another model call and never advances the head before persistence succeeds', async () => {
    class FailCommitRepository extends InMemoryHarnessGenerationRepository {
      failed = false;
      override async save(state: Awaited<ReturnType<InMemoryHarnessGenerationRepository['load']>>) {
        if (!this.failed && state.chapters.length === 1) {
          this.failed = true;
          throw new Error('Simulated final commit write failure.');
        }
        await super.save(state);
      }
    }
    const repository = new FailCommitRepository();
    const provider = adapter(response(JSON.stringify({ prose: 'Tarin kept the map dry beneath his coat.' })));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    expect(controller.snapshot().chapters).toHaveLength(0);
    expect(controller.snapshot().stories[0].head.nextChapterNumber).toBe(1);
    expect(controller.snapshot().attempts[0].stage).toBe('accepted_not_durable');

    await controller.retryAppropriateStage(controller.snapshot().attempts[0].id);
    expect(controller.snapshot().chapters).toHaveLength(1);
    expect(controller.snapshot().stories[0].head.nextChapterNumber).toBe(2);
    expect(provider.generate).toHaveBeenCalledTimes(1);
  });

  it('hydrates committed work and sends committed Chapter 1 prose and events into Chapter 2 context', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(
      response(JSON.stringify({
        title: 'A Door in the Floodwall',
        prose: 'Nera found the door behind the floodwall at first light.',
        events: [{ description: 'Nera discovers a sealed door behind the floodwall.', category: 'mystery' }],
      })),
      response(JSON.stringify({
        prose: 'The sealed door opened only when Nera spoke the name she had lost.',
      })),
    );
    const firstController = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await firstController.hydrate();
    const story = await createStory(firstController);
    await firstController.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await reloaded.hydrate();
    await reloaded.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const chapterTwoRequest = provider.generate.mock.calls[1][0] as HarnessGenerationRequest;
    expect(chapterTwoRequest.chapterNumber).toBe(2);
    expect(chapterTwoRequest.context.committedChapters).toHaveLength(1);
    expect(chapterTwoRequest.context.committedChapters[0]).toMatchObject({
      prose: expect.stringContaining('floodwall'),
      events: [expect.objectContaining({ description: expect.stringContaining('sealed door') })],
    });
    expect(reloaded.snapshot().chapters.map(chapter => chapter.chapterNumber)).toEqual([1, 2]);
  });

  it('marks an interrupted request as an unknown provider outcome and requires an explicit retry', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({ prose: 'The compass began pointing toward the sea.' })));
    const firstRuntime = runtime();
    const firstController = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: firstRuntime });
    await firstController.hydrate();
    const story = await createStory(firstController);
    const interruptedState = repository.snapshot();
    const foundation = interruptedState.foundations[0];
    const context = compileHarnessContext(interruptedState, interruptedState.stories[0], foundation, 'hga_interrupted', firstRuntime);
    interruptedState.attempts.push({
      id: 'hga_interrupted',
      storyId: story.id,
      foundationRevisionId: foundation.id,
      foundationSnapshot: foundation,
      contextSnapshot: context,
      model: 'google/gemini-3.1-flash-lite',
      chapterNumber: 1,
      stage: 'request_started',
      startedAt: firstRuntime.now(),
      warnings: [],
    });
    await repository.save(interruptedState);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await reloaded.hydrate();
    expect(reloaded.snapshot().attempts[0].stage).toBe('provider_outcome_unknown');
    expect(provider.generate).not.toHaveBeenCalled();

    await reloaded.retryModelRequest('hga_interrupted');
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(reloaded.snapshot().attempts[0].stage).toBe('abandoned');
    expect(reloaded.snapshot().chapters).toHaveLength(1);
  });

  it('keeps Chapter 1 committed when a later Chapter 2 provider attempt fails', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(
      response(JSON.stringify({ prose: 'Eli reached the lighthouse before the tide turned.' })),
      new Error('Provider unavailable.'),
    );
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    const state = controller.snapshot();
    expect(state.chapters).toHaveLength(1);
    expect(state.stories[0].head.nextChapterNumber).toBe(2);
    expect(state.attempts[1]).toMatchObject({ stage: 'generation_failed', chapterNumber: 2 });
  });

  it('preserves provider usage labels rather than claiming unavailable usage was reported', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response(JSON.stringify({ prose: 'The observatory woke beneath a blue eclipse.' }), 'unavailable'));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');
    expect(controller.snapshot().attempts[0].providerReceipt?.usage).toEqual({ source: 'unavailable' });
  });
});
