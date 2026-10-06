import { describe, expect, it, vi } from 'vitest';
import type { HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { HarnessGenerationRequestError } from '../host/generation/httpClient';
import { writerWithAccessToken } from './accessToken';

const receipt = { rawProviderResponse: '{}', providerReceipt: { provider: 'gemini', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } };
const refused = () => new HarnessGenerationRequestError('This Development action has reached its temporary request limit. Please try again shortly.', 429);

describe('The writer with the owner\'s access token', () => {
  it('asks for the token when a chapter is refused for the visitor limit, but the Holdings fixer never asks', async () => {
    const writer: HarnessGenerationModelAdapter = {
      getServerInfo: vi.fn(),
      generate: vi.fn().mockRejectedValueOnce(refused()).mockResolvedValueOnce(receipt),
      fixHoldings: vi.fn().mockRejectedValueOnce(refused()),
    };
    const token: { current: string | undefined } = { current: undefined };
    const ask = vi.fn(async () => 'owner-token');
    const wrapped = writerWithAccessToken(writer, token, ask);

    await expect(wrapped.generate({} as never)).resolves.toBe(receipt);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(token.current).toBe('owner-token');

    token.current = undefined;
    // The fixer runs unseen: a refusal is its own failure, recorded on the chapter.
    await expect(wrapped.fixHoldings!({} as never)).rejects.toMatchObject({ status: 429 });
    expect(ask).toHaveBeenCalledTimes(1);
  });
});
