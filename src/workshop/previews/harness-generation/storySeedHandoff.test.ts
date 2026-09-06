import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '../../../components/harness-generation/shared/controller';
import { InMemoryHarnessGenerationRepository } from '../../../components/harness-generation/shared/repository';
import type { HarnessGenerationRequest, HarnessGenerationResponse } from '../../../components/harness-generation/shared/types';
import { handleHarnessGenerationHttp } from '../../../server/harness-generation/http';
import type { HarnessTextGenerationRequest } from '../../../server/harness-generation/provider';
import { createMockStorySeedRecord } from '../story-seed/previewData';
import { createHarnessFoundationFromStorySeed } from './storySeedHandoff';

describe('Story Seed to Harness handoff', () => {
  it('copies the saved seed and Blueprint into a complete independent Foundation snapshot', () => {
    const record = createMockStorySeedRecord();
    const originalPremise = record.seed.story.required.premise;
    const foundation = createHarnessFoundationFromStorySeed(record);

    expect(foundation).toMatchObject({
      title: 'Ashes of the Ninth Meridian',
      premise: originalPremise,
      genre: 'Xianxia',
      sourceSnapshot: {
        kind: 'story-seed',
        sourceId: record.id,
        sourceUpdatedAt: record.updatedAt,
        schemaVersion: record.schemaVersion,
      },
    });
    expect(foundation.toneStyle).toContain('Chinese');
    expect(foundation.toneStyle).toContain('Blueprint style bible');
    expect(foundation.characters).toContain('Ye Chen');
    expect(foundation.worldFacts).toContain('Heavenly Sword Sect');
    expect(foundation.intendedDirection).toContain('First arc promise');

    record.seed.story.required.premise = 'Changed after handoff.';
    const snapshotSeed = foundation.sourceSnapshot?.seed as typeof record.seed;
    expect(snapshotSeed.story.required.premise).toBe(originalPremise);
  });

  it('accepts a saved seed without a Blueprint', () => {
    const record = createMockStorySeedRecord({ blueprint: undefined });
    const foundation = createHarnessFoundationFromStorySeed(record);

    expect(foundation.premise).toBe(record.seed.story.required.premise);
    expect(foundation.sourceSnapshot?.blueprint).toBeUndefined();
  });

  it('keeps future promises separate and favors explicit Seed values over generated fallbacks', () => {
    const record = createMockStorySeedRecord();
    record.seed.world.optional.worldIdentity.startingLocation = 'Author opening';
    record.seed.world.optional.worldFoundations.destinedEnding = 'Author ending';
    record.blueprint!.startingLocation = 'Generated opening';
    record.blueprint!.destinedEnding = 'Generated ending';
    record.blueprint!.mainCharacter = { name: 'Mara', age: '20', personality: 'Quiet', appearance: 'Tall', backgroundProfile: 'Sailor' };
    record.blueprint!.mcProfile = 'Additional profile detail that must survive.';
    const foundation = createHarnessFoundationFromStorySeed(record);
    expect(foundation.openingSituation).toBe('Author opening');
    expect(foundation.intendedDirection).toContain('Author ending');
    expect(foundation.intendedDirection).not.toContain('Generated ending');
    expect(foundation.declaredCanon).not.toContain(record.blueprint!.logline);
    expect(foundation.declaredCanon).not.toContain(record.blueprint!.majorMysteries[0]);
    expect(foundation.intendedDirection).toContain(record.blueprint!.firstArcPromise);
    expect(foundation.intendedDirection).toContain('Estimated arcs');
    expect(foundation.characters).toContain('Additional profile detail');
  });

  it('carries the frozen source, latest revision, corrections, and continuation through reload and serialized HTTP to the provider', async () => {
    const record = createMockStorySeedRecord();
    record.seed.story.optional.makeItWorkInstruction = 'Keep the strange premise believable.';
    const input = createHarnessFoundationFromStorySeed(record);
    const repository = new InMemoryHarnessGenerationRepository();
    const response: HarnessGenerationResponse = {
      rawProviderResponse: JSON.stringify({ prose: 'Mara waits at the sealed harbor gate.',
        events: [{ description: 'Mara has blue eyes.', category: 'character', subjects: ['Mara'] }] }),
      providerReceipt: { provider: 'gemini', model: 'google/gemini-3.1-flash-lite',
        generatedAt: '2026-09-05T12:00:00.000Z', usage: { source: 'unavailable' } },
    };
    const provider = vi.fn(async (_prompt: HarnessTextGenerationRequest) => response);
    const requests: HarnessGenerationRequest[] = [];
    const adapter = {
      getServerInfo: async () => ({ provider: 'gemini' as const, configured: true, models: [], defaultModel: 'google/gemini-3.1-flash-lite' }),
      generate: async (request: HarnessGenerationRequest) => {
        requests.push(structuredClone(request));
        const result = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify(request) }, {
          environment: { GEMINI_API_KEY: 'fixture' },
          providerFactory: () => ({ provider: 'gemini', model: request.model, generate: provider }),
        });
        expect(result.status).toBe(200);
        return result.body as HarnessGenerationResponse;
      },
    };
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter });
    await controller.hydrate();
    const story = await controller.createStory(input);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');
    const target = controller.snapshot().canonicalRecords.find(item => item.kind === 'character')!;
    await controller.addCorrection(story.id, { kind: 'correct-fact', targetRecordIds: [target.id],
      reason: 'Use the author eye color from now on.', replacement: {
        kind: 'character', label: 'Mara', evidence: 'Mara has green eyes.', facts: { eyeColor: 'green' },
      } });
    await controller.saveFoundationRevision(story.id, { ...input, permanentInstructions: 'Remain at the gate; do not finish the tournament arc yet.' });
    record.seed.story.required.premise = 'A later Seed edit must not leak into this story.';
    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter });
    await reloaded.hydrate();
    await reloaded.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');

    expect(requests[1].foundation.revision).toBe(2);
    expect(requests[1].foundation.input.sourceSnapshot).toEqual(input.sourceSnapshot);
    expect(requests[1].context.foundationRevision).toEqual(requests[1].foundation);
    expect(requests[1].context.committedChapters[0].prose).toBe('Mara waits at the sealed harbor gate.');
    const { userPrompt, systemInstruction } = provider.mock.calls[1][0];
    expect(userPrompt).toContain('Remain at the gate; do not finish the tournament arc yet.');
    expect(userPrompt).toContain('Keep the strange premise believable.');
    expect(userPrompt).not.toContain('A later Seed edit must not leak');
    expect(userPrompt).toContain('Mara has green eyes.');
    expect(userPrompt).toContain('targetEvidence');
    expect(userPrompt).toContain('futurePlans');
    expect(userPrompt).toContain(record.blueprint!.firstArcPromise);
    expect(userPrompt).toContain('"immediateContinuationIncluded": true');
    expect(userPrompt).toContain('CONTEXT COVERAGE AND OMISSIONS');
    expect(systemInstruction).toContain('An arc promise spans an arc, not one chapter.');
    expect(systemInstruction).toContain('newest applicable change wins');
    expect(systemInstruction).toContain('active Foundation edits take precedence');
    expect(reloaded.snapshot().attempts[1].contextSnapshot).toEqual(requests[1].context);
  });
});
