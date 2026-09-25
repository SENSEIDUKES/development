import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { type HarnessGenerationRequest, type HarnessGenerationResponse } from '@seihouse/sen/harness-generation';
import { handleHarnessGenerationHttp } from '../../../server/harness-generation/http';
import type { HarnessTextGenerationRequest } from '../../../server/harness-generation/provider';
import { createMockStorySeedRecord } from '../story-seed/previewData';
import { normalizeWorldBlueprint } from '@seihouse/sen/story-seed';
import {
  createHarnessFoundationFromStorySeed,
  createOfficialCapaDefaultLoadout,
  updateOfficialCapaStyle,
} from './storySeedHandoff';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { OFFICIAL_STYLE_REFERENCES } from './officialCapaSkills';

describe('Story Seed to Harness handoff', () => {
  it('hands over the complete reviewed roadmap and arc count, and only Arc 1 from a pre-roadmap Blueprint', () => {
    const record = createMockStorySeedRecord();
    const foundation = createHarnessFoundationFromStorySeed(record);
    expect(foundation.plannedArcCount).toBe(3);
    expect(foundation.arcRoadmap).toEqual(record.blueprint!.arcPlans);
    expect(foundation.arcRoadmap?.[0].goals[0].text).toBe(record.seed.story.optional.activeArcGoal!.text);
    expect(foundation).not.toHaveProperty('initialArcPlan');
    // A Blueprint saved before roadmaps (one Arc 1 plan of a longer story) still starts a story.
    const legacy = createMockStorySeedRecord();
    delete legacy.seed.story.optional.activeArcGoal;
    legacy.blueprint = { ...legacy.blueprint!, arcPlans: legacy.blueprint!.arcPlans!.slice(0, 1), estimatedArcs: 12 };
    const legacyFoundation = createHarnessFoundationFromStorySeed(legacy);
    expect(legacyFoundation.arcRoadmap).toBeUndefined();
    expect(legacyFoundation.plannedArcCount).toBeUndefined();
    expect(legacyFoundation.initialArcPlan).toEqual(legacy.blueprint.arcPlans![0]);
  });

  it('routes Arc inputs once and freezes the original pins and active goal across reload, retry, and replay', async () => {
    const record = createMockStorySeedRecord();
    record.seed.story.optional.fateSurvival.enabled = false;
    record.seed.story.optional.hardPins = [{ text: 'PIN_KEEP_MASTER' }, { text: 'PIN_KEEP_TEMPLE' }, { text: 'PIN_KEEP_VOW' }];
    record.seed.story.optional.activeArcGoal = { id: 'arc-1-gate', text: 'GOAL_OPEN_GATE', chapters: 100 };
    record.seed.story.optional.funSettings = { faceSlap: 'high', plotArmor: 'low', recognition: 'medium' };
    record.seed.story.optional.makeItWorkInstruction = 'WORLD_WALKING_MOUNTAIN';
    record.seed.world.optional.worldFoundations.mainOpposition = 'WORLD_GATE_KEEPER';
    record.seed.world.optional.worldFoundations.destinedEnding = 'ENDING_FREE_VALLEY';
    Object.assign(record.seed.story.optional, { additionalStoryDirection: 'REMOVED_DIRECTION', firstMajorConflict: 'REMOVED_CONFLICT', arcPlan: { goals: [{ text: 'REMOVED_FUTURE_GOAL' }] } });
    record.blueprint!.logline = 'REMOVED_BLUEPRINT_DIRECTION';
    record.blueprint!.firstArcPromise = 'REMOVED_FIRST_CONFLICT';
    const foundation = createHarnessFoundationFromStorySeed(record);
    const requests: HarnessGenerationRequest[] = [];
    const adapter = {
      getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
      arcOperation: vi.fn(),
      generate: vi.fn(async (request: HarnessGenerationRequest): Promise<HarnessGenerationResponse> => {
        requests.push(structuredClone(request));
        return { rawProviderResponse: requests.length === 1 ? '' : JSON.stringify({ paragraphs: ['The traveler reaches the gate.'] }),
          providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-20T12:00:00Z', usage: { source: 'unavailable' } } };
      }),
    };
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter });
    await controller.hydrate();
    const story = await controller.createStory(foundation, 'ja');
    await controller.generateNextChapter(story.id, 'fixture');
    const failed = controller.snapshot().attempts[0];
    expect(failed.stage).toBe('generation_failed');
    const prompt = buildHarnessGenerationPrompt(requests[0]);
    for (const marker of ['PIN_KEEP_MASTER', 'PIN_KEEP_TEMPLE', 'PIN_KEEP_VOW', 'ENDING_FREE_VALLEY', 'GOAL_OPEN_GATE', 'WORLD_WALKING_MOUNTAIN', 'WORLD_GATE_KEEPER', '"funSettings"']) {
      expect(prompt.userPrompt.split(marker), marker).toHaveLength(2);
      expect(prompt.systemInstruction).not.toContain(marker);
    }
    expect(prompt.userPrompt).not.toMatch(/REMOVED_|arcGoals|"plan"/);
    expect(requests[0].storyInformation.arc).toMatchObject({ activeGoal: { text: 'GOAL_OPEN_GATE' }, completionDeadline: 30, plannedArcCount: 3, finalArc: false });
    expect(requests[0].storyInformation.currentStory.funSettings).toEqual(record.seed.story.optional.funSettings);
    expect(JSON.stringify(requests[0].storyInformation.canonicalState)).not.toMatch(/PIN_|GOAL_|funSettings/);
    expect(requests[0].storyInformation.currentStory.intendedDirection).toBeUndefined();
    expect(requests[0].immediateChapterRequest).not.toHaveProperty('funSettings');
    const invalid = structuredClone(requests[0]);
    invalid.storyInformation.storyDirection.hardPins.push('FOURTH_PIN');
    expect(() => buildHarnessGenerationPrompt(invalid)).toThrow('at most 3');
    await controller.setHardPins(story.id, [{ text: 'LATER_PIN' }]);
    await controller.editArcGoals(story.id, { arcNumber: 1, goals: [{ id: 'arc-1-later', text: 'LATER_GOAL', chapters: 100 }] });
    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter });
    await reloaded.hydrate();
    await reloaded.retryModelRequest(failed.id);
    expect(requests[1].storyInformation).toEqual({ ...requests[0].storyInformation, attemptId: requests[1].attemptId });
    await reloaded.replayStory(story.id);
    expect(reloaded.snapshot().attempts[0].storyInformation.storyDirection).toEqual(requests[0].storyInformation.storyDirection);
    expect(reloaded.snapshot().attempts[0].storyInformation.arc).toEqual(requests[0].storyInformation.arc);
    expect(adapter.arcOperation).not.toHaveBeenCalled();
  });

  it.each([false, true])('gates Fate Survival at the provider boundary when enabled=%s, through reload', async enabled => {
    const record = createMockStorySeedRecord();
    record.seed.story.optional.fateSurvival = { enabled, visibility: 'partial', pressure: 'heaven' };
    record.seed.world.optional.worldFoundations.destinedEnding = 'UNIQUE_DESTINED_ENDING';
    record.blueprint!.majorMysteries = ['UNIQUE_SURVIVAL_MYSTERY'];
    record.blueprint!.unresolvedPlotThreads = ['UNIQUE_SURVIVAL_THREAD'];
    const foundation = createHarnessFoundationFromStorySeed(record);
    expect(foundation.intendedDirection).toBeUndefined();
    const requests: HarnessGenerationRequest[] = [];
    const modelAdapter = { getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }), arcOperation: vi.fn(), generate: vi.fn(async (request: HarnessGenerationRequest): Promise<HarnessGenerationResponse> => {
      requests.push(request);
      return { rawProviderResponse: JSON.stringify({ paragraphs: ['The traveler waits at the gate.'] }),
        providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-20T12:00:00Z', usage: { source: 'unavailable' } } };
    }) };
    // Supply the existing Arc Plan authority, so the test needs no planning call.
    foundation.initialArcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 100 }] };
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({ repository, modelAdapter });
    await controller.hydrate();
    const story = await controller.createStory(foundation);
    const reloaded = new HarnessGenerationController({ repository, modelAdapter });
    await reloaded.hydrate();
    await reloaded.generateNextChapter(story.id, 'fixture');
    const packet = requests[0].storyInformation;
    const prompt = buildHarnessGenerationPrompt(requests[0]);
    expect(packet.rhythm?.fatePressure).toBe('heaven');
    expect(prompt.userPrompt.split('"fatePressure"')).toHaveLength(2);
    expect(prompt.userPrompt.split('UNIQUE_DESTINED_ENDING')).toHaveLength(2);
    expect(JSON.stringify(packet.currentStory)).not.toMatch(/UNIQUE_|fateSurvival|fatePressure/);
    expect(JSON.stringify(packet.canonicalState)).not.toMatch(/UNIQUE_SURVIVAL/);
    for (const marker of ['UNIQUE_SURVIVAL_MYSTERY', 'UNIQUE_SURVIVAL_THREAD', 'FATE SURVIVAL CONTEXT']) {
      expect(prompt.userPrompt.split(marker)).toHaveLength(enabled ? 2 : 1);
    }
    expect(packet.fateSurvival).toEqual(enabled ? foundation.fateSurvival : undefined);
    expect(reloaded.snapshot().foundations[0].input.fateSurvival?.majorMysteries).toEqual(['UNIQUE_SURVIVAL_MYSTERY']);
    expect(prompt.measurement.sections.filter(section => section.section === 'fateSurvival')).toHaveLength(enabled ? 1 : 0);
    // Toggle the same Foundation without deleting stored proposals, then generate again.
    await reloaded.saveFoundationRevision(story.id, { ...foundation, fateSurvival: { ...foundation.fateSurvival!, enabled: !enabled } });
    await reloaded.generateNextChapter(story.id, 'fixture');
    expect(requests[1].storyInformation.fateSurvival?.majorMysteries).toEqual(enabled ? undefined : ['UNIQUE_SURVIVAL_MYSTERY']);
  });

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
    expect(foundation.toneStyle).toContain('Style bible');
    expect(foundation.characters).toBeUndefined();
    expect(foundation.identities?.map(identity => identity.name)).toContain('Ye Chen');
    expect(foundation.identities?.find(identity => identity.name === 'Heavenly Sword Sect')?.kind).toBe('faction');
    expect(foundation.intendedDirection).toBeUndefined();
    // The canonical Fate Pressure domain value crosses the boundary as its own
    // field, independent of the visible Story Seed label or placement.
    expect(foundation.fatePressure).toBe(record.seed.story.optional.fateSurvival.pressure);
    expect(['mortal', 'immortal', 'heaven']).toContain(foundation.fatePressure);

    record.seed.story.required.premise = 'Changed after handoff.';
    const snapshotSeed = foundation.sourceSnapshot?.seed as typeof record.seed;
    expect(snapshotSeed.story.required.premise).toBe(originalPremise);
  });

  it('delivers every Story Seed world value to the provider exactly once', async () => {
    const record = createMockStorySeedRecord();
    const world = record.seed.world.optional;
    Object.assign(world.worldIdentity, { title: 'TITLE_ONCE', worldType: 'WORLD_ONCE', societyStructure: 'SOCIETY_ONCE', startingLocation: 'OPENING_ONCE' });
    Object.assign(world.worldFoundations, {
      mainOpposition: 'OPPOSITION_ONCE',
      mainCharacter: { name: 'Hero Once', personality: 'HERO_TEMPER_ONCE', bio: 'HERO_BIO_ONCE' },
      additionalCharacters: [{ id: 'storage-id-char', name: 'Ally Once', aliases: ['ALLY_ALIAS_ONCE'], bio: 'ALLY_BIO_ONCE' }],
      factions: [{ id: 'storage-id-faction', name: 'Guild Once', aliases: ['GUILD_ALIAS_ONCE'], description: 'GUILD_PROFILE_ONCE' }],
      abilities: { startingPowerConcept: 'POWER_CONCEPT_ONCE' },
      powerSystem: { flavor: 'POWER_FLAVOR_ONCE' },
    });
    record.seed.story.required.storyTags = ['TAG_ONCE'];
    record.blueprint = normalizeWorldBlueprint({
      ...record.blueprint!,
      mainCharacter: { name: 'Hero Once', age: '20', personality: 'HERO_TEMPER_ONCE', appearance: 'HERO_LOOK_ONCE', backgroundProfile: 'REVIEWED_PROSE_ONCE' },
      initialCharacters: ['Ally Once — profile: ALLY_BIO_ONCE', 'Rival Once (Rival)'],
      majorFactions: ['Guild Once — profile: GUILD_PROFILE_ONCE', 'Cult Once'],
      powerSystemOutline: 'POWER_CONCEPT_ONCE ladder, POWER_LADDER_ONCE',
      styleBible: 'STYLE_BIBLE_ONCE',
    }, record.seed);
    const foundation = createHarnessFoundationFromStorySeed(record);
    const requests: HarnessGenerationRequest[] = [];
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
      arcOperation: vi.fn(),
      generate: vi.fn(async (request: HarnessGenerationRequest): Promise<HarnessGenerationResponse> => {
        requests.push(structuredClone(request));
        return { rawProviderResponse: JSON.stringify({ paragraphs: ['Hero Once waits.'] }),
          providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-23T12:00:00Z', usage: { source: 'unavailable' } } };
      }),
    } });
    await controller.hydrate();
    const story = await controller.createStory(foundation);
    await controller.generateNextChapter(story.id, 'fixture');
    const { userPrompt } = buildHarnessGenerationPrompt(requests[0]);

    for (const marker of ['TITLE_ONCE', 'WORLD_ONCE', 'SOCIETY_ONCE', 'OPENING_ONCE', 'OPPOSITION_ONCE', 'HERO_TEMPER_ONCE',
      'HERO_BIO_ONCE', 'REVIEWED_PROSE_ONCE', 'HERO_LOOK_ONCE', 'ALLY_BIO_ONCE', 'ALLY_ALIAS_ONCE', 'GUILD_PROFILE_ONCE',
      'GUILD_ALIAS_ONCE', 'POWER_CONCEPT_ONCE', 'POWER_FLAVOR_ONCE', 'POWER_LADDER_ONCE', 'STYLE_BIBLE_ONCE', 'TAG_ONCE',
      'role: Rival']) {
      expect(userPrompt.split(marker), marker).toHaveLength(2);
    }
    expect(userPrompt).not.toMatch(/storage-id-|Blueprint (main character|character profile|initial characters|factions|society|power system)/);
    expect(foundation.identities?.map(identity => identity.name)).toEqual(['Hero Once', 'Ally Once', 'Rival Once', 'Guild Once', 'Cult Once']);
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
    record.blueprint!.mainCharacter = { name: 'Mara', age: '20', personality: 'Quiet', appearance: 'Tall', backgroundProfile: 'Additional profile detail that must survive.' };
    const foundation = createHarnessFoundationFromStorySeed(record);
    expect(foundation.openingSituation).toBe('Author opening');
    expect(foundation.destinedEnding).toBe('Author ending');
    expect(foundation.intendedDirection).toBeUndefined();
    expect(foundation.declaredCanon).not.toContain(record.blueprint!.logline);
    expect(foundation.declaredCanon).not.toContain(record.blueprint!.majorMysteries[0]);
    expect(foundation.identities?.find(identity => identity.name === 'Ye Chen')?.evidence).toContain('Additional profile detail');
  });

  it('keeps Original Language out of the neutral Foundation the boundary produces', () => {
    const foundation = createHarnessFoundationFromStorySeed(createMockStorySeedRecord());

    // Story identity crosses the boundary as its own argument, never hidden in
    // Foundation content, creative seed text, or permanent author instructions.
    expect(JSON.stringify({
      ...foundation,
      sourceSnapshot: undefined,
    })).not.toContain('originalLanguage');
  });

  it('changes only the Style slot and never changes Original Language or Translation', () => {
    const record = createMockStorySeedRecord();
    record.originalLanguage = 'ko';
    const original = {
      ...createOfficialCapaDefaultLoadout('chinese'),
      translation: { id: 'manual.translation', version: '4.2.0' },
    };
    const changed = updateOfficialCapaStyle(original, 'japanese');

    expect(changed).toEqual({ ...original, style: OFFICIAL_STYLE_REFERENCES.japanese });
    expect(record.originalLanguage).toBe('ko');
    expect(changed.translation).toEqual(original.translation);
    expect(changed.author).toEqual(original.author);
    expect(changed.pacing).toEqual(original.pacing);
    expect(changed.continuity).toEqual(original.continuity);
  });

  it('carries the frozen source, latest revision, corrections, and continuation through reload and serialized HTTP to the provider', async () => {
    const record = createMockStorySeedRecord();
    record.seed.story.optional.makeItWorkInstruction = 'Keep the strange premise believable.';
    const input = createHarnessFoundationFromStorySeed(record);
    const repository = new InMemoryHarnessGenerationRepository();
    const response: HarnessGenerationResponse = {
      rawProviderResponse: JSON.stringify({ prose: 'Mara waits at the sealed harbor gate.' }),
      providerReceipt: { provider: 'gemini', model: 'google/gemini-3.1-flash-lite',
        generatedAt: '2026-09-05T12:00:00.000Z', usage: { source: 'unavailable' } },
    };
    const provider = vi.fn(async (_prompt: HarnessTextGenerationRequest) => response);
    const requests: HarnessGenerationRequest[] = [];
    const adapter = {
      getServerInfo: async () => ({ provider: 'gemini' as const, configured: true, models: [], defaultModel: 'google/gemini-3.1-flash-lite' }),
      arcOperation: async (request: { storyInformation: { chapterNumber: number } }) => ({ rawProviderResponse: JSON.stringify({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 100 }] }, destinedEnding: 'Bring the story to its true conclusion.' }), providerReceipt: { provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite', generatedAt: '2026-09-05T12:00:00.000Z', usage: { source: 'unavailable' as const } } }),
      recoverMemory: async () => ({ rawProviderResponse: JSON.stringify({ events: [{ description: 'Mara has blue eyes.', category: 'character', subjects: ['Mara'] }] }),
        providerReceipt: { provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite', generatedAt: '2026-09-05T12:00:00.000Z', usage: { source: 'unavailable' as const } } }),
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

    expect(requests[1].storyInformation.foundationRevision).toBe(2);
    // The frozen Story Seed stays on the attempt's Foundation snapshot; the packet carries no copy of it.
    expect(reloaded.snapshot().attempts[1].foundationSnapshot.input.sourceSnapshot).toEqual(input.sourceSnapshot);
    expect(JSON.stringify(requests[1].storyInformation)).not.toContain('sourceSnapshot');
    expect(requests[1].storyInformation.previouslyOn).toEqual([]);
    expect(JSON.stringify(requests[1].storyInformation)).not.toContain('Mara waits at the sealed harbor gate.');
    expect(requests[1].immediateChapterRequest).toEqual({ chapterNumber: 2, continuation: true, chapterScale: { minWords: 1_800, maxWords: 2_500 } });
    const { userPrompt, systemInstruction } = provider.mock.calls[1][0];
    expect(userPrompt).toContain('Remain at the gate; do not finish the tournament arc yet.');
    // The revision replaced the permanent instructions, and the frozen seed no
    // longer travels as background, so the replaced text is gone from the request.
    expect(userPrompt).not.toContain('Keep the strange premise believable.');
    expect(requests[0].storyInformation.currentStory.permanentInstructions).toContain('Keep the strange premise believable.');
    expect(userPrompt).not.toContain('A later Seed edit must not leak');
    // The correction's meaning travels; its evidence passage and storage identifiers do not.
    expect(userPrompt).toContain('"eyeColor": "green"');
    expect(userPrompt).not.toContain('Mara has green eyes.');
    expect(userPrompt).not.toContain('targetEvidence');
    expect(userPrompt).not.toContain(record.blueprint!.firstArcPromise);
    expect(userPrompt).not.toContain('CONTEXT COVERAGE AND OMISSIONS');
    expect(userPrompt).not.toContain('selectionAudit');
    expect(systemInstruction).toContain('An arc promise spans an arc, not one chapter.');
    expect(systemInstruction).toContain('newest applicable change wins');
    expect(systemInstruction).toContain('Active Foundation edits take precedence');
    expect(reloaded.snapshot().attempts[1].storyInformation).toEqual(requests[1].storyInformation);
    expect(reloaded.snapshot().attempts[1].requestMeasurement).toMatchObject({
      systemInstructionCharacters: systemInstruction.length, userPromptCharacters: userPrompt.length,
    });
  });
});
