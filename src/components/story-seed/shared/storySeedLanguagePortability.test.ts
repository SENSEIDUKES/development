import { describe, expect, it } from 'vitest';
import { LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, importStorySeeds, resetStorySeedRepository } from '../../../workshop/previews/story-seed/storySeedStorage';
import { createEmptyStorySeedInput, type StorySeedInput } from './storySeedSchema';
import {
  createStorySeedCollectionExport,
  createStorySeedExport,
  parseStorySeedJson,
} from './storySeedSerialization';

const seedInput = (premise: string, title: string): StorySeedInput => {
  const seed = createEmptyStorySeedInput();
  seed.story.required.premise = premise;
  seed.story.required.genre = 'Xianxia';
  seed.story.required.style = 'chinese';
  seed.world.optional.worldIdentity.title = title;
  return seed;
};

const roundTrip = (value: unknown) => parseStorySeedJson(JSON.stringify(value));

describe('Original Language travels with a portable Story Seed', () => {
  it('exports the language as an administrative sibling, never inside the creative seed', () => {
    const exported = createStorySeedExport(seedInput('A courier crosses the sea.', 'Tide Courier'), undefined, 'ja');

    expect(exported.administrative).toEqual({ originalLanguage: 'ja' });
    // Creator / Story / World stays purely creative.
    expect(JSON.stringify(exported.seed)).not.toContain('originalLanguage');
  });

  it('restores the exported language on import instead of falling back to English', () => {
    const [restored] = roundTrip(
      createStorySeedExport(seedInput('A healer crosses the mountains.', 'Peak Healer'), undefined, 'ko'),
    );

    expect(restored.originalLanguage).toBe('ko');
  });

  it('keeps each seed’s own language through a collection round trip', () => {
    const exported = createStorySeedCollectionExport([
      { seed: seedInput('A courier crosses the sea.', 'Tide Courier'), originalLanguage: 'ja' },
      { seed: seedInput('A healer crosses the mountains.', 'Peak Healer'), originalLanguage: 'vi' },
    ]);

    expect(roundTrip(exported).map(artifact => artifact.originalLanguage)).toEqual(['ja', 'vi']);
  });

  it('applies the English fallback only to a file that recorded no language', () => {
    const exported = createStorySeedExport(seedInput('Two farmers argue.', 'Fence Line'));

    expect('administrative' in exported).toBe(false);
    expect(roundTrip(exported)[0].originalLanguage).toBeUndefined();
  });

  it('ignores an unsupported code rather than importing an unknown language', () => {
    const [restored] = roundTrip({
      ...createStorySeedExport(seedInput('A courier crosses the sea.', 'Tide Courier'), undefined, 'ja'),
      administrative: { originalLanguage: 'kl' },
    });

    expect(restored.originalLanguage).toBeUndefined();
  });
});

describe('importing saved seeds preserves each recorded language', () => {
  it('saves the imported language per record and falls back to English only without one', async () => {
    resetStorySeedRepository();
    const artifacts = parseStorySeedJson(JSON.stringify(createStorySeedCollectionExport([
      { seed: seedInput('A courier crosses the sea.', 'Tide Courier'), originalLanguage: 'ja' },
      { seed: seedInput('A healer crosses the mountains.', 'Peak Healer'), originalLanguage: 'vi' },
      { seed: seedInput('Two farmers argue.', 'Fence Line') },
    ])));

    const imported = await importStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, artifacts);

    expect(imported.map(record => record.originalLanguage)).toEqual(['ja', 'vi', 'en']);
  });
});
