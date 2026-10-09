import type { HomeWorld, StoryDetailDisplay, WorldActivityStatus, WorldPermissions } from '@seihouse/library/home';
import type { CreatorWorld } from '@seihouse/library/creator-space';
import { featuredNovel } from '../light-novels-home/previewData';
import { SAMPLE_CREATOR_WORLDS } from '../creator-space/previewData';

/** Workshop-only states for judging every World Card size against one world. */
export type WorldCardRecentlyRead = 'no' | 'yes';
export type WorldCardTitleLength = 'standard' | 'long';
export type WorldCardCover = 'art' | 'missing';
/** The SEN sash is awarded by the host; the Workshop shows it on demand. */
export type WorldCardSashPreview = 'hidden' | 'shown';
/** Which host destinations the Info page receives, to review unavailable actions. */
export type WorldCardDestinations = 'all' | 'reading-only' | 'none';
/** `new-story`: a story with no chapters yet, whose host can start it (Begin Story). */
export type WorldCardReadingPreview = 'start' | 'chapter-7' | 'new-story';
/**
 * Who opens the Blueprint: its creator (private or shared novel) or a reader (copy allowed, view
 * only, or the creator's sharing turned off, when World Info offers no Blueprint button at all).
 */
export type WorldCardBlueprintPreview = 'creator' | 'creator-shared' | 'reader-copy' | 'reader-view' | 'reader-off';
export type WorldCardStatusPreview = 'public-ongoing' | 'public-completed'
  | 'library-draft' | 'library-shared' | 'library-public' | 'library-complete';

export interface WorldCardPreviewState {
  recentlyRead: WorldCardRecentlyRead;
  titleLength: WorldCardTitleLength;
  cover: WorldCardCover;
  sash: WorldCardSashPreview;
  activity: WorldActivityStatus | 'hidden';
  cardStatus: WorldCardStatusPreview;
  destinations: WorldCardDestinations;
  reading: WorldCardReadingPreview;
  blueprint: WorldCardBlueprintPreview;
}

const LONG_TITLE = 'The Last Lotus of the Jade Empire and the Thousand-Year Oath Beneath the Silent Pavilion';

/** The featured novel with the chosen states applied to the full card and overview. */
/** What each Blueprint state means for the world's Information panel. */
const BLUEPRINT_PERMISSIONS: Record<WorldCardBlueprintPreview, WorldPermissions> = {
  'creator': { visibility: 'private', blueprint: 'off' },
  'creator-shared': { visibility: 'public', blueprint: 'view' },
  'reader-copy': { visibility: 'public', blueprint: 'copy' },
  'reader-view': { visibility: 'public', blueprint: 'view' },
  'reader-off': { visibility: 'public', blueprint: 'off' },
};

export function previewStory({ recentlyRead, titleLength, cover, activity, reading, blueprint }: WorldCardPreviewState): StoryDetailDisplay {
  return {
    ...featuredNovel,
    ...(reading === 'new-story' ? { chapterCount: 0, currentArc: '' } : {}),
    title: titleLength === 'long' ? LONG_TITLE : featuredNovel.title,
    imageUrl: cover === 'missing' ? '' : featuredNovel.imageUrl,
    recentlyRead: recentlyRead === 'yes',
    activityStatus: activity === 'hidden' ? undefined : activity,
    // Information and Verification panels: sample language, rating, permissions and provenance.
    originalLanguage: 'en',
    readingLanguages: ['ja'],
    matureContent: true,
    permissions: { ...BLUEPRINT_PERMISSIONS[blueprint], branching: featuredNovel.branchingEnabled },
    provenanceUrl: '?preview=provenance',
    updatedAt: '2026-10-08T18:00:00Z',
    authorNotes: 'Ye Chen’s story began as a single image: a lotus opening on dead water.\nThank you for reading — Arc 2 lands this month.',
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

const GRID_GENRES = ['Xianxia', 'Fantasy', 'Wuxia', 'Military', 'Romance', 'Mystery'];

/** A Home grid of several worlds, to judge how the cards read side by side. */
export function previewHomeGrid(state: WorldCardPreviewState): HomeWorld[] {
  const lead = previewStory(state);
  return [lead, ...SAMPLE_CREATOR_WORLDS.slice(1).map((world, index): HomeWorld => ({
    ...featuredNovel,
    id: world.id, title: world.title, chapterCount: world.chapterCount, imageUrl: world.imageUrl ?? '',
    genre: GRID_GENRES[(index + 1) % GRID_GENRES.length], videoUrl: undefined,
    // Alternate the creator's choice so the Branching badge shows on some cards and not others.
    branchingEnabled: index % 2 === 1,
  }))];
}
