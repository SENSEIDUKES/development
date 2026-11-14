import { describe, expect, it, vi } from 'vitest';
import { handleStoryCoverHttp, STORY_COVER_TIMEOUT_MS } from './http';
import { buildStoryCoverPrompt } from './prompt';
import { ModelRouterError } from '@seihouse/library/model-router-server';

const story = { characters: [{ name: 'Mara', role: 'protagonist', image: { data: 'aW1hZ2U=', mimeType: 'image/png' } }], title: 'The Drowned Name', genre: 'Xianxia', style: 'chinese', synopsis: 'A courier returns to the drowned city.', mainCharacter: 'Mara', tags: ['revenge', 'water'] };
const image = { capability: 'image' as const, provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite-image', data: 'aW1hZ2U=', mimeType: 'image/png' };
const environment = { GEMINI_API_KEY: 'secret-gemini' };

describe('The story cover route', () => {
  it('makes one cover with Nano Banana 2 Lite by default, in portrait, and answers with the image', async () => {
    const generate = vi.fn(async () => image);
    const onAnswer = vi.fn();
    const result = await handleStoryCoverHttp({ method: 'POST', body: { story } }, { environment, generate, onAnswer });
    expect(result).toMatchObject({ status: 200, body: { image: 'aW1hZ2U=', mimeType: 'image/png', model: 'google/gemini-3.1-flash-lite-image' } });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'image', model: 'google/gemini-3.1-flash-lite-image', aspectRatio: '2:3', timeoutMs: STORY_COVER_TIMEOUT_MS,
    }));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ model: 'google/gemini-3.1-flash-lite-image' }));
    expect(JSON.stringify(result.body)).not.toContain('secret');
  });

  it('follows the Router\'s image choice and refuses a model that cannot make covers', async () => {
    const generate = vi.fn(async () => ({ ...image, model: 'google/gemini-3-pro-image' }));
    await handleStoryCoverHttp({ method: 'POST', body: { story, model: 'google/gemini-3-pro-image' } }, { environment, generate });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'google/gemini-3-pro-image' }));
    expect(await handleStoryCoverHttp({ method: 'POST', body: { story, model: 'google/gemini-3.8-flash' } }, { environment, generate }))
      .toMatchObject({ status: 400, body: { error: "Model 'google/gemini-3.8-flash' cannot make images." } });
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

  it('letters the title only on a story that has reached its ending', async () => {
    const generate = vi.fn(async (_request: { prompt: string }) => image);
    await handleStoryCoverHttp({ method: 'POST', body: { story } }, { environment, generate: generate as never });
    await handleStoryCoverHttp({ method: 'POST', body: { story: { ...story, titled: true } } }, { environment, generate: generate as never });
    const [untitled, titled] = generate.mock.calls.map(call => call[0].prompt);
    expect(untitled).toContain('No lettering.');
    expect(untitled).not.toContain('“The Drowned Name”');
    expect(titled).toContain('the exact title “The Drowned Name”, displayed once');
    expect(await handleStoryCoverHttp({ method: 'POST', body: { story: { ...story, titled: 'yes' } } }, { environment }))
      .toMatchObject({ status: 400 });
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
  it('fills the approved template from the story and draws the exact title once, on a story that has reached its ending', () => {
    const prompt = buildStoryCoverPrompt({ ...story, titled: true });
    expect(prompt.startsWith('Create a professional Eastern fantasy novel cover art, high-quality animation, drawing on Chinese webnovel, Japanese light novel, or Korean webnovel illustration when appropriate to this story.')).toBe(true);
    expect(prompt).toContain('Title: The Drowned Name');
    expect(prompt).toContain('Tradition: Chinese webnovel');
    expect(prompt).toContain('Genre: Xianxia');
    expect(prompt).toContain('Main character: Mara');
    expect(prompt).toContain('Themes: revenge, water');
    expect(prompt).toContain('Vertical 2:3 composition');
    expect(prompt).toContain('the exact title “The Drowned Name”, displayed once');
    expect(prompt).not.toContain('{');
    // A field the story does not have leaves its line out; until the ending, no lettering.
    const plain = buildStoryCoverPrompt({ title: 'Plain' });
    expect(plain).not.toContain('Tradition:');
    expect(plain).not.toContain('Genre:');
    expect(plain).toContain('No lettering. The title will appear beneath the artwork.');
  });
});


describe('Character reference covers', () => {
  it('sends the ordered protagonist and counterpart bytes with their names and relationship', async () => {
    const characters = [...story.characters, { name: 'Shen Yue', role: 'counterpart', relationship: 'female; spirit-bound rival', image: { data: 'c2hlbg==', mimeType: 'image/jpeg' } }];
    const generate = vi.fn(async () => image);
    const result = await handleStoryCoverHttp({ method: 'POST', body: { story: { ...story, characters } } }, { environment, generate });
    expect(result.status).toBe(200);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ referenceImages: characters.map(character => character.image), prompt: expect.stringContaining('Reference 2: Shen Yue — counterpart; female; spirit-bound rival') }));
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining('Keep their identities separate') }));
  });
  it('refuses missing, reversed, malformed and oversized references before invoking a model', async () => {
    const generate = vi.fn(async () => image);
    for (const characters of [undefined, [], [{ ...story.characters[0], role: 'counterpart' }], [{ ...story.characters[0], image: { data: 'invalid!', mimeType: 'image/png' } }], [{ ...story.characters[0], image: { data: 'YQ=='.repeat(500000), mimeType: 'image/png' } }]]) {
      const result = await handleStoryCoverHttp({ method: 'POST', body: { story: { ...story, characters } } }, { environment, generate });
      expect(result.status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  });
});
