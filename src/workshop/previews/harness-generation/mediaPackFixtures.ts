import { validateMediaPack, type MediaPack } from '@seihouse/library/media';

/** Small Development-only catalogs. These are not product Media Packs. */
export const WORKSHOP_MEDIA_PACKS: MediaPack[] = [
  validateMediaPack({
    id: 'dev.fixture.storm-soundscapes',
    version: '1.0.0',
    type: 'soundscape',
    displayName: 'Storm Paths (Test)',
    description: 'A tiny Development fixture used to prove story-level soundscape equipment.',
    source: { path: 'fixtures/storm-soundscapes.json', digest: '1'.repeat(64) },
    entries: [{
      id: 'DEV_STORM_PATH',
      mood: 'storm-path',
      moods: ['storm-path', 'tension'],
      tags: ['rain', 'mountain-pass', 'thunder'],
      region: 'chinese',
      url: 'https://fixtures-media.r2.dev/soundscapes/storm-path.mp3',
      isPremium: false,
    }],
  }),
  validateMediaPack({
    id: 'dev.fixture.clockwork-cues',
    version: '1.0.0',
    type: 'sound-cue',
    displayName: 'Clockwork Beasts (Test)',
    description: 'A tiny Development fixture used to prove entitled Sound Cue expansion.',
    source: { path: 'fixtures/clockwork-cues.json', digest: '2'.repeat(64) },
    entries: [{
      file_path: 'fixtures/clockwork-beast-roar.mp3',
      public_url: 'https://fixtures-media.r2.dev/cues/clockwork-beast-roar.mp3',
      metadata: {
        main_category: 'beasts',
        broad_variation: 'roar',
        soft_tags: ['clockwork', 'metallic', 'roar'],
        description: 'A short synthetic fixture roar.',
        confidence_score: 1,
      },
    }],
  }),
];
