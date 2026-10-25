import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
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
      rawProviderResponse: JSON.stringify({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 30 }] }, destinedEnding: 'Bring the story to its true conclusion.' }),
      providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: runtime.now(), usage: { source: 'unavailable' } },
    }),
    generate: async () => ({ rawProviderResponse: JSON.stringify(writtenChapter({ prose })), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: runtime.now(), usage: { source: 'unavailable' } } }),

  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter, runtime });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'Mara and Iven cross the sea.',
    cast: [{ name: 'Mara', isMainCharacter: true }, { name: 'Iven', role: 'Captain' }] });
  return { controller, repository, story, runtime, modelAdapter, prose };
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

  it('omits blank cast fields and does not depend on locale-sensitive case folding', async () => {
    expect(normalizeStoryFoundationInput({ premise: 'A crossing.', cast: [{ name: ' Iven ', role: ' ', relationshipToMC: '\t' }] }).cast)
      .toEqual([{ name: 'Iven' }]);
    const locale = vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (this: string) { return this.toLowerCase().replaceAll('i', 'ı'); });
    try {
      const { controller, repository, story, prose } = await setup();
      await controller.generateNextChapter(story.id, 'fixture');
      const sen = createHarnessSenStory(controller.snapshot(), story.id);
      expect(sen.memory?.characters).toHaveLength(2);
      expect(sen.memory?.memoryWarnings).toEqual([]);
    } finally { locale.mockRestore(); }
  });
});
