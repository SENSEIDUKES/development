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
/** The browse catalogue: worlds from twelve languages, or the sample's own English worlds. */
export type WorldCardCataloguePreview = 'multilingual' | 'sample';
/** The reader's language: the interface translates its words, and cards follow the card language rules. */
export const WORLD_CARD_READER_LANGUAGES = ['en', 'zh-CN', 'ja', 'ko', 'ar', 'th', 'hi', 'ru', 'vi', 'es'] as const;
export type WorldCardReaderLanguage = typeof WORLD_CARD_READER_LANGUAGES[number];
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
  catalogue: WorldCardCataloguePreview;
  readerLanguage: WorldCardReaderLanguage;
}

/** The sample world's title as translated for readers of these languages. */
const LEAD_TITLE_TRANSLATIONS = {
  ja: '翡翠帝国最後の蓮',
  'zh-CN': '翡翠帝国的最后一朵莲',
  ar: 'آخر زهرة لوتس في إمبراطورية اليشم',
  ru: 'Последний лотос Нефритовой империи',
};

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
    // Written in English, with real translations of its title in four languages.
    originalLanguage: 'en',
    ...(titleLength === 'long' ? {} : { titleTranslations: LEAD_TITLE_TRANSLATIONS }),
    // The sample world's own wide hero still and loop (Workshop-local assets).
    ...(hero === 'wide' ? { heroImageUrl: '/world-card/last-lotus-hero.jpg', heroVideoUrl: '/world-card/last-lotus-hero.mp4' } : {}),
    ...(hero === 'still' ? { videoUrl: undefined } : {}),
    recentlyRead: recentlyRead === 'yes',
    activityStatus: activity === 'hidden' ? undefined : activity,
    // Information and Verification panels: sample language, rating, permissions and provenance.
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
 * The multilingual catalogue: each world was written in another language, so its title and its
 * creator's name are in that language and script, and the creator wears a different element.
 * Half have a real English translation of the title; the rest show the original with a tag.
 * Includes right-to-left Arabic, Thai and Hindi with marks above and below, and long Greek and
 * Russian words.
 */
export const MULTILINGUAL_WORLDS: readonly {
  language: string; title: string; english?: string; creator: string;
  element: NonNullable<HomeWorld['creatorTitle']>['element']; intensity: NonNullable<HomeWorld['creatorTitle']>['intensity'];
}[] = [
  { language: 'zh-CN', title: '九月之烬', english: 'Ashes of the Nine Moons', creator: '修仙者', element: 'lightning', intensity: 'epic' },
  { language: 'ja', title: '血絹の誓い', english: 'The Blood-Silk Oath', creator: '修行者', element: 'water', intensity: 'rare' },
  { language: 'ko', title: '북방의 철의 맹세', creator: '수련자', element: 'poison', intensity: 'common' },
  { language: 'vi', title: 'Đình Đài Dưới Hồ Sen', english: 'The Pavilion Beneath the Lotus Lake', creator: 'Tu Sĩ', element: 'frost', intensity: 'active' },
  { language: 'ru', title: 'Где реки забывают', creator: 'Культиватор', element: 'celestial', intensity: 'legendary' },
  { language: 'ar', title: 'المحنة التاسعة', english: 'The Ninth Trial', creator: 'المُتعبِّد', element: 'void', intensity: 'epic' },
  { language: 'hi', title: 'नौवें आकाश के खंडहर', creator: 'साधक', element: 'fire', intensity: 'subtle' },
  { language: 'th', title: 'ศิษย์นอกรีตแห่งนิกายอัคคี', english: 'Ember Sect Outcast', creator: 'ผู้บำเพ็ญเพียร', element: 'lightning', intensity: 'rare' },
  { language: 'es', title: 'La apuesta de la marea gris', creator: 'Cultivador', element: 'water', intensity: 'legendary' },
  { language: 'el', title: 'Το Αρχείο της Πνιγμένης Σελήνης', english: 'Archive of the Drowned Moon', creator: 'Καλλιεργητής', element: 'poison', intensity: 'epic' },
  { language: 'id', title: 'Misteri Danau Teratai', creator: 'Pertapa', element: 'frost', intensity: 'common' },
];

/** Every world a browse page might list: the Home grid, then the extra catalogue (one with no cover yet). */
export function previewBrowseWorlds(state: WorldCardPreviewState): HomeWorld[] {
  const worlds = [...previewHomeGrid(state), ...BROWSE_EXTRA.map(([title, genre, imageUrl], index): HomeWorld => ({
    ...featuredNovel, id: `browse-${index}`, title, genre, imageUrl, videoUrl: undefined, chapterCount: 9 + index * 7,
  }))];
  if (state.catalogue !== 'multilingual') return worlds;
  // The lead world stays the English sample; every other world comes from another language.
  return worlds.map((world, index) => {
    if (index === 0) return { ...world, creatorName: 'Cultivator', creatorLanguage: 'en', creatorTitle: { element: 'fire', intensity: 'legendary' } };
    const source = MULTILINGUAL_WORLDS[(index - 1) % MULTILINGUAL_WORLDS.length];
    return {
      ...world, title: source.title, originalLanguage: source.language,
      titleTranslations: source.english ? { en: source.english } : undefined,
      creatorName: source.creator, creatorLanguage: source.language,
      creatorTitle: { element: source.element, intensity: source.intensity },
    };
  });
}
