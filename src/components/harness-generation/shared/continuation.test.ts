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
        if (n > 1) expect(request.context.steering?.[0].direction).toContain('ally');
        if (n > 10) expect(request.context.steering?.[1].direction).toContain('mercy');
        if (n > 20) expect(request.context.steering?.[2].mode).toBe('revise-history');
        const relationship = n === 1 ? 'Enemy' : 'Ally';
        return { rawProviderResponse: JSON.stringify({
          prose: `Mara meets Iven. Iven is her ${relationship}. "We remember the burned bridge." Iven speaks as captain. Mara has ${n} sparks.`,
          events: [
            { description: 'Mara is the protagonist.', category: 'character', subjects: ['Mara'], details: { character: { name: 'Mara', role: 'Protagonist', isMainCharacter: true } } },
            { description: `Iven is now an ${relationship}; the burned bridge still limits their escape.`, category: 'character,relationship', subjects: ['Iven', 'Mara'],
              details: { character: { name: 'Iven', role: 'Captain', relationshipToMC: relationship }, speech: { speaker: 'Iven', quote: '"We remember the burned bridge."' } } },
            { description: `Mara has ${n} sparks.`, category: 'progression', subjects: ['Mara'], details: { mechanics: { subject: 'Mara', name: 'Sparks', value: n, unit: 'sparks' } } },
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
    expect(result.events[2].details?.speech).toBeUndefined();
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
