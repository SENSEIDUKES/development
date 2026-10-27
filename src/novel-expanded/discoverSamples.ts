import type { DiscoverCodexEntry, DiscoverCreator, DiscoverEvent, DiscoverRankingBoard, DiscoverRelease } from '@seihouse/library/discover';
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
  { id: 'worlds', kind: 'stories', label: 'Stories', description: 'Sample order. Real boards follow what readers do and spend.',
    worldIds: ['sample-last-lotus', 'sample-elder-kaelen', 'sample-ember-sect', 'sample-ninth-trial', 'sample-moon-archive', 'sample-iron-front'] },
  { id: 'creators', kind: 'creators', label: 'Creators', description: 'Sample creator order. Discover the people shaping these worlds.', creatorIds: ['sample-creator-seihouse', 'sample-creator-sensei', 'sample-creator-mo-lan'] },
  { id: 'characters', kind: 'characters', label: 'Characters', description: 'Sample character order across the stories in Discover.', entryIds: ['sample-character-ye-chen', 'sample-character-lyra', 'sample-character-kaelen', 'sample-character-anya'] },
  { id: 'items', kind: 'items', label: 'Items', description: 'Sample item order. Treasures with a story behind them.', entryIds: ['sample-item-lotus', 'sample-item-lute', 'sample-item-key', 'sample-item-engine'] },
];

/** Explicit public catalogue fixtures, never inferred from the reader's private stories. */
export const DISCOVER_SAMPLE_CREATORS: readonly DiscoverCreator[] = [
  { id: 'sample-creator-sensei', name: 'SENSEI', description: 'Ancient promises, impossible choices and worlds that remember.', worldIds: ['sample-last-lotus'] },
  { id: 'sample-creator-seihouse', name: 'SEIHouse', description: 'Stories of found family and survival, where the next chapter changes everything.', worldIds: ['sample-meadowlight', 'sample-ninth-trial', 'sample-grey-tide'] },
  { id: 'sample-creator-mo-lan', name: 'Mo Lan', description: 'Slow-burning cultivation tales about the bonds between master and disciple.', worldIds: ['sample-elder-kaelen'] },
  { id: 'sample-creator-rook', name: 'Rook', description: 'Military science fiction from the people inside the machines.', worldIds: ['sample-iron-front'] },
  { id: 'sample-creator-qing-yu', name: 'Qing Yu', description: 'Court intrigue and mysteries hidden behind beautiful doors.', worldIds: ['sample-lotus-lake'] },
  { id: 'sample-creator-ash-wren', name: 'Ash Wren', description: 'Ruined skies, dangerous bargains and choices that carry a cost.', worldIds: ['sample-sky-ruins'] },
  { id: 'sample-creator-hollow-pine', name: 'Hollow Pine', description: 'Outcasts, alchemists and the long road back from exile.', worldIds: ['sample-ember-sect'] },
  { id: 'sample-creator-vesper', name: 'Vesper', description: 'Dark fantasy in forgotten libraries and drowned cities.', worldIds: ['sample-moon-archive'] },
];

export const DISCOVER_SAMPLE_CODEX: readonly DiscoverCodexEntry[] = [
  { id: 'sample-character-ye-chen', kind: 'characters', name: 'Ye Chen', worldId: 'sample-last-lotus', imageUrl: '/card-workshop/test-images/ye_chen_portrait.png', description: 'A young cultivator entrusted with the last lotus and a promise older than the empire. A sample character from The Last Lotus of the Jade Empire.' },
  { id: 'sample-character-lyra', kind: 'characters', name: 'Lyra Meadowlight', worldId: 'sample-meadowlight', imageUrl: '/card-workshop/test-images/lyra_meadowlight_portrait.png', description: 'A wandering bard whose songs keep the memories of her companions alive. A sample character from Meadowlight Requiem.' },
  { id: 'sample-character-kaelen', kind: 'characters', name: 'Elder Kaelen', worldId: 'sample-elder-kaelen', imageUrl: '/card-workshop/test-images/elder_kaelen_portrait.png', description: 'An aging master with one final lesson to pass on. A sample character from Elder Kaelen’s Last Disciple.' },
  { id: 'sample-character-anya', kind: 'characters', name: 'Sergeant Anya Petrova', worldId: 'sample-iron-front', imageUrl: '/card-workshop/test-images/sergeant_anya_petrova_portrait.png', description: 'A frontline veteran holding her unit together when their machines and orders fail. A sample character from Iron Front.' },
  { id: 'sample-item-lotus', kind: 'items', name: 'The Last Jade Lotus', worldId: 'sample-last-lotus', description: 'A living inheritance sheltered beneath an abandoned pavilion. Its meaning belongs to this story, rather than a universal cultivation rule. Sample item.' },
  { id: 'sample-item-lute', kind: 'items', name: 'Meadowlight Lute', worldId: 'sample-meadowlight', description: 'Lyra’s travel-worn instrument, carrying the melodies of people she refuses to forget. Sample item.' },
  { id: 'sample-item-key', kind: 'items', name: 'The Ninth Key', worldId: 'sample-ninth-trial', description: 'A key without teeth, found beside a door without a handle. Opening the way demands a choice. Sample item.' },
  { id: 'sample-item-engine', kind: 'items', name: 'Ironheart Core', worldId: 'sample-iron-front', description: 'A battered power core that keeps Petrova’s last operational mech moving. Sample item.' },
];

export const DISCOVER_SAMPLE_FOLLOWED_CREATORS = ['sample-creator-sensei', 'sample-creator-rook'];
export const DISCOVER_SAMPLE_TRACKED_CODEX = ['sample-character-ye-chen', 'sample-character-anya', 'sample-item-lotus'];

export const DISCOVER_SAMPLE_EVENTS: readonly DiscoverEvent[] = [
  { id: 'mystery-week', title: 'Mystery Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-3.jpg',
    description: 'Seven days of locked rooms, lies and lost heirs, for creators and readers.' },
  { id: 'dark-fantasy-week', title: 'Dark Fantasy Week', when: 'Coming soon', imageUrl: '/manifest-backdrops/immortal-land-4.jpg',
    description: 'Worlds where the light costs something.' },
];
