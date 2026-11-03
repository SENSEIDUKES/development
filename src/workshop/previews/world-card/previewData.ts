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
/**
 * The Feature card's hero: the world's own wide still and loop, its cover with its motion
 * cover clip, or its cover alone (a phone that will not play video).
 */
export type WorldCardHeroPreview = 'wide' | 'cover-clip' | 'still';
/** Compact's creator names: the sample's own, or the multilingual lettering experiment. */
export type WorldCardCreatorsPreview = 'multilingual' | 'sample';
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
  hero: WorldCardHeroPreview;
  creators: WorldCardCreatorsPreview;
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

export function previewStory({ recentlyRead, titleLength, cover, activity, reading, blueprint, hero }: WorldCardPreviewState): StoryDetailDisplay {
  return {
    ...featuredNovel,
    ...(reading === 'new-story' ? { chapterCount: 0, currentArc: '' } : {}),
    title: titleLength === 'long' ? LONG_TITLE : featuredNovel.title,
    imageUrl: cover === 'missing' ? '' : featuredNovel.imageUrl,
    // The sample world's own wide hero still and loop (Workshop-local assets).
    ...(hero === 'wide' ? { heroImageUrl: '/world-card/last-lotus-hero.jpg', heroVideoUrl: '/world-card/last-lotus-hero.mp4' } : {}),
    ...(hero === 'still' ? { videoUrl: undefined } : {}),
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

/** Browse-page worlds beyond the Home grid, so a Compact grid and its Switch box have enough to deal. */
const BROWSE_EXTRA: readonly [string, string, string][] = [
  ['The Ninth Trial', 'Fate Survival', '/manifest-backdrops/immortal-land-5.jpg'],
  ['Ruins Beyond the Ninth Sky', 'Fate Survival', '/manifest-backdrops/immortal-land-1.jpg'],
  ['Ember Sect Outcast', 'Xianxia', '/manifest-backdrops/immortal-land-2.jpg'],
  ['The Grey Tide Wager', 'Fate Survival', '/manifest-backdrops/immortal-land-3.jpg'],
  ['Archive of the Drowned Moon', 'Dark Fantasy', '/manifest-backdrops/immortal-land-4.jpg'],
  ['Mysteries of Lotus Lake', 'Mystery', '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg'],
  ['The Hollow Pine Accord', 'Wuxia', ''],
];

/**
 * The lettering experiment: every creator is "cultivator" in another language and script, each
 * in a different element and strength, to see how names in many languages sit on small cards.
 * Includes right-to-left Arabic and a long Thai word.
 */
export const MULTILINGUAL_CREATORS: readonly { name: string; language: string; title: NonNullable<HomeWorld['creatorTitle']> }[] = [
  { name: 'Cultivator', language: 'en', title: { element: 'fire', intensity: 'legendary' } },
  { name: '修仙者', language: 'zh', title: { element: 'lightning', intensity: 'epic' } },
  { name: '修行者', language: 'ja', title: { element: 'water', intensity: 'rare' } },
  { name: '수련자', language: 'ko', title: { element: 'poison', intensity: 'common' } },
  { name: 'Tu Sĩ', language: 'vi', title: { element: 'frost', intensity: 'active' } },
  { name: 'Культиватор', language: 'ru', title: { element: 'celestial', intensity: 'legendary' } },
  { name: 'المُتعبِّد', language: 'ar', title: { element: 'void', intensity: 'epic' } },
  { name: 'साधक', language: 'hi', title: { element: 'fire', intensity: 'subtle' } },
  { name: 'ผู้บำเพ็ญเพียร', language: 'th', title: { element: 'lightning', intensity: 'rare' } },
  { name: 'Cultivador', language: 'es', title: { element: 'water', intensity: 'legendary' } },
  { name: 'Καλλιεργητής', language: 'el', title: { element: 'poison', intensity: 'epic' } },
  { name: 'Pertapa', language: 'id', title: { element: 'frost', intensity: 'common' } },
];

/** Every world a browse page might list: the Home grid, then the extra catalogue (one with no cover yet). */
export function previewBrowseWorlds(state: WorldCardPreviewState): HomeWorld[] {
  const worlds = [...previewHomeGrid(state), ...BROWSE_EXTRA.map(([title, genre, imageUrl], index): HomeWorld => ({
    ...featuredNovel, id: `browse-${index}`, title, genre, imageUrl, videoUrl: undefined, chapterCount: 9 + index * 7,
  }))];
  if (state.creators !== 'multilingual') return worlds;
  return worlds.map((world, index) => {
    const creator = MULTILINGUAL_CREATORS[index % MULTILINGUAL_CREATORS.length];
    return { ...world, creatorName: creator.name, creatorTitle: creator.title };
  });
}
