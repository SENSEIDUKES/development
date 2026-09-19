/** Portable Story Seed persistence contract. The host supplies the implementation per workspace. */

import type { SenLanguageCode } from '../../../lib/language';
import {
  STORY_SEED_SCHEMA_VERSION,
  type StorySeedInput,
} from './storySeedSchema';
import type { WorldBlueprint } from './types';

/**
 * A saved seed plus the minimum needed to list and reopen it. The generated
 * Blueprint is an optional sibling artifact, never part of Creator / Story /
 * World, so records written before Blueprint persistence remain valid.
 */
export interface StorySeedRecord {
  schemaVersion: typeof STORY_SEED_SCHEMA_VERSION;
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /**
   * The Original Language chosen for this seed. Saved per record so reopening
   * one seed can never inherit the language of the seed opened before it.
   */
  originalLanguage: SenLanguageCode;
  seed: StorySeedInput;
  blueprint?: WorldBlueprint;
}

/**
 * Portable or imported artifacts before account metadata is added. The seed
 * and its Blueprint are creative content; `originalLanguage` travels beside
 * them as administrative metadata so an exported seed keeps the language its
 * author chose instead of being retyped after every import.
 */
export interface StorySeedArtifact {
  seed: StorySeedInput;
  blueprint?: WorldBlueprint;
  originalLanguage?: SenLanguageCode;
}

export interface StorySeedRepository {
  create(userId: string, input: StorySeedInput, blueprint: WorldBlueprint | undefined, originalLanguage: SenLanguageCode): Promise<StorySeedRecord>;
  update(userId: string, existing: StorySeedRecord, input: StorySeedInput, blueprint: WorldBlueprint | undefined, originalLanguage: SenLanguageCode): Promise<StorySeedRecord>;
  list(userId: string): Promise<StorySeedRecord[]>;
  importMany(userId: string, artifacts: StorySeedArtifact[]): Promise<StorySeedRecord[]>;
}
