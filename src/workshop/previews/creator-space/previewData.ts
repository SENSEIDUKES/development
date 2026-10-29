import type { CreatorWorld } from '@seihouse/library/creator-space';
export { CREATOR_TOOLKIT } from '../../../host/media/creatorToolkit';
import { featuredNovel } from '../light-novels-home/previewData';

/**
 * Workshop-only sample worlds (`worlds=sample`), drawn from existing local art.
 * They let the page be judged without a browser full of written stories; the
 * real Create tab reads the chapter workspace's own local store instead.
 */
const sampleCreator = { creatorName: featuredNovel.creatorName, creatorTitle: featuredNovel.creatorTitle, format: featuredNovel.format };

export const SAMPLE_CREATOR_WORLDS: readonly CreatorWorld[] = [
  { ...sampleCreator, id: featuredNovel.id, title: featuredNovel.title, chapterCount: featuredNovel.chapterCount, status: 'draft', genre: 'Xianxia', branchingEnabled: true,
    updatedAt: '2026-09-26T09:00:00Z', imageUrl: featuredNovel.imageUrl },
  { ...sampleCreator, id: 'sample-nine-moons', title: 'Ashes of the Nine Moons', chapterCount: 12, status: 'draft', genre: 'Fantasy', branchingEnabled: false,
    updatedAt: '2026-09-25T18:30:00Z', imageUrl: '/card-workshop/test-images/lyra_meadowlight_portrait.png' },
  { ...sampleCreator, id: 'sample-blood-silk', title: 'The Blood-Silk Oath', chapterCount: 31, status: 'shared', genre: 'Wuxia', branchingEnabled: true,
    updatedAt: '2026-09-24T11:10:00Z', imageUrl: '/card-workshop/test-images/elder_kaelen_portrait.png' },
  { ...sampleCreator, id: 'sample-northern-wall', title: 'Iron Vow of the Northern Wall', chapterCount: 7, status: 'draft', genre: 'Military', branchingEnabled: false,
    updatedAt: '2026-09-21T08:45:00Z', imageUrl: '/card-workshop/test-images/sergeant_anya_petrova_portrait.png' },
  { ...sampleCreator, id: 'sample-lake-pavilion', title: 'The Pavilion Beneath the Lake', chapterCount: 40, status: 'complete', genre: 'Romance', branchingEnabled: true,
    updatedAt: '2026-09-15T20:05:00Z', imageUrl: '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg' },
  // No cover yet: shows the Library's own celestial art in its place.
  { ...sampleCreator, id: 'sample-forgetting-rivers', title: 'Where the Rivers Forget', chapterCount: 3, status: 'draft', genre: 'Mystery', branchingEnabled: false,
    updatedAt: '2026-09-10T07:20:00Z' },
];
