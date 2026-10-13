import type { HarnessGenerationModelAdapter, HarnessGenerationRepository, HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage, ReaderStateRepository } from '@seihouse/sen/reader-runtime';
import type { StorySeedRepository } from '@seihouse/sen/story-seed';
import type { LibraryEconomyClients } from '../host/economy/inProcessEconomy';
import { createPracticeEconomy } from '../host/economy/practiceEconomy';
import { createSavedAccessToken, type AccessTokenStore } from '../host/generation/accessToken';
import { HarnessGenerationHttpClient } from '../host/generation/httpClient';
import { IndexedDbHarnessGenerationRepository } from '../host/generation/indexedDbRepository';
import { installOfficialCapaSkillsInMemory } from '../host/generation/capa/officialCapaSkills';
import { loadHarnessSppSkills, saveHarnessSppSkill } from '../host/generation/capa/sppSkills';
import { DeviceMediaUrls, IndexedDbDeviceMediaPackStore, type DeviceMediaPackStore } from '../host/media/deviceMediaPacks';
import { createLocalReaderPreferenceStorage } from '../host/reader/readerPreferenceStorage';
import { IndexedDbReaderStateRepository } from '../host/reader/readerStateStorage';
import { createLocalStorySeedRepository } from '../host/story-seed/localStorySeedRepository';
import { requestWorldBlueprint } from '../host/story-seed/blueprintGenerationClient';
import { requestStorySpark, storySparksConfigured } from '../host/story-seed/storySparkClient';
import { createDeviceProfileStore, type DeviceProfileStore } from '../host/profile/deviceProfile';
import { requestStoryCover } from '../host/media/storyCoverClient';
import { requestProfilePicture } from '../host/media/profilePictureClient';
import { IndexedDbStoryCoverStore, type StoryCoverStore } from '../host/media/storyCovers';
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
  storyCovers: 'novelexpanded-story-covers-v1',
  /** The Sound Words presets installed from `.spp` packages. */
  soundWords: 'novelexpanded-sound-words-v1',
  /** The skills installed from `.spp` packages, beside the official ones. */
  importedSkills: 'novelexpanded-imported-skills-v1',
  /** The Soundscape and Sound Cue packs installed from `.spp` packages, recordings and all. */
  mediaPacks: 'novelexpanded-media-packs-v1',
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
  /** The official CAPA skills a new story is equipped with, and those the reader installed. */
  installSkills: () => Promise<HarnessSkillManifest[]>;
  /** Keeps a skill the reader installed from a package on this device; returns those installed. */
  saveImportedSkill: (skill: HarnessSkillManifest) => HarnessSkillManifest[];
  /** The Soundscape and Sound Cue packs installed on this device. */
  mediaPacks: DeviceMediaPackStore;
  /** Where this device plays the recordings of installed packs. */
  deviceMedia: DeviceMediaUrls;
  /** The World Blueprint server, behind the development access token. */
  requestWorldBlueprint: typeof requestWorldBlueprint;
  /** Dao Insights' Story Spark server: free, twenty a day for a visitor; the owner's token lifts that. */
  requestStorySpark: typeof requestStorySpark;
  /** Whether the Story Spark server has a model; without one Dao Insights uses its own sparks. */
  storySparksConfigured: typeof storySparksConfigured;
  /** The owner's development access token, saved on this device: it unlocks Blueprints and lifts the chapter limit. */
  accessToken: AccessTokenStore;
  /** The reader's profile on this device: the Cave's name and aura, languages, Reading Mode and Familiar. */
  profile: DeviceProfileStore;
  /**
   * The Library economy (QI, DAO XP, Energy, the Dao Pillar, rewards, Familiars):
   * until the database, a practice account in the page, fresh each visit.
   */
  economy: LibraryEconomyClients;
  /** Each story's cover art, kept on this device until the database keeps it. */
  storyCovers: StoryCoverStore;
  /** The cover server: one cover from a story's own words, with the Router's image model. */
  requestStoryCover: typeof requestStoryCover;
  /** The profile picture server: one portrait from the reader's photo, with the Router's image model. */
  requestProfilePicture: typeof requestProfilePicture;
}

/** The skills the reader installed on this device; a damaged inventory reads as none. */
const readImportedSkills = (): HarnessSkillManifest[] => {
  try { return loadHarnessSppSkills(localStorage, NOVEL_EXPANDED_STORAGE.importedSkills); } catch { return []; }
};

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
    // The official skills are held in memory; the reader's own are kept under the app's key,
    // never in the Workshop's imported-skill inventory.
    installSkills: async () => {
      const official = await installOfficialCapaSkillsInMemory();
      const own = readImportedSkills().filter(skill => !official.some(item => item.id === skill.id && item.version === skill.version));
      return [...official, ...own];
    },
    saveImportedSkill: skill => saveHarnessSppSkill(localStorage, readImportedSkills(), skill, NOVEL_EXPANDED_STORAGE.importedSkills),
    mediaPacks: new IndexedDbDeviceMediaPackStore(NOVEL_EXPANDED_STORAGE.mediaPacks),
    deviceMedia: new DeviceMediaUrls(),
    requestWorldBlueprint,
    requestStorySpark,
    storySparksConfigured,
    accessToken,
    profile: createDeviceProfileStore({ storage: readerPreferences, uid: NOVEL_EXPANDED_READER_ID }),
    // The practice account opens with the most QI a tester could want and every Familiar.
    economy: createPracticeEconomy({ uid: NOVEL_EXPANDED_READER_ID }).clients,
    storyCovers: new IndexedDbStoryCoverStore(NOVEL_EXPANDED_STORAGE.storyCovers),
    requestStoryCover,
    requestProfilePicture,
  };
}
