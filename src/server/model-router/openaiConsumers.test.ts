import { afterEach, expect, it, vi } from 'vitest';
import { handleStoryCoverHttp } from '../story-cover/http';
import { handleImageLabHttp } from '../image-lab/http';
import { handleProfilePictureHttp } from '../profile-picture/http';
import { createWorldBlueprintProvider } from '../story-seed-blueprint/generate';
import { createHarnessTextProvider } from '../harness-generation/provider';
import { harnessGenerationServerInfo, resolveHarnessGenerationConfig } from '../harness-generation/config';
import { modelRouterStatus } from './status';

afterEach(() => vi.unstubAllGlobals());
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSAAAAABJRU5ErkJggg==';
const environment = { OPENAI_API_KEY: 'direct-secret', STORY_SEED_BLUEPRINT_ACCESS_TOKEN: 'access' };

it('enables generation controls with only an OpenAI key, and disables them with no keys', () => {
  expect(harnessGenerationServerInfo(environment)).toMatchObject({ configured: true });
  expect(harnessGenerationServerInfo({}).configured).toBe(false);
  expect(harnessGenerationServerInfo(environment).models).toContainEqual({ id: 'openai/gpt-6.1-terra', label: 'GPT-6.1 Terra' });
});

it('connects covers, Image Lab and reference-based profile pictures to direct OpenAI', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [{ b64_json: png }] })));
  vi.stubGlobal('fetch', fetchMock);
  const model = 'openai/gpt-image-2.6-flare';
  const cover = await handleStoryCoverHttp({ method: 'POST', body: { story: { title: 'The Wind', synopsis: 'A journey.' }, model } }, { environment });
  const lab = await handleImageLabHttp({ method: 'POST', headers: { authorization: 'Bearer access' }, body: { prompt: 'A mountain.', model } }, { environment });
  const portrait = await handleProfilePictureHttp({ method: 'POST', body: { photo: { data: png, mimeType: 'image/png' }, model } }, { environment });
  for (const result of [cover, lab, portrait]) {
    expect(result).toMatchObject({ status: 200, body: { image: png, mimeType: 'image/png' } });
    expect(JSON.stringify(result)).not.toContain('direct-secret');
  }
  expect(fetchMock.mock.calls.map(call => (call as unknown as [string])[0])).toEqual([
    'https://api.openai.com/v1/images/generations', 'https://api.openai.com/v1/images/generations', 'https://api.openai.com/v1/images/edits',
  ]);
});

it('routes both the Blueprint and chapter writer through Responses with OpenAI receipts', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"title":"Dawn"}' }] }] })));
  vi.stubGlobal('fetch', fetchMock);
  const model = 'openai/gpt-6.1-terra';
  const request = { systemInstruction: 'Write.', userPrompt: 'A story.', temperature: 1, maxOutputTokens: 1024, timeoutMs: 1000, responseJsonSchema: { type: 'object' } };
  const blueprint = createWorldBlueprintProvider({ provider: 'openai', model, apiKey: 'direct-secret' });
  expect(await blueprint.generate(request)).toEqual({ title: 'Dawn' });
  const chapter = createHarnessTextProvider(model, resolveHarnessGenerationConfig(environment));
  expect((await chapter.generate(request)).providerReceipt).toMatchObject({ provider: 'openai', model });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  for (const call of fetchMock.mock.calls as unknown as Array<[string, RequestInit]>) {
    expect(call[0]).toBe('https://api.openai.com/v1/responses');
    expect(call[1].headers).toMatchObject({ Authorization: 'Bearer direct-secret' });
  }
});

it('shows OpenAI in each supported selector, with no credential disclosure or changed default', () => {
  for (const env of [{}, environment]) {
    const status = modelRouterStatus(env);
    for (const id of ['chapters', 'images', 'live']) {
      const capability = status.capabilities.find(item => item.id === id)!;
      expect(capability.providers.find(provider => provider.id === 'openai')?.configured).toBe(env === environment);
      const models = capability.models.filter(model => model.provider === 'openai');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(model => model.implemented && model.available === (env === environment))).toBe(true);
    }
    expect(status.capabilities[0].defaultModel).toBe('google/gemini-3.1-flash-lite');
    expect(JSON.stringify(status)).not.toContain('direct-secret');
  }
});
