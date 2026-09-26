import { STORY_STYLE_OPTIONS } from '@seihouse/sen/story-seed';
import type { CreatorToolkitItem, CreatorWorld } from '@seihouse/library/creator-space';
import { TRACK_LIBRARY } from '../../../host/media/soundscapeCatalog';
import { featuredNovel } from '../light-novels-home/previewData';

/**
 * Workshop-only sample worlds (`worlds=sample`), drawn from existing local art.
 * They let the page be judged without a browser full of written stories; the
 * real Create tab reads the chapter workspace's own local store instead.
 */
export const SAMPLE_CREATOR_WORLDS: readonly CreatorWorld[] = [
  { id: featuredNovel.id, title: featuredNovel.title, chapterCount: featuredNovel.chapterCount, status: 'draft',
    updatedAt: '2026-09-26T09:00:00Z', imageUrl: featuredNovel.imageUrl },
  { id: 'sample-nine-moons', title: 'Ashes of the Nine Moons', chapterCount: 12, status: 'draft',
    updatedAt: '2026-09-25T18:30:00Z', imageUrl: '/card-workshop/test-images/lyra_meadowlight_portrait.png' },
  { id: 'sample-blood-silk', title: 'The Blood-Silk Oath', chapterCount: 31, status: 'shared',
    updatedAt: '2026-09-24T11:10:00Z', imageUrl: '/card-workshop/test-images/elder_kaelen_portrait.png' },
  { id: 'sample-northern-wall', title: 'Iron Vow of the Northern Wall', chapterCount: 7, status: 'draft',
    updatedAt: '2026-09-21T08:45:00Z', imageUrl: '/card-workshop/test-images/sergeant_anya_petrova_portrait.png' },
  { id: 'sample-lake-pavilion', title: 'The Pavilion Beneath the Lake', chapterCount: 40, status: 'complete',
    updatedAt: '2026-09-15T20:05:00Z', imageUrl: '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg' },
  // No cover yet: shows the Library's own celestial art in its place.
  { id: 'sample-forgetting-rivers', title: 'Where the Rivers Forget', chapterCount: 3, status: 'draft',
    updatedAt: '2026-09-10T07:20:00Z' },
];

const styles = STORY_STYLE_OPTIONS.map(option => option.label);

/** Previews of real first-party systems; the pack browser itself is not built. */
export const CREATOR_TOOLKIT: readonly CreatorToolkitItem[] = [
  { id: 'style-packs', kind: 'style', title: 'Style Packs',
    description: `${styles.slice(0, -1).join(', ')} and ${styles.at(-1)} writing styles.`,
    imageUrl: '/manifest-backdrops/immortal-land-2.jpg' },
  { id: 'soundscapes', kind: 'soundscape', title: 'Soundscapes',
    description: `${TRACK_LIBRARY.length} ambient scores for your scenes.`,
    imageUrl: '/manifest-backdrops/immortal-land-4.jpg' },
];
