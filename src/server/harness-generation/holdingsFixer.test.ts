import { describe, expect, it, vi } from 'vitest';
import type { HarnessHoldingsFixRequest } from '@seihouse/sen/harness-generation';
import { handleHarnessGenerationHttp } from './http';
import { HOLDINGS_FIXER_INSTRUCTIONS, buildHoldingsFixerPrompt } from './holdingsFixer';
import type { HarnessTextGenerationRequest } from './provider';
import { lowestReasoningLevel } from '../model-router/catalog';

const environment = { GEMINI_API_KEY: 'test-key', OPENROUTER_API_KEY: 'test-key' };
const receipt = { provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite', generatedAt: '2026-10-06', usage: { source: 'unavailable' as const } };

const request = (overrides: Partial<HarnessHoldingsFixRequest> = {}): HarnessHoldingsFixRequest => ({
  operation: 'fix-holdings', storyId: 'hst_test', chapterId: 'hch_test', chapterNumber: 2,
  model: 'google/gemini-3.1-flash-lite', language: 'en', mainCharacter: 'Ye Chen', direction: 'Ye Chen trains with the sword.',
  cases: [
    {
      id: 'c1', problems: ['Ye Chen gains ‘Rusted Iron Sword’ again, but already holds it. It is not counted twice.'],
      passage: { before: 'Ye Chen stepped into the yard.', sentence: 'He picked up the rusted sword again.' },
      tags: '[[gained: MC | Rusted Iron Sword]]',
      record: ['Ye Chen before this chapter: has Rusted Iron Sword.'],
      answers: ['record', 'prose', 'fine', 'major'],
    },
    {
      id: 'c2', problems: ['the writer\'s closing list for Ye Chen includes ‘Silver Bell’, which no tag recorded.'],
      mentions: [{ id: 'm1', sentence: 'Ye Chen found a silver bell in the dust.' }],
      answers: ['record', 'fine'],
    },
  ],
  ...overrides,
});

const provider = () => {
  const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{"fixes":[]}', providerReceipt: receipt }));
  return { generate, providerFactory: ({ model }: { model: string }) => ({ provider: 'gemini' as const, model, generate }) };
};

describe('The Holdings fixer call', () => {
  it('sends its own short instructions and only the cases, at the least reasoning the model accepts, with no randomness', async () => {
    const { generate, providerFactory } = provider();
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: { ...request(), reasoningLevel: 'high' } }, { environment, providerFactory });
    expect(result.status).toBe(200);
    expect(generate).toHaveBeenCalledTimes(1);
    const sent = generate.mock.calls[0][0];
    expect(sent.systemInstruction).toBe(HOLDINGS_FIXER_INSTRUCTIONS);
    // The reader's reasoning choice is for chapters; the fixer thinks as little as the model allows.
    expect(sent.reasoningLevel).toBe('minimal');
    expect(sent.temperature).toBe(0);
    expect(sent.maxOutputTokens).toBe(8_192);
    expect(sent.timeoutMs).toBe(60_000);
    expect(sent.userPrompt).toBe([
      'CHAPTER 2 · Language: en · Main character: Ye Chen (MC in tags)\nREADER\'S DIRECTION FOR THIS CHAPTER: Ye Chen trains with the sword.',
      [
        'CASE c1 · answers: record, prose, fine, major', 'Problems:',
        '- Ye Chen gains ‘Rusted Iron Sword’ again, but already holds it. It is not counted twice.',
        'Sentence before: Ye Chen stepped into the yard.', 'Sentence: He picked up the rusted sword again.',
        'Tags on the sentence: [[gained: MC | Rusted Iron Sword]]', 'Record:', '- Ye Chen before this chapter: has Rusted Iron Sword.',
      ].join('\n'),
      [
        'CASE c2 · answers: record, fine', 'Problems:',
        '- the writer\'s closing list for Ye Chen includes ‘Silver Bell’, which no tag recorded.',
        'Sentences that name it:', '- m1: Ye Chen found a silver bell in the dust.',
      ].join('\n'),
      'Return only the JSON object, with one entry in fixes for every case.',
    ].join('\n\n'));
    expect(sent.responseJsonSchema).toEqual(buildHoldingsFixerPrompt(request()).responseJsonSchema);
  });

  it('uses each model\'s lowest reasoning level', () => {
    expect(lowestReasoningLevel('google/gemini-3.8-flash')).toBe('low');
    expect(lowestReasoningLevel('openrouter/z-ai/glm-5.3-flash')).toBe('low');
    expect(lowestReasoningLevel('openrouter/qwen/qwen3.8-flash')).toBe('none');
    expect(lowestReasoningLevel('openrouter/minimax/minimax-m2.7')).toBeUndefined();
  });

  it('refuses a malformed fixer request before contacting the provider', async () => {
    const { generate, providerFactory } = provider();
    const bad: Array<Partial<HarnessHoldingsFixRequest>> = [
      { cases: [] },
      { cases: Array.from({ length: 13 }, (_, index) => ({ ...request().cases[0], id: `c${index + 1}` })) },
      { cases: [{ ...request().cases[0], answers: ['rewrite' as never] }] },
      { cases: [{ ...request().cases[0], passage: { sentence: 'x'.repeat(2_001) } }] },
      { chapterNumber: 0 },
      { language: '' },
    ];
    for (const overrides of bad) {
      expect((await handleHarnessGenerationHttp({ method: 'POST', body: request(overrides) }, { environment, providerFactory })).status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  });
});
