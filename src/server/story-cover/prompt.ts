import type { StoryCoverRequest } from '@seihouse/library/stories';

/** How each Story Seed tradition's covers look. */
export const TRADITION_LOOK: Record<string, string> = {
  chinese: 'a Chinese web novel cover painting (xianxia, wuxia and cultivation): misty peaks, flowing robes, spiritual light',
  japanese: 'a Japanese light novel cover illustration: crisp character art, vivid color and a dramatic pose',
  korean: 'a Korean web novel cover: polished digital painting, cinematic lighting and a confident main character',
};

/** The look when the story has no tradition. */
export const DEFAULT_COVER_LOOK = 'a web novel cover painting';

/** A cover's shape: portrait, like a book. */
export const STORY_COVER_ASPECT_RATIO = '2:3';

/** The most text each field may carry, so a request can never carry a long prompt of its own. */
export const STORY_COVER_FIELD_LIMITS = { title: 160, genre: 80, style: 20, synopsis: 1_200, tag: 40, tags: 12, mainCharacter: 80, tone: 300, world: 800 } as const;

const line = (label: string, value: string | undefined) => value ? `${label}: ${value}` : undefined;

/**
 * The cover prompt, from the story's own words. The image carries no
 * lettering: World Info and Home show the title beside the art.
 */
export function buildStoryCoverPrompt(request: StoryCoverRequest): string {
  const look = (request.style && TRADITION_LOOK[request.style]) ?? DEFAULT_COVER_LOOK;
  return [
    `Paint the cover art for a web novel, in the style of ${look}.`,
    '',
    line('Title', request.title),
    line('Genre', request.genre),
    line('Story', request.synopsis),
    line('Main character', request.mainCharacter),
    line('Tone', request.tone),
    line('World', request.world),
    line('Themes', request.tags?.join(', ')),
    '',
    `Make one vertical cover image in portrait (${STORY_COVER_ASPECT_RATIO}): the main character or a defining moment of this story, in its world.`,
    'Painterly, cinematic lighting, rich detail, a clear focal point, readable at small sizes.',
    'Draw no text at all: no title, letters, words, numbers, logo, signature or watermark.',
  ].filter(part => part !== undefined).join('\n');
}
