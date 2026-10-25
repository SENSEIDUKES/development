import { describe, expect, it } from 'vitest';
import { createEmptyStorySeedInput, normalizeStorySeedInput } from './storySeedSchema';
import { parseStorySpark, parseStorySparkRequest, storySeedInputFromSpark, storySparkTags, STORY_SPARK_AVOID_LIMIT, STORY_SPARK_PREMISE_MAX_LENGTH } from './storySpark';

describe('Story Sparks', () => {
  it('reads a request for a genre, an idea and recent premises, and refuses one with no genre', () => {
    expect(parseStorySparkRequest({ genre: '  Xianxia ', idea: ' a sword  that writes ', avoid: Array(9).fill('old') }))
      .toEqual({ genre: 'Xianxia', idea: 'a sword that writes', avoid: Array(STORY_SPARK_AVOID_LIMIT).fill('old') });
    expect(parseStorySparkRequest({ inventGenre: true, genre: 'ignored' })).toEqual({ inventGenre: true });
    expect(() => parseStorySparkRequest({ genre: '  ' })).toThrow(/genre/);
    expect(() => parseStorySparkRequest('Xianxia')).toThrow();
  });

  it('keeps a chosen genre as chosen, and takes an invented one from the writer', () => {
    const chosen = parseStorySpark({ premise: ' A premise. ', genre: 'Something else', genreNote: 'no', aside: 'Hm.', voice: 'Elder' }, { genre: 'Regression' });
    // No tradition or Pressure given: the genre's usual tradition, balanced Pressure.
    expect(chosen).toEqual({ premise: 'A premise.', genre: 'Regression', title: '', style: 'korean', survival: false, inventedGenre: false, aside: 'Hm.', voice: 'Elder' });
    const invented = parseStorySpark({ premise: 'P', genre: 'Weather Cultivation', genreNote: 'Storms are Qi.', title: ' "The Rain Sect" ', style: 'Japanese', pressure: 'heaven' }, { inventGenre: true, fateSurvival: true });
    expect(invented).toEqual({ premise: 'P', genre: 'Weather Cultivation', title: 'The Rain Sect', style: 'japanese', survival: true, inventedGenre: true, genreNote: 'Storms are Qi.' });
    // A model's Pressure is never taken: Pressure stays Story Seed's default.
    expect(parseStorySpark({ premise: 'P', style: 'french' }, { genre: 'Xianxia' })).toEqual(expect.objectContaining({ style: 'chinese', survival: false }));
    expect(parseStorySparkRequest({ genre: 'Xianxia', fateSurvival: true })).toEqual({ genre: 'Xianxia', fateSurvival: true });
    expect(parseStorySparkRequest({ genre: 'Xianxia', fateSurvival: 'yes' })).toEqual({ genre: 'Xianxia' });
    expect(() => parseStorySpark({ premise: 'P' }, { inventGenre: true })).toThrow(/name/);
    expect(() => parseStorySpark({ premise: ' ' }, { genre: 'Xianxia' })).toThrow(/premise/);
    expect(parseStorySpark({ premise: 'x'.repeat(900) }, { genre: 'Xianxia' }).premise).toHaveLength(STORY_SPARK_PREMISE_MAX_LENGTH);
  });

  it('plants the whole Origin in a new Story Seed, marked as started from a spark', () => {
    const spark = { premise: 'A porter climbs the tower alone and the tower remembers him.', genre: 'Tower Climb', title: 'The Porter', style: 'korean' as const, survival: true, inventedGenre: false, aside: 'A', voice: 'V' };
    const seed = storySeedInputFromSpark(spark);
    const empty = createEmptyStorySeedInput();
    expect(seed.story.required).toEqual({ ...empty.story.required, premise: spark.premise, genre: 'Tower Climb', style: 'korean', storyTags: storySparkTags(spark) });
    expect(seed.story.required.storyTags.length).toBeGreaterThan(0);
    expect(seed.story.optional).toEqual({ ...empty.story.optional, fateSurvival: { enabled: true, pressure: 'immortal' }, startedFrom: 'story-spark' });
    expect(storySeedInputFromSpark({ ...spark, survival: false }).story.optional.fateSurvival).toEqual({ enabled: false, pressure: 'immortal' });
    expect(seed.world.optional.worldIdentity.title).toBe('The Porter');
    // Survival and everything past the Origin stay the writer's.
    expect({ ...seed, story: empty.story, world: empty.world }).toEqual(empty);
    // An untitled spark leaves the title for the Library to name.
    expect(storySeedInputFromSpark({ ...spark, title: ' ' }).world).toEqual(empty.world);
    // The mark survives saving and reloading.
    expect(normalizeStorySeedInput(seed).story.optional.startedFrom).toBe('story-spark');
  });
});
