import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createModelRouter, LOCAL_LM_STUDIO_MODEL, resolveChapterModelRoute } from './server';
import { createHarnessTextProvider } from '../../server/harness-generation/provider';
import { createWorldBlueprintProvider } from '../../server/story-seed-blueprint/generate';
import { modelRouterStatus } from '../../server/model-router/status';

const request = {
  capability: 'text' as const, model: LOCAL_LM_STUDIO_MODEL,
  systemInstruction: 'system', userPrompt: 'prompt', temperature: 0.8,
  maxOutputTokens: 100, timeoutMs: 1000, responseFormat: 'json' as const,
  responseJsonSchema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
};
const loaded = { id: 'vendor/local-model.gguf', type: 'llm', state: 'loaded' };
const json = (value: unknown) => new Response(JSON.stringify(value));
const mockProvider = (models = [loaded], choice = { finish_reason: 'stop', message: { content: '{"ok":true}' } }) =>
  vi.fn(async (url: RequestInfo | URL) => String(url).endsWith('/models')
    ? json({ data: models }) : json({ choices: [choice], usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } }));

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('VERCEL_ENV', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Local (LM Studio)', () => {
  it('offers a keyless local chapter choice without changing other capabilities or defaults', () => {
    const production = modelRouterStatus({ NODE_ENV: 'production', GEMINI_API_KEY: 'g' });
    const local = modelRouterStatus({ NODE_ENV: 'development', GEMINI_API_KEY: 'g' });
    expect(local.capabilities.slice(1)).toEqual(production.capabilities.slice(1));
    expect(local.capabilities[0].defaultModel).toBe(production.capabilities[0].defaultModel);
    expect(local.capabilities[0].models.filter(model => model.provider !== 'lmstudio')).toEqual(production.capabilities[0].models);
    expect(local.capabilities[0].providers).toContainEqual({ id: 'lmstudio', label: 'Local (LM Studio)', keyVariable: '', configured: true });
    expect(local.capabilities[0].models).toContainEqual(expect.objectContaining({ id: LOCAL_LM_STUDIO_MODEL, provider: 'lmstudio', available: true, implemented: true }));
  });

  it.each([{}, { NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { NODE_ENV: 'development', VERCEL: '1' }, { NODE_ENV: 'development', VERCEL_ENV: 'preview' }])('rejects pinned local models outside local dev: %j', environment => {
    const route = resolveChapterModelRoute({ ...environment, MODELS: LOCAL_LM_STUDIO_MODEL, DEFAULT: LOCAL_LM_STUDIO_MODEL }, 'MODELS', 'DEFAULT');
    expect(route.models.some(model => model.id === LOCAL_LM_STUDIO_MODEL)).toBe(false);
    expect(route.keys.lmstudio).toBeUndefined();
    expect(modelRouterStatus(environment).capabilities[0].providers.some(provider => provider.id === 'lmstudio')).toBe(false);
  });

  it('discovers the loaded text model for every call and sends OpenAI chat/schema fields without auth or cloud routing fields', async () => {
    const fetchMock = mockProvider([{ ...loaded, state: 'not-loaded' }, { ...loaded, type: 'embeddings' }, loaded]);
    const router = createModelRouter({ credentials: {}, localDevelopment: true, fetch: fetchMock });
    const result = await router.generate(request);
    expect(result).toEqual({ capability: 'text', provider: 'lmstudio', model: loaded.id, text: '{"ok":true}', usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 } });
    const [url, init] = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[1];
    expect(url).toBe('http://localhost:1234/v1/chat/completions');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual({ model: loaded.id, messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'prompt' }], temperature: 0.8, max_tokens: 100, stream: false,
      response_format: { type: 'json_schema', json_schema: { name: 'response', strict: true, schema: request.responseJsonSchema } } });
    await router.generate({ ...request, responseFormat: 'text' });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/models'))).toHaveLength(2);
  });

  it.each(['production', 'test'])('refuses direct calls in %s even with host opt-in', async runtime => {
    vi.stubEnv('NODE_ENV', runtime);
    const fetchMock = mockProvider();
    await expect(createModelRouter({ credentials: {}, localDevelopment: true, fetch: fetchMock }).generate(request)).rejects.toMatchObject({ code: 'invalid-model' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires host opt-in and blocks deployed development runtimes', async () => {
    const fetchMock = mockProvider();
    await expect(createModelRouter({ credentials: {}, fetch: fetchMock }).generate(request)).rejects.toMatchObject({ code: 'invalid-model' });
    vi.stubEnv('VERCEL_ENV', 'preview');
    await expect(createModelRouter({ credentials: {}, localDevelopment: true, fetch: fetchMock }).generate(request)).rejects.toMatchObject({ code: 'invalid-model' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('follows a different loaded model on the next generation', async () => {
    let model = loaded;
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => String(url).endsWith('/models')
      ? json({ data: [model] }) : json({ choices: [{ finish_reason: 'stop', message: { content: 'answer' } }] }));
    const router = createModelRouter({ credentials: {}, localDevelopment: true, fetch: fetchMock });
    expect(await router.generate(request)).toMatchObject({ model: loaded.id });
    model = { ...loaded, id: 'another/loaded-model' };
    expect(await router.generate(request)).toMatchObject({ model: 'another/loaded-model' });
  });

  it('reports connection and HTTP failures without echoing provider response bodies', async () => {
    const disconnected = vi.fn(async () => { throw new TypeError('fetch failed'); });
    await expect(createModelRouter({ credentials: {}, localDevelopment: true, fetch: disconnected }).generate(request))
      .rejects.toMatchObject({ code: 'provider-error', message: expect.stringContaining('Start its local server') });
    const failed = vi.fn(async () => new Response('private words', { status: 500 }));
    await expect(createModelRouter({ credentials: {}, localDevelopment: true, fetch: failed }).generate(request))
      .rejects.toMatchObject({ code: 'provider-error', message: 'LM Studio model discovery returned HTTP 500.' });
  });

  it.each([{ models: [] }, { models: [loaded, { ...loaded, id: 'another-model' }] }])('refuses absent or ambiguous loaded models', async ({ models }) => {
    const fetchMock = mockProvider(models);
    await expect(createModelRouter({ credentials: {}, localDevelopment: true, fetch: fetchMock }).generate(request)).rejects.toMatchObject({ code: 'provider-error', message: expect.stringContaining(models.length ? 'one text model' : 'Load a text model') });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { choice: { finish_reason: 'length', message: { content: 'partial' } }, code: 'output-limit' },
    { choice: { finish_reason: 'stop', message: { content: '' } }, code: 'provider-error' },
  ])('reports incomplete replies: $code', async ({ choice, code }) => {
    await expect(createModelRouter({ credentials: {}, localDevelopment: true, fetch: mockProvider([loaded], choice) }).generate(request)).rejects.toMatchObject({ code });
  });

  it('preserves the timeout across discovery and generation', async () => {
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    await expect(createModelRouter({ credentials: {}, localDevelopment: true, fetch: fetchMock }).generate({ ...request, timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout' });
  });

  it('routes chapter and Blueprint consumers to local inference and records the actual model', async () => {
    vi.stubGlobal('fetch', mockProvider());
    const route = resolveChapterModelRoute({ NODE_ENV: 'development' }, 'MODELS', 'DEFAULT');
    const chapter = await createHarnessTextProvider(LOCAL_LM_STUDIO_MODEL, { keys: route.keys }).generate(request);
    expect(chapter.providerReceipt).toMatchObject({ provider: 'lmstudio', model: loaded.id });
    const blueprint = await createWorldBlueprintProvider({ provider: 'lmstudio', model: LOCAL_LM_STUDIO_MODEL, apiKey: route.keys.lmstudio! }).generate(request);
    expect(blueprint).toEqual({ ok: true });
  });
});
