import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAPTER_MODELS, createModelRouter, resolveChapterModelRoute } from './server';
import { modelRouterStatus } from '../../server/model-router/status';
import { createHarnessTextProvider } from '../../server/harness-generation/provider';
import { resolveHarnessGenerationConfig } from '../../server/harness-generation/config';
import { createWorldBlueprintProvider } from '../../server/story-seed-blueprint/generate';

afterEach(() => vi.unstubAllGlobals());
const claude = CHAPTER_MODELS.filter(model => model.provider === 'anthropic');
const text = { capability: 'text' as const, model: 'anthropic/claude-opus-5-5', systemInstruction: 'system', userPrompt: 'prompt', temperature: 0.9, maxOutputTokens: 100, timeoutMs: 1000, responseFormat: 'json' as const, responseJsonSchema: { type: 'object' } };

/** The Messages API's streamed reply, as the SDK reads it. */
const streamed = (blocks: string[], stopReason = 'end_turn') => {
  const events = [
    { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } },
    ...blocks.flatMap((block, index) => [
      { type: 'content_block_start', index, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block } },
      { type: 'content_block_stop', index },
    ]),
    { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 8 } },
    { type: 'message_stop' },
  ];
  return new Response(events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
};
const sent = (fetchMock: ReturnType<typeof vi.fn>, call = 0) => {
  const [url, init] = fetchMock.mock.calls[call] as unknown as [string, RequestInit];
  return { url: String(url), headers: new Headers(init.headers), body: JSON.parse(String(init.body)) };
};
const router = (fetchMock: ReturnType<typeof vi.fn>) => {
  vi.stubGlobal('fetch', fetchMock);
  return createModelRouter({ credentials: { anthropic: 'secret' } });
};

describe('Anthropic direct provider', () => {
  it('offers Claude once its key is set, under the Development alias, without exposing the key', () => {
    expect(claude.map(model => model.id)).toEqual(['anthropic/claude-opus-5-5', 'anthropic/claude-sonnet-5-5', 'anthropic/claude-haiku-5-5', 'anthropic/claude-fable-5-1']);
    expect(resolveChapterModelRoute({}, 'MODELS', 'DEFAULT').models.some(model => model.id.startsWith('anthropic/'))).toBe(false);
    expect(resolveChapterModelRoute({ ANTHROPIC_API_KEY: 'secret' }, 'MODELS', 'DEFAULT').models.filter(model => model.id.startsWith('anthropic/'))).toHaveLength(4);
    expect(resolveHarnessGenerationConfig({ claude_sen: 'secret' }).keys.anthropic).toBe('secret');
    expect(resolveHarnessGenerationConfig({ ANTHROPIC_API_KEY: 'secret' }).keys.anthropic).toBe('secret');
    const status = modelRouterStatus({ claude_sen: 'secret' });
    expect(JSON.stringify(status)).not.toContain('secret');
    const chapters = status.capabilities.find(capability => capability.id === 'chapters')!;
    expect(chapters.providers.find(provider => provider.id === 'anthropic')).toMatchObject({ label: 'Anthropic', keyVariable: 'claude_sen', configured: true });
    expect(chapters.models.filter(model => model.provider === 'anthropic').every(model => model.available && model.implemented)).toBe(true);
  });

  it.each(claude)('streams $id with low effort, the schema in the instructions and no sampling', async model => {
    const fetchMock = vi.fn(async () => streamed(['{"ok":true}']));
    const result = await router(fetchMock).generate({ ...text, model: model.id });
    expect(result).toMatchObject({ provider: 'anthropic', model: model.id, text: '{"ok":true}', usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 } });
    const { url, headers, body } = sent(fetchMock);
    expect(url).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/messages\?beta=true$/);
    expect(headers.get('x-api-key')).toBe('secret');
    expect(body).toMatchObject({ model: model.id.slice('anthropic/'.length), max_tokens: 16_484, stream: true, output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'prompt' }] });
    expect(body.system).toContain('JSON schema: {"type":"object"}');
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('thinking');
    // Server-side fallback on every model that has one; Haiku 5.5 has none.
    if (model.id === 'anthropic/claude-haiku-5-5') {
      expect(body).not.toHaveProperty('fallbacks');
      expect(headers.get('anthropic-beta')).toBeNull();
    } else {
      expect(body.fallbacks).toBe('default');
      expect(headers.get('anthropic-beta')).toBe('server-side-fallback-2026-07-01');
    }
  });

  it('sends the reader\'s effort, and joins every text block in order', async () => {
    const fetchMock = vi.fn(async () => streamed(['{"ok":', 'true}']));
    const result = await router(fetchMock).generate({ ...text, reasoningLevel: 'high' });
    expect(sent(fetchMock).body.output_config).toEqual({ effort: 'high' });
    expect(result).toMatchObject({ text: '{"ok":true}' });
  });

  it('reports declines, cut-off replies and rejected keys safely', async () => {
    await expect(router(vi.fn(async () => streamed([], 'refusal'))).generate(text)).rejects.toMatchObject({ code: 'provider-error', message: expect.stringContaining('declined') });
    await expect(router(vi.fn(async () => streamed(['{"ok":'], 'max_tokens'))).generate(text)).rejects.toMatchObject({ code: 'output-limit' });
    const unauthorized = vi.fn(async () => new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    const error = await router(unauthorized).generate(text).catch(caught => caught);
    expect(error).toMatchObject({ code: 'provider-error', message: expect.stringContaining('HTTP 401') });
    expect(error.message).not.toContain('secret');
    await expect(router(vi.fn()).generate({ ...text, model: 'anthropic/claude-unknown' })).rejects.toMatchObject({ code: 'invalid-model' });
  });

  it('connects the real HARNESS and Blueprint factories to the Claude key', async () => {
    const fetchMock = vi.fn(async () => streamed(['{"ok":true}']));
    vi.stubGlobal('fetch', fetchMock);
    const harness = createHarnessTextProvider(text.model, resolveHarnessGenerationConfig({ claude_sen: 'secret' }));
    expect(harness.provider).toBe('anthropic');
    expect((await harness.generate(text)).providerReceipt).toMatchObject({ provider: 'anthropic', model: text.model, usage: { source: 'reported' } });
    const blueprint = createWorldBlueprintProvider({ provider: 'anthropic', model: text.model, apiKey: 'secret' });
    expect(await blueprint.generate(text)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
