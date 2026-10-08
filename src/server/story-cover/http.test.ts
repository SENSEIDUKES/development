import { describe, expect, it, vi } from 'vitest';
import { handleStoryCoverHttp, STORY_COVER_TIMEOUT_MS } from './http';
import { buildStoryCoverPrompt } from './prompt';
import { ModelRouterError } from '@seihouse/library/model-router-server';

const story = { title: 'The Drowned Name', genre: 'Xianxia', style: 'chinese', synopsis: 'A courier returns to the drowned city.', mainCharacter: 'Mara', tags: ['revenge', 'water'] };
const image = { capability: 'image' as const, provider: 'gemini' as const, model: 'google/gemini-3.1-flash-image', data: 'aW1hZ2U=', mimeType: 'image/png' };
const environment = { GEMINI_API_KEY: 'secret-gemini' };

describe('The story cover route', () => {
  it('makes one cover with Nano Banana 2 by default, in portrait, and answers with the image', async () => {
    const generate = vi.fn(async () => image);
    const onAnswer = vi.fn();
    const result = await handleStoryCoverHttp({ method: 'POST', body: { story } }, { environment, generate, onAnswer });
    expect(result).toMatchObject({ status: 200, body: { image: 'aW1hZ2U=', mimeType: 'image/png', model: 'google/gemini-3.1-flash-image' } });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'image', model: 'google/gemini-3.1-flash-image', aspectRatio: '2:3', timeoutMs: STORY_COVER_TIMEOUT_MS,
    }));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ model: 'google/gemini-3.1-flash-image' }));
    expect(JSON.stringify(result.body)).not.toContain('secret');
  });

  it('follows the Router\'s image choice and refuses a model that cannot make covers', async () => {
    const generate = vi.fn(async () => ({ ...image, model: 'google/gemini-3-pro-image' }));
    await handleStoryCoverHttp({ method: 'POST', body: { story, model: 'google/gemini-3-pro-image' } }, { environment, generate });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'google/gemini-3-pro-image' }));
    expect(await handleStoryCoverHttp({ method: 'POST', body: { story, model: 'google/gemini-3.8-flash' } }, { environment, generate }))
      .toMatchObject({ status: 400, body: { error: "Model 'google/gemini-3.8-flash' cannot make covers." } });
  });

  it('says which key is missing, and refuses a request without a title or of the wrong shape', async () => {
    expect(await handleStoryCoverHttp({ method: 'POST', body: { story } }, { environment: {} }))
      .toMatchObject({ status: 503, body: { error: 'GEMINI_API_KEY is not configured on the Development server.' } });
    expect(await handleStoryCoverHttp({ method: 'POST', body: { story: { genre: 'Xianxia' } } }, { environment }))
      .toMatchObject({ status: 400 });
    expect(await handleStoryCoverHttp({ method: 'POST', body: { story: { ...story, tags: 'water' } } }, { environment }))
      .toMatchObject({ status: 400, body: { error: 'Story tags must be a list.' } });
    expect(await handleStoryCoverHttp({ method: 'GET' }, { environment })).toMatchObject({ status: 405 });
  });

  it('clips each field, so a request cannot carry a long prompt of its own', async () => {
    const generate = vi.fn(async (_request: { prompt: string }) => image);
    await handleStoryCoverHttp({ method: 'POST', body: { story: { ...story, synopsis: 'x'.repeat(5_000), tags: Array.from({ length: 30 }, (_, index) => `tag-${index}`) } } }, { environment, generate: generate as never });
    const prompt = generate.mock.calls[0][0].prompt;
    expect(prompt).toContain(`Story: ${'x'.repeat(1_200)}\n`);
    expect(prompt).toContain('tag-11');
    expect(prompt).not.toContain('tag-12');
  });

  it('reports a timeout plainly and any other failure without the provider\'s words', async () => {
    const timeout = vi.fn(async () => { throw new ModelRouterError('timeout', 'late'); });
    expect((await handleStoryCoverHttp({ method: 'POST', body: { story } }, { environment, generate: timeout })).body)
      .toEqual({ error: 'The cover was still being made after 120 seconds, so it was stopped. Try again, or choose another image model in the Model Router.' });
    const failure = vi.fn(async () => { throw new Error('provider said something about the story'); });
    expect((await handleStoryCoverHttp({ method: 'POST', body: { story } }, { environment, generate: failure })).body)
      .toEqual({ error: 'The cover could not be made. Nothing was changed; please try again.' });
  });
});

describe('The cover prompt', () => {
  it('paints the story in its tradition\'s look and draws no lettering', () => {
    const prompt = buildStoryCoverPrompt(story);
    expect(prompt).toContain('Chinese web novel cover painting');
    expect(prompt).toContain('Title: The Drowned Name');
    expect(prompt).toContain('Main character: Mara');
    expect(prompt).toContain('Themes: revenge, water');
    expect(prompt).toContain('portrait (2:3)');
    expect(prompt).toContain('Draw no text at all');
    expect(buildStoryCoverPrompt({ title: 'Plain' })).toContain('a web novel cover painting');
  });
});
