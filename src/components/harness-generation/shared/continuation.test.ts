import { describe, expect, it } from 'vitest';
import { HarnessGenerationController } from './controller';
import { HarnessCapabilityRegistry, resolveHarnessEntity, type HarnessCapabilityContext } from './capabilities';
import { InMemoryHarnessGenerationRepository } from './repository';
import { createHarnessSenStory } from './senAdapter';
import { compileHarnessContext } from './context';
import { preserveSemanticEvents } from './responseAcceptance';
import { buildHarnessMechanicalContinuity } from './mechanicalContinuity';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import type { HarnessGenerationModelAdapter, HarnessGenerationRequest } from './types';

describe('Steered continuation and SEN boundaries', () => {
  it('projects typed memory and keeps recovered mechanical details distinct from writer events', async () => {
    const prose = 'Mara has 16 sparks. Captain Iven says, "Stay together." Mara spends her sparks and has 0 sparks. The bell has 3 charges.';
    const measurement = (value: string) => ({ description: 'Mara checks her balance.', evidence: prose, facts: {},
      subjects: [{ name: 'Mara', kind: 'character' }], details: { mechanics: { subject: 'Mara', name: 'Sparks', value, unit: 'sparks' } } });
    let writes = 0;
    let request: HarnessGenerationRequest | undefined;
    const response = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body),
      providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });
    const modelAdapter: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
      generate: async input => {
        writes++; request = input;
        return response({ prose, memory: {
          characters: [{ description: 'Iven addresses Mara.', evidence: prose, facts: {}, subjects: [{ name: 'Iven', kind: 'character' }],
            details: { character: { name: 'Iven', role: 'Captain', relationshipToMC: 'Ally' }, speech: { speaker: 'Iven', quote: '"Stay together."' } } }],
          progression: [measurement('16')],
          artifacts: [{ description: 'The bell has 3 charges.', evidence: prose, facts: {}, subjects: [{ name: 'bell', kind: 'artifact' }],
            details: { mechanics: { subject: 'bell', name: 'Charges', value: '3', unit: 'charges' } } }],
        } });
      },
      recoverMemory: async () => response({ memory: { progression: [measurement('0')] } }),
    };
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'Mara and Iven evacuate the islands.',
      cast: [{ name: 'Mara', role: 'Courier', isMainCharacter: true }],
      identities: [{ name: 'Mara', kind: 'character', evidence: 'Mara is a courier.' },
        { name: 'Iven', aliases: ['Captain'], kind: 'character', evidence: 'Iven is the captain.' }],
    });
    await controller.generateNextChapter(story.id, 'fixture');
    const before = controller.snapshot();
    const schema = buildHarnessGenerationPrompt(request!).responseJsonSchema;
    expect(schema.properties.memory.properties.progression.items.properties.details.properties.mechanics.required).toContain('value');
    expect(createHarnessSenStory(before, story.id).memory?.characters).toHaveLength(2);
    await controller.recoverChapterMemory(before.chapters[0].id, 'fixture');
    await controller.replayStory(story.id);
    const repaired = controller.snapshot();
    expect(repaired.events.slice(0, before.events.length)).toEqual(before.events);
    expect(new Set(repaired.events.map(event => event.id)).size).toBe(repaired.events.length);
    expect(repaired.events).toHaveLength(before.events.length + 1);
    const sen = createHarnessSenStory(repaired, story.id);
    expect(sen.mcName).toBe('Mara');
    expect(sen.memory?.worldRules).toContain('Mara: Sparks: 0 sparks');
    expect(sen.memory?.worldRules).toContain('bell: Charges: 3 charges');
    expect(sen.arcs[0].chapters[0].blocks?.find(block => block.type === 'dialogue')?.metadata?.speakerRole).toBe('Captain');
    expect(sen.arcs[0].chapters[0].generatedContent).toBe(prose);
    expect(writes).toBe(1);
  });

  it('continues through Chapter 50 with multiple directions, reload, and an older enhancement repair', async () => {
    const requests: HarnessGenerationRequest[] = [];
    const repository = new InMemoryHarnessGenerationRepository();
    let fail = true;
    class Registry extends HarnessCapabilityRegistry {
      override processEvent(context: HarnessCapabilityContext) {
        if (fail && context.event.chapterNumber === 7) throw new Error('Enhancement failed');
        return super.processEvent(context);
      }
    }
    const provider: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
      generate: async request => {
        requests.push(request);
        const n = request.chapterNumber;
        const relationship = n === 1 ? 'Enemy' : 'Ally';
        return { rawProviderResponse: JSON.stringify({
          prose: `Mara meets Iven. Iven is her ${relationship}. "We remember the burned bridge." Iven speaks as captain. Mara has ${n} sparks.`,
          events: [
            { description: 'Mara is the protagonist.', category: 'character', subjects: ['Mara'], evidence: 'Mara meets Iven.', details: { character: { name: 'Mara', role: 'Protagonist', isMainCharacter: true } } },
            { description: `Iven is now an ${relationship}; the burned bridge still limits their escape.`, category: 'character,relationship', subjects: ['Iven', 'Mara'], evidence: `Iven is her ${relationship}.`,
              details: { character: { name: 'Iven', role: 'Captain', relationshipToMC: relationship }, speech: { speaker: 'Iven', quote: '"We remember the burned bridge."' } } },
            { description: `Mara has ${n} sparks.`, category: 'progression', subjects: ['Mara'], evidence: `Mara has ${n} sparks.`, details: { mechanics: { subject: 'Mara', name: 'Sparks', value: n, unit: 'sparks' } } },
          ],
        }), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: new Date().toISOString(), usage: { source: 'unavailable' } } };
      },
    };
    let controller = new HarnessGenerationController({ repository, modelAdapter: provider, capabilityRegistry: new Registry() });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'Mara crosses a burned bridge.', intendedDirection: 'Iven must become the final enemy.' });
    for (let n = 1; n <= 50; n++) {
      if (n === 2) await controller.steerStory(story.id, 'Make Iven an ally; preserve the consequences of the burned bridge.');
      if (n === 11) await controller.steerStory(story.id, 'Show mercy to captives; Iven remains an ally.');
      if (n === 21) await controller.steerStory(story.id, 'The bridge was destroyed by lightning, not by Iven.', 'revise-history');
      if (n === 36) await controller.steerStory(story.id, 'Let Iven lead the rescue while Mara negotiates.');
      await controller.generateNextChapter(story.id, 'fixture');
      if (n === 7) {
        expect(controller.snapshot().attempts.at(-1)?.postCommitProcessing).toBe('failed');
        expect(controller.snapshot().chapters).toHaveLength(7);
        expect(createHarnessSenStory(controller.snapshot(), story.id).memory?.worldRules?.[0]).toContain('awaits enhancement repair');
      }
      if (n === 12) {
        fail = false;
        const before = controller.snapshot();
        controller = new HarnessGenerationController({ repository, modelAdapter: provider, capabilityRegistry: new Registry() });
        await controller.hydrate();
        await controller.replayStory(story.id, before.chapters[6].id);
        expect(controller.snapshot().chapters).toEqual(before.chapters);
        expect(controller.snapshot().attempts[6].postCommitProcessing).toBe('complete');
        expect(requests).toHaveLength(12);
        expect(createHarnessSenStory(controller.snapshot(), story.id).memory?.worldRules).toContain('Mara: Sparks: 12 sparks');
      }
    }
    for (const request of requests) {
      if (request.chapterNumber > 1) expect(request.context.steering?.[0].direction).toContain('ally');
      if (request.chapterNumber > 10) expect(request.context.steering?.[1].direction).toContain('mercy');
      if (request.chapterNumber > 20) expect(request.context.steering?.[2].mode).toBe('revise-history');
    }
    const state = controller.snapshot();
    expect(state.chapters).toHaveLength(50);
    expect(requests[49].context.committedChapters.map(chapter => chapter.chapterNumber)).toEqual([47, 48, 49]);
    expect(requests[49].context.developments?.some(event => event.chapterNumber < 47)).toBe(true);
    expect(requests[7].context.developments?.some(event => event.chapterNumber === 7)).toBe(true);
    expect(requests[49].context.steering).toHaveLength(4);
    const prompt = buildHarnessGenerationPrompt(requests[49]);
    expect(prompt.systemInstruction).toContain('newest direction wins');
    expect(prompt.userPrompt).toContain('Make Iven an ally');
    const sen = createHarnessSenStory(state, story.id);
    expect(sen.id).toBe(story.id);
    expect(sen.mcName).toBe('Mara');
    expect(sen.memory?.characters).toHaveLength(2);
    expect(sen.memory?.characters?.find(character => character.name === 'Iven')).toMatchObject({ role: 'Captain', relationshipToMC: 'Ally' });
    expect(resolveHarnessEntity('Iven', state, story.id).resolution).toBe('exact');
    const chapter = sen.arcs[0].chapters[49];
    expect(chapter.blocks?.find(block => block.type === 'dialogue')?.metadata).toMatchObject({ speakerName: 'Iven', speakerRole: 'Captain', mode: 'dialogue' });
    expect(chapter.blocks?.filter(block => !block.system).map(block => block.text).join('')).toBe(state.chapters[49].prose);
    const system = chapter.blocks?.find(block => block.system && 'presentation' in block.system && block.system.presentation === 'mechanical')?.system;
    expect(system && 'status' in system ? system.status?.stats : undefined).toEqual([{ label: 'Sparks', value: '50 sparks' }]);
    expect(system?.rows).toEqual([{ label: 'Sparks', value: '50 sparks' }]);
    expect(sen.memory?.characters?.find(character => character.name === 'Mara')?.abilities).toEqual([
      expect.objectContaining({ name: 'Sparks', description: '50 sparks' }),
    ]);
    expect(createHarnessSenStory(state, story.id, 1).memory?.characters?.find(character => character.name === 'Iven')?.relationshipToMC).toBe('Enemy');
    expect(state.chapters[0].prose).toContain('Enemy');
    const currentStory = state.stories[0];
    const tiny = compileHarnessContext(state, { ...currentStory, contextPolicy: { recentChapterCount: 3, maxEstimatedTokens: 1, includeMinorEvents: false } }, state.foundations[0], 'tiny');
    expect(tiny.steering).toHaveLength(4);
    expect(tiny.selectionAudit?.omitted.some(item => item.sourceRecordIds.includes(currentStory.steering![0].id))).toBe(false);
  }, 60_000);

  it('keeps exact zero and negative mechanics but withholds unsupported details', () => {
    const result = preserveSemanticEvents([
      { description: 'Mara has zero sparks.', details: { mechanics: { subject: 'Mara', name: 'Sparks', value: 0 } } },
      { description: 'Mara owes a debt.', details: { mechanics: { subject: 'Mara', name: 'Debt', value: '-12.5' } } },
      { description: 'Bad extraction', details: { mechanics: { subject: 'Mara', name: 'Sparks', value: 2 }, speech: { speaker: 'Nobody', quote: 'Made up' } } },
    ], { storyId: 's', attemptId: 'a', chapterNumber: 1, createdAt: 'now', prose: 'Mara has 0 sparks and a balance of -12.5.' });
    expect(result.events.map(event => event.details?.mechanics?.value)).toEqual(['0', '-12.5', undefined]);
    expect(result.events[2].details).toBeUndefined();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(preserveSemanticEvents([{ description: 'Mara is out of sparks.', details: { mechanics: { subject: 'Mara', name: 'Sparks', value: '0' } } }],
      { storyId: 's', attemptId: 'z', chapterNumber: 2, createdAt: 'now', prose: 'Mara has zero sparks.' }).events[0].details?.mechanics?.value).toBe('0');
  });

  it('recovers provider details placed at the event root and keeps transfer evidence with an older balance', () => {
    const events = preserveSemanticEvents([
      { character: { name: 'Mara', role: 'Courier', isMainCharacter: true } },
      { mechanics: { subject: 'Mara', name: 'Sparks', value: '13', unit: 'sparks' } },
      { description: 'Mara gives all 13 sparks to Iven.' },
      { description: 'Iven spends the remaining sparks to rebuild the bridge.' },
    ], { storyId: 's', attemptId: 'a', chapterNumber: 1, createdAt: 'now', prose: 'Mara has 13 sparks.' }).events;
    expect(events).toHaveLength(4);
    expect(events[0].details?.character?.isMainCharacter).toBe(true);
    const history = buildHarnessMechanicalContinuity(events);
    expect(history[0].value).toBe('13');
    expect(history[0].subsequentDevelopments.map(event => event.description)).toEqual([
      'Mara gives all 13 sparks to Iven.', 'Iven spends the remaining sparks to rebuild the bridge.',
    ]);
  });

  it('repairs partially preserved events without rewriting prose or duplicating equal descriptions', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    let calls = 0;
    const modelAdapter: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
      generate: async () => {
        calls++;
        return { rawProviderResponse: JSON.stringify({ prose: 'Mara has 0 sparks. Iven has 13 sparks.', events: [
          { description: 'The transfer completes.', details: { mechanics: { subject: 'Mara', name: 'Sparks', value: '0' } } },
          { description: 'The transfer completes.', details: { mechanics: { subject: 'Iven', name: 'Sparks', value: '13' } } },
          { character: { name: 'Mara', role: 'Courier', isMainCharacter: true } },
        ] }), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' } } };
      },
    };
    const original = new HarnessGenerationController({ repository, modelAdapter, preserveEvents: (events, input, runtime) => preserveSemanticEvents(events.slice(0, 1), input, runtime) });
    await original.hydrate();
    const story = await original.createStory({ premise: 'Transfer the sparks.' });
    await original.generateNextChapter(story.id, 'fixture');
    const before = original.snapshot();
    expect(before.events).toHaveLength(1);
    const repaired = new HarnessGenerationController({ repository, modelAdapter });
    await repaired.hydrate();
    await repaired.replayStory(story.id, before.chapters[0].id);
    await repaired.replayStory(story.id, before.chapters[0].id);
    expect(repaired.snapshot().events).toHaveLength(3);
    expect(repaired.snapshot().events.slice(0, 2).map(event => event.details?.mechanics?.value)).toEqual(['0', '13']);
    expect(repaired.snapshot().chapters[0].prose).toBe(before.chapters[0].prose);
    expect(repaired.snapshot().chapters[0].id).toBe(before.chapters[0].id);
    expect(calls).toBe(1);
  });
});
