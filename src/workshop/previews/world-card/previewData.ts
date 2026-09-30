import type { HomeWorld, StoryDetailDisplay, WorldActivityStatus } from '@seihouse/library/home';
import type { CreatorWorld } from '@seihouse/library/creator-space';
import { featuredNovel } from '../light-novels-home/previewData';
import { SAMPLE_CREATOR_WORLDS } from '../creator-space/previewData';

/** Workshop-only states for judging every World Card size against one world. */
export type WorldCardRecentlyRead = 'no' | 'yes';
export type WorldCardTitleLength = 'standard' | 'long';
export type WorldCardCover = 'art' | 'missing';
/** Which host destinations the Info page receives, to review unavailable actions. */
export type WorldCardDestinations = 'all' | 'reading-only' | 'none';
export type WorldCardReadingPreview = 'start' | 'chapter-7';
export type WorldCardStatusPreview = 'public-ongoing' | 'public-completed'
  | 'library-draft' | 'library-shared' | 'library-public' | 'library-complete';

export interface WorldCardPreviewState {
  recentlyRead: WorldCardRecentlyRead;
  titleLength: WorldCardTitleLength;
  cover: WorldCardCover;
  activity: WorldActivityStatus | 'hidden';
  cardStatus: WorldCardStatusPreview;
  destinations: WorldCardDestinations;
  reading: WorldCardReadingPreview;
}

const LONG_TITLE = 'The Last Lotus of the Jade Empire and the Thousand-Year Oath Beneath the Silent Pavilion';

/** The featured novel with the chosen states applied to the full card and overview. */
export function previewStory({ recentlyRead, titleLength, cover, activity }: WorldCardPreviewState): StoryDetailDisplay {
  return {
    ...featuredNovel,
    title: titleLength === 'long' ? LONG_TITLE : featuredNovel.title,
    imageUrl: cover === 'missing' ? '' : featuredNovel.imageUrl,
    recentlyRead: recentlyRead === 'yes',
    activityStatus: activity === 'hidden' ? undefined : activity,
  } satisfies HomeWorld & StoryDetailDisplay;
}

/** Create's sample worlds, led by the featured novel with the chosen states. */
export function previewCreatorWorlds({ titleLength, cover }: WorldCardPreviewState): CreatorWorld[] {
  const [first, ...rest] = SAMPLE_CREATOR_WORLDS;
  return [{
    ...first,
    title: titleLength === 'long' ? LONG_TITLE : first.title,
    imageUrl: cover === 'missing' ? undefined : first.imageUrl,
  }, ...rest];
}
