import type { StoryCoverRequest } from '@seihouse/library/stories';

/** How each Story Seed tradition's covers look. */
const TRADITION_LOOK: Record<string, string> = {
  chinese: 'a Chinese web novel cover painting (xianxia, wuxia and cultivation): misty peaks, flowing robes, spiritual light',
  japanese: 'a Japanese light novel cover illustration: crisp character art, vivid color and a dramatic pose',
  korean: 'a Korean web novel cover: polished digital painting, cinematic lighting and a confident main character',
};

const line = (label: string, value: string | undefined) => value ? `${label}: ${value}` : undefined;

/**
 * The cover prompt, from the story's own words. The image carries no
 * lettering: World Info and Home show the title beside the art.
 */
export function buildStoryCoverPrompt(request: StoryCoverRequest): string {
  const look = (request.style && TRADITION_LOOK[request.style]) ?? 'a web novel cover painting';
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
    'Make one vertical cover image in portrait (2:3): the main character or a defining moment of this story, in its world.',
    'Painterly, cinematic lighting, rich detail, a clear focal point, readable at small sizes.',
    'Draw no text at all: no title, letters, words, numbers, logo, signature or watermark.',
  ].filter(part => part !== undefined).join('\n');
}
