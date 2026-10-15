import type { CodexPictureRequest } from '@seihouse/library/stories';
import { CHARACTER_LOOK_TRAITS, THING_LOOK_TRAITS, type LookTrait } from '@seihouse/sen/harness-generation';
import { COVER_TRADITIONS, STORY_COVER_FIELD_LIMITS } from './prompt';

/**
 * A Codex card's picture: one image of a character or thing, made from the
 * look the story's record wrote down for it (its line and each trait the
 * chapters state), set in the story's own tradition, genre, tone and world.
 * Made with the Model Router's image choice, on the cover route.
 */
export const CODEX_CHARACTER_PROMPT_TEMPLATE = `Create Eastern fantasy character art, drawing on Chinese webnovel, Japanese light novel, or Korean webnovel illustration appropriate to this story.
Tradition: {tradition}
Genre: {genre}
Tone: {tone}
World: {world facts}
Character: {name}
Look: {look}
{look traits}
Draw only what the look states and keep every stated detail exact. Where the look is silent, keep it plain and true to the world; never add scars, marks, colours or gear it does not name.
One character, full figure, centered, in a simple setting that suits the world. Never sexualize anyone.
Vertical 3:4 composition, detailed illustration, readable at thumbnail size.
No lettering, logos, signatures, or watermarks.`;

/** The same for a thing: the object alone, so its look can be judged. */
export const CODEX_THING_PROMPT_TEMPLATE = `Create Eastern fantasy item art, drawing on Chinese webnovel, Japanese light novel, or Korean webnovel illustration appropriate to this story.
Tradition: {tradition}
Genre: {genre}
Tone: {tone}
World: {world facts}
Item: {name}
Look: {look}
{look traits}
Draw only what the look states and keep every stated detail exact. Where the look is silent, keep it plain and true to the world; never add engravings, gems, glow or colours it does not name.
The object alone, whole and centered, against a simple background that suits the world. No hands or people.
Vertical 3:4 composition, detailed illustration, readable at thumbnail size.
No lettering, logos, signatures, or watermarks.`;

/** A card's shape: the Codex card's own 3:4. */
export const CODEX_PICTURE_ASPECT_RATIO = '3:4';

/** The most text each part of a card may carry; the story's fields keep the cover's limits. */
export const CODEX_PICTURE_FIELD_LIMITS = { name: 120, look: 300, trait: 200 } as const;

const TRAITS: Record<CodexPictureRequest['card']['subject'], readonly LookTrait[]> = { character: CHARACTER_LOOK_TRAITS, thing: THING_LOOK_TRAITS };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const clip = (value: unknown, limit: number): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error('Each picture field must be text.');
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, limit) : undefined;
};

/**
 * Reads a Codex picture request: the card (a character or thing, its name and
 * its look, with only the traits of its kind) and the story's own words, each
 * clipped to its limit.
 */
export function parseCodexPictureRequest(source: unknown): CodexPictureRequest {
  if (!isRecord(source) || !isRecord(source.card)) throw new Error('The picture request must contain the card.');
  const { card } = source;
  if (card.subject !== 'character' && card.subject !== 'thing') throw new Error('A picture is of a character or a thing.');
  const name = clip(card.name, CODEX_PICTURE_FIELD_LIMITS.name);
  if (!name) throw new Error('The picture request needs the card\'s name.');
  if (!isRecord(card.look)) throw new Error('A picture is made from the card\'s look.');
  const summary = clip(card.look.summary, CODEX_PICTURE_FIELD_LIMITS.look);
  if (!summary) throw new Error('A picture is made from the card\'s look.');
  const traits: Partial<Record<LookTrait, string>> = {};
  if (card.look.traits !== undefined) {
    if (!isRecord(card.look.traits)) throw new Error('A look\'s traits must be text by trait.');
    for (const trait of TRAITS[card.subject]) {
      const text = clip(card.look.traits[trait], CODEX_PICTURE_FIELD_LIMITS.trait);
      if (text) traits[trait] = text;
    }
  }
  const story: CodexPictureRequest['story'] = {};
  if (source.story !== undefined) {
    if (!isRecord(source.story)) throw new Error('The story must be its own words.');
    for (const field of ['genre', 'style', 'tone', 'world'] as const) {
      const text = clip(source.story[field], STORY_COVER_FIELD_LIMITS[field]);
      if (text) story[field] = text;
    }
  }
  return { card: { subject: card.subject, name, look: { summary, traits } }, story };
}

/**
 * The picture prompt: the template for its kind, filled from the card and the
 * story. A line whose field is missing is left out; the look's traits follow
 * its line, one to a line, in the order a look is read.
 */
export function buildCodexPicturePrompt({ card, story }: CodexPictureRequest): string {
  const fields: Record<string, string | undefined> = {
    '{tradition}': story.style ? COVER_TRADITIONS[story.style] : undefined,
    '{genre}': story.genre,
    '{tone}': story.tone,
    '{world facts}': story.world,
    '{name}': card.name,
    '{look}': card.look.summary,
  };
  const traits = TRAITS[card.subject].flatMap(trait => {
    const text = card.look.traits[trait];
    return text ? [`- ${trait[0].toUpperCase()}${trait.slice(1)}: ${text}`] : [];
  });
  const template = card.subject === 'character' ? CODEX_CHARACTER_PROMPT_TEMPLATE : CODEX_THING_PROMPT_TEMPLATE;
  return template.split('\n').flatMap(line => {
    if (line === '{look traits}') return traits;
    const brace = Object.keys(fields).find(key => line.includes(key));
    if (!brace) return [line];
    const value = fields[brace];
    return value ? [line.replace(brace, value)] : [];
  }).join('\n');
}
