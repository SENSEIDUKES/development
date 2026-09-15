import {
  DEFAULT_SEN_LANGUAGE_CODE,
  isSenLanguageCode,
  type SenLanguageCode,
} from '../../../lib/language';

/**
 * Bump on any change to the administrative shape. This is a development
 * system: stale saved metadata is rejected by validation and recreated, never
 * migrated. Version 2 removed `currentLanguage` — reader display language is
 * an account/reader concern and never part of permanent story identity.
 */
export const STORY_ADMINISTRATIVE_SCHEMA_VERSION = 2 as const;
export const INITIAL_STORY_CONTENT_VERSION = 1 as const;

export type StoryStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'DELETED';
export type StoryGenerationStatus = 'NOT_STARTED' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';
export type StoryVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';
export type StoryPublishingState = 'UNPUBLISHED' | 'PUBLISHED';

/** Durable internal story spine. This is never part of Creator / Story / World. */
export interface StoryAdministrativeMetadata {
  storyId: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: typeof STORY_ADMINISTRATIVE_SCHEMA_VERSION;
  contentVersion: number;
  storyStatus: StoryStatus;
  generationStatus: StoryGenerationStatus;
  visibility: StoryVisibility;
  publishingState: StoryPublishingState;
  /** Permanent story identity: the language this story is authored in. */
  originalLanguage: SenLanguageCode;
  sourceSeedId: string;
  currentChapterId: string | null;
  coverAssetId: string | null;
}

export interface CreateStoryAdministrativeMetadataInput {
  storyId: string;
  creatorId: string;
  sourceSeedId: string;
  /** Resolved by Story Seed before the story starts; English when unsupplied. */
  originalLanguage?: SenLanguageCode;
  now?: string;
}

export interface StoryAdministrativeValidationResult {
  valid: boolean;
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value.trim());

const nullableReference = (value: unknown): boolean => value === null || nonEmptyString(value);

const STORY_STATUSES = new Set<StoryStatus>(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'DELETED']);
const GENERATION_STATUSES = new Set<StoryGenerationStatus>(['NOT_STARTED', 'QUEUED', 'GENERATING', 'READY', 'FAILED']);
const VISIBILITIES = new Set<StoryVisibility>(['PRIVATE', 'SHARED', 'PUBLIC']);
const PUBLISHING_STATES = new Set<StoryPublishingState>(['UNPUBLISHED', 'PUBLISHED']);

export const validateStoryAdministrativeMetadata = (
  value: unknown,
): StoryAdministrativeValidationResult => {
  if (!isRecord(value)) return { valid: false, errors: ['Administrative metadata must be an object.'] };
  const errors: string[] = [];
  for (const field of [
    'storyId',
    'creatorId',
    'createdAt',
    'updatedAt',
    'sourceSeedId',
  ] as const) {
    if (!nonEmptyString(value[field])) errors.push(`${field} is required.`);
  }
  if (!isSenLanguageCode(value.originalLanguage)) errors.push('originalLanguage must be a supported SEN language code.');
  if (value.schemaVersion !== STORY_ADMINISTRATIVE_SCHEMA_VERSION) errors.push('schemaVersion is unsupported.');
  if (typeof value.contentVersion !== 'number' || !Number.isInteger(value.contentVersion) || value.contentVersion < 1) {
    errors.push('contentVersion must be a positive integer.');
  }
  if (!STORY_STATUSES.has(value.storyStatus as StoryStatus)) errors.push('storyStatus is invalid.');
  if (!GENERATION_STATUSES.has(value.generationStatus as StoryGenerationStatus)) errors.push('generationStatus is invalid.');
  if (!VISIBILITIES.has(value.visibility as StoryVisibility)) errors.push('visibility is invalid.');
  if (!PUBLISHING_STATES.has(value.publishingState as StoryPublishingState)) errors.push('publishingState is invalid.');
  if (!nullableReference(value.currentChapterId)) errors.push('currentChapterId must be a string or null.');
  if (!nullableReference(value.coverAssetId)) errors.push('coverAssetId must be a string or null.');
  return { valid: errors.length === 0, errors };
};

export function assertValidStoryAdministrativeMetadata(
  value: unknown,
): asserts value is StoryAdministrativeMetadata {
  const result = validateStoryAdministrativeMetadata(value);
  if (!result.valid) throw new Error(result.errors.join(' '));
}

export const createStoryAdministrativeMetadata = (
  input: CreateStoryAdministrativeMetadataInput,
): StoryAdministrativeMetadata => {
  const now = input.now || new Date().toISOString();
  const metadata: StoryAdministrativeMetadata = {
    storyId: input.storyId,
    creatorId: input.creatorId,
    createdAt: now,
    updatedAt: now,
    schemaVersion: STORY_ADMINISTRATIVE_SCHEMA_VERSION,
    contentVersion: INITIAL_STORY_CONTENT_VERSION,
    storyStatus: 'DRAFT',
    generationStatus: 'QUEUED',
    visibility: 'PRIVATE',
    publishingState: 'UNPUBLISHED',
    originalLanguage: input.originalLanguage ?? DEFAULT_SEN_LANGUAGE_CODE,
    sourceSeedId: input.sourceSeedId,
    currentChapterId: null,
    coverAssetId: null,
  };
  assertValidStoryAdministrativeMetadata(metadata);
  return metadata;
};
