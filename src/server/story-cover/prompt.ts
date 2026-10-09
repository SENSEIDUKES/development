import type { StoryCoverRequest } from '@seihouse/library/stories';

/** The owner's approved cover template (2026-10-08), with each story field shown as its brace. */
export const COVER_PROMPT_TEMPLATE = `Create professional Eastern fantasy novel cover art, drawing on Chinese webnovel, Japanese light novel, or Korean webnovel illustration appropriate to this story.
Title: {title}
Tradition: {tradition}
Genre: {genre}
Story: {logline, else premise}
Main character: {visual description}
Tone: {tone}
World: {world facts}
Themes: {story tags}
Let the story details guide the art style, clothing, setting, colors, and atmosphere. Feature a compelling character, scene, or symbol that captures this novel.
Vertical 2:3 composition, striking focal point, detailed illustration, readable at thumbnail size.
{title instruction}
No logos, signatures, or watermarks.`;

/** {title instruction} when the title is drawn on the cover (the default). */
export const COVER_TITLE_ON = 'The only lettering is the exact title “{title}”, displayed once in expressive, clearly readable typography suited to the cover. Do not invent subtitles, volume numbers, author names, or other lettering.';
/** {title instruction} when the title is shown beneath the artwork instead. */
export const COVER_TITLE_OFF = 'No lettering. The title will appear beneath the artwork.';

/** Each Story Seed tradition, as the cover prompt names it. */
export const COVER_TRADITIONS: Record<string, string> = {
  chinese: 'Chinese webnovel',
  japanese: 'Japanese light novel',
  korean: 'Korean webnovel',
};

/** A cover's shape: portrait, like a book. */
export const STORY_COVER_ASPECT_RATIO = '2:3';

/** The most text each field may carry, so a request can never carry a long prompt of its own. */
export const STORY_COVER_FIELD_LIMITS = { title: 160, genre: 80, style: 20, synopsis: 1_200, tag: 40, tags: 12, mainCharacter: 80, tone: 300, world: 800 } as const;

/**
 * The cover prompt: the approved template filled from the story's own words.
 * A line whose field the story does not have is left out. The exact title is
 * drawn once unless `title` is false; then the art carries no lettering.
 */
export function buildStoryCoverPrompt(request: StoryCoverRequest, options: { title?: boolean } = {}): string {
  const fields: Record<string, string | undefined> = {
    '{title}': request.title,
    '{tradition}': request.style ? COVER_TRADITIONS[request.style] : undefined,
    '{genre}': request.genre,
    '{logline, else premise}': request.synopsis,
    '{visual description}': request.mainCharacter,
    '{tone}': request.tone,
    '{world facts}': request.world,
    '{story tags}': request.tags?.length ? request.tags.join(', ') : undefined,
  };
  const titleInstruction = (options.title ?? true) ? COVER_TITLE_ON.replace('{title}', request.title) : COVER_TITLE_OFF;
  return COVER_PROMPT_TEMPLATE.split('\n').flatMap(line => {
    if (line === '{title instruction}') return [titleInstruction];
    const brace = Object.keys(fields).find(key => line.includes(key));
    if (!brace) return [line];
    const value = fields[brace];
    return value ? [line.replace(brace, value)] : [];
  }).join('\n');
}
