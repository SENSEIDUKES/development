import { findFoundationRevision, findStory, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import type { StorySeedInput, WorldBlueprint } from '@seihouse/sen/story-seed';

/**
 * What a cover is made from: the story's own words, never the chapters. The
 * host's cover service turns it into an image; the server writes the prompt.
 */
export interface StoryCoverRequest {
  title: string;
  genre?: string;
  /** The Story Seed's story tradition (`chinese`, `japanese`, `korean`), which sets the cover's look. */
  style?: string;
  /** The Blueprint's logline, else the premise. */
  synopsis?: string;
  tags?: string[];
  mainCharacter?: string;
  tone?: string;
  /** The world, in a few lines. */
  world?: string;
}

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || undefined;
};

/**
 * A story's cover request, from what the story already knows: its title and
 * genre, its Story Seed's tradition and tags, its Blueprint logline (else its
 * premise), its main character, tone and world. The cover server clips each
 * field to its own limit.
 */
export function storyCoverRequest(state: HarnessWorkspaceState, storyId: string): StoryCoverRequest | undefined {
  const story = findStory(state, storyId);
  if (!story) return undefined;
  const input = findFoundationRevision(state, story.activeFoundationRevisionId)?.input;
  const source = input?.sourceSnapshot?.kind === 'story-seed' ? input.sourceSnapshot : undefined;
  const seed = source?.seed as Partial<StorySeedInput> | undefined;
  const blueprint = source?.blueprint as Partial<WorldBlueprint> | undefined;
  const tags = seed?.story?.required?.storyTags;
  const request: StoryCoverRequest = { title: text(story.title) ?? 'Untitled' };
  const fields: Array<[Exclude<keyof StoryCoverRequest, 'title' | 'tags'>, unknown]> = [
    ['genre', input?.genre],
    ['style', seed?.story?.required?.style],
    ['synopsis', text(blueprint?.logline) ?? input?.premise],
    ['mainCharacter', input?.cast?.find(member => member.isMainCharacter)?.name],
    ['tone', input?.toneStyle],
    ['world', input?.worldFacts],
  ];
  for (const [field, value] of fields) {
    const normalized = text(value);
    if (normalized) request[field] = normalized;
  }
  const tagList = Array.isArray(tags) ? tags.flatMap(tag => text(tag) ?? []) : [];
  if (tagList.length) request.tags = tagList;
  return request;
}

/** How many covers a reader may ask for at once: one, or three to choose from. */
export const STORY_COVER_CHOICES = [1, 3] as const;
export type StoryCoverChoice = typeof STORY_COVER_CHOICES[number];

/** Covers just made: each address shows one until it is kept or let go. */
export interface MadeStoryCovers {
  urls: string[];
  /** Why some (or, with no urls, all) of the covers asked for could not be made. */
  problem?: string;
}

/**
 * The host's cover service: makes cover images for a story and keeps the one
 * the reader chooses. Covers are the host's media (the app keeps them on the
 * device until the database), so the Library only asks for them and shows them.
 */
export interface StoryCoverService {
  /** The story's kept cover, as an address an `<img>` can show, or undefined. */
  coverUrl: (storyId: string) => string | undefined;
  /** Makes `count` covers from the request. None is kept yet; each made address shows one. */
  make: (storyId: string, request: StoryCoverRequest, count: StoryCoverChoice) => Promise<MadeStoryCovers>;
  /** Keeps one made cover as the story's cover, replacing any cover before it. */
  keep: (storyId: string, madeUrl: string) => Promise<void>;
  /** Lets go of made covers the reader did not keep. */
  letGo: (madeUrls: readonly string[]) => void;
}
