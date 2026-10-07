import type { HarnessGenerationModelAdapter, HarnessGenerationRepository, HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage, ReaderStateRepository } from '@seihouse/sen/reader-runtime';
import type { StorySeedRepository } from '@seihouse/sen/story-seed';
import type { LibraryEconomyClients } from '../host/economy/inProcessEconomy';
import { createPracticeEconomy } from '../host/economy/practiceEconomy';
import { createSavedAccessToken, type AccessTokenStore } from '../host/generation/accessToken';
import { HarnessGenerationHttpClient } from '../host/generation/httpClient';
import { IndexedDbHarnessGenerationRepository } from '../host/generation/indexedDbRepository';
import { installOfficialCapaSkillsInMemory } from '../host/generation/capa/officialCapaSkills';
import { createLocalReaderPreferenceStorage } from '../host/reader/readerPreferenceStorage';
import { IndexedDbReaderStateRepository } from '../host/reader/readerStateStorage';
import { createLocalStorySeedRepository } from '../host/story-seed/localStorySeedRepository';
import { requestWorldBlueprint } from '../host/story-seed/blueprintGenerationClient';
import { createDeviceProfileStore, type DeviceProfileStore } from '../host/profile/deviceProfile';
import { NOVEL_EXPANDED_READER_ID } from './storyCreationRuntime';

/**
 * The app's own browser storage. Its stories, reading places and Story Seeds
 * never mix with the Workshop's, so neither can overwrite the other. The Model
 * Router's chapter model is the one choice the two share.
 */
export const NOVEL_EXPANDED_STORAGE = {
  stories: 'novelexpanded-harness-stories-v1',
  readerState: 'novelexpanded-reader-state-v1',
  storySeeds: 'novelexpanded-story-seeds-v1',
  /** The prefix of the reader's device preferences (narration voices and speed, the mix, the profile). */
  readerPreferences: 'novelexpanded-reader-',
} as const;

/** Everything the app reads, writes or asks a server for. Tests supply in-memory ones. */
export interface NovelExpandedServices {
  stories: HarnessGenerationRepository;
  readerState: ReaderStateRepository;
  /** The reader's narration voices and speed, on this device. */
  readerPreferences: ReaderPreferenceStorage;
  storySeeds: StorySeedRepository;
  /** The chapter writer: the server route that calls the model. */
  writer: HarnessGenerationModelAdapter;
  /** The official CAPA skills a new story is equipped with. */
  installSkills: () => Promise<HarnessSkillManifest[]>;
  /** The World Blueprint server, behind the development access token. */
  requestWorldBlueprint: typeof requestWorldBlueprint;
  /** The owner's development access token, saved on this device: it unlocks Blueprints and lifts the chapter limit. */
  accessToken: AccessTokenStore;
  /** The reader's profile on this device: the Cave's name and aura, languages, Reading Mode and Familiar. */
  profile: DeviceProfileStore;
  /**
   * The Library economy (QI, DAO XP, Energy, the Dao Pillar, rewards, Familiars):
   * until the database, a practice account in the page, fresh each visit.
   */
  economy: LibraryEconomyClients;
}

export function createNovelExpandedServices(): NovelExpandedServices {
  const accessToken = createSavedAccessToken();
  const readerPreferences = createLocalReaderPreferenceStorage(NOVEL_EXPANDED_STORAGE.readerPreferences);
  return {
    stories: new IndexedDbHarnessGenerationRepository(NOVEL_EXPANDED_STORAGE.stories),
    readerState: new IndexedDbReaderStateRepository(NOVEL_EXPANDED_STORAGE.readerState),
    readerPreferences,
    storySeeds: createLocalStorySeedRepository({ storageKey: NOVEL_EXPANDED_STORAGE.storySeeds }),
    // Chapters carry the owner's token, which lifts the visitor limit.
    writer: new HarnessGenerationHttpClient(undefined, () => accessToken.current),
    // Held in memory: the app never writes the Workshop's imported-skill inventory.
    installSkills: () => installOfficialCapaSkillsInMemory(),
    requestWorldBlueprint,
    accessToken,
    profile: createDeviceProfileStore({ storage: readerPreferences, uid: NOVEL_EXPANDED_READER_ID }),
    // The practice account opens with the most QI a tester could want and every Familiar.
    economy: createPracticeEconomy({ uid: NOVEL_EXPANDED_READER_ID }).clients,
  };
}
