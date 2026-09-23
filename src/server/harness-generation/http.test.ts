import { describe, expect, it, vi } from 'vitest';
import { type HarnessGenerationRequest } from '@seihouse/sen/harness-generation';
import { handleHarnessGenerationHttp } from './http';
import type { HarnessTextGenerationRequest } from './provider';
import { SEN_NOVEL_AUTHOR_SKILL } from '@seihouse/sen/harness-generation';
import { assembleCapaPrompt } from '@seihouse/sen/harness-generation';
import { HARNESS_RESPONSE_CONTRACT } from './prompt';
import { arcGenerationContext } from '@seihouse/sen/arc-goals';
import { buildMissionReminder } from '@seihouse/sen/harness-generation';

const foundation = () => ({
  id: 'hfr_test',
  storyId: 'hst_test',
  revision: 1,
  createdAt: '2026-08-29T00:00:00.000Z',
  input: { premise: 'A cartographer returns to a city that has moved overnight.' },
});

const capaPrompt = () => assembleCapaPrompt({ capturedAt: '2026-09-12T00:00:00.000Z', skills: [SEN_NOVEL_AUTHOR_SKILL] });

const request = (): HarnessGenerationRequest => ({
  storyId: 'hst_test',
  attemptId: 'hga_test',
  model: 'google/gemini-3.1-flash-lite',
  capaPrompt: capaPrompt(),
  storyInformation: {
    id: 'hctx_test',
    storyId: 'hst_test',
    attemptId: 'hga_test',
    foundationRevisionId: foundation().id,
    foundationRevision: 1,
    storyHead: { nextChapterNumber: 1 },
    chapterNumber: 1,
    createdAt: '2026-08-29T00:00:00.000Z',
    currentStory: { title: 'The Moved City', originalLanguage: 'en', premise: foundation().input.premise, authorDirections: [], corrections: [] },
    storyDirection: { destinedEnding: 'Restore the city.', hardPins: [] },
    arc: arcGenerationContext({ arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Reach the moved city.', chapters: 100 }] }, 1, 'Restore the city.'),
    previouslyOn: [],
    canonicalState: { characters: [], relationships: [], locations: [], factions: [], artifacts: [], abilities: [], resources: [] },
    diagnostics: { budgetSource: 'test', sections: [], omitted: [], identityAmbiguities: [], storage: { chapters: 0, events: 0, canonicalRecords: 0, activeRecords: 0, recaps: 0 } },
  },
  missionReminder: buildMissionReminder(capaPrompt()),
  immediateChapterRequest: { chapterNumber: 1, continuation: false, chapterScale: { minWords: 1_800, maxWords: 2_500 } },
});

const environment = { GEMINI_API_KEY: 'test-key' };

describe('Harness Generation HTTP boundary', () => {
  it('passes the Router reasoning level to the provider only when the model accepts it', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-23', usage: { source: 'unavailable' as const } } }));
    const send = (reasoningLevel: string) => handleHarnessGenerationHttp({ method: 'POST', body: { ...request(), operation: 'plan-arc', reasoningLevel } },
      { environment, providerFactory: () => ({ provider: 'gemini', model: request().model, generate }) });
    await send('high');
    await send('xhigh');
    expect(generate.mock.calls.map(call => call[0].reasoningLevel)).toEqual(['high', undefined]);
  });

  it('routes automatic Arc planning through the provider with its own structured schema', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-13', usage: { source: 'unavailable' as const } } }));
    const original = request();
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: { ...original, operation: 'plan-arc' } },
      { environment, providerFactory: () => ({ provider: 'gemini', model: original.model, generate }) });
    expect(result.status).toBe(200);
    expect(generate).toHaveBeenCalledOnce();
    const schema = generate.mock.calls[0][0].responseJsonSchema as { properties: Record<string, unknown> };
    expect(schema.properties).toHaveProperty('plan');
    expect(schema.properties).not.toHaveProperty('prose');
  });
  it('serializes recovery as evidence extraction, with no chapter-generation response schema', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{"memory":{}}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-05', usage: { source: 'unavailable' as const } } }));
    const original = request();
    const revision = { ...foundation(), input: { ...foundation().input, intendedDirection: 'Future plan must not become an extracted fact.' } };
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify({
      operation: 'recover-memory', storyId: original.storyId, chapterId: 'saved', model: original.model,
      prose: 'Aria warned that the core would collapse in six hours.', foundation: revision,
    }) }, { environment, providerFactory: () => ({ provider: 'gemini', model: original.model, generate }) });
    expect(result.status).toBe(200);
    expect(generate).toHaveBeenCalledOnce();
    const input = generate.mock.calls[0][0] as unknown as { userPrompt: string; temperature: number; responseJsonSchema: { properties: Record<string, unknown> } };
    expect(input.userPrompt).toContain('collapse in six hours');
    expect(input.userPrompt).not.toContain('Future plan');
    expect(input.temperature).toBe(0);
    expect(Object.keys(input.responseJsonSchema.properties)).toEqual(['memory']);
  });

  it('rejects unknown operations and empty recovery identities before contacting the provider', async () => {
    for (const body of [{ ...request(), operation: 'unknown' }, {
      ...request(), operation: 'recover-memory', chapterId: ' ', prose: 'Saved prose.',
    }]) expect((await handleHarnessGenerationHttp({ method: 'POST', body }, { environment })).status).toBe(400);
  });
  it('reports independent model configuration', async () => {
    const result = await handleHarnessGenerationHttp({ method: 'GET' }, { environment });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ provider: 'gemini', configured: true });
  });

  it('performs one provider call and returns raw output plus an accurately labeled receipt', async () => {
    const generate = async () => ({
      rawProviderResponse: JSON.stringify({ prose: 'The north gate opened at noon.' }),
      providerReceipt: {
        provider: 'gemini' as const,
        model: 'google/gemini-3.1-flash-lite',
        generatedAt: '2026-08-29T00:00:00.000Z',
        usage: { source: 'reported' as const, inputTokens: 5, outputTokens: 9, totalTokens: 14 },
      },
    });
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: JSON.stringify(request()) },
      { environment, providerFactory: () => ({ provider: 'gemini', model: 'google/gemini-3.1-flash-lite', generate }) },
    );
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      rawProviderResponse: expect.stringContaining('north gate'),
      providerReceipt: { usage: { source: 'reported', totalTokens: 14 } },
    });
  });

  it('sends the CAPA Prompt once as authoring instruction, separated from the Harness contract and story content', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({
      rawProviderResponse: JSON.stringify({ prose: 'The siege remained beyond the hills.' }),
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-12', usage: { source: 'unavailable' as const } },
    }));
    const skilled = request();
    skilled.capaPrompt = assembleCapaPrompt({
      capturedAt: '2026-09-12T00:00:00.000Z',
      skills: [
        { id: 'seihouse.pacing', version: '1.0.0', name: 'Patient Siege', description: 'Pacing.', slot: 'pacing', applications: ['generation'], instructions: 'Do not resolve the siege in this chapter.' },
        SEN_NOVEL_AUTHOR_SKILL,
      ],
    });
    skilled.storyInformation.currentStory.authorDirections = [{ direction: 'Bring the envoy to the gate.', mode: 'future', effectiveChapter: 1 }];
    skilled.immediateChapterRequest = { chapterNumber: 1, continuation: false, chapterScale: { minWords: 1_800, maxWords: 2_500 }, assignment: 'Bring the envoy to the gate.' };
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: skilled },
      { environment, providerFactory: () => ({ provider: 'gemini', model: skilled.model, generate }) },
    );
    expect(result.status).toBe(200);
    const input = generate.mock.calls[0][0] as HarnessTextGenerationRequest;
    // Authoring instruction: CAPA Prompt first, in schema order (Author before Pacing), then the Harness contract.
    expect(input.systemInstruction).toBe(`${skilled.capaPrompt.text}\n\n${HARNESS_RESPONSE_CONTRACT}`);
    expect(input.systemInstruction).toMatch(/^CAPA SKILL \[Author\] — SEN Novel Author v1\.0\.0\n/);
    expect(input.systemInstruction.indexOf('CAPA SKILL [Author]')).toBeLessThan(input.systemInstruction.indexOf('CAPA SKILL [Pacing]'));
    expect(input.systemInstruction).toContain('elite Eastern fantasy web-novel author specializing in Asian light novels');
    expect(input.systemInstruction.split('Do not resolve the siege in this chapter.')).toHaveLength(2);
    expect(input.systemInstruction).toContain('paragraphs is the complete chapter and its sole body');
    expect(input.systemInstruction).toContain('Every signal carries anchorText');
    expect(input.systemInstruction).toContain('The HARNESS assigns speaker roles from the cast.');
    expect(input.systemInstruction).toContain('The HARNESS constructs the complete mechanical, narrative, World Notice, or Fate presentation afterward.');
    expect(input.systemInstruction).not.toContain('memory object');
    expect(input.systemInstruction).not.toContain('blocks array');
    expect(input.systemInstruction.split('HARNESS RESPONSE AND EVIDENCE CONTRACT')).toHaveLength(2);
    expect(skilled.capaPrompt.text).not.toContain('HARNESS RESPONSE AND EVIDENCE CONTRACT');
    expect(skilled.capaPrompt.text).not.toMatch(/R2|track list|Library Cue catalog/i);
    // The provider schema is the compact semantic contract, never the SEN block, memory, or presentation contracts.
    const chapterSchema = input.responseJsonSchema as { properties: Record<string, unknown>; required: string[] };
    expect(chapterSchema.required).toEqual(['paragraphs', 'arcCompletion', 'recap', 'chapterFunction', 'nextProgression', 'nextWorldBuilding', 'nextConflict']);
    // Diagnostics never leave the HARNESS.
    expect(input.userPrompt).not.toMatch(/selectionAudit|diagnostics|budgetSource/);
    expect(Object.keys(chapterSchema.properties)).not.toContain('blocks');
    expect(Object.keys(chapterSchema.properties)).not.toContain('memory');
    expect(JSON.stringify(chapterSchema)).not.toContain('anyOf');
    expect(JSON.stringify(chapterSchema)).not.toContain('fateResult');
    // Generation content: story information plus the immediate request, with no skill instructions.
    expect(input.userPrompt).toMatch(/^STORY INFORMATION PACKET/);
    expect(input.userPrompt).toContain('CURRENT STORY INFORMATION');
    expect(input.userPrompt).toContain('"direction": "Bring the envoy to the gate."');
    expect(input.userPrompt.indexOf('CURRENT STORY INFORMATION')).toBeLessThan(input.userPrompt.indexOf('IMMEDIATE CHAPTER REQUEST'));
    expect(input.userPrompt).toContain('NEXT CHAPTER ASSIGNMENT: Bring the envoy to the gate.');
    // The Mission Reminder is its own section now, after the packet and before the request.
    expect(input.userPrompt).toContain('MISSION REMINDER: You are the author of this novel');
    expect(input.userPrompt.indexOf('MISSION REMINDER')).toBeGreaterThan(input.userPrompt.indexOf('CURRENT CANONICAL STATE'));
    expect(input.userPrompt.indexOf('MISSION REMINDER')).toBeLessThan(input.userPrompt.indexOf('IMMEDIATE CHAPTER REQUEST'));
    expect(input.systemInstruction).not.toContain('MISSION REMINDER');
    expect(input.userPrompt).not.toContain('Do not resolve the siege in this chapter.');
    expect(input.userPrompt).not.toContain(SEN_NOVEL_AUTHOR_SKILL.instructions);
  });

  it('rejects a chapter request without an assembled CAPA Prompt before calling the provider', async () => {
    const generate = vi.fn();
    const authorless = request();
    authorless.capaPrompt = { ...authorless.capaPrompt, text: ' ' };
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: authorless },
      { environment, providerFactory: () => ({ provider: 'gemini', model: authorless.model, generate }) },
    );
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: expect.stringContaining('CAPA Prompt') });
    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects a chapter request without the canonical Arc Plan before calling the provider', async () => {
    const generate = vi.fn();
    const unplanned = request();
    delete unplanned.storyInformation.arc;
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: unplanned },
      { environment, providerFactory: () => ({ provider: 'gemini', model: unplanned.model, generate }) },
    );
    expect(result).toMatchObject({ status: 400, body: { error: expect.stringContaining('Arc Plan') } });
    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects an invalid Foundation before a provider call', async () => {
    const invalid = request();
    invalid.storyInformation.currentStory.premise = ' ';
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: invalid }, { environment });
    expect(result).toMatchObject({ status: 400, body: { error: expect.stringContaining('premise') } });
  });

  it('does not expose protected provider failure details', async () => {
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: request() },
      {
        environment,
        providerFactory: () => ({
          provider: 'gemini',
          model: 'google/gemini-3.1-flash-lite',
          generate: async () => { throw new Error('provider private diagnostic'); },
        }),
      },
    );
    expect(result.status).toBe(502);
    expect(JSON.stringify(result.body)).not.toContain('private diagnostic');
  });
});
