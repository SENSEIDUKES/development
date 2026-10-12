// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type { BlueprintGenerationPayload } from '@seihouse/sen/story-seed';
import { requestWorldBlueprint } from './blueprintGenerationClient';

afterEach(() => vi.unstubAllGlobals());

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
