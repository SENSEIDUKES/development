import { describe, expect, it, vi } from 'vitest';
import { HARNESS_TAG_RULES, SEN_HOLDINGS_INSTRUCTIONS, SEN_SPEAKERS_INSTRUCTIONS, type HarnessChapterRereadRequest } from '@seihouse/sen/harness-generation';
import { handleHarnessGenerationHttp } from './http';
import type { HarnessTextGenerationRequest } from './provider';

const environment = { GEMINI_API_KEY: 'test-key', OPENROUTER_API_KEY: 'test-key' };
const receipt = { provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite', generatedAt: '2026-10-12', usage: { source: 'unavailable' as const } };

const request = (overrides: Partial<HarnessChapterRereadRequest> = {}): HarnessChapterRereadRequest => ({
  operation: 'reread-chapter', storyId: 'hst_test', chapterId: 'hch_test', chapterNumber: 3,
  model: 'google/gemini-3.1-flash-lite', language: 'en', mainCharacter: 'Ye Chen',
  tags: { speakers: true, holdings: true },
  paragraphs: ['Ye Chen picked up the rusted sword.', '"Mind the edge," the smith said.'],
  ...overrides,
});

const provider = () => {
  const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{"paragraphs":[],"recap":""}', providerReceipt: receipt }));
  return { generate, providerFactory: ({ model }: { model: string }) => ({ provider: 'gemini' as const, model, generate }) };
};

describe('The chapter reread call', () => {
  it('sends the chapter as the reader left it with the tag teaching it was written with, writing no prose, at the least reasoning', async () => {
    const { generate, providerFactory } = provider();
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: { ...request(), reasoningLevel: 'high' } }, { environment, providerFactory });
    expect(result.status).toBe(200);
    const sent = generate.mock.calls[0][0];
    expect(sent.systemInstruction).toContain('Return every paragraph exactly as given');
    for (const teaching of [HARNESS_TAG_RULES, SEN_SPEAKERS_INSTRUCTIONS, SEN_HOLDINGS_INSTRUCTIONS]) expect(sent.systemInstruction).toContain(teaching);
    expect(sent.reasoningLevel).toBe('minimal');
    expect(sent.temperature).toBe(0);
    expect(sent.userPrompt).toContain('CHAPTER 3 · Language: en · Main character: Ye Chen (MC in tags)');
    expect(sent.userPrompt).toContain(JSON.stringify(request().paragraphs));
    // The reply keeps the chapter's paragraph count; the closing list only with holdings.
    expect(sent.responseJsonSchema).toMatchObject({
      properties: { paragraphs: { minItems: 2, maxItems: 2 } }, required: ['paragraphs', 'recap', 'mainCharacterHoldings'],
    });
  });

  it('teaches only the tags the chapter was written with, and refuses a request it cannot read', async () => {
    const { generate, providerFactory } = provider();
    await handleHarnessGenerationHttp({ method: 'POST', body: request({ tags: { speakers: true, holdings: false } }) }, { environment, providerFactory });
    const sent = generate.mock.calls[0][0];
    expect(sent.systemInstruction).toContain(SEN_SPEAKERS_INSTRUCTIONS);
    expect(sent.systemInstruction).not.toContain(SEN_HOLDINGS_INSTRUCTIONS);
    expect(sent.responseJsonSchema).toMatchObject({ required: ['paragraphs', 'recap'] });
    const refused = await handleHarnessGenerationHttp({ method: 'POST', body: request({ paragraphs: [] }) }, { environment, providerFactory });
    expect(refused.status).toBe(400);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
