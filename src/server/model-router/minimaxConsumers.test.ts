import { afterEach, expect, it, vi } from 'vitest';
import { handleStoryCoverHttp } from '../story-cover/http';
import { handleImageLabHttp } from '../image-lab/http';
import { handleProfilePictureHttp } from '../profile-picture/http';

afterEach(() => vi.unstubAllGlobals());
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSAAAAABJRU5ErkJggg==';
const environment = { Minimax: 'secret', STORY_SEED_BLUEPRINT_ACCESS_TOKEN: 'access' };

it('routes covers, Image Lab, and profile pictures through the MiniMax adapter with the Vercel alias', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { image_base64: [png] }, base_resp: { status_code: 0 } })));
  vi.stubGlobal('fetch', fetchMock);
  const cover = await handleStoryCoverHttp({ method: 'POST', body: { story: { title: 'The Wind', synopsis: 'A journey begins.' }, model: 'minimax/image-01' } }, { environment });
  const lab = await handleImageLabHttp({ method: 'POST', headers: { authorization: 'Bearer access' }, body: { prompt: 'A mountain.', model: 'minimax/image-01' } }, { environment });
  const portrait = await handleProfilePictureHttp({ method: 'POST', body: { photo: { data: png, mimeType: 'image/png' }, model: 'minimax/image-01-live' } }, { environment });
  for (const result of [cover, lab, portrait]) {
    expect(result).toMatchObject({ status: 200, body: { image: png, mimeType: 'image/png' } });
    expect(JSON.stringify(result)).not.toContain('secret');
  }
  expect(fetchMock).toHaveBeenCalledTimes(3);
  for (const call of fetchMock.mock.calls as unknown as Array<[string, RequestInit]>) {
    expect(call[0]).toBe('https://api.minimax.io/v1/image_generation');
    expect(call[1].headers).toMatchObject({ Authorization: 'Bearer secret' });
  }
});

it('explains incompatible image choices and oversized cover prompts without charging', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  const noPortrait = await handleStoryCoverHttp({ method: 'POST', body: { story: { title: 'The Wind' }, model: 'minimax/image-01-live' } }, { environment });
  expect(noPortrait).toMatchObject({ status: 400, body: { error: expect.stringContaining('requires a portrait reference') } });
  const tooLong = await handleStoryCoverHttp({ method: 'POST', body: { story: { title: 'The Wind', synopsis: 'x'.repeat(1200), world: 'y'.repeat(800) }, model: 'minimax/image-01' } }, { environment });
  expect(tooLong).toMatchObject({ status: 400, body: { error: expect.stringContaining('1,500 characters') } });
  expect(fetchMock).not.toHaveBeenCalled();
});
