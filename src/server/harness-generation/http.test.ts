import { describe, expect, it } from 'vitest';
import type { HarnessGenerationRequest } from '../../components/harness-generation/shared/types';
import { handleHarnessGenerationHttp } from './http';

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
