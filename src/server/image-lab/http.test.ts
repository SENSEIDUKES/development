import { describe, expect, it, vi } from 'vitest';
import { ModelRouterError } from '@seihouse/library/model-router-server';
import { handleImageLabHttp, IMAGE_LAB_PROMPT_LIMIT, IMAGE_LAB_TIMEOUT_MS } from './http';

const environment = { GEMINI_API_KEY: 'secret-gemini', STORY_SEED_BLUEPRINT_ACCESS_TOKEN: 'owner-token' };
const owner = { authorization: 'Bearer owner-token' };
const image = { capability: 'image' as const, provider: 'gemini' as const, model: 'google/gemini-3.1-flash-image', data: 'aW1hZ2U=', mimeType: 'image/png' };

describe('The Image Lab route', () => {
  it('makes an image from the owner\'s prompt with Nano Banana 2 by default, square unless asked otherwise', async () => {
    const generate = vi.fn(async () => image);
    const result = await handleImageLabHttp({ method: 'POST', headers: owner, body: { prompt: '  A jade dragon over misty peaks.  ' } }, { environment, generate });
    expect(result).toMatchObject({ status: 200, body: { image: 'aW1hZ2U=', mimeType: 'image/png', model: 'google/gemini-3.1-flash-image' } });
    expect(generate).toHaveBeenCalledWith({ capability: 'image', model: 'google/gemini-3.1-flash-image', prompt: 'A jade dragon over misty peaks.', aspectRatio: '1:1', timeoutMs: IMAGE_LAB_TIMEOUT_MS });
    expect(JSON.stringify(result.body)).not.toContain('secret');
  });

  it('takes the chosen model and shape', async () => {
    const generate = vi.fn(async () => image);
    await handleImageLabHttp({ method: 'POST', headers: owner, body: { prompt: 'A cover.', model: 'google/gemini-3-pro-image', aspectRatio: '2:3' } }, { environment, generate });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'google/gemini-3-pro-image', aspectRatio: '2:3' }));
  });

  it('is the owner\'s alone: no token, a wrong token, or a server without one is refused before any model call', async () => {
    const generate = vi.fn(async () => image);
    expect(await handleImageLabHttp({ method: 'POST', body: { prompt: 'A cover.' } }, { environment, generate })).toMatchObject({ status: 401 });
    expect(await handleImageLabHttp({ method: 'POST', headers: { authorization: 'Bearer guess' }, body: { prompt: 'A cover.' } }, { environment, generate })).toMatchObject({ status: 401 });
    expect(await handleImageLabHttp({ method: 'POST', headers: owner, body: { prompt: 'A cover.' } }, { environment: { GEMINI_API_KEY: 'secret-gemini' }, generate })).toMatchObject({ status: 503 });
    expect(generate).not.toHaveBeenCalled();
  });

  it('refuses an empty or overlong prompt, an unknown shape and a model that cannot make images', async () => {
    const generate = vi.fn(async () => image);
    const post = (body: unknown) => handleImageLabHttp({ method: 'POST', headers: owner, body }, { environment, generate });
    expect(await post({ prompt: '   ' })).toMatchObject({ status: 400, body: { error: 'Write a prompt first.' } });
    expect(await post({ prompt: 'x'.repeat(IMAGE_LAB_PROMPT_LIMIT + 1) })).toMatchObject({ status: 400 });
    expect(await post({ prompt: 'A cover.', aspectRatio: '5:1' })).toMatchObject({ status: 400 });
    expect(await post({ prompt: 'A cover.', model: 'google/gemini-3.8-flash' })).toMatchObject({ status: 400 });
    expect(generate).not.toHaveBeenCalled();
    expect(await handleImageLabHttp({ method: 'GET' }, { environment })).toMatchObject({ status: 405 });
  });

  it('says why an image could not be made, so the prompt can be refined', async () => {
    const refused = vi.fn(async () => { throw new ModelRouterError('provider-error', 'The configured model returned no image.'); });
    expect((await handleImageLabHttp({ method: 'POST', headers: owner, body: { prompt: 'A cover.' } }, { environment, generate: refused })).body)
      .toEqual({ error: 'The image could not be made: The configured model returned no image.' });
    const late = vi.fn(async () => { throw new ModelRouterError('timeout', 'late'); });
    expect((await handleImageLabHttp({ method: 'POST', headers: owner, body: { prompt: 'A cover.' } }, { environment, generate: late })).status).toBe(502);
  });
});
