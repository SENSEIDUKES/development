import type { DiscoverEvent, DiscoverRankingBoard, DiscoverRelease } from '@seihouse/library/discover';
import type { HomeWorld } from '@seihouse/library/home';

/**
 * Sample worlds for Discover while the page's look and feel is refined. None
 * of them is a real story: there are no public worlds yet, and Discover says
 * so on the page. Release times are set back from when the app loads, so the
 * feed always reads as live.
 */
const sample = (world: Omit<HomeWorld, 'reads' | 'mcName' | 'powerStage' | 'format'> & Partial<HomeWorld>): HomeWorld => ({
  reads: 0, mcName: '', powerStage: '', format: 'Novel', ...world,
});

export const DISCOVER_SAMPLE_WORLDS: readonly HomeWorld[] = [
  sample({ id: 'sample-last-lotus', title: 'The Last Lotus of the Jade Empire', genre: 'Xianxia', createdAt: '2026-09-09T12:00:00Z',
    imageUrl: '/card-workshop/test-images/ye_chen_portrait.png', chapterCount: 42, creatorName: 'SENSEI', senVerified: true,
    publicationStatus: 'ongoing', tags: ['inheritance trials', 'sect politics'],
    synopsis: 'When the last lotus blooms beneath an abandoned pavilion, a young cultivator inherits a promise the empire tried to erase.' }),
  sample({ id: 'sample-meadowlight', title: 'Meadowlight Requiem', genre: 'Fantasy', createdAt: '2026-09-21T08:00:00Z',
    imageUrl: '/card-workshop/test-images/lyra_meadowlight_portrait.png', chapterCount: 18, creatorName: 'SEIHouse',
    publicationStatus: 'ongoing', tags: ['bardic magic', 'found family'] }),
  sample({ id: 'sample-ninth-trial', title: 'The Ninth Trial', genre: 'Fate Survival', createdAt: '2026-10-01T10:00:00Z',
    imageUrl: '/manifest-backdrops/immortal-land-5.jpg', chapterCount: 9, creatorName: 'SEIHouse',
    publicationStatus: 'ongoing', tags: ['choices', 'consequences'] }),
  sample({ id: 'sample-elder-kaelen', title: 'Elder Kaelen’s Last Disciple', genre: 'Xianxia', createdAt: '2026-08-14T09:00:00Z',
    imageUrl: '/card-workshop/test-images/elder_kaelen_portrait.png', chapterCount: 120, creatorName: 'Mo Lan',
    publicationStatus: 'completed', tags: ['master and disciple', 'slow burn'] }),
  sample({ id: 'sample-iron-front', title: 'Iron Front: Sergeant Petrova', genre: 'Sci-Fi', createdAt: '2026-09-30T14:00:00Z',
    imageUrl: '/card-workshop/test-images/sergeant_anya_petrova_portrait.png', chapterCount: 27, creatorName: 'Rook',
    publicationStatus: 'ongoing', tags: ['military', 'mecha'] }),
  sample({ id: 'sample-lotus-lake', title: 'Mysteries of Lotus Lake', genre: 'Mystery', createdAt: '2026-10-05T16:00:00Z',
    imageUrl: '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg', chapterCount: 12, creatorName: 'Qing Yu',
    publicationStatus: 'ongoing', tags: ['detective', 'court intrigue'] }),
  sample({ id: 'sample-sky-ruins', title: 'Ruins Beyond the Ninth Sky', genre: 'Fate Survival', createdAt: '2026-10-08T11:00:00Z',
    imageUrl: '/manifest-backdrops/immortal-land-1.jpg', chapterCount: 6, creatorName: 'Ash Wren',
    publicationStatus: 'ongoing', tags: ['dungeon', 'consequences'] }),
  sample({ id: 'sample-ember-sect', title: 'Ember Sect Outcast', genre: 'Xianxia', createdAt: '2026-07-02T09:00:00Z',
    imageUrl: '/manifest-backdrops/immortal-land-2.jpg', chapterCount: 88, creatorName: 'Hollow Pine',
    publicationStatus: 'ongoing', tags: ['revenge', 'alchemy'] }),
  sample({ id: 'sample-grey-tide', title: 'The Grey Tide Wager', genre: 'Fate Survival', createdAt: '2026-09-18T19:00:00Z',
    imageUrl: '/manifest-backdrops/immortal-land-3.jpg', chapterCount: 14, creatorName: 'SEIHouse',
    publicationStatus: 'ongoing', tags: ['gambling', 'choices'] }),
  sample({ id: 'sample-moon-archive', title: 'Archive of the Drowned Moon', genre: 'Dark Fantasy', createdAt: '2026-06-11T09:00:00Z',
    imageUrl: '/manifest-backdrops/immortal-land-4.jpg', chapterCount: 64, creatorName: 'Vesper',
    publicationStatus: 'completed', tags: ['eldritch', 'libraries'] }),
];

const MINUTE = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

export const DISCOVER_SAMPLE_RELEASES: readonly DiscoverRelease[] = [
  { id: 'r1', worldId: 'sample-last-lotus', chapterNumber: 42, chapterTitle: 'The Silent Pavilion', releasedAt: ago(4) },
  { id: 'r2', worldId: 'sample-ninth-trial', chapterNumber: 9, chapterTitle: 'A Door With No Handle', releasedAt: ago(38) },
  { id: 'r3', worldId: 'sample-iron-front', chapterNumber: 27, chapterTitle: 'Cold Engines', releasedAt: ago(95) },
  { id: 'r4', worldId: 'sample-lotus-lake', chapterNumber: 12, chapterTitle: 'The Magistrate Lies', releasedAt: ago(180) },
  { id: 'r5', worldId: 'sample-meadowlight', chapterNumber: 18, chapterTitle: 'Song for the Unburied', releasedAt: ago(300) },
  { id: 'r6', worldId: 'sample-sky-ruins', chapterNumber: 6, releasedAt: ago(460) },
  { id: 'r7', worldId: 'sample-ember-sect', chapterNumber: 88, chapterTitle: 'Ash Remembers', releasedAt: ago(720) },
  { id: 'r8', worldId: 'sample-grey-tide', chapterNumber: 14, chapterTitle: 'Double or Drown', releasedAt: ago(1_100) },
  { id: 'r9', worldId: 'sample-last-lotus', chapterNumber: 41, chapterTitle: 'Roots Under Stone', releasedAt: ago(1_500) },
  { id: 'r10', worldId: 'sample-iron-front', chapterNumber: 26, releasedAt: ago(2_400) },
  { id: 'r11', worldId: 'sample-ninth-trial', chapterNumber: 8, chapterTitle: 'The Eighth Door', releasedAt: ago(3_100) },
  { id: 'r12', worldId: 'sample-ember-sect', chapterNumber: 87, releasedAt: ago(4_600) },
];

/** The sample reader tracks two series, so My updates has something to show. */
export const DISCOVER_SAMPLE_TRACKED: readonly string[] = ['sample-last-lotus', 'sample-ember-sect'];

/** The worlds the page features at its top. */
export const DISCOVER_SAMPLE_FEATURED: readonly string[] = ['sample-last-lotus', 'sample-ninth-trial', 'sample-moon-archive'];

export const DISCOVER_SAMPLE_FATE_SURVIVAL: readonly string[] = ['sample-ninth-trial', 'sample-sky-ruins', 'sample-grey-tide'];

export const DISCOVER_RANKING_BOARDS: readonly DiscoverRankingBoard[] = [
  { id: 'worlds', label: 'Worlds', description: 'Sample order. Real boards follow what readers do and spend.',
    worldIds: ['sample-last-lotus', 'sample-elder-kaelen', 'sample-ember-sect', 'sample-ninth-trial', 'sample-moon-archive', 'sample-iron-front'] },
  { id: 'characters', label: 'Characters', description: 'The heroes and villains readers follow' },
  { id: 'beasts', label: 'Items, Beasts & Pets', description: 'Treasures and creatures across every world' },
  { id: 'familiars', label: 'Familiars', description: 'The companions cultivators raise' },
];

export const DISCOVER_SAMPLE_EVENTS: readonly DiscoverEvent[] = [
  { id: 'mystery-week', title: 'Mystery Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-3.jpg',
    description: 'Seven days of locked rooms, lies and lost heirs, for creators and readers.' },
  { id: 'dark-fantasy-week', title: 'Dark Fantasy Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-4.jpg',
    description: 'Worlds where the light costs something.' },
];
