import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, projectCanonicalState, exportHarnessStory } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { handleHarnessGenerationHttp } from '../../../server/harness-generation/http';
import type { HarnessTextGenerationRequest } from '../../../server/harness-generation/provider';
import { createEmptyHarnessWorkspaceState, PACKET_SECTION_ORDER, harnessArcContext } from '@seihouse/sen/harness-generation';
import type { HarnessCanonicalRecord, HarnessGenerationModelAdapter, HarnessGenerationRequest, HarnessGenerationResponse, HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import type { ArcPlan } from '@seihouse/sen/arc-goals';

const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-20T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const response = (body: unknown): HarnessGenerationResponse => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: receipt });

const plan: ArcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the mountain gate.', chapters: 10 }, { id: 'arc-1-trial', text: 'Pass the sect trial.', chapters: 90 }] };

const chapterReply = (n: number) => ({
  title: `Chapter ${n} Title`,
  paragraphs: [`Yi Chen reached Stage ${n} and climbed toward the Azure Sect gate. He had ${100 + n} qi.`, `Elder Mu watched from the wall in chapter ${n}.`],
  arcCompletion: { goalId: 'arc-1-gate', completed: false, evidence: '' },
  recap: `Recap ${n}: Yi Chen climbed higher.`,
  chapterFunction: n % 2 ? 'progression' : 'worldBuilding',
  nextProgression: `Progression ${n}`, nextWorldBuilding: `World ${n}`, nextConflict: `Conflict ${n}`,
});

const memoryReply = (n: number, prose: string) => ({ events: [
  { description: `Yi Chen reached stage ${n}.`, category: 'character', subjects: ['Yi Chen'], evidence: `Yi Chen reached Stage ${n} and climbed toward the Azure Sect gate.`, details: { character: { name: 'Yi Chen', role: 'Disciple', isMainCharacter: true } }, facts: { stage: `Stage ${n}` } },
  { description: `Yi Chen has ${100 + n} qi.`, category: 'progression', subjects: ['Yi Chen'], evidence: `He had ${100 + n} qi.`, details: { mechanics: { subject: 'Yi Chen', name: 'Qi', value: String(100 + n), unit: 'qi' } } },
  { description: `Elder Mu watches in chapter ${n}.`, category: 'character', subjects: ['Elder Mu'], evidence: `Elder Mu watched from the wall in chapter ${n}.`, details: { character: { name: 'Elder Mu', role: 'Elder' } } },
].filter(event => prose.includes(event.evidence)) });

const setup = async (options: { throughHttp?: boolean } = {}) => {
  const requests: HarnessGenerationRequest[] = [];
  const providerInputs: HarnessTextGenerationRequest[] = [];
  const memories = new Map<string, unknown>();
  let chapter = 0;
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
    generate: vi.fn(async request => {
      requests.push(structuredClone(request));
      chapter += 1;
      const body = chapterReply(chapter);
      memories.set(body.paragraphs.join('\n\n'), memoryReply(chapter, body.paragraphs.join('\n\n')));
      if (!options.throughHttp) return response(body);
      const result = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify(request) }, {
        environment: { GEMINI_API_KEY: 'fixture' },
        providerFactory: () => ({ provider: 'gemini', model: request.model, generate: async input => { providerInputs.push(input); return response(body); } }),
      });
      if (result.status !== 200) throw new Error(`HTTP ${result.status}: ${JSON.stringify(result.body)}`);
      return result.body as HarnessGenerationResponse;
    }),
    recoverMemory: async request => response(memories.get(request.prose) ?? { events: [] }),
    arcOperation: vi.fn(async () => response({ plan, destinedEnding: 'Yi Chen leads the Azure Sect to glory.' })),
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await controller.hydrate();
  const story = await controller.createStory({
    title: 'Azure Ascent', premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Yi Chen leads the Azure Sect to glory.', initialArcPlan: plan, fatePressure: 'heaven',
    openingSituation: 'Yi Chen waits at the outer gate.', toneStyle: 'Fierce and lyrical.', cast: [{ name: 'Yi Chen', role: 'Disciple', isMainCharacter: true }],
    sourceSnapshot: { kind: 'story-seed', sourceId: 'seed-77', sourceUpdatedAt: 'a', schemaVersion: 3, seed: { marker: 'COMPLETE SEED SNAPSHOT' } },
  });
  await controller.setHardPins(story.id, [{ text: 'Make Yi Chen take the Azure Sect to glory throughout the entire story.' }, { text: 'Never kill Elder Mu.' }]);
  return { controller, repository, adapter, requests, providerInputs, story };
};

describe('Compact long-story generation packet', () => {
  it('delivers the nine sections to the provider once, in the approved order, with nothing else', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const prompt = buildHarnessGenerationPrompt(run.requests[1]);
    expect(prompt.measurement.sections.map(section => section.section)).toEqual([...PACKET_SECTION_ORDER]);
    const markers = ['CAPA SKILL [Author]', 'CURRENT STORY INFORMATION', 'DESTINED ENDING AND HARD PINS', 'ACTIVE ARC GOAL', 'FATE PRESSURE RHYTHM DIRECTION', 'PREVIOUSLY ON', 'CURRENT CANONICAL STATE', 'MISSION REMINDER:', 'IMMEDIATE CHAPTER REQUEST'];
    const serialized = `${prompt.systemInstruction}\n\n${prompt.userPrompt}`;
    const positions = markers.map(marker => ({ marker, index: serialized.indexOf(marker), count: serialized.split(marker).length - 1 }));
    for (const position of positions) expect(position, position.marker).toMatchObject({ count: 1 });
    expect(positions.map(position => position.index)).toEqual([...positions.map(position => position.index)].sort((a, b) => a - b));
    // Author-owned direction appears exactly once each.
    expect(prompt.userPrompt.split('Yi Chen leads the Azure Sect to glory.')).toHaveLength(2);
    expect(prompt.userPrompt.split('Make Yi Chen take the Azure Sect to glory throughout the entire story.')).toHaveLength(2);
    expect(prompt.userPrompt.split('Never kill Elder Mu.')).toHaveLength(2);
    // Excluded material never reaches the request.
    expect(serialized).not.toContain('COMPLETE SEED SNAPSHOT');
    expect(serialized).not.toContain('sourceSnapshot');
    expect(serialized).not.toMatch(/selectionAudit|diagnostics|budgetSource|identityAmbiguities/);
    expect(serialized).not.toContain('Yi Chen reached Stage 1 and climbed toward the Azure Sect gate.');
    expect(prompt.userPrompt).not.toContain('"evidence"');
    expect(prompt.userPrompt).not.toContain('Elder Mu watched from the wall');
  });

  it('sends Chapter 2 the saved Chapter 1 recap, resulting canonical state, and the persisted rhythm direction', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const state = run.controller.snapshot();
    const packet = run.requests[1].storyInformation;
    expect(packet.previouslyOn).toEqual([{ chapterNumber: 1, title: 'Chapter 1 Title', recap: 'Recap 1: Yi Chen climbed higher.' }]);
    expect(packet.canonicalState.characters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Yi Chen', asOfChapter: 1, facts: expect.objectContaining({ role: 'Disciple', stage: 'Stage 1', isMainCharacter: 'true' }) }),
      expect.objectContaining({ name: 'Elder Mu', facts: expect.objectContaining({ role: 'Elder' }) }),
    ]));
    expect(packet.canonicalState.resources).toEqual([expect.objectContaining({ owner: 'Yi Chen', name: 'Qi', value: '101', unit: 'qi', asOfChapter: 1 })]);
    const recommendation = state.attempts[1].storyInformation.rhythm!;
    expect(recommendation).toEqual({ fatePressure: 'heaven', recentFunctions: [{ chapterNumber: 1, chapterFunction: 'progression' }], recommendedFunction: 'conflict', reason: expect.stringContaining('Heaven pressure'), suggestion: 'Conflict 1' });
    expect(recommendation.recommendedFunction).toBe(state.stories[0].rhythmRecommendation?.recommendedFunction);
    const arc = harnessArcContext(state.stories[0], state.foundations[0].input, 2)!;
    expect(packet.arc).toEqual({ ...arc, plan: arc.plan });
    expect(run.requests[1].missionReminder).toEqual(state.attempts[1].missionReminder);
  });

  it('freezes the exact packet with the attempt so a provider retry resends the frozen inputs, and replay never rebuilds it', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    let fail = true;
    const generate = run.adapter.generate as ReturnType<typeof vi.fn<(request: HarnessGenerationRequest) => Promise<HarnessGenerationResponse>>>;
    const original = generate.getMockImplementation()!;
    generate.mockImplementation(async (request: HarnessGenerationRequest) => { if (fail) { fail = false; throw new Error('provider down'); } return original(request); });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const failed = run.controller.snapshot().attempts.at(-1)!;
    expect(failed.stage).toBe('generation_failed');
    // Newer story state between failure and retry must not leak into the retried request.
    await run.controller.setHardPins(run.story.id, [{ text: 'A pin added after the failure.' }]);
    await run.controller.retryModelRequest(failed.id);
    const retried = run.controller.snapshot().attempts.at(-1)!;
    const retriedRequest = run.requests.at(-1)!;
    expect(retried.stage).toBe('committed');
    for (const key of ['capaPrompt', 'immediateChapterRequest', 'missionReminder', 'mediaLoadout'] as const) expect(retried[key]).toEqual(failed[key]);
    expect({ ...retried.storyInformation, attemptId: '' }).toEqual({ ...failed.storyInformation, attemptId: '' });
    expect(retriedRequest.storyInformation.storyDirection.hardPins).toEqual(['Make Yi Chen take the Azure Sect to glory throughout the entire story.', 'Never kill Elder Mu.']);
    // Replay reads committed chapters only; every frozen attempt packet is untouched.
    const before = run.controller.snapshot().attempts.map(attempt => attempt.storyInformation);
    await run.controller.replayStory(run.story.id);
    expect(run.controller.snapshot().attempts.map(attempt => attempt.storyInformation)).toEqual(before);
    const reloaded = new HarnessGenerationController({ repository: run.repository, modelAdapter: run.adapter });
    const state = await reloaded.hydrate();
    expect(state.attempts.map(attempt => attempt.storyInformation)).toEqual(before);
    expect(exportHarnessStory(state, run.story.id).attempts.map(attempt => attempt.storyInformation)).toEqual(before);
  });

  it('persists the measured size of the exact serialized provider request', async () => {
    const run = await setup({ throughHttp: true });
    await run.controller.generateNextChapter(run.story.id, 'google/gemini-3.1-flash-lite');
    await run.controller.generateNextChapter(run.story.id, 'google/gemini-3.1-flash-lite');
    expect(run.controller.snapshot().attempts.map(attempt => attempt.failure?.message ?? attempt.stage)).toEqual(['committed', 'committed']);
    const attempt = run.controller.snapshot().attempts[1];
    const sent = run.providerInputs[1];
    expect(attempt.requestMeasurement).toMatchObject({
      systemInstructionCharacters: sent.systemInstruction.length,
      userPromptCharacters: sent.userPrompt.length,
      responseSchemaCharacters: JSON.stringify(sent.responseJsonSchema).length,
      totalCharacters: sent.systemInstruction.length + sent.userPrompt.length + JSON.stringify(sent.responseJsonSchema).length,
    });
    expect(attempt.requestMeasurement!.sections.reduce((sum, section) => sum + section.characters, 0)).toBeLessThanOrEqual(attempt.requestMeasurement!.totalCharacters);
    expect(attempt.requestMeasurement!.sections.map(section => section.section)).toEqual([...PACKET_SECTION_ORDER]);
    // The provider received the same nine sections the local builder produces.
    const local = buildHarnessGenerationPrompt(run.requests[1]);
    expect(local.userPrompt).toBe(sent.userPrompt);
    expect(local.systemInstruction).toBe(sent.systemInstruction);
  });
});

describe('Current canonical state projection', () => {
  const record = (id: string, overrides: Partial<HarnessCanonicalRecord>): HarnessCanonicalRecord => ({
    id, storyId: 's', chapterId: 'c1', capabilityId: 'characters', capabilityVersion: '2', kind: 'character', label: id,
    evidence: `EVIDENCE ${id}`, confidence: 'resolved', facts: {}, createdAt: 'a', warnings: [], ...overrides,
  });
  const stateWith = (records: HarnessCanonicalRecord[]): HarnessWorkspaceState => {
    const state = createEmptyHarnessWorkspaceState();
    state.stories.push({ id: 's', title: 'S', originalLanguage: 'en', createdAt: 'a', updatedAt: 'a', activeFoundationRevisionId: 'f', foundationRevisionIds: ['f'], head: { nextChapterNumber: 4 } });
    for (const n of [1, 2, 3]) state.chapters.push({ id: `c${n}`, storyId: 's', attemptId: 'a', foundationRevisionId: 'f', storyInformationPacketId: 'p', chapterNumber: n, title: `C${n}`, titleSource: 'model', prose: '', paragraphs: [], metrics: { wordCount: 0, paragraphCount: 0, meetsScaleTarget: false }, eventIds: [], responseMode: 'json', createdAt: 'a', committedAt: 'a', mediaLoadout: { capturedAt: 'a', soundscapes: [], soundCues: [] } });
    state.canonicalRecords.push(...records);
    return state;
  };

  it('keeps only the latest applicable state per entity while history stays in storage', () => {
    const state = stateWith([
      record('r1', { label: 'Yi Chen', entityId: 'e-yi', chapterId: 'c1', facts: { stage: 'Stage 1', home: 'Azure Sect', description: 'Yi Chen joins.' } }),
      record('r2', { label: 'Yi Chen', entityId: 'e-yi', chapterId: 'c3', facts: { stage: 'Stage 3', description: 'Yi Chen advances.' } }),
      record('r3', { label: 'Yi Chen', entityId: 'e-yi', chapterId: 'c2', facts: { stage: 'Stage 2' } }),
    ]);
    const { projection, identityAmbiguities } = projectCanonicalState({ state, storyId: 's' });
    expect(projection.characters).toEqual([{ name: 'Yi Chen', asOfChapter: 3, facts: { stage: 'Stage 3', home: 'Azure Sect', description: 'Yi Chen advances.' } }]);
    expect(identityAmbiguities).toEqual([]);
    expect(JSON.stringify(projection)).not.toContain('Stage 1');
    expect(state.canonicalRecords.map(item => item.facts.stage)).toEqual(['Stage 1', 'Stage 3', 'Stage 2']);
  });

  it('merges deterministic aliases and confirmed corrections instead of creating duplicate entities', () => {
    const state = stateWith([
      record('r1', { label: 'Xie Jin', entityId: 'e-xie', aliases: ['Xie Jin (Protagonist)'], facts: { role: 'Protagonist' } }),
      record('r2', { label: 'Xie Jin (Protagonist)', entityId: 'e-other', chapterId: 'c2', facts: { mood: 'resolute' } }),
      record('r3', { label: 'The Captain', entityId: 'e-cap', chapterId: 'c2', facts: { rank: 'Captain' } }),
      record('r4', { label: 'Iven', entityId: 'e-iven', chapterId: 'c1', facts: { role: 'Sailor' } }),
    ]);
    state.corrections.push({ id: 'corr', storyId: 's', kind: 'resolve-entity', reason: 'The Captain is Iven.', createdAt: 'a', targetRecordIds: [], referenceLabel: 'The Captain', resolvedRecordId: 'r4', acceptedAlias: 'The Captain' });
    const { projection, identityAmbiguities } = projectCanonicalState({ state, storyId: 's' });
    expect(projection.characters.map(character => character.name).sort()).toEqual(['Iven', 'Xie Jin']);
    expect(projection.characters.find(character => character.name === 'Xie Jin')).toMatchObject({ aliases: ['Xie Jin (Protagonist)'], facts: { role: 'Protagonist', mood: 'resolute' } });
    expect(projection.characters.find(character => character.name === 'Iven')).toMatchObject({ aliases: ['The Captain'], facts: { role: 'Sailor', rank: 'Captain' }, asOfChapter: 2 });
    expect(identityAmbiguities).toEqual([]);
  });

  it('flags uncertain near-duplicates for inspection instead of merging or inventing an identity', () => {
    const state = stateWith([
      record('r1', { label: 'Yi Chen', entityId: 'e-1', facts: { role: 'Disciple' } }),
      record('r2', { label: 'Elder Yi Chen', entityId: 'e-2', chapterId: 'c2', facts: { role: 'Elder' } }),
    ]);
    const { projection, identityAmbiguities } = projectCanonicalState({ state, storyId: 's' });
    expect(projection.characters.map(character => character.name)).toEqual(['Elder Yi Chen', 'Yi Chen']);
    expect(identityAmbiguities).toEqual([expect.objectContaining({ kind: 'character', labels: ['Yi Chen', 'Elder Yi Chen'], recordIds: ['r1', 'r2'] })]);
  });

  it('prioritizes relevant entities under budget, compacts older ones, and records omissions', () => {
    const records = Array.from({ length: 40 }, (_, index) => record(`loc-${index}`, {
      kind: 'location-world', capabilityId: 'locations-world', label: `Location ${index}`, entityId: `e-loc-${index}`, chapterId: index < 38 ? 'c1' : 'c3',
      facts: { description: `A long description of location ${index}. `.repeat(6) },
    }));
    records.push(record('hero', { label: 'Yi Chen', entityId: 'e-yi', chapterId: 'c1', facts: { role: 'Disciple', description: 'The hero of the sect. '.repeat(6) } }));
    const state = stateWith(records);
    const { projection, omitted } = projectCanonicalState({ state, storyId: 's', budgetTokens: 900, castNames: ['Yi Chen'], activeChapterNumbers: [3], focusText: 'Reach Location 7.' });
    expect(projection.characters[0]).toMatchObject({ name: 'Yi Chen', facts: expect.objectContaining({ role: 'Disciple' }) });
    const fullLocations = projection.locations.filter(location => !location.facts.summary);
    expect(fullLocations.map(location => location.name)).toEqual(expect.arrayContaining(['Location 7', 'Location 38', 'Location 39']));
    expect(projection.locations.some(location => location.facts.summary)).toBe(true);
    expect(omitted.length).toBeGreaterThan(0);
    expect(omitted.every(item => item.section === 'canonicalState' && item.sourceRecordIds.length)).toBe(true);
    expect(JSON.stringify(projection)).not.toContain('EVIDENCE');
  });
});
