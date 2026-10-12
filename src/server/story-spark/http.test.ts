import { describe, expect, it, vi } from 'vitest';
import type { HarnessTextGenerationRequest, HarnessTextGenerationResult } from '../harness-generation/provider';
import { handleStorySparkHttp } from './http';

const environment = { GEMINI_API_KEY: 'test-key' };
const provider = (reply: unknown) => {
  const generate = vi.fn(async (_request: HarnessTextGenerationRequest): Promise<HarnessTextGenerationResult> => ({
    rawProviderResponse: typeof reply === 'string' ? reply : JSON.stringify(reply),
    providerReceipt: { provider: 'gemini', model: 'm', generatedAt: '', durationMs: 1, usage: { source: 'estimated', inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
  }));
  return { generate, providerFactory: () => ({ provider: 'gemini' as const, model: 'm', generate }) };
};

describe('Story Spark route', () => {
  it('reports whether a model is configured', async () => {
    expect((await handleStorySparkHttp({ method: 'GET' }, { environment })).body).toEqual({ configured: true });
    expect((await handleStorySparkHttp({ method: 'GET' }, { environment: {} })).body).toEqual({ configured: false });
  });

  it('writes a spark in the chosen genre, shaping the writer\'s idea', async () => {
    const { generate, providerFactory } = provider({ premise: 'A sword writes letters to its first owner.', genre: 'Ignored', aside: 'Hm.', voice: 'Elder' });
    const response = await handleStorySparkHttp(
      { method: 'POST', body: JSON.stringify({ genre: 'Xianxia', idea: 'a sword that writes letters', avoid: ['An old premise.'] }) },
      { environment, providerFactory },
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ premise: 'A sword writes letters to its first owner.', genre: 'Xianxia', inventedGenre: false, aside: 'Hm.', voice: 'Elder' });
    const prompt = generate.mock.calls[0][0].userPrompt;
    expect(prompt).toContain('GENRE: Xianxia');
    expect(prompt).toContain('a sword that writes letters');
    expect(prompt).toContain('An old premise.');
  });

  it('asks for an invented genre and returns its name and note', async () => {
    const { generate, providerFactory } = provider('```json\n{"premise":"P","genre":"Debt Cultivation","genreNote":"Power is borrowed.","aside":"A","voice":"V"}\n```');
    const response = await handleStorySparkHttp({ method: 'POST', body: { inventGenre: true } }, { environment, providerFactory });
    expect(response.body).toMatchObject({ genre: 'Debt Cultivation', inventedGenre: true, genreNote: 'Power is borrowed.' });
    expect(generate.mock.calls[0][0].userPrompt).toContain('invent a new genre');
  });

  it('refuses a request with no genre, says when no model is configured, and hides a model failure', async () => {
    expect((await handleStorySparkHttp({ method: 'POST', body: {} }, { environment })).status).toBe(400);
    expect((await handleStorySparkHttp({ method: 'POST', body: { genre: 'Xianxia' } }, { environment: {} })).status).toBe(503);
    const onError = vi.fn();
    const { providerFactory } = provider('not json');
    const failed = await handleStorySparkHttp({ method: 'POST', body: { genre: 'Xianxia' } }, { environment, providerFactory, onError });
    expect(failed).toMatchObject({ status: 502, body: { error: 'The Dao was silent. Seek again.' } });
    expect(onError).toHaveBeenCalled();
    expect((await handleStorySparkHttp({ method: 'DELETE' }, { environment })).status).toBe(405);
  });
});
