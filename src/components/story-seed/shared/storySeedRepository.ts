/** Portable Story Seed persistence contract. The host supplies the implementation per workspace. */

import type { SenLanguageCode } from '../../../lib/language';
import {
  STORY_SEED_SCHEMA_VERSION,
  type StorySeedInput,
} from './storySeedSchema';
import type { WorldBlueprint } from './types';

/** Editor confirmations, stored beside the creative content and never sent to a model. */
export interface StorySeedEditorProgress {
  confirmedTabs: string[];
}

/** Canonical persisted editor keys; the host's creator positions must match this contract. */
export const STORY_SEED_EDITOR_TAB_KEYS = [
  'origin.style', 'origin.synopsis', 'origin.fate', 'origin.tags',
  'world-identity', 'characters', 'factions', 'things', 'places', 'species', 'abilities', 'power-system',
  'arc.ending', 'arc.goals', 'arc.pins', 'arc.fun',
] as const;
const editorTabKeys = new Set<string>(STORY_SEED_EDITOR_TAB_KEYS);

/** Ignore damaged editor-only metadata without discarding a usable saved seed. */
export const normalizeStorySeedEditorProgress = (value: unknown): StorySeedEditorProgress => {
  const tabs = value && typeof value === 'object' && 'confirmedTabs' in value ? value.confirmedTabs : undefined;
  return { confirmedTabs: Array.isArray(tabs)
    ? [...new Set(tabs.filter((tab): tab is string => typeof tab === 'string' && editorTabKeys.has(tab)))].slice(0, 40)
    : [] };
};

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
  editorProgress?: StorySeedEditorProgress;
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
  create(userId: string, input: StorySeedInput, blueprint: WorldBlueprint | undefined, originalLanguage: SenLanguageCode, editorProgress?: StorySeedEditorProgress): Promise<StorySeedRecord>;
  update(userId: string, existing: StorySeedRecord, input: StorySeedInput, blueprint: WorldBlueprint | undefined, originalLanguage: SenLanguageCode, editorProgress?: StorySeedEditorProgress): Promise<StorySeedRecord>;
  list(userId: string): Promise<StorySeedRecord[]>;
  importMany(userId: string, artifacts: StorySeedArtifact[]): Promise<StorySeedRecord[]>;
}
