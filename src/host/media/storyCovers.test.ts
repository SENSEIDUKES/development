import { describe, expect, it, vi } from 'vitest';
import { requestStoryCover, StoryCoverRequestError } from './storyCoverClient';
import { createMemoryStoryCoverStore } from './storyCovers';

const story = { title: 'The Drowned Name', genre: 'Xianxia' };

describe('The cover server client', () => {
  it('sends the story, the Router\'s image model and the owner\'s token, and returns the image', async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ story, model: 'google/gemini-3-pro-image' });
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer owner-token');
      return new Response(JSON.stringify({ image: btoa('png-bytes'), mimeType: 'image/png', model: 'google/gemini-3-pro-image' }), { status: 200 });
    });
    const image = await requestStoryCover(story, { model: 'google/gemini-3-pro-image', accessToken: 'owner-token', fetchImpl: fetchImpl as typeof fetch });
    expect(image.type).toBe('image/png');
    expect(await image.text()).toBe('png-bytes');
  });

  it('carries the server\'s status and words when it refuses, and refuses a reply with no image', async () => {
    const limited = vi.fn(async () => new Response(JSON.stringify({ error: 'Limit reached.' }), { status: 429 }));
    await expect(requestStoryCover(story, { fetchImpl: limited as typeof fetch })).rejects.toMatchObject({ status: 429, message: 'Limit reached.' });
    const empty = vi.fn(async () => new Response(JSON.stringify({ mimeType: 'text/plain' }), { status: 200 }));
    await expect(requestStoryCover(story, { fetchImpl: empty as typeof fetch })).rejects.toBeInstanceOf(StoryCoverRequestError);
  });
});

describe('Covers kept for the visit', () => {
  it('keeps one cover per story; a new one replaces it', async () => {
    const store = createMemoryStoryCoverStore();
    await store.save('story-1', new Blob(['first']));
    await store.save('story-1', new Blob(['second']));
    const [cover, ...rest] = await store.loadAll();
    expect(rest).toEqual([]);
    expect(cover.storyId).toBe('story-1');
    expect(await cover.image.text()).toBe('second');
  });
});
