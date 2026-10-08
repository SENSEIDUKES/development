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

/**
 * The host's cover service: makes a cover image for a story and keeps it.
 * Covers are the host's media (the app keeps them on the device until the
 * database), so the Library only asks for one and shows it.
 */
export interface StoryCoverService {
  /** The story's kept cover, as an address an `<img>` can show, or undefined. */
  coverUrl: (storyId: string) => string | undefined;
  /** Makes a new cover from the request, keeps it as the story's cover, and resolves with its address. */
  manifest: (storyId: string, request: StoryCoverRequest) => Promise<string>;
}
