import { describe, expect, it, vi } from 'vitest';
import type { HarnessGenerationRequest } from '../../components/harness-generation/shared/types';
import { handleHarnessGenerationHttp } from './http';
import type { HarnessTextGenerationRequest } from './provider';

const request = (): HarnessGenerationRequest => ({
  storyId: 'hst_test',
  attemptId: 'hga_test',
  chapterNumber: 1,
  model: 'google/gemini-3.1-flash-lite',
  foundation: {
    id: 'hfr_test',
    storyId: 'hst_test',
    revision: 1,
    createdAt: '2026-08-29T00:00:00.000Z',
    input: { premise: 'A cartographer returns to a city that has moved overnight.' },
  },
  context: {
    id: 'hctx_test',
    storyId: 'hst_test',
    attemptId: 'hga_test',
    foundationRevision: {
      id: 'hfr_test',
      storyId: 'hst_test',
      revision: 1,
      createdAt: '2026-08-29T00:00:00.000Z',
      input: { premise: 'A cartographer returns to a city that has moved overnight.' },
    },
    storyHead: { nextChapterNumber: 1 },
    chapterNumber: 1,
    createdAt: '2026-08-29T00:00:00.000Z',
    committedChapters: [],
  },
});

const environment = { GEMINI_API_KEY: 'test-key' };

describe('Harness Generation HTTP boundary', () => {
  it('serializes recovery as evidence extraction, with no chapter-generation response schema', async () => {
    const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{"memory":{}}',
      providerReceipt: { provider: 'gemini' as const, model: request().model, generatedAt: '2026-09-05', usage: { source: 'unavailable' as const } } }));
    const original = request();
    original.foundation.input.intendedDirection = 'Future plan must not become an extracted fact.';
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify({
      operation: 'recover-memory', storyId: original.storyId, chapterId: 'saved', model: original.model,
      prose: 'Aria warned that the core would collapse in six hours.', foundation: original.foundation,
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

  it('rejects an invalid Foundation before a provider call', async () => {
    const invalid = request();
    invalid.foundation.input.premise = ' ';
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
