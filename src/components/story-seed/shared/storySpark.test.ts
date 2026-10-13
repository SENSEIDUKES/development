import { describe, expect, it } from 'vitest';
import { createEmptyStorySeedInput } from './storySeedSchema';
import { parseStorySpark, parseStorySparkRequest, storySeedInputFromSpark, STORY_SPARK_AVOID_LIMIT, STORY_SPARK_PREMISE_MAX_LENGTH } from './storySpark';

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
    expect(chosen).toEqual({ premise: 'A premise.', genre: 'Regression', inventedGenre: false, aside: 'Hm.', voice: 'Elder' });
    const invented = parseStorySpark({ premise: 'P', genre: 'Weather Cultivation', genreNote: 'Storms are Qi.' }, { inventGenre: true });
    expect(invented).toEqual({ premise: 'P', genre: 'Weather Cultivation', inventedGenre: true, genreNote: 'Storms are Qi.' });
    expect(() => parseStorySpark({ premise: 'P' }, { inventGenre: true })).toThrow(/name/);
    expect(() => parseStorySpark({ premise: ' ' }, { genre: 'Xianxia' })).toThrow(/premise/);
    expect(parseStorySpark({ premise: 'x'.repeat(900) }, { genre: 'Xianxia' }).premise).toHaveLength(STORY_SPARK_PREMISE_MAX_LENGTH);
  });

  it('plants only the premise and the genre in a new Story Seed', () => {
    const seed = storySeedInputFromSpark({ premise: 'P', genre: 'Tower Climb', inventedGenre: false, aside: 'A', voice: 'V' });
    const empty = createEmptyStorySeedInput();
    expect(seed.story.required).toEqual({ ...empty.story.required, premise: 'P', genre: 'Tower Climb' });
    expect({ ...seed, story: { ...seed.story, required: empty.story.required } }).toEqual(empty);
  });
});
