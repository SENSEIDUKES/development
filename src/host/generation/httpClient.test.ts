// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { HarnessGenerationRequest } from '@seihouse/sen/harness-generation';
import { createSavedAccessToken } from './accessToken';
import { HarnessGenerationHttpClient, HarnessGenerationRequestError } from './httpClient';
import { writeReasoningPreference } from './modelPreference';

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

const receipt = { rawProviderResponse: '{}', providerReceipt: { provider: 'gemini', model: 'google/gemini-3.8-flash', generatedAt: '2026-09-23', usage: { source: 'unavailable' } } };

const sentBody = async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(receipt), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  await new HarnessGenerationHttpClient().generate({ model: 'google/gemini-3.8-flash' } as HarnessGenerationRequest);
  return JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
};

it('sends the Model Router reasoning level saved for the request model', async () => {
  expect((await sentBody()).reasoningLevel).toBeUndefined();
  writeReasoningPreference('google/gemini-3.8-flash', 'high');
  expect((await sentBody()).reasoningLevel).toBe('high');
  writeReasoningPreference('google/gemini-3.8-flash', undefined);
  expect((await sentBody()).reasoningLevel).toBeUndefined();
});

it("sends the owner's access token when the host has one, and reports the server's refusal with its status", async () => {
  const token = createSavedAccessToken();
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(receipt), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const client = new HarnessGenerationHttpClient(undefined, () => token.current);
  const authorization = () => ((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers as Record<string, string>).Authorization;
  await client.generate({ model: 'google/gemini-3.8-flash' } as HarnessGenerationRequest);
  expect(authorization()).toBeUndefined();
  token.current = ' owner-token ';
  await client.generate({ model: 'google/gemini-3.8-flash' } as HarnessGenerationRequest);
  expect(authorization()).toBe('Bearer owner-token');
  // Saved on this device: a new store reads the same token.
  expect(createSavedAccessToken().current).toBe('owner-token');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'This Development action has reached its temporary request limit. Please try again shortly.' }), { status: 429 })));
  await expect(client.generate({ model: 'google/gemini-3.8-flash' } as HarnessGenerationRequest)).rejects.toMatchObject({
    name: 'HarnessGenerationRequestError', status: 429, message: 'This Development action has reached its temporary request limit. Please try again shortly.',
  });
  expect(new HarnessGenerationRequestError('x', 401)).toBeInstanceOf(Error);
  token.current = undefined;
  expect(createSavedAccessToken().current).toBeUndefined();
});
