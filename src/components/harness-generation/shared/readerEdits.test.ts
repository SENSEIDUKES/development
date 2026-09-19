import { describe, expect, it } from 'vitest';
import { HarnessGenerationController, createHarnessSenStory, createEmptyHarnessWorkspaceState, readHarnessWorkspaceState, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import type { StoryWorld, ReaderCodexStoryPatch } from '@seihouse/sen/contracts';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { createHarnessStory } from './foundation';
import { compileStoryInformationPacket } from './context';
import { applyHarnessReaderChanges, diffHarnessReaderPatch, semanticReaderChanges } from './readerEdits';

const fixture = () => createHarnessStory(createEmptyHarnessWorkspaceState(), {
  premise: 'A courier returns to a city at low tide.',
  identities: [{ kind: 'character', name: 'Mara', evidence: 'Mara is a courier.' }],
  initialArcPlan: { arcNumber: 1, goals: [{ id: 'gate', text: 'Open the gate.', chapters: 100 }] },
});
const noGeneration: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({ configured: false, provider: 'custom', models: [], defaultModel: '' }),
  generate: async () => { throw new Error('Generation deliberately omitted.'); },
};

describe('canonical Reader/Codex edit journal', () => {
  it('persists edits through HARNESS and recovers them without a parallel story store', async () => {
    const { state, story, foundation } = fixture();
    const repository = new InMemoryHarnessGenerationRepository(state);
    const controller = new HarnessGenerationController({ repository, modelAdapter: noGeneration });
    await controller.hydrate();
    await controller.updateReaderStory(story.id, 1, current => ({ memory: {
      ...current.memory!, characters: current.memory!.characters!.map(character => ({ ...character, description: 'The keeper of the gate.', imageUrl: 'https://publisher.example/art.png' })),
    } }));
    const reloaded = new HarnessGenerationController({ repository, modelAdapter: noGeneration });
    await reloaded.hydrate();
    const saved = reloaded.snapshot();
    expect(saved.corrections).toHaveLength(1);
    expect(saved.chapters).toEqual(state.chapters);
    expect(saved.foundations).toEqual(state.foundations);
    expect(createHarnessSenStory(saved, story.id).memory!.characters![0]).toMatchObject({ description: 'The keeper of the gate.', imageUrl: 'https://publisher.example/art.png' });
    const packet = JSON.stringify(compileStoryInformationPacket(saved, saved.stories[0], foundation, 'next'));
    expect(packet).toContain('The keeper of the gate.');
    expect(packet).not.toContain('publisher.example');
    expect(packet).not.toContain('imageUrl');
  });

  it('does not apply an edit when durable saving fails', async () => {
    const { state, story } = fixture();
    const repository = new InMemoryHarnessGenerationRepository(state);
    const controller = new HarnessGenerationController({ repository, modelAdapter: noGeneration });
    await controller.hydrate();
    const before = controller.snapshot();
    repository.failNextSave();
    await expect(controller.updateReaderStory(story.id, 1, { lastReadChapter: 1 })).rejects.toThrow('persistence failure');
    expect(controller.snapshot()).toEqual(before);
    expect(repository.snapshot()).toEqual(before);
    await controller.updateReaderStory(story.id, 1, { lastReadChapter: 1 });
    expect(createHarnessSenStory(controller.snapshot(), story.id).lastReadChapter).toBe(1);
  });

  it('addresses entity edits by identity and retains later generated entities', () => {
    const { state, story } = fixture();
    const before = createHarnessSenStory(state, story.id);
    const original = before.memory!.characters![0];
    const changes = diffHarnessReaderPatch(before, { memory: { ...before.memory!, characters: [{ ...original, description: 'Author correction.' }] } });
    const later: StoryWorld = { ...before, memory: { ...before.memory!, characters: [...before.memory!.characters!, { ...original, id: 'new', name: 'Neri' }] } };
    const edited = applyHarnessReaderChanges(later, changes);
    expect(edited.memory!.characters).toHaveLength(2);
    expect(edited.memory!.characters![0].description).toBe('Author correction.');
    expect(edited.memory!.characters![1].name).toBe('Neri');
    expect(later.memory!.characters![0].description).not.toBe('Author correction.');
  });

  it('rejects canonical replacement and unsafe property paths', () => {
    const { state, story } = fixture();
    const before = createHarnessSenStory(state, story.id);
    expect(() => diffHarnessReaderPatch(before, { title: 'Overwrite canon' } as ReaderCodexStoryPatch)).toThrow('canonical story field');
    expect(() => applyHarnessReaderChanges(before, [{ path: ['memory', '__proto__', 'polluted'], value: true }])).toThrow('Unsafe');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('keeps presentation-only state out of model context and resets stale DEV shapes', () => {
    expect(semanticReaderChanges([
      { path: ['readerPreferences'], value: { fontSize: 20 } },
      { path: ['memory', 'characters', { id: 'a' }, 'imageUrl'], value: 'secret-art' },
      { path: ['memory', 'characters', { id: 'a' }], value: { id: 'a', name: 'Mara', imageUrl: 'secret-art', voiceKey: 'voice' } },
    ])).toEqual([{ path: ['memory', 'characters', { id: 'a' }], value: { id: 'a', name: 'Mara' } }]);
    expect(readHarnessWorkspaceState({ ...fixture().state, schemaVersion: 12 }).stories).toEqual([]);
  });
});
