/**
 * Temporary Workshop-only Story Seed storage (browser `localStorage`, with an
 * in-memory fallback). It exists solely to validate the cleaned Story Seed
 * contract end to end.
 *
 * Everything database-shaped stops here: it is the single implementation of
 * the `StorySeedRepository` port and is replaced by passing the real one to
 * `setStorySeedRepository`. No other Story Seed module may import this file.
 */

import { DEFAULT_SEN_LANGUAGE_CODE, normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';
import { generateUUID } from '@seihouse/sen/story-seed';
import { STORY_SEED_SCHEMA_VERSION, normalizeStorySeedInput, reconcileStorySeedBlueprint, type StorySeedInput } from '@seihouse/sen/story-seed';
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import { type StorySeedRecord, type StorySeedRepository } from '@seihouse/sen/story-seed';

const STORAGE_KEY = 'seihouse-workshop-story-seeds-v4';
let memoryRecords: StorySeedRecord[] = [];

const storage = (): Storage | null =>
  typeof window === 'undefined' ? null : window.localStorage;

const seedTitle = (seed: StorySeedInput): string =>
  seed.world.optional.worldIdentity.title
  || seed.story.required.premise.slice(0, 80)
  || 'Untitled Seed';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeRecord = (value: unknown): StorySeedRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (
    source.schemaVersion !== STORY_SEED_SCHEMA_VERSION
    || typeof source.id !== 'string'
    || typeof source.userId !== 'string'
    || typeof source.createdAt !== 'string'
    || typeof source.updatedAt !== 'string'
  ) return null;
  try {
    // A stored Blueprint's values live in its Seed; the Blueprint mirrors it.
    const reconciled = isRecord(source.blueprint)
      ? reconcileStorySeedBlueprint(normalizeStorySeedInput(source.seed), source.blueprint)
      : undefined;
    const seed = reconciled?.seed ?? normalizeStorySeedInput(source.seed);
    const blueprint = reconciled?.blueprint;
    return {
      schemaVersion: STORY_SEED_SCHEMA_VERSION,
      id: source.id,
      userId: source.userId,
      title: typeof source.title === 'string' && source.title.trim()
        ? source.title.trim()
        : seedTitle(seed),
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      originalLanguage: normalizeSenLanguageCode(source.originalLanguage),
      seed,
      ...(blueprint ? { blueprint } : {}),
    };
  } catch {
    return null;
  }
};

const readRecords = (): StorySeedRecord[] => {
  let persisted: string | null = null;
  try {
    persisted = storage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    throw new Error('Saved Story Seeds could not be read. Check browser storage access and try again.');
  }
  if (!persisted) {
    const records = memoryRecords
      .map(normalizeRecord)
      .filter((seed): seed is StorySeedRecord => seed !== null);
    memoryRecords = records;
    return [...records];
  }
  try {
    const parsed = JSON.parse(persisted);
    if (!Array.isArray(parsed)) throw new Error('Stored Story Seed data is not a collection.');
    const normalizedRecords = parsed.map(normalizeRecord);
    if (normalizedRecords.some(seed => seed === null)) {
      // Development persistence has no migration path. A structural/schema
      // mismatch clears the stale local collection rather than retaining a
      // partly readable old Story Seed shape.
      writeRecords([]);
      return [];
    }
    const records = normalizedRecords.filter((seed): seed is StorySeedRecord => seed !== null);
    memoryRecords = records;
    return [...records];
  } catch {
    throw new Error('Saved Story Seed data is unreadable. Import a valid backup or clear the damaged browser data.');
  }
};

const writeRecords = (records: StorySeedRecord[]): void => {
  const nextRecords = [...records];
  const browserStorage = storage();
  // Persist first so a quota/security failure never leaves the in-memory view
  // claiming a save succeeded when browser storage rejected it.
  browserStorage?.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  memoryRecords = nextRecords;
};

const saveRecords = (records: StorySeedRecord[], message: string): void => {
  try {
    writeRecords(records);
  } catch {
    throw new Error(message);
  }
};

const buildRecord = (
  userId: string,
  id: string,
  input: StorySeedInput,
  originalLanguage: SenLanguageCode,
  createdAt = new Date().toISOString(),
  blueprint?: WorldBlueprint,
): StorySeedRecord => {
  if (!userId) throw new Error('Sign in to save story seeds to your account.');
  const reconciled = blueprint ? reconcileStorySeedBlueprint(normalizeStorySeedInput(input), blueprint) : undefined;
  const seed = reconciled?.seed ?? normalizeStorySeedInput(input);
  return {
    schemaVersion: STORY_SEED_SCHEMA_VERSION,
    id,
    userId,
    title: seedTitle(seed),
    createdAt,
    updatedAt: new Date().toISOString(),
    originalLanguage,
    seed,
    ...(reconciled ? { blueprint: reconciled.blueprint } : {}),
  };
};

export const workshopStorySeedStorage: StorySeedRepository = {
  async create(userId, input, blueprint, originalLanguage) {
    const record = buildRecord(userId, `seed-${generateUUID()}`, input, originalLanguage, undefined, blueprint);
    saveRecords(
      [record, ...readRecords()],
      'The Story Seed could not be saved. Free browser storage space and try again.',
    );
    return record;
  },

  async update(userId, existing, input, blueprint, originalLanguage) {
    if (existing.userId !== userId) throw new Error('Cannot update a story seed owned by another account.');
    const record = buildRecord(
      userId,
      existing.id,
      input,
      originalLanguage,
      existing.createdAt,
      blueprint === undefined ? existing.blueprint : blueprint,
    );
    saveRecords(
      readRecords().map(seed => (seed.id === record.id ? record : seed)),
      'The Story Seed changes could not be saved. Free browser storage space and try again.',
    );
    return record;
  },

  async list(userId) {
    if (!userId) return [];
    return readRecords()
      .filter(seed => seed.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async importMany(userId, artifacts) {
    if (artifacts.length > 500) throw new Error('A seed import can contain at most 500 seeds at a time.');
    // A portable artifact carries its own administrative Original Language.
    // English is the explicit fallback only for a file that recorded none.
    const imported = artifacts.map(artifact => buildRecord(
      userId,
      `seed-${generateUUID()}`,
      artifact.seed,
      normalizeSenLanguageCode(artifact.originalLanguage, DEFAULT_SEN_LANGUAGE_CODE),
      undefined,
      artifact.blueprint,
    ));
    const existing = readRecords();
    saveRecords(
      [...imported, ...existing],
      'The Story Seed import could not be saved. Free browser storage space and try again.',
    );
    return imported;
  },
};

export const resetWorkshopStorySeedStorage = (records: StorySeedRecord[] = []): void => {
  writeRecords(records);
};
