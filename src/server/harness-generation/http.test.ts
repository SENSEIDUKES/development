import { describe, expect, it, vi } from 'vitest';
import { type HarnessGenerationRequest } from '@seihouse/sen/harness-generation';
import { handleHarnessGenerationHttp } from './http';
import type { HarnessTextGenerationRequest } from './provider';
import { SEN_NOVEL_AUTHOR_SKILL } from '@seihouse/sen/harness-generation';
import { assembleCapaPrompt } from '@seihouse/sen/harness-generation';
import { composeHarnessSystemInstruction } from './prompt';
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
    currentStory: { title: 'The Moved City', originalLanguage: 'en', premise: foundation().input.premise, corrections: [] },
    storyDirection: { destinedEnding: 'Restore the city.', hardPins: [] },
    arc: arcGenerationContext({ arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Reach the moved city.', chapters: 30 }] }, 1, 'Restore the city.'),
    previouslyOn: [],
    canonicalState: { characters: [], relationships: [], locations: [], factions: [], artifacts: [], abilities: [], resources: [] },
    codex: { entries: [] },
    diagnostics: { budgetSource: 'test', sections: [], omitted: [], identityAmbiguities: [], storage: { chapters: 0, events: 0, canonicalRecords: 0, activeRecords: 0, recaps: 0 } },
  },
  missionReminder: buildMissionReminder(capaPrompt()),
  immediateChapterRequest: { chapterNumber: 1, continuation: false, chapterScale: { minWords: 1_800, maxWords: 2_500 } },
  chapterPlan: { cast: [{ name: 'Mara', kind: 'character', mainCharacter: true }], events: [{ kind: 'journey', actor: { name: 'MC' }, targets: [], presses: [], how: 'Mara reaches the moved city.', facts: [] }] },
});

const environment = { GEMINI_API_KEY: 'test-key' };

/** The arc planner's own context, which every planning request carries. */
const PLANNING = { arcNumber: 2, plannedArcCount: 2, finalArc: true, previousArcs: [], lookahead: [] };

describe('Harness Generation HTTP boundary', () => {
  it('passes the Router reasoning level to the provider only when the model accepts it', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-23', usage: { source: 'unavailable' as const } } }));
    const send = (reasoningLevel: string) => handleHarnessGenerationHttp({ method: 'POST', body: { ...request(), operation: 'plan-arc', planning: PLANNING, reasoningLevel } },
      { environment, providerFactory: () => ({ provider: 'gemini', model: request().model, generate }) });
    await send('high');
    await send('xhigh');
    expect(generate.mock.calls.map(call => call[0].reasoningLevel)).toEqual(['high', undefined]);
  });

  it('routes automatic Arc planning through the provider with its own structured schema', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-13', usage: { source: 'unavailable' as const } } }));
    const original = request();
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: { ...original, operation: 'plan-arc', planning: PLANNING } },
      { environment, providerFactory: () => ({ provider: 'gemini', model: original.model, generate }) });
    expect(result.status).toBe(200);
    expect(generate).toHaveBeenCalledOnce();
    const schema = generate.mock.calls[0][0].responseJsonSchema as { properties: Record<string, unknown> };
    expect(schema.properties).toHaveProperty('plan');
    expect(schema.properties).toHaveProperty('lookahead');
    expect(schema.properties).not.toHaveProperty('prose');
    // Only the planner receives its planning context.
    expect(generate.mock.calls[0][0].userPrompt).toContain('"finalArc": true');
    const missing = await handleHarnessGenerationHttp({ method: 'POST', body: { ...original, operation: 'plan-arc' } },
      { environment, providerFactory: () => ({ provider: 'gemini', model: original.model, generate }) });
    expect(missing.status).toBe(400);
    expect(generate).toHaveBeenCalledOnce();
  });
  it('rejects unknown operations and the retired memory operation before contacting the provider', async () => {
    for (const body of [{ ...request(), operation: 'unknown' }, {
      ...request(), operation: 'recover-memory', chapterId: 'saved', prose: 'Saved prose.',
    }]) expect((await handleHarnessGenerationHttp({ method: 'POST', body }, { environment })).status).toBe(400);
  });
  it('rejects sound words outside the Sound Cue pack limits before contacting the provider, and asks for no list of sounds in the reply', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({
      rawProviderResponse: JSON.stringify({ paragraphs: ['The gate held.'] }),
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-29', usage: { source: 'unavailable' as const } },
    }));
    const providerFactory = () => ({ provider: 'gemini' as const, model: request().model, generate });
    for (const soundVocabulary of [
      'blade drawn',
      [{ word: 'Blade Drawn!', example: 'drew his sword' }],
      [{ word: 'blade drawn', example: 'see https://example.com' }],
      Array.from({ length: 33 }, (_, index) => ({ word: `sound ${String.fromCharCode(97 + (index % 26))}${index}`, example: 'it sounded' })),
    ]) {
      const body = request();
      body.capaPrompt = { ...body.capaPrompt, soundVocabulary: soundVocabulary as never };
      expect((await handleHarnessGenerationHttp({ method: 'POST', body }, { environment, providerFactory })).status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();

    const body = request();
    body.capaPrompt = { ...body.capaPrompt, soundVocabulary: [{ word: ' Blade Drawn ', example: 'drew his sword' }] };
    expect((await handleHarnessGenerationHttp({ method: 'POST', body }, { environment, providerFactory })).status).toBe(200);
    // The words travel in the CAPA Prompt the writer reads; the reply carries sound tags, never a list.
    const schema = generate.mock.calls[0][0].responseJsonSchema as { properties: Record<string, unknown> };
    expect(schema.properties).not.toHaveProperty('soundCues');
  });

  it('rejects a chapter paragraph count that is not a sane whole number before contacting the provider', async () => {
    const generate = vi.fn();
    const providerFactory = () => ({ provider: 'gemini' as const, model: request().model, generate });
    for (const paragraphs of [0, 2.5, 601, '73']) {
      const body = request();
      body.immediateChapterRequest = { ...body.immediateChapterRequest, chapterScale: { ...body.immediateChapterRequest.chapterScale, paragraphs: paragraphs as never } };
      expect((await handleHarnessGenerationHttp({ method: 'POST', body }, { environment, providerFactory })).status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  });

  it('sends a chapter rewrite with the reader\'s note, and refuses a malformed one or a note past its limit before contacting the provider', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-10-06', usage: { source: 'unavailable' as const } } }));
    const providerFactory = () => ({ provider: 'gemini' as const, model: request().model, generate });
    const rewriting = (rewrite: unknown) => {
      const body = request();
      body.immediateChapterRequest = { ...body.immediateChapterRequest, rewrite: rewrite as never };
      return handleHarnessGenerationHttp({ method: 'POST', body }, { environment, providerFactory });
    };
    for (const rewrite of [
      'Make it darker.',
      { note: 'Make it darker.', previous: { title: 'The Keeper' } },
      { replacesChapterId: 'chapter-2', note: 'Make it darker.' },
      { replacesChapterId: 'chapter-2', note: '   ', previous: { title: 'The Keeper' } },
      { replacesChapterId: 'chapter-2', note: 'x'.repeat(1_201), previous: { title: 'The Keeper' } },
    ]) expect((await rewriting(rewrite)).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();

    expect((await rewriting({ replacesChapterId: 'chapter-2', note: 'Make it darker.', previous: { title: 'The Keeper', recap: 'Lin met the keeper.' } })).status).toBe(200);
    expect(generate).toHaveBeenCalledTimes(1);
    const sent = generate.mock.calls[0][0].userPrompt;
    expect(sent).toContain('REWRITE: the reader asked for Chapter 1 to be written again. The version they set aside: "The Keeper", Lin met the keeper.');
    expect(sent).toContain('The Chapter Plan was made again from their note: "Make it darker.".');
  });

  it('sends the planner\'s call with its own instruction, skills and schema, and refuses one without the Codex before contacting the provider', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-10-20', usage: { source: 'unavailable' as const } } }));
    const providerFactory = () => ({ provider: 'gemini' as const, model: request().model, generate });
    const { storyId, attemptId, model, storyInformation, immediateChapterRequest } = request();
    const planning = { operation: 'plan-chapter', storyId, attemptId, model, storyInformation, immediateChapterRequest,
      planningSkills: 'CAPA SKILL [Pacing] — Patient Siege v1.0.0\nDo not resolve the siege in this chapter.' };
    const { codex: _codex, ...withoutCodex } = storyInformation;
    expect((await handleHarnessGenerationHttp({ method: 'POST', body: { ...planning, storyInformation: withoutCodex } }, { environment, providerFactory })).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();

    const result = await handleHarnessGenerationHttp({ method: 'POST', body: planning }, { environment, providerFactory });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ requestMeasurement: { sections: expect.arrayContaining([{ section: 'codex', characters: expect.any(Number) }]) } });
    const input = generate.mock.calls[0][0];
    expect(input.systemInstruction).toMatch(/^# ROLE AND MISSION\n\nYou are Fate for a serialized novel\./);
    // Its skills open How to plan the chapter, before the HARNESS's own rules.
    expect(input.systemInstruction).toContain('# HOW TO PLAN THE CHAPTER\n\nCAPA SKILL [Pacing] — Patient Siege v1.0.0\nDo not resolve the siege in this chapter.\n\nCAST:');
    expect(input.userPrompt).toContain('THE CODEX (everyone and everything the story knows');
    expect(input.userPrompt).toContain('Chapter 1, chapter 1 of 30 in Arc 1.');
    expect(Object.keys((input.responseJsonSchema as { properties: object }).properties)).toEqual(['cast', 'events', 'arcGoalReached', 'chapterFunction']);
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
        { id: 'seihouse.pacing', version: '1.0.0', name: 'Long Siege', description: 'Pacing.', slot: 'pacing', applications: ['generation'], instructions: 'Keep the siege going for three arcs.' },
        { id: 'seihouse.style', version: '1.0.0', name: 'Patient Siege', description: 'Style.', slot: 'style', applications: ['generation'], instructions: 'Do not resolve the siege in this chapter.' },
        SEN_NOVEL_AUTHOR_SKILL,
      ],
    });
    skilled.immediateChapterRequest = { chapterNumber: 1, continuation: false, chapterScale: { minWords: 1_800, maxWords: 2_500 },
      direction: { id: 'hdir-test', forChapter: 1, choice: { kind: 'reader', text: 'Bring the envoy to the gate.' }, chosenAt: '2026-09-25T00:00:00.000Z' } };
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: skilled },
      { environment, providerFactory: () => ({ provider: 'gemini', model: skilled.model, generate }) },
    );
    expect(result.status).toBe(200);
    const input = generate.mock.calls[0][0] as HarnessTextGenerationRequest;
    // Authoring instruction: the role first, then the CAPA Prompt under How to write, in schema order (Author before Style), then the HARNESS parts.
    expect(input.systemInstruction).toBe(composeHarnessSystemInstruction(skilled.capaPrompt));
    expect(input.systemInstruction).toMatch(/^# ROLE AND MISSION\n\nYou are the author of this novel\./);
    expect(input.systemInstruction).toContain('# HOW TO WRITE\n\nCAPA SKILL [Author] — SEN Novel Author v1.0.0\n');
    expect(input.systemInstruction.indexOf('CAPA SKILL [Author]')).toBeLessThan(input.systemInstruction.indexOf('CAPA SKILL [Style]'));
    // Pacing decides what happens, so only the planner reads it.
    expect(input.systemInstruction).not.toContain('CAPA SKILL [Pacing]');
    expect(input.systemInstruction).not.toContain('Keep the siege going for three arcs.');
    expect(input.systemInstruction).toContain('elite Eastern fantasy web-novel author specializing in Asian light novels');
    expect(input.systemInstruction.split('Do not resolve the siege in this chapter.')).toHaveLength(2);
    expect(input.systemInstruction).toContain('paragraphs is the complete chapter and its sole body');
    // Narration only: the old signal families are gone, and the guard against invented IDs and assets stays.
    expect(input.systemInstruction).not.toMatch(/anchorText|dialogue:|systemPanels|creatureEvents/);
    expect(input.systemInstruction).toContain('Do not invent block IDs');
    expect(input.systemInstruction).not.toContain('memory object');
    expect(input.systemInstruction).not.toContain('blocks array');
    expect(input.systemInstruction.split('# HOW TO RETURN THE CHAPTER')).toHaveLength(2);
    expect(skilled.capaPrompt.text).not.toContain('# HOW TO RETURN THE CHAPTER');
    expect(skilled.capaPrompt.text).not.toMatch(/R2|track list|Library Cue catalog/i);
    // The provider schema is the compact semantic contract, never the SEN block, memory, or presentation contracts.
    const chapterSchema = input.responseJsonSchema as { properties: Record<string, unknown>; required: string[] };
    // The writer narrates and never decides: no arc goal, ending or chapter function in its reply.
    expect(chapterSchema.required).toEqual(['paragraphs', 'recap', 'nextProgression', 'nextWorldBuilding', 'nextConflict']);
    // Diagnostics never leave the HARNESS.
    expect(input.userPrompt).not.toMatch(/selectionAudit|diagnostics|budgetSource/);
    expect(Object.keys(chapterSchema.properties)).not.toContain('blocks');
    expect(Object.keys(chapterSchema.properties)).not.toContain('memory');
    expect(JSON.stringify(chapterSchema)).not.toContain('anyOf');
    expect(JSON.stringify(chapterSchema)).not.toContain('fateResult');
    // Generation content: story information plus the immediate request, with no skill instructions.
    expect(input.userPrompt).toMatch(/^# STORY INFORMATION \(story data/);
    expect(input.userPrompt).toContain('CURRENT STORY INFORMATION');
    // The reader's direction is stated once, in the request that acts on it.
    expect(input.userPrompt.split('Bring the envoy to the gate.')).toHaveLength(2);
    expect(input.userPrompt.indexOf('CURRENT STORY INFORMATION')).toBeLessThan(input.userPrompt.indexOf('IMMEDIATE CHAPTER REQUEST'));
    expect(input.userPrompt).toContain('The reader\'s direction for this chapter: Bring the envoy to the gate. The Chapter Plan carries it out.');
    expect(input.userPrompt.indexOf('The reader\'s direction for this chapter')).toBeGreaterThan(input.userPrompt.indexOf('IMMEDIATE CHAPTER REQUEST'));
    // The Mission Reminder is its own section, last, after the request: it closes the call.
    expect(input.userPrompt).toContain('# MISSION REMINDER\n\nYou are the author of this novel, writing the chapter requested above.');
    expect(input.userPrompt.indexOf('# MISSION REMINDER')).toBeGreaterThan(input.userPrompt.indexOf('IMMEDIATE CHAPTER REQUEST'));
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

  it('sends each model its default reasoning (low, or lower where that finishes a chapter) when the reader chose none', async () => {
    const sent: Array<[string, unknown]> = [];
    const write = (model: string, reasoningLevel?: string) => handleHarnessGenerationHttp(
      { method: 'POST', body: { ...request(), model, ...(reasoningLevel ? { reasoningLevel } : {}) } },
      { environment: { ...environment, OPENROUTER_API_KEY: 'router-key' }, providerFactory: () => ({
        provider: 'openrouter', model,
        generate: async (input: HarnessTextGenerationRequest) => {
          sent.push([model, input.reasoningLevel]);
          return { rawProviderResponse: '{}', providerReceipt: { provider: 'openrouter', model, generatedAt: '2026-10-04', usage: { source: 'unavailable' as const } } };
        },
      }) },
    );
    await write('openrouter/z-ai/glm-5.3-flash');
    await write('openrouter/qwen/qwen3.8-flash');
    await write('openrouter/deepseek/deepseek-v4.1-flash');
    await write('openrouter/z-ai/glm-5.3-flash', 'medium');
    await write('openrouter/openai/gpt-6-luna');
    await write('openrouter/minimax/minimax-m2.7');
    expect(sent).toEqual([
      ['openrouter/z-ai/glm-5.3-flash', 'low'],
      ['openrouter/qwen/qwen3.8-flash', 'none'],
      ['openrouter/deepseek/deepseek-v4.1-flash', 'none'],
      // The reader's own choice wins; low goes by default; a model without levels sends nothing.
      ['openrouter/z-ai/glm-5.3-flash', 'medium'],
      ['openrouter/openai/gpt-6-luna', 'low'],
      ['openrouter/minimax/minimax-m2.7', undefined],
    ]);
  });

  it('tells the reader a chapter was stopped at the deadline, not that it failed for no reason', async () => {
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: request() },
      { environment, providerFactory: () => ({
        provider: 'gemini', model: 'google/gemini-3.1-flash-lite',
        generate: async () => { throw new Error('The provider exceeded the Harness Generation 170 second deadline.'); },
      }) },
    );
    expect(result).toMatchObject({ status: 502, body: { error: 'The model was still writing after 170 seconds, so it was stopped. Choose a lower reasoning level or a faster model in the Model Router. The prior committed story is unchanged.' } });
  });

  it('tells the reader when a provider rejected its key, so a retry is not wasted, without its private details', async () => {
    const result = await handleHarnessGenerationHttp(
      { method: 'POST', body: request() },
      { environment, providerFactory: () => ({
        provider: 'gemini', model: 'google/gemini-3.1-flash-lite',
        generate: async () => { throw new Error('MiniMax returned HTTP 401. Check the key, plan access and remaining quota. trace=private'); },
      }) },
    );
    expect(result.status).toBe(502);
    expect((result.body as { error: string }).error).toMatch(/^The provider for .+ rejected its key \(HTTP 401\)\. Check that provider's key, plan and remaining credit in the server settings, or choose another model in the Model Router\. The prior committed story is unchanged\.$/);
    expect(JSON.stringify(result.body)).not.toContain('trace=private');
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
