import type { StorySpark } from '../../story-seed/shared/storySpark';
import { GENRE_PRESETS } from '../../story-seed/shared/storyGenres';

export const DAO_GENRES = GENRE_PRESETS;

/** SENSEI's flower premise supplies ghost text, never content to plant. */
export const EXAMPLE_SPARK: StorySpark = {
  title: '',
  genre: '',
  premise: 'A nameless flower grows alone on a barren mountain, surviving storms, winters, and time by quietly absorbing sunlight and awakening faint consciousness.',
  style: 'chinese',
  inventedGenre: false,
  survival: false,
};
