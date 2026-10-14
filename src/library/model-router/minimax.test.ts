import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAPTER_MODELS, IMAGE_MODELS, VIDEO_MODELS, createModelRouter, resolveChapterModelRoute } from './server';
import { modelRouterStatus } from '../../server/model-router/status';
import { createHarnessTextProvider } from '../../server/harness-generation/provider';
import { resolveHarnessGenerationConfig } from '../../server/harness-generation/config';
import { createWorldBlueprintProvider } from '../../server/story-seed-blueprint/generate';

afterEach(() => vi.unstubAllGlobals());
const json = (body: object) => new Response(JSON.stringify(body));
const answer = { choices: [{ message: { content: '{"ok":true}', reasoning_content: 'private reasoning' }, finish_reason: 'stop' }], usage: { prompt_tokens: 4, completion_tokens: 8, total_tokens: 12 } };
const text = { capability: 'text' as const, model: 'minimax/MiniMax-M2.7', systemInstruction: 'system', userPrompt: 'prompt', temperature: 1, maxOutputTokens: 100, timeoutMs: 1000, responseFormat: 'json' as const, responseJsonSchema: { type: 'object' } };
const image = { capability: 'image' as const, model: 'minimax/image-01', prompt: 'A portrait', aspectRatio: '2:3', timeoutMs: 1000 };
const video = { capability: 'video' as const, model: 'minimax/MiniMax-H3', prompt: 'A breeze moves the trees', timeoutMs: 1000 };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSAAAAABJRU5ErkJggg==';

describe('MiniMax direct provider', () => {
  it('offers all documented models and resolves the existing Vercel alias without exposing the key', () => {
    expect(CHAPTER_MODELS.filter(m => m.provider === 'minimax')).toHaveLength(9);
    expect(IMAGE_MODELS.filter(m => m.provider === 'minimax')).toHaveLength(2);
    expect(VIDEO_MODELS.filter(m => m.provider === 'minimax')).toHaveLength(11);
    expect(resolveChapterModelRoute({}, 'MODELS', 'DEFAULT').models.some(m => m.id.startsWith('minimax/'))).toBe(false);
    const status = modelRouterStatus({ Minimax: 'secret' });
    expect(JSON.stringify(status)).not.toContain('secret');
    for (const capability of ['chapters', 'images', 'video']) {
      const models = status.capabilities.find(c => c.id === capability)!.models.filter(m => m.provider === 'minimax');
      expect(models.every(m => m.available && m.implemented)).toBe(true);
    }
    expect(status.capabilities.find(c => c.id === 'video')!.models.filter(m => m.provider === 'gemini').every(m => !m.implemented)).toBe(true);
    expect(resolveHarnessGenerationConfig({ Minimax: 'secret' }).keys.minimax).toBe('secret');
  });

  it.each(CHAPTER_MODELS.filter(m => m.provider === 'minimax'))('routes $id directly, with schemas in the instructions and reasoning separate', async model => {
    const fetchMock = vi.fn(async () => json(answer));
    const result = await createModelRouter({ credentials: { minimax: 'secret' }, fetch: fetchMock }).generate({ ...text, model: model.id });
    expect(result).toMatchObject({ provider: 'minimax', text: '{"ok":true}', usage: { totalTokens: 12 } });
    expect(JSON.stringify(result)).not.toMatch(/secret|private reasoning/);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.minimax.io/v1/chat/completions');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret' });
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: model.id.slice(8), reasoning_split: true, max_completion_tokens: 16484 });
    expect(body.messages[0].content).toContain('JSON schema: {"type":"object"}');
    expect(body).not.toHaveProperty('response_format');
    if (model.reasoning) expect(body.reasoning_effort).toBe('low');
    else expect(body).not.toHaveProperty('reasoning_effort');
  });

  it('connects the real HARNESS and Blueprint factories to MiniMax credentials', async () => {
    const fetchMock = vi.fn(async () => json(answer)); vi.stubGlobal('fetch', fetchMock);
    const harness = createHarnessTextProvider(text.model, resolveHarnessGenerationConfig({ Minimax: 'secret' }));
    expect(harness.provider).toBe('minimax');
    expect((await harness.generate(text)).providerReceipt).toMatchObject({ provider: 'minimax', model: text.model });
    const blueprint = createWorldBlueprintProvider({ provider: 'minimax', model: text.model, apiKey: 'secret' });
    expect(await blueprint.generate(text)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(call => (call as unknown as [string])[0] === 'https://api.minimax.io/v1/chat/completions')).toBe(true);
  });

  it('makes a base64 image and sends portrait references for Live', async () => {
    const fetchMock = vi.fn(async () => json({ data: { image_base64: [png] }, base_resp: { status_code: 0 } }));
    const router = createModelRouter({ credentials: { minimax: 'secret' }, fetch: fetchMock });
    expect(await router.generate(image)).toMatchObject({ provider: 'minimax', data: png, mimeType: 'image/png' });
    await router.generate({ ...image, model: 'minimax/image-01-live', referenceImages: [{ data: png, mimeType: 'image/png' }] });
    const body = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(body).toMatchObject({ model: 'image-01-live', response_format: 'base64', n: 1, aspect_ratio: '2:3', subject_reference: [{ type: 'character', image_file: `data:image/png;base64,${png}` }] });
    await expect(router.generate({ ...image, model: 'minimax/image-01-live' })).rejects.toMatchObject({ code: 'invalid-model' });
    await expect(router.generate({ ...image, prompt: 'x'.repeat(1501) })).rejects.toMatchObject({ code: 'invalid-model' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(VIDEO_MODELS.filter(m => m.provider === 'minimax'))('submits $id and queries the job without submitting again', async model => {
    const v2 = model.id.includes('/MiniMax-H3');
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ task_id: '123' }))
      .mockResolvedValueOnce(json(v2 ? { task: { status: 'running' } } : { status: 'Processing' }))
      .mockResolvedValueOnce(json(v2 ? { task: { status: 'succeeded', content: { url: 'https://cdn.example/video.mp4' } } } : { status: 'Success', file_id: '456' }))
      .mockResolvedValueOnce(json({ file: { download_url: 'https://cdn.example/video.mp4' } }));
    const router = createModelRouter({ credentials: { minimax: 'secret' }, fetch: fetchMock });
    const needsImage = /\/(?:I2V|S2V)|-Fast$/.test(model.id);
    const task = await router.generate({ ...video, model: model.id, ...(needsImage ? { firstFrame: 'https://cdn.example/portrait.png' } : {}) });
    expect(task).toMatchObject({ taskId: '123', status: 'queued' });
    const query = { model: model.id, taskId: '123', timeoutMs: 1000 };
    expect(await router.queryVideoTask(query)).toMatchObject({ status: 'running' });
    expect(await router.queryVideoTask(query)).toMatchObject({ status: 'succeeded', url: 'https://cdn.example/video.mp4' });
    expect(fetchMock.mock.calls.filter(call => call[1].method === 'POST')).toHaveLength(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe(model.id.slice(8));
    if (v2) expect(body).toMatchObject({ content: [{ type: 'text', text: video.prompt }], resolution: '768P', duration: 6, ratio: '16:9' });
    if (model.id.endsWith('S2V-01')) expect(body.subject_reference).toEqual([{ type: 'character', image: ['https://cdn.example/portrait.png'] }]);
  });

  it('validates video constraints and returns failed or cancelled task states', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ task: { status: 'failed', error: { message: 'private story' } } }))
      .mockResolvedValueOnce(json({ task: { status: 'cancelled' } }));
    const router = createModelRouter({ credentials: { minimax: 'secret' }, fetch: fetchMock });
    for (const request of [{ ...video, model: 'minimax/MiniMax-H3-Max', resolution: '2K' as const }, { ...video, durationSeconds: 3 }, { ...video, model: 'minimax/I2V-01' }, { ...video, model: 'google/veo-3.1-generate-preview' }]) {
      await expect(router.generate(request)).rejects.toMatchObject({ code: 'invalid-model' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await router.queryVideoTask({ model: video.model, taskId: '123', timeoutMs: 1000 })).toMatchObject({ status: 'failed' });
    expect(await router.queryVideoTask({ model: video.model, taskId: '123', timeoutMs: 1000 })).toMatchObject({ status: 'cancelled' });
  });

  it.each([text, image, video])('requires its own credential for $capability without falling back', async request => {
    const fetchMock = vi.fn();
    await expect(createModelRouter({ credentials: { openrouter: 'other-key' }, fetch: fetchMock }).generate(request)).rejects.toMatchObject({ code: 'missing-credential' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects video queries asynchronously when the credential is missing', async () => {
    const fetchMock = vi.fn();
    const result = createModelRouter({ credentials: {}, fetch: fetchMock }).queryVideoTask({ model: video.model, taskId: '123', timeoutMs: 1000 });
    await expect(result).rejects.toMatchObject({ code: 'missing-credential' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed or decoded oversized portrait references before charging', async () => {
    const fetchMock = vi.fn();
    const router = createModelRouter({ credentials: { minimax: 'secret' }, fetch: fetchMock });
    for (const data of ['invalid base64!', Buffer.alloc(10 * 1024 * 1024).toString('base64')]) {
      await expect(router.generate({ ...image, referenceImages: [{ data, mimeType: 'image/png' }] })).rejects.toMatchObject({ code: 'invalid-model' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [json({ base_resp: { status_code: 1008, status_msg: 'secret' } }), 'provider-error'],
    [new Response('secret', { status: 401 }), 'provider-error'],
    [json({ choices: [{ finish_reason: 'length', message: { content: 'partial' } }] }), 'output-limit'],
    [json({ choices: [{ message: { content: '', reasoning_content: 'secret' } }] }), 'provider-error'],
    [new Response('secret'), 'provider-error'],
  ])('reports safe errors and output limits', async (response, code) => {
    const promise = createModelRouter({ credentials: { minimax: 'secret' }, fetch: vi.fn(async () => response) }).generate(text);
    await expect(promise).rejects.toMatchObject({ code });
    await expect(promise).rejects.not.toMatchObject({ message: expect.stringContaining('secret') });
  });

  it('keeps the deadline active while the reply body is still being read', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => ({ ok: true, json: () => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) }) as Response);
    await expect(createModelRouter({ credentials: { minimax: 'secret' }, fetch: fetchMock }).generate({ ...text, timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout' });
  });
});
