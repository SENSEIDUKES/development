import { describe, expect, it, vi } from 'vitest';
import { HarnessCapabilityRegistry, resolveHarnessEntity, type HarnessCapabilityHandler } from './capabilities';
import { appendHarnessCorrection, buildCanonicalStoryView } from './canonicalState';
import { compileHarnessContext } from './context';
import { HarnessGenerationController } from './controller';
import type { HarnessRuntime } from './ids';
import {
  createEmptyHarnessWorkspaceState,
  InMemoryHarnessGenerationRepository,
  migrateHarnessWorkspaceState,
} from './repository';
import type {
  HarnessGenerationModelAdapter,
  HarnessGenerationRequest,
  HarnessGenerationResponse,
  HarnessSemanticEvent,
  HarnessWorkspaceState,
} from './types';

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

const adapter = (...outputs: Array<HarnessGenerationResponse | Error>) => {
  const generate = vi.fn(async (_request: HarnessGenerationRequest) => {
    const next = outputs.shift();
    if (!next) throw new Error('No provider fixture remains.');
    if (next instanceof Error) throw next;
    return next;
  });
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'gemini-test', label: 'Gemini test' }], defaultModel: 'gemini-test' }),
    generate,
  };
  return { value, generate };
};

const semanticEvent = (overrides: Partial<HarnessSemanticEvent> = {}): HarnessSemanticEvent => ({
  id: 'hev_fixture', storyId: 'story_fixture', attemptId: 'attempt_fixture', chapterId: 'chapter_fixture', chapterNumber: 1,
  createdAt: '2026-08-29T12:00:00.000Z', description: 'A meaningful change occurs.', capability: 'general-narrative-event', ...overrides,
});

describe('Harness Generation Phase 3 deterministic story harness', () => {
  it('migrates Phase 2 state losslessly, including interrupted and accepted-not-durable attempts', () => {
    const legacy = {
      schemaVersion: 1,
      stories: [{ id: 'story', title: 'Preserved', createdAt: 'a', updatedAt: 'a', activeFoundationRevisionId: 'foundation', foundationRevisionIds: ['foundation'], head: { nextChapterNumber: 2, lastCommittedChapterId: 'chapter' } }],
      foundations: [{ id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Keep this premise.' } }],
      chapters: [{ id: 'chapter', storyId: 'story', attemptId: 'committed', foundationRevisionId: 'foundation', contextSnapshotId: 'context', chapterNumber: 1, title: 'One', titleSource: 'model', prose: 'Exact accepted prose.', eventIds: ['event'], responseMode: 'json', createdAt: 'a', committedAt: 'b' }],
      events: [{ ...semanticEvent(), id: 'event', storyId: 'story', attemptId: 'committed', chapterId: 'chapter' }],
      attempts: [
        { id: 'committed', storyId: 'story', foundationRevisionId: 'foundation', foundationSnapshot: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Keep this premise.' } }, contextSnapshot: { id: 'context', storyId: 'story', attemptId: 'committed', foundationRevision: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Keep this premise.' } }, storyHead: { nextChapterNumber: 1 }, chapterNumber: 1, createdAt: 'a', committedChapters: [] }, model: 'gemini-test', chapterNumber: 1, stage: 'committed', startedAt: 'a', rawProviderResponse: '{"prose":"Exact accepted prose."}', acceptedDraft: { prose: 'Exact accepted prose.', title: 'One', titleSource: 'model', responseMode: 'json' }, warnings: [] },
        { id: 'interrupted', storyId: 'story', foundationRevisionId: 'foundation', foundationSnapshot: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Keep this premise.' } }, contextSnapshot: { id: 'ctx2', storyId: 'story', attemptId: 'interrupted', foundationRevision: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Keep this premise.' } }, storyHead: { nextChapterNumber: 2 }, chapterNumber: 2, createdAt: 'a', committedChapters: [] }, model: 'gemini-test', chapterNumber: 2, stage: 'request_started', startedAt: 'a', warnings: [] },
        { id: 'not_durable', storyId: 'story', foundationRevisionId: 'foundation', foundationSnapshot: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Keep this premise.' } }, contextSnapshot: { id: 'ctx3', storyId: 'story', attemptId: 'not_durable', foundationRevision: { id: 'foundation', storyId: 'story', revision: 1, createdAt: 'a', input: { premise: 'Keep this premise.' } }, storyHead: { nextChapterNumber: 2 }, chapterNumber: 2, createdAt: 'a', committedChapters: [] }, model: 'gemini-test', chapterNumber: 2, stage: 'accepted_not_durable', startedAt: 'a', rawProviderResponse: 'raw', acceptedDraft: { prose: 'Accepted but not durable.', title: 'Two', titleSource: 'model', responseMode: 'json' }, recoveryStage: 'committed', warnings: [] },
      ],
    };
    const migrated = migrateHarnessWorkspaceState(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.chapters[0].prose).toBe('Exact accepted prose.');
    expect(migrated.attempts.map(attempt => attempt.stage)).toEqual(['committed', 'request_started', 'accepted_not_durable']);
    expect(migrated.attempts[2].acceptedDraft?.prose).toBe('Accepted but not durable.');
    expect(migrated.events[0].description).toBe('A meaningful change occurs.');
    expect(migrated.capabilityReceipts[0]).toMatchObject({ status: 'unresolved', capabilityVersion: 'phase-2-unprocessed' });
  });

  it('routes every capability family, supports multiple handlers, and preserves an unknown fallback', () => {
    const registry = new HarnessCapabilityRegistry();
    const state = createEmptyHarnessWorkspaceState();
    const fixtures: Array<[string, string[], string]> = [
      ['character', ['Mara'], 'Mara chooses to protect the harbor.'],
      ['relationship', ['Mara', 'Iven'], 'Mara and Iven renew their uneasy alliance.'],
      ['location', ['Ash Harbor'], 'Ash Harbor closes its sea gate.'],
      ['faction', ['Glass Parliament'], 'The Glass Parliament fractures into two camps.'],
      ['plot-thread', ['The missing fleet'], 'The missing fleet thread advances when a sail is sighted.'],
      ['clue', ['Black tide cipher'], 'A clue reveals one symbol in the black tide cipher.'],
      ['timeline', [], 'At dawn, the evacuation begins.'],
      ['artifact', ['Bell of Salt'], 'The Bell of Salt cracks during the storm.'],
      ['progression', ['Mara'], 'Mara learns to hear currents through stone.'],
    ];
    const capabilityIds = new Set<string>();
    fixtures.forEach(([category, subjects, description], index) => {
      const results = registry.processEvent({ state, event: semanticEvent({ id: `event_${index}`, category, subjects, description }), now: `t${index}` });
      results.forEach(result => capabilityIds.add(result.receipt.capabilityId));
    });
    expect(capabilityIds).toEqual(new Set(['characters', 'relationships', 'locations-world', 'factions', 'plot-threads', 'mysteries', 'timeline', 'artifacts', 'progression', 'general-narrative-event']));
    const relationship = registry.processEvent({ state, event: semanticEvent({ id: 'multi', category: 'relationship', subjects: ['Mara', 'Iven'] }), now: 't' });
    expect(relationship.map(result => result.receipt.capabilityId)).toEqual(['characters', 'relationships']);
    const unknown = registry.processEvent({ state, event: semanticEvent({ id: 'unknown', category: 'weather-omen' }), now: 't' });
    expect(unknown[0].receipt.capabilityId).toBe('general-narrative-event');
  });

  it('uses exact names and accepted aliases, but leaves ambiguous identities conflicted', () => {
    const base = createEmptyHarnessWorkspaceState();
    base.canonicalRecords.push(
      { id: 'mara_1', storyId: 'story_fixture', capabilityId: 'characters', capabilityVersion: '1', kind: 'character', evidence: 'Mara appears.', confidence: 'resolved', label: 'Mara', facts: {}, createdAt: 'a', warnings: [] },
      { id: 'mara_2', storyId: 'story_fixture', capabilityId: 'characters', capabilityVersion: '1', kind: 'character', evidence: 'Another Mara appears.', confidence: 'resolved', label: 'Mara', facts: {}, createdAt: 'b', warnings: [] },
      { id: 'iven', storyId: 'story_fixture', capabilityId: 'characters', capabilityVersion: '1', kind: 'character', evidence: 'Iven appears.', confidence: 'resolved', label: 'Iven', facts: {}, createdAt: 'c', warnings: [] },
    );
    expect(resolveHarnessEntity('Mara', base, 'story_fixture').resolution).toBe('conflicted');
    const corrected = appendHarnessCorrection(base, 'story_fixture', { kind: 'resolve-entity', reason: 'The author confirms the nickname.', referenceLabel: 'Captain', resolvedRecordId: 'iven', acceptedAlias: 'Captain' }, runtime());
    expect(resolveHarnessEntity('Captain', corrected.state, 'story_fixture')).toMatchObject({ resolution: 'alias', resolvedRecordId: 'iven' });
    expect(resolveHarnessEntity('the active speaker', corrected.state, 'story_fixture', [], ['iven'])).toMatchObject({ resolution: 'active-context', resolvedRecordId: 'iven' });
  });

  it('builds distinct relationship, thread, and mystery history without allowing uncommitted records into canonical state', () => {
    const state = createEmptyHarnessWorkspaceState();
    state.stories.push({ id: 'story_fixture', title: 'Story', createdAt: 'a', updatedAt: 'a', activeFoundationRevisionId: 'f', foundationRevisionIds: ['f'], head: { nextChapterNumber: 2 } });
    state.chapters.push({ id: 'chapter_fixture', storyId: 'story_fixture', attemptId: 'a', foundationRevisionId: 'f', contextSnapshotId: 'c', chapterNumber: 1, title: 'One', titleSource: 'model', prose: 'Prose.', eventIds: [], responseMode: 'json', createdAt: 'a', committedAt: 'b' });
    const registry = new HarnessCapabilityRegistry();
    const events = [
      semanticEvent({ id: 'rel1', category: 'relationship', subjects: ['Mara', 'Iven'], description: 'Mara distrusts Iven.' }),
      semanticEvent({ id: 'rel2', category: 'relationship', subjects: ['Mara', 'Iven'], description: 'Mara chooses to trust Iven.' }),
      semanticEvent({ id: 'thread', category: 'plot-thread', subjects: ['Missing fleet'], description: 'The missing fleet remains unresolved.' }),
      semanticEvent({ id: 'mystery', category: 'clue', subjects: ['Black tide'], description: 'A clue exposes the black tide symbol.' }),
    ];
    events.forEach(event => registry.processEvent({ state, event, now: event.id }).forEach(result => state.canonicalRecords.push(...result.records)));
    state.canonicalRecords.push({ id: 'uncommitted', storyId: 'story_fixture', chapterId: 'not_committed', sourceEventId: 'x', capabilityId: 'factions', capabilityVersion: '1', kind: 'faction', evidence: 'Not canon.', confidence: 'resolved', label: 'Ghost faction', facts: {}, createdAt: 'z', warnings: [] });
    const view = buildCanonicalStoryView(state, 'story_fixture');
    expect(view.relationships).toHaveLength(2);
    expect(view.threads[0].facts.state).toBe('open');
    expect(view.mysteries[0].facts.knowledgeState).toBe('clue');
    expect(view.records.some(record => record.id === 'uncommitted')).toBe(false);
  });

  it('commits broad semantic evidence, creates conservative projections, and replays idempotently', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response({
      prose: 'Mara crossed Ash Harbor as the Glass Parliament sealed the gates and the Bell of Salt cracked.',
      events: [
        { description: 'Mara arrives at Ash Harbor.', category: 'character, location', subjects: ['Mara'] },
        { description: 'Mara and Iven renew their alliance.', category: 'relationship', subjects: ['Mara', 'Iven'] },
        { description: 'The Glass Parliament fractures publicly.', category: 'faction, world-change', subjects: ['Glass Parliament'], significance: 'major' },
        { description: 'A clue points toward the missing fleet.', category: 'clue, plot-thread', subjects: ['Missing fleet'] },
        { description: 'The Bell of Salt cracks.', category: 'artifact', subjects: ['Bell of Salt'], requestedEffects: ['color-code', 'badge'] },
      ],
    }));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A harbor city bargains with an impossible tide.' });
    await controller.generateNextChapter(story.id, 'gemini-test');
    const first = controller.snapshot();
    expect(first.chapters).toHaveLength(1);
    expect(first.events).toHaveLength(5);
    expect(first.capabilityReceipts.some(receipt => receipt.capabilityId === 'relationships')).toBe(true);
    expect(first.capabilityReceipts.some(receipt => receipt.capabilityId === 'mysteries')).toBe(true);
    expect(first.capabilityReceipts.some(receipt => receipt.capabilityId === 'artifacts')).toBe(true);
    expect(first.projections.some(item => item.kind === 'world-notice' && item.status === 'ready')).toBe(true);
    expect(first.projections.some(item => item.kind === 'color-code' && item.status === 'unresolved')).toBe(true);
    expect(first.projections.some(item => item.kind === 'fate')).toBe(false);
    const counts = [first.capabilityReceipts.length, first.canonicalRecords.length, first.projections.length];
    await controller.replayStory(story.id);
    const replayed = controller.snapshot();
    expect([replayed.capabilityReceipts.length, replayed.canonicalRecords.length, replayed.projections.length]).toEqual(counts);
    expect(replayed.capabilityReceipts.some(receipt => receipt.replayCount === 1)).toBe(true);
  });

  it('keeps prose committed when the capability registry fails and allows later replay', async () => {
    class FailingRegistry extends HarnessCapabilityRegistry {
      override processEvent(): never { throw new Error('simulated capability failure'); }
    }
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response({ prose: 'The harbor bell rang once.', events: [{ description: 'The harbor bell rings.', category: 'timeline' }] }));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime(), capabilityRegistry: new FailingRegistry() });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A bell records the city’s forgotten days.' });
    await controller.generateNextChapter(story.id, 'gemini-test');
    expect(controller.snapshot().chapters[0].prose).toContain('harbor bell');
    expect(controller.snapshot().capabilityReceipts[0].status).toBe('failed');
    const reloaded = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await reloaded.hydrate();
    await reloaded.replayStory(story.id);
    expect(reloaded.snapshot().chapters).toHaveLength(1);
    expect(reloaded.snapshot().canonicalRecords.some(record => record.kind === 'timeline-event')).toBe(true);
    expect(provider.generate).toHaveBeenCalledTimes(1);
  });

  it('keeps canonical records when projection construction fails', () => {
    const registry = new HarnessCapabilityRegistry(undefined, () => { throw new Error('simulated projection failure'); });
    const results = registry.processEvent({
      state: createEmptyHarnessWorkspaceState(),
      event: semanticEvent({ category: 'artifact', subjects: ['Bell of Salt'], description: 'The Bell of Salt cracks.' }),
      now: 'now',
    });
    expect(results[0].records).toHaveLength(1);
    expect(results[0].projections).toHaveLength(0);
    expect(results[0].receipt.status).toBe('succeeded');
    expect(results[0].receipt.warnings[0]).toContain('Projection construction failed in isolation');
  });

  it('supersedes prior capability-version output during an idempotent upgrade replay', async () => {
    const handler = (version: string): HarnessCapabilityHandler => ({
      id: 'timeline', version,
      canHandle: event => event.category === 'timeline',
      process: ({ event, now }) => ({
        records: [{ id: `record_${version}_${event.id}`, storyId: event.storyId, chapterId: event.chapterId, sourceEventId: event.id, capabilityId: 'timeline', capabilityVersion: version, kind: 'timeline-event', evidence: event.description, confidence: 'resolved', facts: { description: event.description }, createdAt: now, warnings: [] }],
        projections: [], warnings: [], unresolvedReferences: [],
      }),
    });
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response({ prose: 'The evacuation begins at dawn.', events: [{ description: 'The evacuation begins at dawn.', category: 'timeline' }] }));
    const first = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime(), capabilityRegistry: new HarnessCapabilityRegistry([handler('1.0.0')]) });
    await first.hydrate();
    const story = await first.createStory({ premise: 'A city prepares to leave itself behind.' });
    await first.generateNextChapter(story.id, 'gemini-test');
    const upgraded = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime(), capabilityRegistry: new HarnessCapabilityRegistry([handler('2.0.0')]) });
    await upgraded.hydrate();
    await upgraded.replayStory(story.id);
    const state = upgraded.snapshot();
    expect(state.capabilityReceipts.find(receipt => receipt.capabilityVersion === '1.0.0')?.status).toBe('superseded');
    expect(state.capabilityReceipts.find(receipt => receipt.capabilityVersion === '2.0.0')?.status).toBe('succeeded');
    expect(state.canonicalRecords.find(record => record.capabilityVersion === '1.0.0')?.supersededAt).toBeTruthy();
    expect(buildCanonicalStoryView(state, story.id).timeline.map(record => record.capabilityVersion)).toEqual(['2.0.0']);
  });

  it('keeps corrections append-only and exposes auditable context inclusions and omissions', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(response({ prose: 'Mara enters the drowned archive.', events: [{ description: 'Mara enters the drowned archive.', category: 'character', subjects: ['Mara'] }] }));
    const controller = new HarnessGenerationController({ repository, modelAdapter: provider.value, runtime: runtime() });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'An archive remembers everyone except its keeper.' });
    await controller.generateNextChapter(story.id, 'gemini-test');
    const record = controller.snapshot().canonicalRecords.find(item => item.kind === 'character')!;
    await controller.addCorrection(story.id, { kind: 'correct-fact', reason: 'Author correction.', targetRecordIds: [record.id], replacement: { kind: 'character', label: 'Mara Vale', evidence: 'Her full canonical name is Mara Vale.', facts: { description: 'Mara is Mara Vale.' } } });
    const corrected = controller.snapshot();
    expect(corrected.corrections).toHaveLength(1);
    expect(corrected.canonicalRecords.find(item => item.id === record.id)?.supersededByCorrectionId).toBe(corrected.corrections[0].id);
    const foundation = corrected.foundations[0];
    const context = compileHarnessContext(corrected, corrected.stories[0], foundation, 'next', runtime());
    expect(context.canonicalContext?.corrections).toHaveLength(1);
    expect(context.selectionAudit?.included.some(item => item.sourceKind === 'correction')).toBe(true);
    expect(context.selectionAudit?.included.every(item => item.reason.length > 0)).toBe(true);
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
      if (call === 1) return response({ prose: 'First batch chapter.' });
      if (call === 2) return new Promise<HarnessGenerationResponse>(resolve => { resolveSecond = resolve; });
      throw new Error('Unexpected provider call.');
    });
    const modelAdapter: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'gemini-test', label: 'Gemini' }], defaultModel: 'gemini-test' }),
      generate,
    };
    const controller = new HarnessGenerationController({ repository, modelAdapter, runtime: runtime() });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A convoy follows the last star.' });
    const running = controller.startBatch(story.id, 'gemini-test', 3);
    for (let index = 0; index < 30 && generate.mock.calls.length < 2; index += 1) await Promise.resolve();
    const batchId = controller.snapshot().batches[0].id;
    await controller.requestBatchPause(batchId);
    resolveSecond(response({ prose: 'Second batch chapter finishes the active call.' }));
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
