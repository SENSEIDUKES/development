// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { HarnessGenerationRequestError } from '../host/generation/httpClient';
import { ProfilePictureRequestError } from '../host/media/profilePictureClient';
import { portraitMakerWithAccessToken, writerWithAccessToken } from './accessToken';

const receipt = { rawProviderResponse: '{}', providerReceipt: { provider: 'gemini', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } };
const refused = () => new HarnessGenerationRequestError('This Development action has reached its temporary request limit. Please try again shortly.', 429);

describe('The writer with the owner\'s access token', () => {
  it('asks for the token when a chapter\'s plan or its writing is refused for the visitor limit, then sends it again with it', async () => {
    const writer: HarnessGenerationModelAdapter = {
      getServerInfo: vi.fn(),
      generate: vi.fn().mockRejectedValueOnce(refused()).mockResolvedValueOnce(receipt),
      planChapter: vi.fn().mockRejectedValueOnce(refused()).mockResolvedValueOnce(receipt),
    };
    const token: { current: string | undefined } = { current: undefined };
    const ask = vi.fn(async () => 'owner-token');
    const wrapped = writerWithAccessToken(writer, token, ask);

    await expect(wrapped.generate({} as never)).resolves.toBe(receipt);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(token.current).toBe('owner-token');

    // The planner is the first of a chapter's two calls: it asks the same way.
    token.current = undefined;
    await expect(wrapped.planChapter!({} as never)).resolves.toBe(receipt);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(writer.planChapter).toHaveBeenCalledTimes(2);
  });
});

describe('The profile picture maker with the owner\'s access token', () => {
  const photo = new File(['me'], 'me.jpg', { type: 'image/jpeg' });
  const portrait = (n: number) => new Blob([String(n)], { type: 'image/png' });

  it('asks for three portraits from the photo, with the Router\'s image choice', async () => {
    let n = 0;
    const request = vi.fn(async () => portrait(++n));
    const maker = portraitMakerWithAccessToken(request, { current: 'owner-token' }, vi.fn(), () => 'google/gemini-3-pro-image');
    const { images, problem } = await maker.make(photo);
    expect(images).toHaveLength(3);
    expect(problem).toBeUndefined();
    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenCalledWith({ data: btoa('me'), mimeType: 'image/jpeg' }, { model: 'google/gemini-3-pro-image', accessToken: 'owner-token' });
  });

  it('asks for the token once when the visitor limit stops some, then asks for those again', async () => {
    const limited = new ProfilePictureRequestError('This Development action has reached its temporary request limit.', 429);
    const request = vi.fn()
      .mockResolvedValueOnce(portrait(1))
      .mockRejectedValueOnce(limited)
      .mockRejectedValueOnce(limited)
      .mockResolvedValue(portrait(2));
    const token: { current: string | undefined } = { current: undefined };
    const ask = vi.fn(async () => 'owner-token');
    const { images, problem } = await portraitMakerWithAccessToken(request, token, ask, () => undefined).make(photo);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledWith({ reason: 'portraits', rejected: false });
    expect(token.current).toBe('owner-token');
    expect(images).toHaveLength(3);
    expect(problem).toBeUndefined();
  });

  it('keeps what was made and says why the rest could not be', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(portrait(1))
      .mockRejectedValue(new ProfilePictureRequestError('The portrait could not be made. Try again, or try another photo.', 502));
    const { images, problem } = await portraitMakerWithAccessToken(request, { current: undefined }, vi.fn(), () => undefined).make(photo);
    expect(images).toHaveLength(1);
    expect(problem).toBe('2 of 3 portraits could not be made. The portrait could not be made. Try again, or try another photo.');
  });
});
