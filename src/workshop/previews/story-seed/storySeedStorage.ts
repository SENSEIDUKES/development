import type { SenLanguageCode } from '@seihouse/sen/contracts';
import type { StorySeedInput, StorySeedArtifact, StorySeedRecord, StorySeedRepository, WorldBlueprint } from '@seihouse/sen/story-seed';
import { resetWorkshopStorySeedStorage, workshopStorySeedStorage } from '../../../components/story-seed/shared/workshopStorySeedStorage';
export const LOCAL_WORKSHOP_STORY_SEED_OWNER_ID = 'local-workshop-creator';
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
  blueprint: WorldBlueprint | undefined,
  originalLanguage: SenLanguageCode,
): Promise<StorySeedRecord> => repository.create(userId, input, blueprint, originalLanguage);

export const updateStorySeed = (
  userId: string,
  existing: StorySeedRecord,
  input: StorySeedInput,
  blueprint: WorldBlueprint | undefined,
  originalLanguage: SenLanguageCode,
): Promise<StorySeedRecord> => repository.update(userId, existing, input, blueprint, originalLanguage);

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

export const previewStorySeedRepository: StorySeedRepository = {
  create: (...args) => repository.create(...args), update: (...args) => repository.update(...args),
  list: (...args) => repository.list(...args), importMany: (...args) => repository.importMany(...args),
};
