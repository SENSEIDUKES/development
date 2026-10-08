import { describe, expect, it, vi } from 'vitest';
import { ModelRouterError } from '@seihouse/library/model-router-server';
import { ATTACHED_IMAGE_MAX_BASE64 } from '../shared/imageAttachments';
import { handleProfilePictureHttp, PROFILE_PICTURE_TIMEOUT_MS } from './http';
import { PROFILE_PICTURE_PROMPT } from './prompt';

const environment = { GEMINI_API_KEY: 'secret-gemini' };
const photo = { data: 'cGhvdG8=', mimeType: 'image/jpeg' };
const image = { capability: 'image' as const, provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite-image', data: 'aW1hZ2U=', mimeType: 'image/png' };

describe('The profile picture route', () => {
  it('gives the reader\'s photo to the image model with the approved prompt, square, with Nano Banana 2 Lite by default', async () => {
    const generate = vi.fn(async () => image);
    const result = await handleProfilePictureHttp({ method: 'POST', body: { photo } }, { environment, generate });
    expect(result).toMatchObject({ status: 200, body: { image: 'aW1hZ2U=', mimeType: 'image/png', model: 'google/gemini-3.1-flash-lite-image' } });
    expect(generate).toHaveBeenCalledWith({
      capability: 'image', model: 'google/gemini-3.1-flash-lite-image', prompt: PROFILE_PICTURE_PROMPT,
      aspectRatio: '1:1', referenceImages: [photo], timeoutMs: PROFILE_PICTURE_TIMEOUT_MS,
    });
    expect(JSON.stringify(result.body)).not.toContain('secret');
  });

  it('uses the reader\'s Model Router choice, and never a prompt of the reader\'s own', async () => {
    const generate = vi.fn(async () => image);
    await handleProfilePictureHttp({ method: 'POST', body: { photo, model: 'google/gemini-3-pro-image', prompt: 'Something else entirely.' } }, { environment, generate });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'google/gemini-3-pro-image', prompt: PROFILE_PICTURE_PROMPT }));
  });

  it('needs a photo it can read, small enough to send, before any model call', async () => {
    const generate = vi.fn(async () => image);
    const post = (body: unknown) => handleProfilePictureHttp({ method: 'POST', body }, { environment, generate });
    expect(await post({})).toMatchObject({ status: 400, body: { error: 'Choose a photo first.' } });
    expect(await post({ photo: { data: 'cGhvdG8=', mimeType: 'image/gif' } })).toMatchObject({ status: 400 });
    expect(await post({ photo: { data: 'A'.repeat(ATTACHED_IMAGE_MAX_BASE64 + 4), mimeType: 'image/png' } })).toMatchObject({ status: 413 });
    expect(await post({ photo, model: 'google/gemini-3.8-flash' })).toMatchObject({ status: 400 });
    expect(await handleProfilePictureHttp({ method: 'POST', body: { photo } }, { environment: {}, generate })).toMatchObject({ status: 503 });
    expect(await handleProfilePictureHttp({ method: 'GET' }, { environment, generate })).toMatchObject({ status: 405 });
    expect(generate).not.toHaveBeenCalled();
  });

  it('says plainly when a portrait could not be made, without the provider\'s words', async () => {
    const refused = vi.fn(async () => { throw new ModelRouterError('provider-error', 'safety: blocked'); });
    const failed = await handleProfilePictureHttp({ method: 'POST', body: { photo } }, { environment, generate: refused });
    expect(failed).toMatchObject({ status: 502, body: { error: 'The portrait could not be made. Try again, or try another photo.' } });
    const late = vi.fn(async () => { throw new ModelRouterError('timeout', 'late'); });
    expect((await handleProfilePictureHttp({ method: 'POST', body: { photo } }, { environment, generate: late })).body).toMatchObject({ error: expect.stringContaining('120 seconds') });
  });
});
