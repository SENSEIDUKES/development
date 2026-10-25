/**
 * Story Sparks: a starting point for someone facing a blank Story Seed.
 *
 * A spark is a whole Origin: a premise, a genre, a novel tradition (Style) and
 * a title, written for Fate Survival when the writer asks for it. Planting it
 * fills every Origin input of a new seed — the Story Tags are recommended from
 * the premise by Story Seed's own tag inference, Pressure stays Story Seed's
 * default (Immortal) and Survival is on only for a Survival spark — and marks
 * the seed as `startedFrom: 'story-spark'` so a Story Bank can keep sparks
 * apart from seeds the writer built. The world and every later choice stay
 * with the writer.
 *
 * How a spark is written (a model, a hand-written list) and how it is dressed
 * (the Library's Dao Insights) belong to the host.
 */
import { createEmptyStorySeedInput, type StorySeedInput } from './storySeedSchema';
import { normalizeStoryStyle, type StoryStyle } from './storyStyle';
import { inferStoryTags } from './storyTagInference';

/** A spark's premise is a hook, never a synopsis. */
export const STORY_SPARK_PREMISE_MAX_LENGTH = 600;
/** A genre is a name, invented or not. */
export const STORY_SPARK_GENRE_MAX_LENGTH = 60;
/** A title is a name on a spine, never a sentence. */
export const STORY_SPARK_TITLE_MAX_LENGTH = 80;
const GENRE_NOTE_MAX_LENGTH = 200;
const VOICE_MAX_LENGTH = 80;
const ASIDE_MAX_LENGTH = 400;
/** The rough beginning of a premise a writer may bring. */
export const STORY_SPARK_IDEA_MAX_LENGTH = 1_000;
/** Recent premises a request may name so the writer does not repeat them. */
export const STORY_SPARK_AVOID_LIMIT = 6;

interface StorySparkRequestBase {
  /**
   * The writer's own beginning of a premise, not yet worded into one. When
   * present the spark shapes it into a real premise in the genre and keeps its
   * idea; when absent the spark is the writer's to discover.
   */
  idea?: string;
  /** Recent premises, so a new spark does not repeat them. */
  avoid?: string[];
  /**
   * A spark for Fate Survival: the protagonist's life is at stake from the
   * first chapter and the reader directs every choice. Planting it turns
   * Survival on.
   */
  fateSurvival?: true;
}

/** What the writer asked for: a spark inside one genre, or inside a genre invented on the spot. */
export type StorySparkRequest =
  | (StorySparkRequestBase & { genre: string; inventGenre?: false })
  | (StorySparkRequestBase & { inventGenre: true; genre?: undefined });

export interface StorySpark {
  premise: string;
  genre: string;
  /** The novel's name. Empty when the writer's own words stand untitled. */
  title: string;
  /** The novel tradition the premise reads in. */
  style: StoryStyle;
  /** Written for Fate Survival; planting it turns Survival on. */
  survival: boolean;
  /** True when the genre was invented for this spark rather than chosen from a list. */
  inventedGenre: boolean;
  /** One line on how an invented genre feels. Shown with the spark; never planted. */
  genreNote?: string;
  /**
   * The line the spark arrived in, in the host's voice — a wandering elder's
   * muttering, say — around the plain premise. Presentation only; never planted.
   */
  aside?: string;
  /** Who the host says spoke the spark. Presentation only. */
  voice?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const clean = (value: unknown, maximum: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maximum).trim() : '';

/** The tradition a genre most often reads in, when a writer gave none. */
export const storyStyleForGenre = (genre: string): StoryStyle => {
  const name = genre.toLowerCase();
  if (/system|litrpg|tower|regression|dungeon|hunter|academy/.test(name)) return 'korean';
  if (/cozy|slice|isekai|villainess/.test(name)) return 'japanese';
  return 'chinese';
};

/** A request from outside (a client, a server body), checked and trimmed. Throws on an unusable one. */
export const parseStorySparkRequest = (value: unknown): StorySparkRequest => {
  if (!isRecord(value)) throw new Error('A spark request must be an object.');
  const avoid = Array.isArray(value.avoid)
    ? value.avoid.map(item => clean(item, STORY_SPARK_PREMISE_MAX_LENGTH)).filter(Boolean).slice(0, STORY_SPARK_AVOID_LIMIT)
    : [];
  const idea = clean(value.idea, STORY_SPARK_IDEA_MAX_LENGTH);
  const extra = {
    ...(idea ? { idea } : {}),
    ...(avoid.length ? { avoid } : {}),
    ...(value.fateSurvival === true ? { fateSurvival: true as const } : {}),
  };
  if (value.inventGenre === true) return { inventGenre: true, ...extra };
  const genre = clean(value.genre, STORY_SPARK_GENRE_MAX_LENGTH);
  if (!genre) throw new Error('Choose a genre, or ask for one to be invented.');
  return { genre, ...extra };
};

/**
 * A spark as a writer (usually a model) returned it, checked against what was
 * asked. A chosen genre always comes back as chosen; only an invented one may
 * take the writer's name for it. Throws when there is no usable premise.
 */
export const parseStorySpark = (value: unknown, request: StorySparkRequest): StorySpark => {
  if (!isRecord(value)) throw new Error('The spark must be an object.');
  const premise = clean(value.premise, STORY_SPARK_PREMISE_MAX_LENGTH);
  if (!premise) throw new Error('The spark has no premise.');
  const genre = request.inventGenre ? clean(value.genre, STORY_SPARK_GENRE_MAX_LENGTH) : request.genre;
  if (!genre) throw new Error('The invented genre has no name.');
  const genreNote = request.inventGenre ? clean(value.genreNote, GENRE_NOTE_MAX_LENGTH) : '';
  const aside = clean(value.aside, ASIDE_MAX_LENGTH);
  const voice = clean(value.voice, VOICE_MAX_LENGTH);
  return {
    premise,
    genre,
    title: clean(value.title, STORY_SPARK_TITLE_MAX_LENGTH).replace(/^["“]|["”]$/g, ''),
    style: normalizeStoryStyle(value.style) ?? storyStyleForGenre(genre),
    survival: request.fateSurvival === true,
    inventedGenre: Boolean(request.inventGenre),
    ...(genreNote ? { genreNote } : {}),
    ...(aside ? { aside } : {}),
    ...(voice ? { voice } : {}),
  };
};

/** The Story Tags a spark plants: Story Seed's own recommendations for its premise. */
export const storySparkTags = (spark: Pick<StorySpark, 'premise' | 'genre' | 'style'>): string[] =>
  inferStoryTags({ premise: spark.premise, genre: spark.genre, style: spark.style });

/** A new Story Seed whose whole Origin is the spark, marked as started from one. */
export const storySeedInputFromSpark = (spark: StorySpark): StorySeedInput => {
  const seed = createEmptyStorySeedInput();
  const title = spark.title.trim();
  return {
    ...seed,
    story: {
      required: {
        ...seed.story.required,
        premise: spark.premise,
        genre: spark.genre,
        style: spark.style,
        storyTags: storySparkTags(spark),
      },
      optional: {
        ...seed.story.optional,
        fateSurvival: { ...seed.story.optional.fateSurvival, enabled: spark.survival },
        startedFrom: 'story-spark',
      },
    },
    world: title
      ? { ...seed.world, optional: { ...seed.world.optional, worldIdentity: { ...seed.world.optional.worldIdentity, title } } }
      : seed.world,
  };
};
