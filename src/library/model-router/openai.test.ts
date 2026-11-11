import { describe, expect, it, vi } from 'vitest';
import { createModelRouter } from './server';
import { CHAPTER_MODELS, IMAGE_MODELS, resolveChapterModelRoute, textModelProvider } from './catalog';

const textRequest = { capability: 'text' as const, model: 'openai/gpt-6.1-terra', systemInstruction: 'Write.', userPrompt: 'A story.', temperature: 0.9, maxOutputTokens: 4096, timeoutMs: 1000 };
const completed = { status: 'completed', output: [{ type: 'reasoning', content: [{ type: 'summary_text', text: 'private' }] }, { type: 'message', content: [{ type: 'output_text', text: '{"title":"Dawn"}' }] }], usage: { input_tokens: 4, output_tokens: 8, total_tokens: 12 } };
const imageRequest = { capability: 'image' as const, model: 'openai/gpt-image-2.6-flare', prompt: 'A mountain.', aspectRatio: '2:3', timeoutMs: 1000 };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSAAAAABJRU5ErkJggg==';
const reply = (body: unknown) => new Response(JSON.stringify(body));

describe('direct OpenAI routing', () => {
  it('only offers direct writing models with their own key, preserving OpenRouter and defaults', () => {
    const route = (env: Record<string, string>) => resolveChapterModelRoute(env, 'MODELS', 'DEFAULT');
    expect(route({ OPENROUTER_API_KEY: 'or' }).models.some(model => model.id.startsWith('openai/'))).toBe(false);
    const configured = route({ OPENAI_API_KEY: 'direct' });
    expect(configured.keys.openai).toBe('direct');
    expect(configured.models.filter(model => model.id.startsWith('openai/'))).toHaveLength(15);
    expect(configured.defaultModel).toBe('google/gemini-3.1-flash-lite');
    expect(textModelProvider('openai/gpt-image-2.6-flare')).toBeUndefined();
    expect(textModelProvider('openai/unknown')).toBeUndefined();
  });

  it.each(CHAPTER_MODELS.filter(model => model.provider === 'openai'))('executes $id through Responses with valid reasoning and no custom sampling', async model => {
    const fetchImpl = vi.fn(async () => reply(completed));
    const router = createModelRouter({ credentials: { openai: 'direct' }, fetch: fetchImpl });
    const result = await router.generate({ ...textRequest, model: model.id, reasoningLevel: 'minimal', responseFormat: 'json', responseJsonSchema: { type: 'object', additionalProperties: true } });
    expect(result).toMatchObject({ provider: 'openai', model: model.id, text: '{"title":"Dawn"}', usage: { inputTokens: 4, outputTokens: 8, totalTokens: 12 } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer direct' });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: model.id.slice(7), input: 'A story.', store: false, max_output_tokens: 4096, reasoning: { effort: model.reasoning!.defaultLevel } });
    expect(body.instructions).toContain('"additionalProperties":true');
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('text');
  });

  it.each([
    [{ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }, 'output-limit'],
    [{ status: 'failed' }, 'provider-error'],
    [{ status: 'completed', output: [] }, 'provider-error'],
    [{ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }, 'provider-error'],
  ])('rejects incomplete, failed, empty and declined answers', async (body, code) => {
    await expect(createModelRouter({ credentials: { openai: 'key' }, fetch: async () => reply(body) }).generate(textRequest)).rejects.toMatchObject({ code });
  });

  it('requires the direct key and never falls back to another provider', async () => {
    const fetchImpl = vi.fn();
    await expect(createModelRouter({ credentials: { openrouter: 'other' }, fetch: fetchImpl }).generate(textRequest)).rejects.toMatchObject({ code: 'missing-credential' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('redacts provider errors and preserves the deadline', async () => {
    await expect(createModelRouter({ credentials: { openai: 'secret' }, fetch: async () => new Response('secret details', { status: 403 }) }).generate(textRequest)).rejects.toThrow('OpenAI returned HTTP 403.');
    const fetchImpl: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('secret'))));
    await expect(createModelRouter({ credentials: { openai: 'secret' }, fetch: fetchImpl }).generate({ ...textRequest, timeoutMs: 5 })).rejects.toMatchObject({ code: 'timeout' });
  });

  it.each(IMAGE_MODELS.filter(model => model.provider === 'openai'))('generates $id and returns the existing image contract', async model => {
    const fetchImpl = vi.fn(async () => reply({ data: [{ b64_json: png }] }));
    const result = await createModelRouter({ credentials: { openai: 'key' }, fetch: fetchImpl }).generate({ ...imageRequest, model: model.id });
    expect(result).toMatchObject({ provider: 'openai', data: png, mimeType: 'image/png' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/images/generations');
    expect(JSON.parse(init.body as string)).toMatchObject({ model: model.id.slice(7), size: '1024x1536', output_format: 'png', quality: 'medium', n: 1 });
  });

  it('sends portrait references as multipart edits, without setting the multipart boundary itself', async () => {
    const fetchImpl = vi.fn(async () => reply({ data: [{ b64_json: png }] }));
    await createModelRouter({ credentials: { openai: 'key' }, fetch: fetchImpl }).generate({ ...imageRequest, aspectRatio: '1:1', referenceImages: [{ data: png, mimeType: 'image/png' }] });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/images/edits');
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('size')).toBe('1024x1024');
    expect((init.body as FormData).getAll('image[]')).toHaveLength(1);
  });

  it('rejects invalid reference data before any request and empty returned images', async () => {
    const fetchImpl = vi.fn(async () => reply({ data: [] }));
    const router = createModelRouter({ credentials: { openai: 'key' }, fetch: fetchImpl });
    await expect(router.generate({ ...imageRequest, referenceImages: [{ data: 'invalid!', mimeType: 'image/png' }] })).rejects.toMatchObject({ code: 'invalid-model' });
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(router.generate(imageRequest)).rejects.toMatchObject({ code: 'provider-error' });
  });
});
