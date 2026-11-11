import type { StorySpark } from '../../story-seed/shared/storySpark';
import { GENRE_PRESETS } from '../../story-seed/shared/storyGenres';

export const DAO_GENRES = GENRE_PRESETS;

/** SENSEI's showcase. Title and genre await his choice; never offered for planting. */
export const EXAMPLE_SPARK: StorySpark = {
  title: 'Example spark (title pending)',
  genre: '',
  premise: 'A nameless flower grows alone on a barren mountain, surviving storms, winters, and time by quietly absorbing sunlight and awakening faint consciousness.',
  style: 'chinese',
  inventedGenre: false,
  survival: false,
};
