import { describe, expect, it, vi } from 'vitest';
import { createModelRouter, ModelRouterError, type GenerationRequest } from './server';

const textRequest = {
  capability: 'text' as const, model: 'openrouter/openai/gpt-6-luna',
  systemInstruction: 'system', userPrompt: 'prompt', temperature: 0.8,
  maxOutputTokens: 100, timeoutMs: 1000, responseFormat: 'json' as const,
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
    await expect(reply({ message: { content: null }, finish_reason: 'error', error: { code: 502, message: 'Upstream overloaded' } }))
      .rejects.toMatchObject({ code: 'provider-error', message: expect.stringMatching(/^The provider failed during the reply: Upstream overloaded \(provider Alibaba, finish error, /) });
    await expect(reply({ message: { content: null, refusal: 'I cannot write that.' }, finish_reason: 'stop' }))
      .rejects.toMatchObject({ message: expect.stringMatching(/^The model refused: I cannot write that\. \(/) });
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
