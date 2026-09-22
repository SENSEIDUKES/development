import type { StoryCardDemoProps } from './StoryCardDemo';

/**
 * Each item points at its own clip, the way production models it: a story's own
 * motion cover, a Familiar's own clip, never one shared fallback. These are
 * hosted Library assets used for inspection; the component ships no URLs.
 */
export const STORY_CLIP_URL = 'https://video.seihouse.org/LIGHT%20NOVEL/LIGHT_NOVEL_INTRO.mp4';
export const CELESTIAL_GUARDIAN_CLIP_URL = 'https://media.seihouse.org/SEN/VIDEO/Familiar/Celestial%20Guardian%20Canva.mp4';

export const storyCardSample: StoryCardDemoProps = {
  title: 'The Last Lotus of the Jade Empire',
  author: 'Aetherial Resonance',
  genre: 'Xianxia',
  chapters: 24,
  stage: 'Foundation',
  coverUrl: '/card-workshop/test-images/ye_chen_portrait.png',
  videoUrl: STORY_CLIP_URL,
};

export interface MotionPictureSample {
  id: string;
  label: string;
  caption: string;
  stillUrl: string;
  /** Left unset to show an item that has artwork but no clip. */
  videoUrl?: string;
  /** Portrait covers and square companions both have to sit correctly. */
  shape: 'portrait' | 'square';
}

export const motionPictureSamples: readonly MotionPictureSample[] = [
  {
    id: 'celestial-guardian',
    label: 'Celestial Guardian',
    caption: 'A Familiar playing its own clip, sampling its own artwork for the aura.',
    stillUrl: '/familiars/celestial-guardian/neutral.png',
    videoUrl: CELESTIAL_GUARDIAN_CLIP_URL,
    shape: 'square',
  },
  {
    id: 'remembered',
    label: 'Host-remembered',
    caption: 'Playback owned by the host, the way a profile would persist the choice.',
    stillUrl: '/card-workshop/test-images/ye_chen_portrait.png',
    videoUrl: STORY_CLIP_URL,
    shape: 'portrait',
  },
  {
    id: 'location',
    label: 'Location plate',
    caption: 'Different artwork, so the sampled aura changes colour with it.',
    stillUrl: '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg',
    videoUrl: STORY_CLIP_URL,
    shape: 'portrait',
  },
  {
    id: 'no-clip',
    label: 'No clip supplied',
    caption: 'Without a clip the still stands alone and no control is offered.',
    stillUrl: '/card-workshop/test-images/elder_kaelen_portrait.png',
    shape: 'portrait',
  },
];
