import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CHAPTER_MODELS,
  DEFAULT_CHAPTER_MODEL,
  providerModelName,
  requireTextModelKey,
  resolveChapterModelRoute,
  textModelProvider,
} from './catalog';
import { generateOpenRouterText } from './openRouter';
import { resolveHarnessGenerationConfig } from '../harness-generation/config';
import { createHarnessTextProvider } from '../harness-generation/provider';
import { modelRouterStatus } from './status';
import { resolveReasoningLevel } from './catalog';
import { geminiThinkingConfig } from './geminiThinking';

afterEach(() => vi.unstubAllGlobals());

const okResponse = (content: string, finish = 'stop') => new Response(JSON.stringify({
  choices: [{ message: { content }, finish_reason: finish }],
  usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 },
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('Model Router catalog', () => {
  it('routes model ids to providers and provider-facing names', () => {
    expect(textModelProvider('google/gemini-3.8-flash')).toBe('gemini');
    expect(textModelProvider('gemini-3.8-flash')).toBe('gemini');
    expect(textModelProvider('openrouter/openai/gpt-6-luna')).toBe('openrouter');
    expect(textModelProvider('openai/gpt-6-luna')).toBeUndefined();
    expect(providerModelName('google/gemini-3.8-flash')).toBe('gemini-3.8-flash');
    expect(providerModelName('openrouter/openai/gpt-6-luna')).toBe('openai/gpt-6-luna');
  });

  it('offers the current Gemini models and keeps the long-running default', () => {
    const route = resolveChapterModelRoute({ GEMINI_API_KEY: 'g' }, 'HARNESS_GENERATION_MODELS', 'HARNESS_GENERATION_DEFAULT_MODEL');
    const ids = route.models.map(model => model.id);
    expect(ids).toContain('google/gemini-3.8-flash');
    expect(ids).toContain(DEFAULT_CHAPTER_MODEL);
    expect(route.defaultModel).toBe(DEFAULT_CHAPTER_MODEL);
    // OpenRouter models only appear once their key exists.
    expect(ids.some(id => id.startsWith('openrouter/'))).toBe(false);
  });

  it('adds OpenRouter models, including extras, once OPENROUTER_API_KEY is configured', () => {
    const route = resolveChapterModelRoute(
      { GEMINI_API_KEY: 'g', OPENROUTER_API_KEY: 'o', OPENROUTER_MODELS: 'openai/gpt-5.6-luna' },
      'HARNESS_GENERATION_MODELS',
      'HARNESS_GENERATION_DEFAULT_MODEL',
    );
    const ids = route.models.map(model => model.id);
    expect(ids).toContain('openrouter/openai/gpt-6-luna');
    expect(ids).toContain('openrouter/openai/gpt-5.6-luna');
    expect(route.models.find(model => model.id === 'openrouter/openai/gpt-6-luna')?.label).toBe('GPT-6 Luna · OpenRouter');
    expect(CHAPTER_MODELS.every(model => textModelProvider(model.id) === model.provider)).toBe(true);
  });

  it('reads the OpenRouter key from OpenRouter-Dev, falling back to OPENROUTER_API_KEY', () => {
    const route = (environment: Record<string, string>) => resolveChapterModelRoute(environment, 'HARNESS_GENERATION_MODELS', 'HARNESS_GENERATION_DEFAULT_MODEL');
    expect(route({ 'OpenRouter-Dev': 'dev-key' }).keys.openrouter).toBe('dev-key');
    expect(route({ 'OpenRouter-Dev': 'dev-key', OPENROUTER_API_KEY: 'other' }).keys.openrouter).toBe('dev-key');
    expect(route({ OPENROUTER_API_KEY: 'other' }).keys.openrouter).toBe('other');
    expect(route({ 'OpenRouter-Dev': 'dev-key' }).models.map(model => model.id)).toContain('openrouter/openai/gpt-6-luna');
  });

  it('names the missing credential for the chosen model', () => {
    expect(() => requireTextModelKey('openrouter/openai/gpt-6-luna', { gemini: 'g' }))
      .toThrow('OpenRouter-Dev is not configured on the Development server.');
    expect(requireTextModelKey('google/gemini-3.8-flash', { gemini: 'g' })).toBe('g');
  });
});

describe('OpenRouter text call', () => {
  it('sends a chat completion with the schema and reports usage', async () => {
    const fetchMock = vi.fn(async () => okResponse('{"title":"One"}'));
    vi.stubGlobal('fetch', fetchMock);
    const result = await generateOpenRouterText({
      apiKey: 'o', model: 'openrouter/openai/gpt-6-luna', systemInstruction: 'sys', userPrompt: 'user',
      temperature: 0.9, maxOutputTokens: 1000, responseFormat: 'json', responseJsonSchema: { type: 'object' },
    });
    expect(result).toEqual({ text: '{"title":"One"}', usage: { inputTokens: 12, outputTokens: 34, totalTokens: 46 } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer o');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('openai/gpt-6-luna');
    expect(body.messages).toEqual([{ role: 'system', content: 'sys' }, { role: 'user', content: 'user' }]);
    expect(body.response_format).toEqual({ type: 'json_schema', json_schema: { name: 'response', strict: false, schema: { type: 'object' } } });
    expect(body.max_tokens).toBeGreaterThan(1000);
  });

  it('surfaces provider errors and truncated replies', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'No credits' } }), { status: 402 })));
    const request = { apiKey: 'o', model: 'openai/gpt-6-luna', systemInstruction: 's', userPrompt: 'u', temperature: 1, maxOutputTokens: 10, responseFormat: 'text' as const };
    await expect(generateOpenRouterText(request)).rejects.toThrow('OpenRouter 402: No credits');
    vi.stubGlobal('fetch', vi.fn(async () => okResponse('partial', 'length')));
    await expect(generateOpenRouterText(request)).rejects.toThrow(/output token limit/);
  });
});

describe('generation surfaces route through the Model Router', () => {
  const environment = { GEMINI_API_KEY: 'g', OPENROUTER_API_KEY: 'o' };

  it('builds an OpenRouter Harness provider whose receipt names OpenRouter', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse('{"paragraphs":["Hi"]}')));
    const config = resolveHarnessGenerationConfig(environment);
    const provider = createHarnessTextProvider('openrouter/openai/gpt-6-luna', config);
    expect(provider.provider).toBe('openrouter');
    const result = await provider.generate({ systemInstruction: 's', userPrompt: 'u', temperature: 0.9, maxOutputTokens: 1024, timeoutMs: 10_000 });
    expect(result.providerReceipt).toMatchObject({ provider: 'openrouter', model: 'openrouter/openai/gpt-6-luna', usage: { source: 'reported', inputTokens: 12 } });
    expect(createHarnessTextProvider('google/gemini-3.8-flash', config).provider).toBe('gemini');
  });
});

describe('Model Router status', () => {
  it('groups capabilities and reports configuration without exposing keys', () => {
    const status = modelRouterStatus({ GEMINI_API_KEY: 'secret-g', ELEVENLABS_API_KEY: 'secret-e' });
    expect(status.capabilities.map(capability => capability.id)).toEqual(['chapters', 'images', 'tts', 'audio', 'video', '3d']);
    expect(JSON.stringify(status)).not.toContain('secret-');
    const chapters = status.capabilities[0];
    expect(chapters.providers.find(provider => provider.id === 'openrouter')?.configured).toBe(false);
    expect(chapters.models.find(model => model.id === 'openrouter/openai/gpt-6-luna')?.available).toBe(false);
    expect(chapters.models.find(model => model.id === 'google/gemini-3.8-flash')?.available).toBe(true);
    expect(status.capabilities[2].defaultModel).toBe('eleven_multilingual_v2');
  });
});

describe('Model Router reasoning levels', () => {
  it('accepts only the levels each model supports', () => {
    expect(resolveReasoningLevel('google/gemini-3.8-flash', 'high')).toBe('high');
    expect(resolveReasoningLevel('google/gemini-3.8-flash', 'minimal')).toBeUndefined();
    expect(resolveReasoningLevel('openrouter/openai/gpt-6-luna', 'xhigh')).toBe('xhigh');
    expect(resolveReasoningLevel('openrouter/openai/gpt-6-luna', 'bogus')).toBeUndefined();
    expect(resolveReasoningLevel('google/gemini-unknown', 'high')).toBeUndefined();
    expect(CHAPTER_MODELS.every(model => model.reasoning?.levels.includes(model.reasoning.defaultLevel) ?? true)).toBe(true);
  });

  it('maps levels to Gemini thinking config and to OpenRouter reasoning effort', async () => {
    expect(geminiThinkingConfig('high')).toEqual({ thinkingConfig: { thinkingLevel: 'HIGH' } });
    expect(geminiThinkingConfig(undefined)).toEqual({});
    expect(geminiThinkingConfig('xhigh')).toEqual({});
    const fetchMock = vi.fn(async () => okResponse('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const provider = createHarnessTextProvider('openrouter/openai/gpt-6-luna', resolveHarnessGenerationConfig({ OPENROUTER_API_KEY: 'o' }));
    await provider.generate({ systemInstruction: 's', userPrompt: 'u', temperature: 1, maxOutputTokens: 1024, timeoutMs: 10_000, reasoningLevel: 'high' });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.reasoning).toEqual({ effort: 'high' });
  });

  it('reports each model\'s reasoning levels in the Router status', () => {
    const chapters = modelRouterStatus({ GEMINI_API_KEY: 'g' }).capabilities[0];
    expect(chapters.models.find(model => model.id === 'google/gemini-3.1-pro-preview')?.reasoning).toEqual({ levels: ['low', 'medium', 'high'], defaultLevel: 'high' });
  });
});
