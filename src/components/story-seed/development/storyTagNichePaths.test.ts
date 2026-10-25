import { describe, expect, it } from 'vitest';
import { STORY_TAG_NICHES } from '@seihouse/sen/story-seed';
import { GENRE_PRESETS } from './constants';

describe('Story Tag niches and Origin genre paths', () => {
  it('give every genre path its own niche, in the same order', () => {
    expect(STORY_TAG_NICHES.map(niche => niche.id)).toEqual(GENRE_PRESETS.map(preset => preset.id));
    expect(STORY_TAG_NICHES.map(niche => niche.label)).toEqual(GENRE_PRESETS.map(preset => preset.name));
  });
});
