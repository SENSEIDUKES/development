import { normalizeChapterWritingStyle, type ChapterWritingStyle, type SenLanguageCode } from '@seihouse/sen/contracts';
import type { HarnessStoryVisibility, StoryFoundationInput } from '@seihouse/sen/harness-generation';
import { STORY_SEED_SCHEMA_VERSION, type InitialStoryGenerationPayload, type StorySeedRecord } from '@seihouse/sen/story-seed';
import { createHarnessFoundationFromStorySeed } from './harnessFoundation';

/** Everything a HARNESS story started from a Story Seed begins with. */
export interface HarnessStoryStart {
  foundation: StoryFoundationInput;
  /** Story identity, fixed at creation. */
  originalLanguage: SenLanguageCode;
  /** The Seed's story tradition; the host picks the matching style skill. */
  style: StorySeedRecord['seed']['story']['required']['style'];
  visibility: HarnessStoryVisibility;
  /** The Reading Mode, a Story Setting carried beside the Foundation, never inside it. */
  chapterWritingStyle: ChapterWritingStyle;
}

/**
 * Turns the payload a Story Seed's Start Story hands over (the Seed, its
 * reviewed Blueprint and the administrative record) into the new story's
 * Foundation and settings. Every host starts stories through this one mapping.
 */
export function harnessStoryStartFromSeed(payload: InitialStoryGenerationPayload): HarnessStoryStart {
  const { administrative, storySeed, blueprint } = payload;
  const foundation = createHarnessFoundationFromStorySeed({
    id: administrative.sourceSeedId, userId: administrative.creatorId,
    createdAt: administrative.createdAt, updatedAt: administrative.updatedAt,
    schemaVersion: STORY_SEED_SCHEMA_VERSION, title: blueprint.title,
    originalLanguage: administrative.originalLanguage,
    seed: storySeed, blueprint,
  });
  return {
    foundation,
    originalLanguage: administrative.originalLanguage,
    style: storySeed.story.required.style,
    visibility: administrative.visibility === 'PUBLIC' ? 'public' : administrative.visibility === 'SHARED' ? 'shared' : 'private',
    chapterWritingStyle: normalizeChapterWritingStyle(storySeed.story.optional.chapterWritingStyle),
  };
}
