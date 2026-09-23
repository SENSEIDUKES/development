// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { HarnessGenerationRequest } from '@seihouse/sen/harness-generation';
import { HarnessGenerationHttpClient } from './httpClient';
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
