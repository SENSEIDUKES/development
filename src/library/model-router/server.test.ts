import { describe, expect, it, vi } from 'vitest';
import type { GenerateContentParameters } from '@google/genai';
import { CHAPTER_MODELS, createModelRouter, generateOpenRouterText, ModelRouterError, type GenerationRequest } from './server';

const textRequest = {
  capability: 'text' as const, model: 'openrouter/openai/gpt-6-luna',
  systemInstruction: 'system', userPrompt: 'prompt', temperature: 0.8,
  maxOutputTokens: 100, timeoutMs: 1000, responseFormat: 'json' as const,
};

const expectNoDeprecatedGeminiFields = (config: object) => {
  expect(JSON.stringify(config)).not.toMatch(/"(?:thinkingBudget|thinking_budget|temperature|topP|top_p|topK|top_k)"\s*:/);
};

describe('published Model Router server contract', () => {
  it('routes OpenRouter text with host attribution, usage, and no credential in the result', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
      expect((init?.headers as Record<string, string>)['X-Title']).toBe('Consumer');
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
      }), { status: 200 });
    });
    const result = await createModelRouter({
      credentials: { openrouter: 'secret' }, fetch: fetchMock as typeof fetch,
      openRouterAttribution: { referer: 'https://consumer.example', title: 'Consumer' },
    }).generate(textRequest);
    expect(result).toMatchObject({
      capability: 'text', provider: 'openrouter', text: '{"ok":true}',
      usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('says why an OpenRouter reply has no answer, from the reply itself, never repeating its words', async () => {
    const reply = (choice: object) => createModelRouter({
      credentials: { openrouter: 'secret' },
      fetch: vi.fn(async () => new Response(JSON.stringify({
        provider: 'Alibaba', choices: [choice],
        usage: { prompt_tokens: 9, completion_tokens: 812, total_tokens: 821, completion_tokens_details: { reasoning_tokens: 812 } },
      }), { status: 200 })) as typeof fetch,
    }).generate(textRequest);
    const answerInReasoning = reply({ message: { content: '', reasoning: '{"title":"Secret words"}' }, finish_reason: 'stop' });
    await expect(answerInReasoning).rejects.toMatchObject({
      code: 'provider-error',
      message: 'The configured model returned an empty response (provider Alibaba, finish stop, 812 output tokens, 812 of them reasoning, 24 characters of reasoning that begin like the JSON answer).',
    });
    await expect(answerInReasoning).rejects.not.toMatchObject({ message: expect.stringContaining('Secret words') });
    // A provider failure or a refusal says only its kind: their own text can quote the story.
    const failed = reply({ message: { content: null }, finish_reason: 'error', error: { code: 502, message: 'Upstream overloaded near "Secret words"' } });
    await expect(failed).rejects.toMatchObject({ code: 'provider-error', message: expect.stringMatching(/^The provider failed during the reply with code 502 \(provider Alibaba, finish error, /) });
    await expect(failed).rejects.not.toMatchObject({ message: expect.stringMatching(/Upstream|Secret/) });
    const refused = reply({ message: { content: null, refusal: 'I cannot write "Secret words".' }, finish_reason: 'stop' });
    await expect(refused).rejects.toMatchObject({ message: expect.stringMatching(/^The model refused to answer \(provider Alibaba, /) });
    await expect(refused).rejects.not.toMatchObject({ message: expect.stringContaining('Secret') });
  });

  it('asks OpenRouter for the fastest provider only for models the catalog marks', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchFor = (sent: Array<Record<string, unknown>>) => vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }] }), { status: 200 });
    }) as typeof fetch;
    const router = createModelRouter({ credentials: { openrouter: 'secret' }, fetch: fetchFor(bodies) });
    await router.generate({ ...textRequest, model: 'openrouter/z-ai/glm-5.3-flash' });
    await router.generate(textRequest);
    expect(bodies[0]).toMatchObject({ model: 'z-ai/glm-5.3-flash', provider: { sort: 'throughput' } });
    expect(bodies[1]).not.toHaveProperty('provider');
    // The adapter also takes a bare OpenRouter name; the same model routes the same way.
    await generateOpenRouterText({ apiKey: 'secret', model: 'z-ai/glm-5.3-flash', systemInstruction: 's', userPrompt: 'u', temperature: 1, maxOutputTokens: 100, responseFormat: 'json', fetchImpl: fetchFor(bodies) });
    expect(bodies[2]).toMatchObject({ model: 'z-ai/glm-5.3-flash', provider: { sort: 'throughput' } });
  });

  it('reports a reply still being written at the deadline as a timeout, never as an empty reply', async () => {
    // OpenRouter sends its 200 at once and holds the body open while the model writes.
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => ({
      ok: true, status: 200, statusText: 'OK',
      json: () => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')))),
    }) as unknown as Response);
    const router = createModelRouter({ credentials: { openrouter: 'secret' }, fetch: fetchMock as typeof fetch });
    await expect(router.generate({ ...textRequest, timeoutMs: 20 }))
      .rejects.toMatchObject({ code: 'timeout', message: 'The provider exceeded the 1 second deadline.' });
    // A 200 whose body is not JSON says so.
    const garbled = createModelRouter({
      credentials: { openrouter: 'secret' },
      fetch: vi.fn(async () => new Response('upstream reset', { status: 200 })) as typeof fetch,
    });
    await expect(garbled.generate(textRequest)).rejects.toMatchObject({
      code: 'provider-error', message: expect.stringMatching(/^OpenRouter's reply could not be read: /),
    });
    // A read that fails for its own reason just as the deadline passes is still an unreadable reply, never a timeout.
    const brokenAtDeadline = createModelRouter({
      credentials: { openrouter: 'secret' },
      fetch: vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => ({
        ok: true, status: 200, statusText: 'OK',
        json: () => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new SyntaxError('Unexpected end of JSON input')))),
      }) as unknown as Response) as typeof fetch,
    });
    await expect(brokenAtDeadline.generate({ ...textRequest, timeoutMs: 20 })).rejects.toMatchObject({
      code: 'provider-error', message: "OpenRouter's reply could not be read: Unexpected end of JSON input.",
    });
  });

  it('routes Gemini structured text and reports output limits', async () => {
    const generateContent = vi.fn(async () => ({
      text: '{"ok":true}', usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 7, totalTokenCount: 11 },
      candidates: [{ finishReason: 'STOP' }],
    }));
    const router = createModelRouter({
      credentials: { gemini: 'gemini-secret' },
      createGeminiClient: () => ({ models: { generateContent } }) as never,
    });
    const result = await router.generate({ ...textRequest, model: 'google/gemini-3.8-flash' });
    expect(result).toMatchObject({ capability: 'text', provider: 'gemini', usage: { totalTokens: 11 } });
    expect((generateContent.mock.calls[0] as unknown as [unknown])[0]).toMatchObject({
      model: 'gemini-3.8-flash', config: { responseMimeType: 'application/json' },
    });
    generateContent.mockResolvedValueOnce({ text: 'partial', candidates: [{ finishReason: 'MAX_TOKENS' }] } as never);
    await expect(router.generate({ ...textRequest, model: 'google/gemini-3.8-flash' }))
      .rejects.toMatchObject({ code: 'output-limit' });
  });

  it.each(CHAPTER_MODELS.filter(model => model.provider === 'gemini').flatMap(model =>
    [undefined, ...model.reasoning!.levels].map(level => [model.id, level] as const),
  ))('sends only supported thinking levels and default sampling to %s (%s)', async (model, reasoningLevel) => {
    const generateContent = vi.fn(async (_request: GenerateContentParameters) => ({ text: 'answer' }));
    const router = createModelRouter({
      credentials: { gemini: 'secret' },
      createGeminiClient: () => ({ models: { generateContent } }) as never,
    });
    await router.generate({ ...textRequest, model, reasoningLevel });
    const sent = generateContent.mock.calls[0][0];
    expectNoDeprecatedGeminiFields(sent.config!);
    expect(sent.config).toMatchObject({
      systemInstruction: 'system', maxOutputTokens: 100, responseMimeType: 'application/json',
      abortSignal: expect.any(AbortSignal),
    });
    // With no level chosen, the model's sent default (low) goes instead.
    const reasoning = CHAPTER_MODELS.find(entry => entry.id === model)!.reasoning!;
    const level = reasoningLevel ?? (reasoning.sendDefault ? reasoning.defaultLevel : undefined);
    expect(sent.config!.thinkingConfig).toEqual(level ? { thinkingLevel: level.toUpperCase() } : undefined);
  });

  it.each([
    ['google/gemini-3.8-flash', 'minimal', 'LOW'],
    ['gemini-3.8-flash', 'high', 'HIGH'],
    ['google/gemini-3.1-pro-preview', 'xhigh', 'LOW'],
    ['google/gemini-3.5-flash-lite', 'xhigh', undefined],
    ['google/gemini-unlisted', 'high', undefined],
  ] as const)('uses supported thinking or the model\'s sent default for %s (%s)', async (model, reasoningLevel, expected) => {
    const generateContent = vi.fn(async (_request: GenerateContentParameters) => ({ text: 'answer' }));
    const router = createModelRouter({
      credentials: { gemini: 'secret' },
      createGeminiClient: () => ({ models: { generateContent } }) as never,
    });
    await router.generate({ ...textRequest, model, reasoningLevel });
    const sent = generateContent.mock.calls[0][0];
    expectNoDeprecatedGeminiFields(sent.config!);
    expect(sent.config!.thinkingConfig).toEqual(expected ? { thinkingLevel: expected } : undefined);
  });

  it.each([
    ['openrouter/google/gemini-3.8-flash', 'high', 'high'],
    ['google/gemini-3.8-flash', 'medium', 'medium'],
    ['openrouter/google/gemini-3.8-flash', 'minimal', 'low'],
    ['openrouter/google/gemini-3.8-flash', undefined, 'low'],
    ['openrouter/google/gemini-unlisted', 'high', undefined],
  ] as const)('omits deprecated sampling on OpenRouter Gemini %s (%s)', async (model, reasoningEffort, expected) => {
    let sent: Record<string, unknown> = {};
    await generateOpenRouterText({
      ...textRequest, apiKey: 'secret', model, reasoningEffort,
      fetchImpl: vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        sent = JSON.parse(init!.body as string);
        return new Response(JSON.stringify({ choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }] }));
      }) as typeof fetch,
    });
    expectNoDeprecatedGeminiFields(sent);
    expect(sent.model).toBe(model.replace(/^openrouter\//, ''));
    expect(sent.reasoning).toEqual(expected ? { effort: expected } : undefined);
    expect(sent.messages).toEqual([{ role: 'system', content: 'system' }, { role: 'user', content: 'prompt' }]);
    expect(sent.max_tokens).toBeGreaterThan(textRequest.maxOutputTokens);
  });

  it('keeps non-Gemini OpenRouter sampling and reasoning unchanged', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }],
    })));
    await createModelRouter({ credentials: { openrouter: 'secret' }, fetch: fetchMock }).generate({
      ...textRequest, reasoningLevel: 'xhigh',
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toMatchObject({
      temperature: textRequest.temperature, reasoning: { effort: 'xhigh' },
    });
  });

  it('synthesizes speech bytes and checks the returned artifact', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200, headers: { 'content-type': 'audio/mpeg' },
    }));
    const router = createModelRouter({ credentials: { elevenlabs: 'voice-secret' }, fetch: fetchMock as typeof fetch });
    const result = await router.generate({
      capability: 'tts', model: 'eleven_multilingual_v2', text: 'Hello',
      voiceId: 'private-voice-id', timeoutMs: 1000,
    });
    expect(result).toMatchObject({ capability: 'tts', provider: 'elevenlabs', mimeType: 'audio/mpeg' });
    if (result.capability !== 'tts') throw new Error('Expected speech.');
    expect([...result.bytes]).toEqual([1, 2, 3]);
    expect(String((fetchMock.mock.calls[0] as unknown as [unknown])[0])).toContain('/v1/text-to-speech/private-voice-id');
  });

  it('rejects unimplemented capability, invalid model, missing credential, and provider failure', async () => {
    const router = createModelRouter({ credentials: {} });
    await expect(router.generate({ capability: 'images', model: 'google/gemini-3.1-flash-image' } as unknown as GenerationRequest))
      .rejects.toMatchObject({ code: 'unsupported-capability' });
    await expect(router.generate({ ...textRequest, model: 'tripo-v3.1' }))
      .rejects.toMatchObject({ code: 'invalid-model' });
    await expect(router.generate(textRequest)).rejects.toMatchObject({ code: 'missing-credential' });
    const failing = createModelRouter({
      credentials: { openrouter: 'secret' },
      fetch: vi.fn(async () => new Response(JSON.stringify({ error: { message: 'No credits' } }), { status: 402 })) as typeof fetch,
    });
    await expect(failing.generate(textRequest)).rejects.toMatchObject({ code: 'provider-error', message: 'OpenRouter 402: No credits' });
    expect(ModelRouterError).toBeDefined();
  });
});
