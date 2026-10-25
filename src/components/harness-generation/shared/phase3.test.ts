import { describe, expect, it, vi } from 'vitest';
import { appendHarnessCorrection, buildCanonicalStoryView } from './canonicalState';
import { compileStoryInformationPacket } from './context';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import type { HarnessRuntime } from './ids';
import { createEmptyHarnessWorkspaceState, readHarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { asWrittenChapter, writtenChapter } from '../../../test-utils/writtenChapter';
import { HARNESS_GENERATION_SCHEMA_VERSION, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessGenerationResponse, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';

const runtime = (): HarnessRuntime => {
  let id = 0;
  let tick = 0;
  return {
    createId: prefix => `${prefix}_p3_${++id}`,
    now: () => `2026-08-29T12:00:${String(tick++).padStart(2, '0')}.000Z`,
  };
};

const response = (reply: unknown, source: 'reported' | 'estimated' | 'unavailable' = 'reported'): HarnessGenerationResponse => ({
  rawProviderResponse: typeof reply === 'string' ? reply : JSON.stringify(reply),
  providerReceipt: {
    provider: 'gemini', model: 'gemini-test', generatedAt: '2026-08-29T12:00:00.000Z', durationMs: 12,
    usage: source === 'unavailable' ? { source } : { source, inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});

/**
 * Chapter replies carry prose only. A fixture's `events` are served by the
 * historical stored event fixtures for the chapter whose prose they belong to.
 */
const adapter = (...outputs: Array<HarnessGenerationResponse | Error>) => {
  const memoryByProse = new Map<string, unknown[]>();
  const generate = vi.fn(async (_request: HarnessGenerationRequest) => {
    const next = outputs.shift();
    if (!next) throw new Error('No provider fixture remains.');
    if (next instanceof Error) throw next;
    try {
      const parsed = JSON.parse(next.rawProviderResponse) as { prose?: string; events?: unknown[] };
      if (parsed.events && parsed.prose) {
        const written = writtenChapter({ ...parsed, events: undefined });
        memoryByProse.set(written.prose!, parsed.events);
        return { ...next, rawProviderResponse: JSON.stringify(written) };
      }
    } catch { /* plain prose fixtures pass through */ }
    return asWrittenChapter(next);
  });
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'gemini-test', label: 'Gemini test' }], defaultModel: 'gemini-test' }),
    generate,
    arcOperation: async request => response({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 30 }] }, destinedEnding: 'Bring the story to its true conclusion.' }),
  };
  return { value, generate, memoryByProse };
};
describe('Harness Generation Phase 3 deterministic story harness', () => {
  it('resets storage at an old schema version to an empty workspace instead of migrating it', () => {
    // Shaped like a saved workspace from before the CAPA / Story Information
    // separation: an older schemaVersion, and attempts still keyed by the old
    // `contextSnapshot` field with no `capaPrompt` or `immediateChapterRequest`.
    // Schema 21: nothing before 22 upgrades (later versions do, step by step).
    const old = {
      schemaVersion: 21,
      stories: [{ id: 'story', title: 'Old', createdAt: 'a', updatedAt: 'a', activeFoundationRevisionId: 'foundation', foundationRevisionIds: ['foundation'], head: { nextChapterNumber: 2, lastCommittedChapterId: 'chapter' } }],
      foundations: [{ id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Old premise.' } }],
      chapters: [{ id: 'chapter', storyId: 'story', attemptId: 'committed', foundationRevisionId: 'foundation', contextSnapshotId: 'context', chapterNumber: 1, title: 'One', titleSource: 'model', prose: 'Old prose.', eventIds: ['event'], responseMode: 'json', createdAt: 'a', committedAt: 'b' }],
      events: [{ id: 'event', storyId: 'story', attemptId: 'committed', chapterId: 'chapter', chapterNumber: 1, createdAt: 'a', description: 'A meaningful change occurs.', capability: 'general-narrative-event' }],
      attempts: [
        { id: 'committed', storyId: 'story', foundationRevisionId: 'foundation', foundationSnapshot: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Old premise.' } }, contextSnapshot: { id: 'context', storyId: 'story', attemptId: 'committed', foundationRevision: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Old premise.' } }, storyHead: { nextChapterNumber: 1 }, chapterNumber: 1, createdAt: 'a', committedChapters: [] }, model: 'gemini-test', chapterNumber: 1, stage: 'committed', startedAt: 'a', rawProviderResponse: '{"prose":"Old prose."}', acceptedDraft: { prose: 'Old prose.', title: 'One', titleSource: 'model', responseMode: 'json' }, warnings: [] },
      ],
      capabilityReceipts: [], canonicalRecords: [], projections: [], corrections: [], batches: [],
    };
    const reset = readHarnessWorkspaceState(old);
    expect(reset).toEqual(createEmptyHarnessWorkspaceState());
    expect(reset.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);

    // A repository seeded with that same old-version snapshot starts clean; it
    // never migrates the saved story, chapter, or attempt into the new shape.
    const repository = new InMemoryHarnessGenerationRepository(old as unknown as HarnessWorkspaceState);
    expect(repository.snapshot()).toEqual(createEmptyHarnessWorkspaceState());
  });

  it('rejects a malformed value the same way, and leaves current-version storage untouched', () => {
    expect(readHarnessWorkspaceState(null)).toEqual(createEmptyHarnessWorkspaceState());
    expect(readHarnessWorkspaceState('not an object')).toEqual(createEmptyHarnessWorkspaceState());
    expect(readHarnessWorkspaceState({ schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION })).toEqual(createEmptyHarnessWorkspaceState());

    const current = createEmptyHarnessWorkspaceState();
    current.stories.push({ id: 'story', title: 'Kept', originalLanguage: 'en', createdAt: 'a', updatedAt: 'a', activeFoundationRevisionId: 'foundation', foundationRevisionIds: ['foundation'], head: { nextChapterNumber: 1 } });
    expect(readHarnessWorkspaceState(current)).toEqual(current);
  });

  it('keeps corrections append-only and exposes auditable context inclusions and omissions', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response({ prose: 'Mara enters the drowned archive.' }));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await controller.createStory({
      premise: 'An archive remembers everyone except its keeper.',
      identities: [{ name: 'Mara', kind: 'character', evidence: 'Mara keeps the drowned archive.' }],
    });
    const record = controller.snapshot().canonicalRecords.find(item => item.kind === 'character')!;
    await controller.addCorrection(story.id, { kind: 'correct-fact', reason: 'Author correction.', targetRecordIds: [record.id], replacement: { kind: 'character', label: 'Mara Vale', evidence: 'Her full canonical name is Mara Vale.', facts: { description: 'Mara is Mara Vale.' } } });
    const corrected = controller.snapshot();
    expect(corrected.corrections).toHaveLength(1);
    expect(corrected.canonicalRecords.find(item => item.id === record.id)?.supersededByCorrectionId).toBe(corrected.corrections[0].id);
    const foundation = corrected.foundations[0];
    const context = compileStoryInformationPacket(corrected, corrected.stories[0], foundation, 'next', runtime());
    // The correction travels compactly inside Current Story Information; its
    // evidence passage and the superseded record stay in storage.
    expect(context.currentStory.corrections).toEqual([expect.objectContaining({ kind: 'correct-fact', reason: 'Author correction.', targets: ['Mara'], replacement: { kind: 'character', label: 'Mara Vale', facts: { description: 'Mara is Mara Vale.' } } })]);
    expect(JSON.stringify(context)).not.toContain('Her full canonical name is Mara Vale.');
    expect(context.canonicalState.characters.map(character => character.name)).toEqual(['Mara Vale']);
    expect(context.diagnostics.omitted.every(item => item.reason.length > 0)).toBe(true);
  });

  it('reloads, retries, and resumes a failed sequential batch without duplicating committed chapters', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const firstProvider = adapter(response({ prose: 'Chapter one is durable.' }, 'reported'), new Error('provider pause'));
    const first = new HarnessGenerationController({ repository, modelAdapter: firstProvider.value, runtime: runtime() });
    await first.hydrate();
    const story = await first.createStory({ premise: 'A cartographer maps a road that moves at night.' });
    await first.startBatch(story.id, 'gemini-test', 2);
    expect(first.snapshot().chapters.map(chapter => chapter.chapterNumber)).toEqual([1]);
    expect(first.snapshot().batches[0]).toMatchObject({ status: 'failed', completedChapterIds: [first.snapshot().chapters[0].id] });

    const secondProvider = adapter(response({ prose: 'Chapter two follows the moving road.' }, 'estimated'));
    const reloaded = new HarnessGenerationController({ repository, modelAdapter: secondProvider.value, runtime: runtime() });
    await reloaded.hydrate();
    await reloaded.retryBatchChapter(reloaded.snapshot().batches[0].id);
    const final = reloaded.snapshot();
    expect(final.chapters.map(chapter => chapter.chapterNumber)).toEqual([1, 2]);
    expect(new Set(final.chapters.map(chapter => chapter.id)).size).toBe(2);
    expect(final.batches[0]).toMatchObject({ status: 'completed', usage: { reportedCalls: 1, estimatedCalls: 1, unavailableCalls: 0, totalTokens: 60 } });
  });

  it('honors a manual pause after the active provider call and resumes from the next uncommitted chapter', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    let resolveSecond!: (value: HarnessGenerationResponse) => void;
    let call = 0;
    const generate = vi.fn(async () => {
      call += 1;
      if (call === 1) return asWrittenChapter(response({ prose: 'First batch chapter.' }));
      if (call === 2) return new Promise<HarnessGenerationResponse>(resolve => { resolveSecond = resolve; });
      throw new Error('Unexpected provider call.');
    });
    const modelAdapter: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'gemini-test', label: 'Gemini' }], defaultModel: 'gemini-test' }),
      arcOperation: async request => response({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 30 }] }, destinedEnding: 'Bring the story to its true conclusion.' }),
      generate,
    };
    const controller = new HarnessGenerationController({ repository, modelAdapter, runtime: runtime() });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A convoy follows the last star.', destinedEnding: 'Bring the convoy safely home.', initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-convoy', text: 'Carry the convoy safely home.', chapters: 30 }] } });
    const running = controller.startBatch(story.id, 'gemini-test', 3);
    // Waits for the second provider call to start before pausing. The budget is
    // microtask turns, so every stage the write pipeline gains costs a few.
    for (let index = 0; index < 120 && generate.mock.calls.length < 2; index += 1) await Promise.resolve();
    const batchId = controller.snapshot().batches[0].id;
    await controller.requestBatchPause(batchId);
    resolveSecond(asWrittenChapter(response({ prose: 'Second batch chapter finishes the active call.' })));
    await running;
    expect(controller.snapshot().batches[0]).toMatchObject({ status: 'paused' });
    expect(controller.snapshot().chapters.map(chapter => chapter.chapterNumber)).toEqual([1, 2]);

    const resumed = new HarnessGenerationController({ repository, modelAdapter: adapter(response({ prose: 'Third batch chapter resumes safely.' })).value, runtime: runtime() });
    await resumed.hydrate();
    await resumed.resumeBatch(batchId);
    expect(resumed.snapshot().batches[0].status).toBe('completed');
    expect(resumed.snapshot().chapters.map(chapter => chapter.chapterNumber)).toEqual([1, 2, 3]);
  });
});
