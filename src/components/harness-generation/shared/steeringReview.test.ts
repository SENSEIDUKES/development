import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { createHarnessSenStory } from '@seihouse/sen/harness-generation';
import { compileStoryInformationPacket } from './context';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { appendHarnessCorrection } from './canonicalState';
import { normalizeStoryFoundationInput } from './foundation';
import { type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';

const setup = async () => {
  let tick = 0;
  const runtime = { now: () => new Date(Date.UTC(2026, 8, 6, 0, 0, tick++)).toISOString(), createId: (prefix: string) => `${prefix}-${tick++}` };
  const prose = 'Mara has 16 sparks. Iven says, "Stay together."';
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    arcOperation: async request => ({
      rawProviderResponse: JSON.stringify({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 100 }] }, destinedEnding: 'Bring the story to its true conclusion.' }),
      providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: runtime.now(), usage: { source: 'unavailable' } },
    }),
    generate: async () => ({ rawProviderResponse: JSON.stringify({ prose }), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: runtime.now(), usage: { source: 'unavailable' } } }),
    recoverMemory: async () => ({ rawProviderResponse: JSON.stringify({ events: [
      { description: 'Iven speaks while Mara checks her sparks.', category: 'character', subjects: ['Iven'], evidence: prose,
        details: { character: { name: 'Iven', role: 'Captain' }, speech: { speaker: 'Iven', quote: '"Stay together."' },
          mechanics: { subject: 'Mara', name: 'Sparks', value: '16', unit: 'sparks' } } },
    ] }), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: runtime.now(), usage: { source: 'unavailable' } } }),
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter, runtime });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'Mara and Iven cross the sea.',
    cast: [{ name: 'Mara', isMainCharacter: true }, { name: 'Iven', role: 'Captain' }] });
  return { controller, repository, story, runtime, modelAdapter };
};

describe('Chapter direction review regressions', () => {
  it('blocks direction changes at a saved checkpoint and after reload', async () => {
    const { controller, repository, story, modelAdapter } = await setup();
    const save = repository.save.bind(repository);
    vi.spyOn(repository, 'save').mockImplementation(async state => {
      if (state.attempts.at(-1)?.stage === 'prose_accepted') throw new Error('Disk unavailable');
      await save(state);
    });
    await controller.generateNextChapter(story.id, 'fixture');
    expect(controller.snapshot().attempts[0].stage).toBe('accepted_not_durable');
    await expect(controller.chooseChapterDirection(story.id, { kind: 'reader', text: 'Make Iven an ally' })).rejects.toThrow('checkpoint');
    const reloaded = new HarnessGenerationController({ repository, modelAdapter });
    await reloaded.hydrate();
    await expect(reloaded.chooseChapterDirection(story.id, { kind: 'reader', text: 'Make Iven an ally' })).rejects.toThrow('checkpoint');
    expect(reloaded.snapshot().stories[0].nextChapterDirection).toBeUndefined();
  });

  it('carries cast identity and the latest resource balance as current canonical state, without the prose', async () => {
    const { controller, story } = await setup();
    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    expect(state.canonicalRecords.filter(record => record.kind === 'character').map(record => record.label)).toContain('Mara');
    const context = compileStoryInformationPacket(state, state.stories[0], state.foundations[0], 'next');
    expect(context.canonicalState.characters.find(character => character.name === 'Iven')?.facts).toMatchObject({ role: 'Captain' });
    expect(context.canonicalState.resources).toEqual([expect.objectContaining({ owner: 'Mara', name: 'Sparks', value: '16', unit: 'sparks', asOfChapter: 1 })]);
    const prompt = buildHarnessGenerationPrompt({ storyId: story.id, attemptId: 'next', model: 'fixture',
      capaPrompt: state.attempts[0].capaPrompt, storyInformation: context, missionReminder: state.attempts[0].missionReminder,
      immediateChapterRequest: { chapterNumber: 2, continuation: true, chapterScale: { minWords: 1_800, maxWords: 2_500 } } });
    expect(prompt.userPrompt).toContain('CURRENT CANONICAL STATE');
    expect(prompt.userPrompt).toContain('Mara · Sparks: 16 sparks (as of Chapter 1)');
    // The speech quote is chapter evidence, not current state; it stays in storage.
    expect(prompt.userPrompt).not.toContain('"Stay together."');
  });

  it('does not let unchecked later quantities or spending alter SEN memory', async () => {
    const { controller, story } = await setup();
    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    state.events.push({ ...state.events[0], id: 'unsupported-quantity', description: 'Mara has 99 sparks.',
      evidence: 'Mara has 99 sparks.', evidenceVerified: undefined,
      details: { mechanics: { subject: 'Mara', name: 'Sparks', value: '99', unit: 'sparks' } } },
      { ...state.events[0], id: 'unsupported-spending', description: 'Mara spends all her sparks.',
        evidence: 'Mara spends all her sparks.', details: undefined, evidenceVerified: undefined });
    expect(createHarnessSenStory(state, story.id).memory?.worldRules).toEqual(['Mara: Sparks: 16 sparks']);
  });

  it('keeps earlier dialogue through later ambiguity and correction of its character', async () => {
    const { controller, story, runtime } = await setup();
    await controller.generateNextChapter(story.id, 'fixture');
    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    const original = state.canonicalRecords.find(record => record.label === 'Iven')!;
    const changed = appendHarnessCorrection(state, story.id, { kind: 'correct-fact', reason: 'Iven now commands the fleet.',
      targetRecordIds: [original.id], replacement: { kind: 'character', label: 'Iven', evidence: 'Iven is an Admiral.', facts: { role: 'Admiral' } } }, runtime).state;
    changed.canonicalRecords.push({ ...original, id: 'different-iven', entityId: 'other-person',
      chapterId: changed.chapters[1].id, facts: { role: 'Spy' } });
    const sen = createHarnessSenStory(changed, story.id);
    expect(sen.memory?.memoryWarnings).toContain('Ambiguous character identity: iven. Speech attribution is withheld.');
    expect(sen.arcs[0].chapters[0].blocks?.find(block => block.type === 'dialogue')?.metadata?.speakerRole).toBe('Captain');
    expect(createHarnessSenStory(changed, story.id, 1).memory?.characters?.find(character => character.name === 'Iven')?.role).toBe('Captain');
    expect(sen.arcs[0].chapters[0].blocks?.filter(block => !block.system).map(block => block.text).join('')).toBe(state.chapters[0].prose);
  });

  it('omits blank cast fields and does not depend on locale-sensitive case folding', async () => {
    expect(normalizeStoryFoundationInput({ premise: 'A crossing.', cast: [{ name: ' Iven ', role: ' ', relationshipToMC: '\t' }] }).cast)
      .toEqual([{ name: 'Iven' }]);
    const locale = vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (this: string) { return this.toLowerCase().replaceAll('i', 'ı'); });
    try {
      const { controller, story } = await setup();
      await controller.generateNextChapter(story.id, 'fixture');
      const sen = createHarnessSenStory(controller.snapshot(), story.id);
      expect(sen.memory?.characters).toHaveLength(2);
      expect(sen.memory?.memoryWarnings).toEqual([]);
    } finally { locale.mockRestore(); }
  });
});
