import { describe, expect, it, vi } from 'vitest';
import { handleStoryCoverHttp } from './http';
import { buildCodexPicturePrompt, CODEX_PICTURE_FIELD_LIMITS, parseCodexPictureRequest } from './codexPicture';
import { GENERATION_CONSUMERS } from '../model-router/catalog';

const image = { capability: 'image' as const, provider: 'gemini' as const, model: 'google/gemini-3.1-flash-lite-image', data: 'aW1hZ2U=', mimeType: 'image/png' };
const environment = { GEMINI_API_KEY: 'secret-gemini' };
const story = { style: 'chinese', genre: 'Xianxia', tone: 'Grim and hungry.', world: 'Furnace sects rule the ash plains.' };
const sword = { subject: 'thing' as const, name: 'Crimson Broadsword', look: { summary: 'A heavy black-iron broadsword veined with red.', traits: { colour: 'red veins', material: 'black iron' } } };

describe('A Codex card\'s picture', () => {
  it('is written from the card\'s look and the story\'s own words, traits in the order a look is read', () => {
    expect(buildCodexPicturePrompt({ card: sword, story })).toBe([
      'Create professional, high-quality Eastern fantasy item art, drawing on Chinese webnovel, Japanese light novel, or Korean webnovel illustration appropriate to this story.',
      'Tradition: Chinese webnovel',
      'Genre: Xianxia',
      'Tone: Grim and hungry.',
      'World: Furnace sects rule the ash plains.',
      'Item: Crimson Broadsword',
      'Look: A heavy black-iron broadsword veined with red.',
      '- Material: black iron',
      '- Colour: red veins',
      'Keep every detail the look states exact and never contradict it; never add engravings or gems it does not name. Where the look is silent, choose what suits the object and the world.',
      'The object alone as the clear focus, whole, against a background from its world, with cinematic lighting. No hands or people.',
      'Vertical 3:4 composition. High quality, highly detailed, richly painted, sharp focus, readable at thumbnail size.',
      'No lettering, logos, signatures, or watermarks.',
    ].join('\n'));
  });

  it('leaves out a line the story lacks, and draws a character as one figure', () => {
    const prompt = buildCodexPicturePrompt({ card: { subject: 'character', name: 'Han Shuo', look: { summary: 'A lean youth with ash-streaked black hair.', traits: { hair: 'black, ash-streaked' } } }, story: {} });
    expect(prompt).not.toMatch(/Tradition:|Genre:|Tone:|World:/);
    expect(prompt).toContain('Character: Han Shuo\nLook: A lean youth with ash-streaked black hair.\n- Hair: black, ash-streaked\n');
    expect(prompt).toContain('One character as the clear focus, in a setting from their world');
    expect(prompt).toContain('Never sexualize anyone.');
  });

  it('keeps only the traits of the card\'s kind and clips every field', () => {
    const parsed = parseCodexPictureRequest({
      card: { subject: 'thing', name: 'x'.repeat(500), look: { summary: 'y'.repeat(900), traits: { material: 'iron', hair: 'none', colour: 'z'.repeat(900) } } },
      story: { genre: 'Xianxia', synopsis: 'Not used.' },
    });
    expect(parsed.card.name).toHaveLength(CODEX_PICTURE_FIELD_LIMITS.name);
    expect(parsed.card.look.summary).toHaveLength(CODEX_PICTURE_FIELD_LIMITS.look);
    expect(parsed.card.look.traits).toEqual({ material: 'iron', colour: 'z'.repeat(CODEX_PICTURE_FIELD_LIMITS.trait) });
    expect(parsed.story).toEqual({ genre: 'Xianxia' });
  });

  it('is made on the cover route, at 3:4, and a malformed card is refused before any model is called', async () => {
    const generate = vi.fn(async () => image);
    const result = await handleStoryCoverHttp({ method: 'POST', body: { card: sword, story } }, { environment, generate });
    expect(result).toMatchObject({ status: 200, body: { image: 'aW1hZ2U=', mimeType: 'image/png' } });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ capability: 'image', aspectRatio: '3:4', prompt: buildCodexPicturePrompt({ card: sword, story }) }));
    for (const card of [{ ...sword, subject: 'place' }, { ...sword, name: ' ' }, { ...sword, look: undefined }, { ...sword, look: { summary: '' } }, { ...sword, look: { ...sword.look, traits: 'iron' } }]) {
      expect((await handleStoryCoverHttp({ method: 'POST', body: { card, story } }, { environment, generate })).status).toBe(400);
    }
    expect(generate).toHaveBeenCalledTimes(1);
    generate.mockRejectedValueOnce(new Error('busy'));
    expect(await handleStoryCoverHttp({ method: 'POST', body: { card: sword } }, { environment, generate }))
      .toMatchObject({ status: 502, body: { error: 'The picture could not be made. Nothing was changed; please try again.' } });
  });

  it('is registered in the Model Router, following the Router\'s image choice', () => {
    expect(GENERATION_CONSUMERS).toContainEqual({ name: 'Codex Picture', capability: 'images', entry: 'src/server/story-cover/codexPicture.ts', modelChoice: 'router' });
  });
});
