import { describe, expect, it, vi } from 'vitest';
import type { ReaderTranslationRequest } from '../../components/reader-chamber/shared/translation/contract';
import type { HarnessTextModelProvider } from '../harness-generation/provider';
import { handleReaderTranslationHttp, type ReaderTranslationProviderFactory } from './http';
import { buildReaderTranslationPrompt } from './prompt';

const environment = { GEMINI_API_KEY: 'fixture-key' };

/** Test-only frozen request. No product Translation skill is involved. */
const request = (overrides: Partial<ReaderTranslationRequest> = {}): ReaderTranslationRequest => ({
  schemaVersion: 1,
  storyId: 'story-1',
  chapterNumber: 1,
  sourceLanguage: 'ja',
  targetLanguage: 'ko',
  sourceContentHash: 'hash-1',
  skill: { id: 'test.reader.translation.ko', version: '1.0.0', targetLanguage: 'ko' },
  instructions: 'Render reader-facing values in the declared target language.',
  source: {
    title: 'The Closed Gate',
    blocks: [{ id: 'block-1', text: 'The courier climbed the stair.' }],
  },
  frozenAt: '2026-09-15T00:00:00.000Z',
  ...overrides,
});

type Generate = HarnessTextModelProvider['generate'];

const providerFactory = (generate: Generate): ReaderTranslationProviderFactory => () => ({
  provider: 'gemini' as const,
  model: 'google/gemini-3.1-flash-lite',
  generate,
});

describe('the reader translation route', () => {
  it('returns the raw provider reply and receipt for the client validator', async () => {
    const generate = vi.fn<Generate>().mockResolvedValue({
      rawProviderResponse: '{"title":"닫힌 문","blocks":[{"id":"block-1","text":"전령이 계단을 올랐다."}]}',
      providerReceipt: {
        provider: 'gemini',
        model: 'google/gemini-3.1-flash-lite',
        generatedAt: '2026-09-15T00:00:00.000Z',
        usage: { source: 'unavailable' },
      },
    });

    const response = await handleReaderTranslationHttp(
      { method: 'POST', body: JSON.stringify(request()) },
      { environment, providerFactory: providerFactory(generate) },
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      rawProviderResponse: expect.stringContaining('block-1'),
      receipt: { provider: 'gemini' },
    });
    // A translation restates existing prose; it must not invent variation.
    expect(generate.mock.calls[0][0].temperature).toBe(0);
  });

  it('refuses a request that is not a real translation', async () => {
    const refusals: Array<[Partial<ReaderTranslationRequest>, string]> = [
      [{ targetLanguage: 'ja' }, 'never translated into its own original language'],
      [{ instructions: '   ' }, 'installed Translation skill'],
      [{ skill: { id: 'x', version: '1.0.0', targetLanguage: 'vi' } }, 'does not declare the requested target language'],
      [{ source: { title: 'Empty', blocks: [] } }, 'frozen reader-facing chapter material'],
    ];

    for (const [overrides, message] of refusals) {
      const response = await handleReaderTranslationHttp(
        { method: 'POST', body: JSON.stringify(request(overrides)) },
        { environment },
      );
      expect(response.status).toBe(400);
      expect((response.body as { error: string }).error).toContain(message);
    }
  });

  it('reports a provider failure without claiming the chapter changed', async () => {
    const response = await handleReaderTranslationHttp(
      { method: 'POST', body: JSON.stringify(request()) },
      {
        environment,
        providerFactory: providerFactory(vi.fn<Generate>().mockRejectedValue(new Error('upstream down'))),
      },
    );

    expect(response.status).toBe(502);
    expect((response.body as { error: string }).error).toContain('original chapter is unchanged');
  });

  it('reports a missing provider key rather than silently doing nothing', async () => {
    const response = await handleReaderTranslationHttp(
      { method: 'POST', body: JSON.stringify(request()) },
      { environment: {} },
    );

    expect(response.status).toBe(503);
  });
});

describe('the reader translation prompt', () => {
  it('states the structural contract and carries only reader-facing material', () => {
    const prompt = buildReaderTranslationPrompt(request({
      glossary: [{ term: 'Qi Condensation', translation: '기 응축' }],
    }));

    expect(prompt.systemInstruction).toContain('Render reader-facing values in the declared target language.');
    expect(prompt.systemInstruction).toContain('Copy every "id" through unchanged');
    expect(prompt.systemInstruction).toContain('Never emit block types');
    expect(prompt.systemInstruction).toContain('기 응축');
    expect(prompt.userPrompt).toContain('The courier climbed the stair.');
    expect(prompt.userPrompt).toContain('block-1');
  });

  it('omits the glossary section entirely when no entry was selected', () => {
    expect(buildReaderTranslationPrompt(request()).systemInstruction)
      .not.toContain('TRANSLATION GLOSSARY REFERENCE');
  });
});
