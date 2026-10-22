import { describe, expect, it, vi } from 'vitest';
import { LOOK_SUBJECT_LIMIT, type HarnessLookRequest } from '@seihouse/sen/harness-generation';
import { handleHarnessGenerationHttp } from './http';
import { LOOK_DESCRIBER_INSTRUCTIONS, buildLookDescriberPrompt } from './lookDescriber';
import type { HarnessTextGenerationRequest } from './provider';
import { GENERATION_CONSUMERS } from '../model-router/catalog';

const environment = { GEMINI_API_KEY: 'test-key', OPENROUTER_API_KEY: 'test-key' };
const receipt = { provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite', generatedAt: '2026-10-14', usage: { source: 'unavailable' as const } };

const request = (overrides: Partial<HarnessLookRequest> = {}): HarnessLookRequest => ({
  operation: 'describe-looks', storyId: 'hst_test', chapterId: 'hch_test', chapterNumber: 3,
  model: 'google/gemini-3.1-flash-lite', language: 'en',
  subjects: [
    {
      id: 'appearance:c3-p2:0-40:0', name: 'Han Shuo', entity: 'character', event: 'appears',
      passage: 'Han Shuo stepped out of the furnace smoke. Ash streaked his coal-black hair.',
      declared: 'Age: 18 Appearance: Lean and wiry with calloused hands, sharp hazel eyes.',
    },
    {
      id: 'appearance:c3-p9:0-30:1', name: 'Han Shuo', entity: 'character', event: 'look', change: 'a burn across his palm',
      passage: 'The hilt seared a red line across his palm.',
      previous: { summary: 'A lean, wiry youth with ash-streaked black hair.', traits: { build: 'lean and wiry', hair: 'coal-black, ash-streaked' } },
    },
    { id: 'appearance:c3-p4:0-20:2', name: 'Crimson Broadsword', entity: 'thing', event: 'appears', passage: 'The broadsword was black iron, its edge veined with red.' },
  ],
  ...overrides,
});

const provider = () => {
  const generate = vi.fn(async (_input: HarnessTextGenerationRequest) => ({ rawProviderResponse: '{"looks":[]}', providerReceipt: receipt }));
  return { generate, providerFactory: ({ model }: { model: string }) => ({ provider: 'gemini' as const, model, generate }) };
};

describe('The look step\'s call', () => {
  it('sends its own short instructions and only the passages, at the least reasoning the model accepts, with no randomness', async () => {
    const { generate, providerFactory } = provider();
    const result = await handleHarnessGenerationHttp({ method: 'POST', body: { ...request(), reasoningLevel: 'high' } }, { environment, providerFactory });
    expect(result.status).toBe(200);
    expect(generate).toHaveBeenCalledTimes(1);
    const sent = generate.mock.calls[0][0];
    expect(sent.systemInstruction).toBe(LOOK_DESCRIBER_INSTRUCTIONS);
    // The reader's reasoning choice is for chapters; the look step thinks as little as the model allows.
    expect(sent.reasoningLevel).toBe('minimal');
    expect(sent.temperature).toBe(0);
    expect(sent.maxOutputTokens).toBe(8_192);
    expect(sent.timeoutMs).toBe(60_000);
    expect(sent.userPrompt).toBe([
      'CHAPTER 3 · Language: en',
      [
        'SUBJECT appearance:c3-p2:0-40:0 · Han Shuo · a character · first appearance',
        'Passage: Han Shuo stepped out of the furnace smoke. Ash streaked his coal-black hair.',
        'The author\'s notes: Age: 18 Appearance: Lean and wiry with calloused hands, sharp hazel eyes.',
      ].join('\n'),
      [
        'SUBJECT appearance:c3-p9:0-30:1 · Han Shuo · a character · change of look: a burn across his palm',
        'Passage: The hilt seared a red line across his palm.',
        'Look before: A lean, wiry youth with ash-streaked black hair.',
        '- build: lean and wiry',
        '- hair: coal-black, ash-streaked',
      ].join('\n'),
      [
        'SUBJECT appearance:c3-p4:0-20:2 · Crimson Broadsword · a thing · first appearance',
        'Passage: The broadsword was black iron, its edge veined with red.',
      ].join('\n'),
      'Return only the JSON object, with one entry in looks for every subject, by its id.',
    ].join('\n\n'));
    expect(sent.responseJsonSchema).toEqual(buildLookDescriberPrompt(request()).responseJsonSchema);
  });

  it('asks for what can be seen, in any medium, and never how to show it', () => {
    expect(LOOK_DESCRIBER_INSTRUCTIONS).toContain('never invent a detail');
    expect(LOOK_DESCRIBER_INSTRUCTIONS).toContain('no camera, framing, pose, lighting, mood or art style');
    expect(LOOK_DESCRIBER_INSTRUCTIONS).toContain('the passage wins, and conflict says how in one short sentence');
    expect(LOOK_DESCRIBER_INSTRUCTIONS).toContain('A character: build, face, eyes, hair, skin, clothing, marks, gear');
    expect(LOOK_DESCRIBER_INSTRUCTIONS).toContain('A thing: form, size, material, colour, condition, marks');
  });

  it('refuses a malformed look request before contacting the provider', async () => {
    const { generate, providerFactory } = provider();
    const [subject] = request().subjects;
    const bad: Array<Partial<HarnessLookRequest>> = [
      { subjects: [] },
      { subjects: Array.from({ length: LOOK_SUBJECT_LIMIT + 1 }, (_, index) => ({ ...subject, id: `s${index}` })) },
      { subjects: [{ ...subject, entity: 'place' as never }] },
      { subjects: [{ ...subject, event: 'vanishes' as never }] },
      { subjects: [{ ...subject, passage: 'x'.repeat(2_000) }] },
      { subjects: [{ ...subject, passage: '  ' }] },
      { subjects: [{ ...subject, name: '' }] },
      { subjects: [{ ...subject, previous: { summary: 'A youth.', traits: { hair: 'x'.repeat(401) } } }] },
      { chapterNumber: 0 },
      { language: '' },
    ];
    for (const overrides of bad) {
      expect((await handleHarnessGenerationHttp({ method: 'POST', body: request(overrides) }, { environment, providerFactory })).status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  });

  it('is registered in the Model Router, following the Router\'s model choice', () => {
    expect(GENERATION_CONSUMERS).toContainEqual({ name: 'Look Describer', capability: 'chapters', entry: 'src/server/harness-generation/lookDescriber.ts', modelChoice: 'router' });
  });
});
