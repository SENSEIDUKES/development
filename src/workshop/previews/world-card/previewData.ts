import type { HomeWorld, StoryDetailDisplay, WorldActivityStatus } from '@seihouse/library/home';
import type { CreatorWorld } from '@seihouse/library/creator-space';
import { featuredNovel } from '../light-novels-home/previewData';
import { SAMPLE_CREATOR_WORLDS } from '../creator-space/previewData';

/** Workshop-only states for judging every World Card size against one world. */
export type WorldCardAcquisition = 'sealed' | 'draft' | 'unacquired' | 'recently-read';
export type WorldCardTitleLength = 'standard' | 'long';
export type WorldCardCover = 'art' | 'missing';
export type WorldCardBranchPreview = 'sample' | 'zero' | 'unavailable';
export type WorldCardStatusPreview = 'public-ongoing' | 'public-completed'
  | 'library-draft' | 'library-shared' | 'library-public' | 'library-complete';

export interface WorldCardPreviewState {
  acquisition: WorldCardAcquisition;
  titleLength: WorldCardTitleLength;
  cover: WorldCardCover;
  branches: WorldCardBranchPreview;
  activity: WorldActivityStatus | 'hidden';
  cardStatus: WorldCardStatusPreview;
}

export const ACQUISITION_LABELS: Record<WorldCardAcquisition, string> = {
  sealed: 'Sealed (in library)', draft: 'Draft (in library)', unacquired: 'Unacquired', 'recently-read': 'Recently read + Sealed',
};

const LONG_TITLE = 'The Last Lotus of the Jade Empire and the Thousand-Year Oath Beneath the Silent Pavilion';

/** The featured novel with the chosen states applied to the full card and overview. */
export function previewStory({ acquisition, titleLength, cover, branches, activity }: WorldCardPreviewState): StoryDetailDisplay {
  return {
    ...featuredNovel,
    title: titleLength === 'long' ? LONG_TITLE : featuredNovel.title,
    imageUrl: cover === 'missing' ? '' : featuredNovel.imageUrl,
    acquired: acquisition !== 'unacquired',
    draft: acquisition === 'draft',
    recentlyRead: acquisition === 'recently-read',
    branchCount: branches === 'sample' ? 12 : branches === 'zero' ? 0 : undefined,
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
