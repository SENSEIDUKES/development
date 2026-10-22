import { seedLegacyChapterEvents } from '../../../test-utils/seedLegacyChapterEvents';
import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { buildCanonicalStoryView } from '@seihouse/sen/harness-generation';
import { createHarnessSenStory } from '@seihouse/sen/harness-generation';
import { resolveHarnessEntity } from '@seihouse/sen/harness-generation';
import { type HarnessGenerationModelAdapter, type HarnessGenerationResponse } from '@seihouse/sen/harness-generation';

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
/** The chapter as saved: the synthetic prose, then the rest of the written chapter. */
const reply = (body: unknown): HarnessGenerationResponse => ({
  rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'gemini', model: 'fixture',
    generatedAt: '2026-09-05T12:00:00Z', usage: { source: 'unavailable' } },
});
const setup = async () => {
  const repository = new InMemoryHarnessGenerationRepository();
  const generate = vi.fn(async () => reply(writtenChapter({ title: 'Synthetic memory fixture', prose })));
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate,
    arcOperation: async request => reply({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 30 }] }, destinedEnding: 'Bring the story to its true conclusion.' }),
  };
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A traveler meets a dungeon intelligence.', identities: [
    { kind: 'character', name: 'Aria', aliases: ['Dungeon Voice'], evidence: 'Aria is the dungeon intelligence.' },
    { kind: 'character', name: 'Xie Jin', evidence: 'Xie Jin is a traveler.' },
  ] });
  await controller.generateNextChapter(story.id, 'fixture');
  await seedLegacyChapterEvents(controller, repository, { events });
  return { repository, generate, modelAdapter, controller, story,
    chapter: controller.snapshot().chapters[0] };
};

describe('Useful, evidenced chapter memory', () => {
  it('commits without extraction or an incomplete-memory warning and keeps historical receipts untouched on reload', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const generate = vi.fn(async () => reply(writtenChapter({ prose })));
    const retiredCall = vi.fn(async () => { throw new Error('Retired memory call must never run'); });
    // A host object from an older version may still carry this method; the controller ignores it.
    const modelAdapter = { generate, recoverMemory: retiredCall,
      getServerInfo: async () => ({ provider: 'fixture', configured: true, models: [], defaultModel: 'fixture' }),
      arcOperation: async () => reply({ plan: { arcNumber: 1, goals: [{ id: 'goal', text: 'Repair the dungeon', chapters: 30 }] }, destinedEnding: 'The dungeon is repaired.' }),
    };
    const controller = new HarnessGenerationController({ repository, modelAdapter });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'Repair the dungeon.' });
    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    expect(state.attempts[0]).toMatchObject({ stage: 'committed', postCommitProcessing: 'complete' });
    expect(state.attempts[0].warnings.some(warning => warning.code === 'capability_unresolved')).toBe(false);
    expect(state.memoryRecoveries).toBeUndefined();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(retiredCall).not.toHaveBeenCalled();
    for (const status of ['request_started', 'raw_received', 'applied', 'failed'] as const) {
      const saved = structuredClone(state);
      saved.memoryRecoveries = [{ id: 'old-memory', storyId: story.id, chapterId: saved.chapters[0].id,
        request: { operation: 'recover-memory', storyId: story.id, chapterId: saved.chapters[0].id, model: 'fixture', prose: saved.chapters[0].prose, foundation: saved.foundations[0] },
        startedAt: '2026-09-05', status, rawProviderResponse: '{"events":[]}', eventIds: [],
      }];
      saved.attempts[0].warnings.push({ code: 'capability_unresolved', message: 'Prose is saved, but story memory is incomplete: historical warning.' });
      await repository.save(saved);
      const reloaded = new HarnessGenerationController({ repository, modelAdapter });
      await reloaded.hydrate();
      expect(reloaded.snapshot()).toEqual(saved);
      expect(await repository.load()).toEqual(saved);
      expect(retiredCall).not.toHaveBeenCalled();
    }
  });


  it('retires a previous fallback when replay now interprets the same event successfully', async () => {
    const { controller, repository, modelAdapter, story } = await setup();
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

  it('keeps a semantic canonical match as one record when replay assigns it a new generated id', async () => {
    const { controller, repository, modelAdapter, story } = await setup();
    const state = controller.snapshot();
    const source = state.canonicalRecords.find(record => record.sourceEventId)!;
    const receipt = state.capabilityReceipts.find(item => item.sourceEventId === source.sourceEventId)!;
    state.canonicalRecords = state.canonicalRecords.filter(record => record.id !== source.id);
    state.canonicalRecords.push({
      ...source,
      id: 'semantic-fallback',
      supersededAt: '2026-09-05T12:01:00Z',
      supersededByCorrectionId: 'hcorrection-1',
    });
    receipt.canonicalRecordIds = receipt.canonicalRecordIds.map(id => id === source.id ? 'semantic-fallback' : id);
    await repository.save(state);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter });
    await reloaded.hydrate();
    await reloaded.replayStory(story.id);

    const matching = reloaded.snapshot().canonicalRecords.filter(record =>
      record.storyId === source.storyId && record.sourceEventId === source.sourceEventId
      && record.capabilityId === source.capabilityId && record.kind === source.kind && record.label === source.label,
    );
    expect(matching.map(record => record.id)).toEqual(['semantic-fallback']);
    expect(reloaded.snapshot().capabilityReceipts.find(item => item.id === receipt.id)?.canonicalRecordIds)
      .toContain('semantic-fallback');
  });


  it('routes consequential memory and preserves Foundation identity across repeated mentions and aliases', async () => {
    const { controller, story, chapter } = await setup();
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


  it('keeps extracted memory out of the Reader instead of inventing a System Panel', async () => {
    const { controller, story } = await setup();
    const state = controller.snapshot();
    // Memory interpreted successfully: the records exist and are resolved.
    expect(buildCanonicalStoryView(state, story.id).records.length).toBeGreaterThan(0);
    // The chapter carried no System Panel signal, so the reader sees prose only.
    const chapter = createHarnessSenStory(state, story.id).arcs[0].chapters[0];
    expect(chapter.blocks?.some(block => block.system)).toBe(false);
    expect(chapter.blocks?.map(block => block.text).join('\n\n')).toBe(state.chapters[0].prose);
    expect(chapter.generatedContent).toBe(state.chapters[0].prose);
  });




});
