// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type { BlueprintGenerationPayload } from '@seihouse/sen/story-seed';
import { readUsage } from '../usage/usageLog';
import { writeReasoningPreference, writeTextRolePreference } from '../generation/modelPreference';
import { requestWorldBlueprint } from './blueprintGenerationClient';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it('sends local LM Studio Blueprints without a token or Authorization header', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ title: 'Local Blueprint' })));
  vi.stubGlobal('fetch', fetchMock);
  await expect(requestWorldBlueprint({ storySeed: {} } as BlueprintGenerationPayload, '', undefined, 'lmstudio/loaded'))
    .resolves.toMatchObject({ title: 'Local Blueprint' });
  const [, init] = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0];
  expect(init.headers).not.toHaveProperty('Authorization');
  expect(JSON.parse(String(init.body)).model).toBe('lmstudio/loaded');
});

it('still requires a token for cloud-provider Blueprints', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(requestWorldBlueprint({ storySeed: {} } as BlueprintGenerationPayload, '', undefined, 'google/gemini-3.8-flash'))
    .rejects.toThrow('Enter the Development access token');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('sends the Blueprint reasoning override even when Chapter uses the same model', async () => {
  const model = 'openai/gpt-6-luna';
  writeReasoningPreference(model, 'low');
  writeTextRolePreference('blueprint', { model, reasoningLevel: 'high' });
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}', { headers: {
    'X-Blueprint-Input-Tokens': '1234', 'X-Blueprint-Output-Tokens': '4321', 'X-Blueprint-Total-Tokens': '5755',
  } }));
  vi.stubGlobal('fetch', fetchMock);
  await requestWorldBlueprint({ storySeed: {} } as BlueprintGenerationPayload, 'token', undefined, model);
  expect(readUsage().at(-1)).toMatchObject({ kind: 'blueprint', model, inputTokens: 1234, outputTokens: 4321, totalTokens: 5755 });
  expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({ model, reasoningLevel: 'high' });
});
