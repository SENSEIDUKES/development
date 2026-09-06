import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from './controller';
import { InMemoryHarnessGenerationRepository } from './repository';
import { buildCanonicalStoryView } from './canonicalState';
import { resolveHarnessEntity } from './capabilities';
import type { HarnessGenerationModelAdapter, HarnessGenerationResponse, HarnessMemoryRecoveryRequest } from './types';

// Synthetic regression prose, not the user's saved Start Now chapter.
const prose = [
  'Aria was the resident intelligence of the Hollow Dungeon, not a human prisoner.',
  'The dungeon core was fractured and its eastern passage remained sealed.',
  'At the first bell, Aria warned: "The dungeon will collapse in six hours."',
  'Xie Jin chose to stay and repair the core rather than abandon Aria.',
  'Aria accepted Xie Jin as her ally.',
  'Xie Jin learned Core Listening by placing his hand on the stone.',
  'Finding a replacement core remained their unfinished task.',
].join('\n');
const events = [
  { description: 'Aria is the dungeon intelligence.', category: 'character', subjects: ['Aria'], evidence: prose.split('\n')[0] },
  { description: 'The core is fractured and the eastern passage is sealed.', category: 'location', subjects: ['Hollow Dungeon'], evidence: prose.split('\n')[1], facts: { state: 'fractured core; eastern passage sealed' } },
  { description: 'Collapse is due six hours after the first bell.', category: 'deadline', subjects: ['Dungeon collapse'], evidence: prose.split('\n')[2], facts: { deadline: 'six hours', anchor: 'first bell' } },
  { description: 'Xie Jin commits to repairing the core and staying with Aria.', category: 'decision', subjects: ['Xie Jin'], evidence: prose.split('\n')[3], facts: { decision: 'stay and repair the core' } },
  { description: 'Aria and Xie Jin become allies.', category: 'relationship', subjects: ['Aria', 'Xie Jin'], evidence: prose.split('\n')[4] },
  { description: 'Xie Jin learns Core Listening.', category: 'progression', subjects: ['Xie Jin'], evidence: prose.split('\n')[5], facts: { ability: 'Core Listening' } },
  { description: 'Find a replacement core.', category: 'plot-thread', subjects: ['Replace the core'], evidence: prose.split('\n')[6], facts: { state: 'open' } },
];
const reply = (body: unknown): HarnessGenerationResponse => ({
  rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'gemini', model: 'fixture',
    generatedAt: '2026-09-05T12:00:00Z', usage: { source: 'unavailable' } },
});
const setup = async (rich = false) => {
  const repository = new InMemoryHarnessGenerationRepository();
  const generate = vi.fn(async () => reply({ title: 'Synthetic memory fixture', prose,
    events: rich ? events : ['A stranger arrives.', 'Danger grows.', 'A choice is made.', 'The journey begins.'] }));
  const recoverMemory = vi.fn(async (_request: HarnessMemoryRecoveryRequest) => reply({ events }));
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate, recoverMemory,
  };
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A traveler meets a dungeon intelligence.', identities: [
    { kind: 'character', name: 'Aria', aliases: ['Dungeon Voice'], evidence: 'Aria is the dungeon intelligence.' },
    { kind: 'character', name: 'Xie Jin', evidence: 'Xie Jin is a traveler.' },
  ] });
  await controller.generateNextChapter(story.id, 'fixture');
  return { repository, generate, recoverMemory, modelAdapter, controller, story,
    chapter: controller.snapshot().chapters[0] };
};

describe('Useful, evidenced chapter memory', () => {
  it('retires a previous fallback when replay now interprets the same event successfully', async () => {
    const { controller, repository, modelAdapter, story } = await setup(true);
    const state = controller.snapshot();
    const source = state.canonicalRecords.find(record => record.sourceEventId)!;
    const receipt = state.capabilityReceipts.find(receipt => receipt.sourceEventId === source.sourceEventId)!;
    state.canonicalRecords.push({ ...source, id: 'old-fallback', kind: 'narrative-event', capabilityId: 'general-narrative-event', confidence: 'unresolved' });
    state.capabilityReceipts.push({ ...receipt, id: 'old-fallback-receipt', capabilityId: 'general-narrative-event', status: 'unresolved', canonicalRecordIds: ['old-fallback'], projectionIntentIds: [] });
    await repository.save(state);
    const reloaded = new HarnessGenerationController({ repository, modelAdapter });
    await reloaded.hydrate();
    await reloaded.replayStory(story.id);
    expect(reloaded.snapshot().capabilityReceipts.find(receipt => receipt.id === 'old-fallback-receipt')?.status).toBe('superseded');
    expect(buildCanonicalStoryView(reloaded.snapshot(), story.id).records.some(record => record.id === 'old-fallback')).toBe(false);
    expect(reloaded.snapshot().attempts[0].postCommitProcessing).toBe('complete');
  });

  it('reports partially malformed subject and fact fields instead of claiming complete interpretation', async () => {
    const { controller, recoverMemory, chapter } = await setup();
    recoverMemory.mockImplementationOnce(async () => reply({ memory: { characters: [{
      description: 'Aria is the dungeon intelligence.', evidence: prose.split('\n')[0],
      subjects: [{ name: 'Aria', kind: 'character' }, { name: 'invalid', kind: 'invented' }],
      facts: { identity: 'intelligence', invalid: 42 },
    }] } }));
    await controller.recoverChapterMemory(chapter.id, 'fixture');
    expect(controller.snapshot().attempts[0].postCommitProcessing).toBe('warnings');
    expect(controller.snapshot().memoryRecoveries![0].warnings).toHaveLength(2);
  });

  it('routes consequential memory and preserves Foundation identity across repeated mentions and aliases', async () => {
    const { controller, story, chapter } = await setup(true);
    const state = controller.snapshot();
    const view = buildCanonicalStoryView(state, story.id);
    const aria = view.characters.filter(record => record.label === 'Aria');
    expect(aria.length).toBeGreaterThan(1); // Foundation + event history, one identity.
    expect(new Set(aria.map(record => record.entityId)).size).toBe(1);
    expect(resolveHarnessEntity('Dungeon Voice', state, story.id).entityId).toBe(aria[0].entityId);
    expect(view.timeline[0].facts).toMatchObject({ deadline: 'six hours', anchor: 'first bell' });
    expect(view.locations[0].facts.state).toContain('eastern passage sealed');
    expect(view.characters.find(record => record.facts.decision)?.facts.decision).toContain('repair the core');
    expect(view.relationships[0].references?.every(reference => reference.entityId)).toBe(true);
    expect(view.progression[0].facts.ability).toBe('Core Listening');
    expect(view.threads[0].facts.state).toBe('open');
    expect(view.records.filter(record => record.chapterId === chapter.id).every(record => prose.includes(record.evidence))).toBe(true);
    expect(state.attempts[0].postCommitProcessing).toBe('complete');
    await controller.replayStory(story.id);
    expect(buildCanonicalStoryView(controller.snapshot(), story.id).relationships[0].confidence).toBe('resolved');
  });

  it('labels generic summaries as incomplete and recovers from persisted prose without another chapter call', async () => {
    const { controller, repository, modelAdapter, generate, recoverMemory, story, chapter } = await setup();
    expect(controller.snapshot().attempts[0]).toMatchObject({ stage: 'committed', postCommitProcessing: 'warnings' });
    const before = controller.snapshot();
    const reloaded = new HarnessGenerationController({ repository, modelAdapter });
    await reloaded.hydrate();
    await reloaded.recoverChapterMemory(chapter.id, 'fixture');
    const after = reloaded.snapshot();
    expect(recoverMemory.mock.calls[0][0].prose).toBe(prose);
    expect(after.chapters[0].prose).toBe(before.chapters[0].prose);
    expect(after.stories[0].head).toEqual(before.stories[0].head);
    expect(after.attempts[0].rawProviderResponse).toBe(before.attempts[0].rawProviderResponse);
    expect(after.events.slice(0, 4)).toEqual(before.events);
    expect(after.memoryRecoveries![0]).toMatchObject({ status: 'applied', rawProviderResponse: expect.any(String) });
    expect(buildCanonicalStoryView(after, story.id).timeline[0].facts.deadline).toBe('six hours');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(after.attempts[0].postCommitProcessing).toBe('complete');
    await reloaded.recoverChapterMemory(chapter.id, 'fixture');
    expect(reloaded.snapshot().events).toHaveLength(after.events.length);
    expect(reloaded.snapshot().chapters[0].prose).toBe(prose);
  });

  it('keeps unsupported evidence unresolved and prevents ready projections', async () => {
    const { controller, recoverMemory, chapter } = await setup();
    recoverMemory.mockImplementationOnce(async () => reply({ events: [{ ...events[1], evidence: 'The dungeon is perfectly safe.' }] }));
    await controller.recoverChapterMemory(chapter.id, 'fixture');
    const state = controller.snapshot();
    const record = state.canonicalRecords.find(record => record.kind === 'location-world')!;
    expect(record.confidence).toBe('unresolved');
    expect(state.projections.filter(item => item.sourceCanonicalRecordIds.includes(record.id)).every(item => item.status === 'unresolved')).toBe(true);
    expect(state.attempts[0].postCommitProcessing).toBe('warnings');
  });

  it('retries a saved raw extraction after a failed derived write without calling the model again', async () => {
    const { controller, repository, recoverMemory, chapter } = await setup();
    const save = repository.save.bind(repository);
    let writes = 0;
    vi.spyOn(repository, 'save').mockImplementation(async state => {
      writes += 1;
      if (writes === 3) throw new Error('Derived memory write failed.');
      await save(state);
    });
    await expect(controller.recoverChapterMemory(chapter.id, 'fixture')).rejects.toThrow('Derived memory write failed');
    expect(controller.snapshot().events).toHaveLength(4);
    expect(controller.snapshot().memoryRecoveries![0].status).toBe('raw_received');
    await controller.recoverChapterMemory(chapter.id, 'fixture');
    expect(recoverMemory).toHaveBeenCalledTimes(1);
    expect(controller.snapshot().chapters[0].prose).toBe(prose);
    expect(controller.snapshot().memoryRecoveries![0].status).toBe('applied');
  });

  it('preserves malformed recovery output and allows an explicit fresh extraction', async () => {
    const { controller, recoverMemory, chapter } = await setup();
    recoverMemory.mockImplementationOnce(async () => reply({ prose: 'Attempted rewrite.' }));
    await expect(controller.recoverChapterMemory(chapter.id, 'fixture')).rejects.toThrow('no event list');
    expect(controller.snapshot().memoryRecoveries![0]).toMatchObject({ status: 'failed', rawProviderResponse: expect.stringContaining('Attempted rewrite') });
    await controller.recoverChapterMemory(chapter.id, 'fixture');
    expect(controller.snapshot().chapters[0].prose).toBe(prose);
    expect(recoverMemory).toHaveBeenCalledTimes(2);
  });
});
