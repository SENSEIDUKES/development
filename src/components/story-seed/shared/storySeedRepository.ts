/**
 * The Story Seed storage port.
 *
 * The creator-controlled seed (`StorySeedInput`) is stored *inside* the
 * record, never merged with it, so the account-level fields below stay out of
 * `creator` / `story` / `world`. The real record and its database layer are a
 * later phase; for now the port is backed by the temporary Workshop
 * localStorage adapter, which can be swapped through `setStorySeedRepository`
 * without the Story Seed domain structure changing again.
 */

import {
  STORY_SEED_SCHEMA_VERSION,
  type StorySeedInput,
} from './storySeedSchema';
import type { WorldBlueprint } from './types';
import {
  resetWorkshopStorySeedStorage,
  workshopStorySeedStorage,
} from './workshopStorySeedStorage';

/** Account key used by the Development-only local Story Seed workspace. */
export const LOCAL_WORKSHOP_STORY_SEED_OWNER_ID = 'local-workshop-creator';

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
  seed: StorySeedInput;
  blueprint?: WorldBlueprint;
}

/** Portable or imported creative artifacts before account metadata is added. */
export interface StorySeedArtifact {
  seed: StorySeedInput;
  blueprint?: WorldBlueprint;
}

export interface StorySeedRepository {
  create(userId: string, input: StorySeedInput, blueprint?: WorldBlueprint): Promise<StorySeedRecord>;
  update(userId: string, existing: StorySeedRecord, input: StorySeedInput, blueprint?: WorldBlueprint): Promise<StorySeedRecord>;
  list(userId: string): Promise<StorySeedRecord[]>;
  importMany(userId: string, artifacts: StorySeedArtifact[]): Promise<StorySeedRecord[]>;
}

let repository: StorySeedRepository = workshopStorySeedStorage;

/** Swap the backing store (used when the real repository replaces the Workshop one). */
export const setStorySeedRepository = (next: StorySeedRepository): void => {
  repository = next;
};

/** Read Development-only local artifacts without mutating the configured repository. */
export const listWorkshopStorySeeds = (userId: string): Promise<StorySeedRecord[]> =>
  workshopStorySeedStorage.list(userId);

export const createStorySeed = (
  userId: string,
  input: StorySeedInput,
  blueprint?: WorldBlueprint,
): Promise<StorySeedRecord> => repository.create(userId, input, blueprint);

export const updateStorySeed = (
  userId: string,
  existing: StorySeedRecord,
  input: StorySeedInput,
  blueprint?: WorldBlueprint,
): Promise<StorySeedRecord> => repository.update(userId, existing, input, blueprint);

export const listStorySeeds = (userId: string): Promise<StorySeedRecord[]> => repository.list(userId);

export const importStorySeeds = (
  userId: string,
  artifacts: StorySeedArtifact[],
): Promise<StorySeedRecord[]> => repository.importMany(userId, artifacts);

/** Restore the Workshop adapter and seed it deterministically for tests/previews. */
export const resetStorySeedRepository = (records: StorySeedRecord[] = []): void => {
  repository = workshopStorySeedStorage;
  resetWorkshopStorySeedStorage(records);
};
