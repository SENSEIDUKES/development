import type { StoryDetailDisplay } from '../../../components/light-novels-home/shared/storyDetailContracts';
import type { WorldExpansionPreview } from '../../../components/light-novels-home/development/WorldExpressions';

/** One local featured novel. Adaptations never enter the homepage catalog. */
export const featuredNovel: StoryDetailDisplay = {
  id: 'mock-lotus-empire',
  title: 'The Last Lotus of the Jade Empire',
  genre: 'Xianxia',
  createdAt: '2026-09-09T12:00:00Z',
  reads: 1280,
  imageUrl: '/card-workshop/test-images/ye_chen_portrait.png',
  chapterCount: 24,
  chapterWritingStyle: 'Standard',
  mcName: 'Ye Chen',
  powerStage: 'Foundation',
  acquired: true,
  author: 'Aetherial Resonance',
  currentArc: 'The Silent Pavilion',
  status: 'Manifesting',
  tags: ['LostLegacy', 'FoundFamily'],
  synopsis: 'When the last lotus blooms beneath an abandoned pavilion, a young cultivator inherits a promise the empire tried to erase. Ye Chen must follow its roots through forgotten sects and skybound ruins, before the world’s oldest oath awakens.',
};

export const featuredExpansions: readonly WorldExpansionPreview[] = [
  {
    medium: 'manga',
    title: 'The Last Lotus · Inkbound',
    description: 'A manga adaptation of Ye Chen’s first journey, retold through ink, quiet panels, and the secrets of the Silent Pavilion.',
    imageUrl: '/card-workshop/test-images/lotus_lake_pavilion_portrait.jpg',
  },
  {
    medium: 'game',
    title: 'The Last Lotus · Echoes of Jade',
    description: 'An exploration game concept set among the same mountain sects and forgotten ruins. Walk the paths beyond the novel.',
    imageUrl: '/manifest-backdrops/immortal-land-3.jpg',
  },
];
export const homePreviewWorlds = [featuredNovel];
export const homePreviewExpansions = { [featuredNovel.id]: featuredExpansions };
