/**
 * The Workshop's Story Seeds in this browser. Only the Story Seed preview
 * storage (`src/workshop/previews/story-seed/storySeedStorage.ts`) and its
 * tests use it; its sample scenarios reset it freely.
 */
import type { StorySeedRecord, StorySeedRepository } from '@seihouse/sen/story-seed';
import { createLocalStorySeedRepository } from '../../../host/story-seed/localStorySeedRepository';

const storage = createLocalStorySeedRepository({ storageKey: 'seihouse-workshop-story-seeds-v4' });

export const workshopStorySeedStorage: StorySeedRepository = storage;

export const resetWorkshopStorySeedStorage = (records: StorySeedRecord[] = []): void => {
  storage.reset(records);
};
