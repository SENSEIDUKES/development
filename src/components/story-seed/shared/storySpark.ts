/**
 * Story Sparks: a starting point for someone facing a blank Story Seed.
 *
 * A spark is exactly two things, a premise and a genre — enough direction to
 * begin, and nothing more. Style, tags, the world and every other choice stay
 * with the writer. A spark is never a Story Seed of its own: planting it fills
 * those two Story inputs of an otherwise empty seed, which the host saves in
 * its Story Bank like any other draft.
 *
 * How a spark is written (a model, a hand-written list) and how it is dressed
 * (the Library's Dao Insights) belong to the host.
 */
import { createEmptyStorySeedInput, type StorySeedInput } from './storySeedSchema';

/** A spark's premise is a hook, never a synopsis. */
export const STORY_SPARK_PREMISE_MAX_LENGTH = 600;
/** A genre is a name, invented or not. */
export const STORY_SPARK_GENRE_MAX_LENGTH = 60;
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
}

/** What the writer asked for: a spark inside one genre, or inside a genre invented on the spot. */
export type StorySparkRequest =
  | (StorySparkRequestBase & { genre: string; inventGenre?: false })
  | (StorySparkRequestBase & { inventGenre: true; genre?: undefined });

export interface StorySpark {
  premise: string;
  genre: string;
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

/** A request from outside (a client, a server body), checked and trimmed. Throws on an unusable one. */
export const parseStorySparkRequest = (value: unknown): StorySparkRequest => {
  if (!isRecord(value)) throw new Error('A spark request must be an object.');
  const avoid = Array.isArray(value.avoid)
    ? value.avoid.map(item => clean(item, STORY_SPARK_PREMISE_MAX_LENGTH)).filter(Boolean).slice(0, STORY_SPARK_AVOID_LIMIT)
    : [];
  const idea = clean(value.idea, STORY_SPARK_IDEA_MAX_LENGTH);
  const extra = { ...(idea ? { idea } : {}), ...(avoid.length ? { avoid } : {}) };
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
    inventedGenre: Boolean(request.inventGenre),
    ...(genreNote ? { genreNote } : {}),
    ...(aside ? { aside } : {}),
    ...(voice ? { voice } : {}),
  };
};

/** A new Story Seed holding the spark's premise and genre, and nothing else the writer did not choose. */
export const storySeedInputFromSpark = (spark: StorySpark): StorySeedInput => {
  const seed = createEmptyStorySeedInput();
  return {
    ...seed,
    story: {
      ...seed.story,
      required: { ...seed.story.required, premise: spark.premise, genre: spark.genre },
    },
  };
};
