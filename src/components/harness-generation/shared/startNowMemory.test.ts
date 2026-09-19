import { describe, expect, it } from 'vitest';
import fixture from '../../../test-utils/fixtures/startNowMemory.json';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildCanonicalStoryView } from '@seihouse/sen/harness-generation';
import { compileStoryInformationPacket } from './context';
import { type HarnessGenerationResponse } from '@seihouse/sen/harness-generation';

const response = (value: unknown): HarnessGenerationResponse => ({
  rawProviderResponse: JSON.stringify(value), providerReceipt: { provider: 'captured-gemini', model: 'fixture',
    generatedAt: '2026-09-05T23:33:00Z', usage: { source: 'unavailable' } },
});

describe('Start Now captured prose and memory regression', () => {
  it('uses the grouped memory contract in the separate extraction call, with exact saved chapter evidence', async () => {
    for (const recover of [false, true]) {
      const repository = new InMemoryHarnessGenerationRepository();
      // The chapter call returns prose only. The first (automatic) extraction
      // returns either the captured grouped memory or the four original generic
      // summaries; an explicit recovery then reads the same saved prose again.
      let extractions = 0;
      const controller = new HarnessGenerationController({ repository, modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
        arcOperation: async request => response({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 100 }] }, destinedEnding: 'Bring the story to its true conclusion.' }),
        generate: async () => response({ prose: fixture.prose }),
        recoverMemory: async () => response(recover && extractions++ === 0 ? { events: fixture.originalEvents } : fixture.memoryReply),
      } });
      await controller.hydrate();
      const story = await controller.createStory({ premise: fixture.premise, characters: fixture.characters,
        identities: [
          { name: 'Xie Jin', aliases: ['Xie Jin (Protagonist)'], kind: 'character', evidence: 'Xie Jin (Protagonist)' },
          { name: 'Aria', kind: 'character', evidence: 'Aria (The AI Interface of the inherited System module)' },
        ],
      });
      await controller.generateNextChapter(story.id, 'fixture');
      if (recover) await controller.recoverChapterMemory(controller.snapshot().chapters[0].id, 'fixture');
      const saved = controller.snapshot();
      const view = buildCanonicalStoryView(saved, story.id);
      expect(saved.chapters[0].prose).toBe(fixture.prose);
      expect(saved.stories[0].head.nextChapterNumber).toBe(2);
      expect(view.characters.filter(record => record.label === 'Aria').every(record => record.confidence === 'resolved')).toBe(true);
      expect(new Set(view.characters.filter(record => record.label === 'Aria').map(record => record.entityId)).size).toBe(1);
      expect(new Set(view.characters.filter(record => record.label === 'Xie Jin').map(record => record.entityId)).size).toBe(1);
      expect(view.timeline.find(record => record.label === 'Facility Collapse')).toMatchObject({ confidence: 'resolved', facts: { timeLimit: 'forty-eight hours' } });
      expect(view.locations[0]).toMatchObject({ confidence: 'resolved', facts: { rank: 'F-Tier (Prototype)', difficulty: 'Brutal' } });
      expect(view.artifacts[0]).toMatchObject({ confidence: 'resolved', facts: { energyReserves: '0.04%' } });
      expect(view.characters.some(record => record.confidence === 'resolved' && record.label === 'Xie Jin' && record.evidence.includes('get him arrested'))).toBe(true);
      expect(view.threads.find(record => record.label === 'Facility Collapse')?.facts.state).toBe('open');
      // The captured model put a character in one thread's subject slot. Retain
      // that as a visible gap instead of claiming exhaustive understanding.
      expect(saved.attempts[0].postCommitProcessing).toBe('warnings');
      const context = compileStoryInformationPacket(saved, saved.stories[0], saved.foundations[0], 'next');
      expect(context.canonicalContext!.records.some(record => record.facts.timeLimit === 'forty-eight hours')).toBe(true);
      expect(context.committedChapters[0].events.some(event => event.evidenceVerified)).toBe(true);
      if (recover) expect(context.committedChapters[0].events.slice(0, 4).every(event => event.evidenceVerified === false)).toBe(true);
    }
  });
});
