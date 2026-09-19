/**
 * The frozen Phase-1 Story Seed contract: the flat `IntakeData` intake plus
 * the portable seed format built on it (a verbatim copy of Light-Novels
 * `src/lib/storySeedFormat.ts`).
 *
 * **This is not an active Story Seed contract.** It is consumed only by the
 * locked `reference/` replica — the untouched production snapshot the Workshop
 * compares against — and by the reference-only mocks in `stubs.ts`. The
 * canonical creator-controlled Story Seed is the Creator / Story / World
 * hierarchy in `storySeedSchema.ts`; nothing in `development/` may import from
 * this file. Reading old exported files is handled separately by the narrow
 * `legacySeedImport.ts` adapter.
 */

import { generateId } from '@seihouse/sen/story-seed';
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import type {} from '@seihouse/sen/story-seed';

/**
 * The locked Library Shell replica still reads this retired field. This is
 * type-only reference intake support: Story Seed normalization and all active
 * generation adapters omit it.
 */
declare module '@seihouse/sen/story-seed' {
  interface StorySeedPlotAndTropeSettings {
    longTermGoal?: string;
  }
}

export interface IntakeCharacter {
  id: string;
  name: string;
  aliases?: string[];
  age?: string;
  skinTone?: string;
  eyeColor?: string;
  powerType?: string;
  rankLevel?: string;
  role?: string;
  connectionToMC?: string;
  bio?: string;
}

export interface IntakeFaction {
  id: string;
  name: string;
  aliases?: string[];
  role?: string;
  powerLevel?: string;
  alignment?: string;
  connectionToMC?: string;
  description?: string;
}

/** The Phase-1 flat intake. Superseded by `StorySeedInput`. */
export interface IntakeData {
  // 1. Core Seed
  novelTitle?: string;
  mcName?: string;
  genrePath?: string;
  corePremise?: string;
  proseStyle?: string;
  desiredPlotDirection?: string;
  storyTags?: string[];
  destinedEnding?: string;
  estimatedArcs?: number;

  // 2. World Setting
  worldType?: string;
  startingLocation?: string;
  societyStructure?: string;
  dangerLevel?: string;
  generalAtmosphere?: string;

  // 3. Main Character Setup
  startingIdentity?: string;
  personality?: string;
  mainFlaw?: string;
  secretAdvantage?: string;
  startingWeakness?: string;
  moralAlignment?: string;
  mcBio?: string;

  // 3.5 / 3.8. Character and faction intake
  customCharacters?: IntakeCharacter[];
  customFactions?: IntakeFaction[];

  // 4. Power System Seed
  startingPowerConcept?: string;
  powerFlavor?: string;
  powerPace?: string;
  knownRanks?: string;
  uniquePath?: string;

  // 5. Plot & Trope Control
  /** Locked Reference-only field. Active Story Seed normalization discards it. */
  longTermGoal?: string;
  firstMajorConflict?: string;
  mainAntagonistPressure?: string;
  romanceLevel?: string;
  faceSlappingLevel?: string;
  comedyLevel?: string;
  tournamentArcPreference?: string;
  haremPreference?: string;
  betrayalLevel?: string;
  thingsToAvoid?: string;
  mustIncludeElements?: string;
  hardcoreFateMode?: boolean;
  fatePressure?: 'Relaxed' | 'Balanced' | 'Hardcore' | 'Dao Master';

  // 6. Make it Work (Absolute Custom Rule)
  makeItWorkInstruction?: string;
}

export interface StorySeedPayload {
  intake: IntakeData;
  blueprint: WorldBlueprint;
}

export interface StorySeed extends StorySeedPayload {
  schemaVersion: 1;
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type { WorldBlueprint };

export const STORY_SEED_FORMAT = 'seihouse-story-seed' as const;
export const STORY_SEED_COLLECTION_FORMAT = 'seihouse-story-seed-collection' as const;
export const STORY_SEED_FORMAT_VERSION = 1 as const;

const INTAKE_STRING_FIELDS = [
  'novelTitle',
  'mcName',
  'genrePath',
  'corePremise',
  'desiredPlotDirection',
  'destinedEnding',
  'worldType',
  'startingLocation',
  'societyStructure',
  'dangerLevel',
  'generalAtmosphere',
  'startingIdentity',
  'personality',
  'mainFlaw',
  'secretAdvantage',
  'startingWeakness',
  'moralAlignment',
  'mcBio',
  'startingPowerConcept',
  'powerFlavor',
  'powerPace',
  'knownRanks',
  'uniquePath',
  'firstMajorConflict',
  'mainAntagonistPressure',
  'romanceLevel',
  'faceSlappingLevel',
  'comedyLevel',
  'tournamentArcPreference',
  'haremPreference',
  'betrayalLevel',
  'thingsToAvoid',
  'mustIncludeElements',
  'makeItWorkInstruction',
] as const;

const CHARACTER_STRING_FIELDS = [
  'name',
  'age',
  'skinTone',
  'eyeColor',
  'powerType',
  'rankLevel',
  'role',
  'connectionToMC',
  'bio',
] as const;

const FACTION_STRING_FIELDS = [
  'name',
  'role',
  'powerLevel',
  'alignment',
  'connectionToMC',
  'description',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
    : [];

const safePositiveInteger = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : fallback;

const normalizeCharacter = (value: unknown): IntakeCharacter | null => {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return null;
  const normalized: Record<string, unknown> = {
    id: typeof value.id === 'string' && value.id ? value.id : `seed-character-${generateId(9)}`,
  };
  for (const field of CHARACTER_STRING_FIELDS) {
    if (typeof value[field] === 'string') normalized[field] = value[field];
  }
  const aliases = stringArray(value.aliases);
  if (aliases.length > 0) normalized.aliases = aliases;
  return normalized as unknown as IntakeCharacter;
};

const normalizeFaction = (value: unknown): IntakeFaction | null => {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return null;
  const normalized: Record<string, unknown> = {
    id: typeof value.id === 'string' && value.id ? value.id : `seed-faction-${generateId(9)}`,
  };
  for (const field of FACTION_STRING_FIELDS) {
    if (typeof value[field] === 'string') normalized[field] = value[field];
  }
  const aliases = stringArray(value.aliases);
  if (aliases.length > 0) normalized.aliases = aliases;
  return normalized as unknown as IntakeFaction;
};

export const normalizeSeedIntake = (value: unknown): IntakeData => {
  const source = isRecord(value) ? value : {};
  const normalized: Record<string, unknown> = {};
  for (const field of INTAKE_STRING_FIELDS) {
    if (typeof source[field] === 'string') normalized[field] = source[field];
  }

  const storyTags = stringArray(source.storyTags);
  if (storyTags.length > 0 || Array.isArray(source.storyTags)) normalized.storyTags = storyTags;
  if (typeof source.estimatedArcs === 'number' && Number.isInteger(source.estimatedArcs) && source.estimatedArcs > 0) {
    normalized.estimatedArcs = source.estimatedArcs;
  }
  if (typeof source.hardcoreFateMode === 'boolean') normalized.hardcoreFateMode = source.hardcoreFateMode;
  if (
    source.fatePressure === 'Relaxed'
    || source.fatePressure === 'Balanced'
    || source.fatePressure === 'Hardcore'
    || source.fatePressure === 'Dao Master'
  ) {
    normalized.fatePressure = source.fatePressure;
  }

  if (Array.isArray(source.customCharacters)) {
    normalized.customCharacters = source.customCharacters
      .map(normalizeCharacter)
      .filter((item): item is IntakeCharacter => item !== null);
  }
  if (Array.isArray(source.customFactions)) {
    normalized.customFactions = source.customFactions
      .map(normalizeFaction)
      .filter((item): item is IntakeFaction => item !== null);
  }

  return normalized as IntakeData;
};

export const normalizeSeedBlueprint = (value: unknown): WorldBlueprint => {
  const source = isRecord(value) ? value : {};
  const readString = (field: string, fallback = ''): string =>
    typeof source[field] === 'string' ? source[field] : fallback;
  const requestedTitle = readString('title', readString('novelTitle'));

  return {
    title: requestedTitle.trim() ? requestedTitle : 'Imported World',
    logline: readString('logline', readString('corePremise')),
    worldOverview: readString('worldOverview', readString('worldType')),
    startingLocation: readString('startingLocation'),
    societyStructure: readString('societyStructure'),
    powerSystemOutline: readString('powerSystemOutline', readString('startingPowerConcept')),
    mcProfile: readString('mcProfile', readString('startingIdentity')),
    majorFactions: stringArray(source.majorFactions),
    initialCharacters: stringArray(source.initialCharacters),
    majorMysteries: stringArray(source.majorMysteries),
    firstArcPromise: readString('firstArcPromise'),
    tropeRules: readString('tropeRules'),
    styleBible: readString('styleBible'),
    destinedEnding: readString('destinedEnding'),
    estimatedArcs: safePositiveInteger(source.estimatedArcs, 10),
    unresolvedPlotThreads: stringArray(source.unresolvedPlotThreads),
  };
};

export const normalizeStorySeedPayload = (value: unknown): StorySeedPayload => {
  const source = isRecord(value) ? value : {};
  return {
    intake: normalizeSeedIntake(source.intake),
    blueprint: normalizeSeedBlueprint(source.blueprint),
  };
};

const portableIntake = (intake: IntakeData): Record<string, unknown> => {
  const normalized = normalizeSeedIntake(intake);
  const portable = { ...normalized } as Record<string, unknown>;
  if (normalized.customCharacters) {
    portable.customCharacters = normalized.customCharacters.map(({ id: _id, ...character }) => character);
  }
  if (normalized.customFactions) {
    portable.customFactions = normalized.customFactions.map(({ id: _id, ...faction }) => faction);
  }
  return portable;
};

export const createPortableSeedPayload = (payload: StorySeedPayload): Record<string, unknown> => ({
  intake: portableIntake(payload.intake),
  blueprint: normalizeSeedBlueprint(payload.blueprint),
});

export const createStorySeedExport = (payload: StorySeedPayload) => ({
  format: STORY_SEED_FORMAT,
  version: STORY_SEED_FORMAT_VERSION,
  seed: createPortableSeedPayload(payload),
});

export const createStorySeedCollectionExport = (payloads: StorySeedPayload[]) => ({
  format: STORY_SEED_COLLECTION_FORMAT,
  version: STORY_SEED_FORMAT_VERSION,
  seeds: payloads.map(createPortableSeedPayload),
});

const isGeneratedStoryPackage = (value: Record<string, unknown>): boolean =>
  'memory' in value
  || 'arcs' in value
  || 'chapters' in value
  || 'imageHistory' in value
  || 'codex' in value;

const hasBlueprintShape = (value: Record<string, unknown>): boolean =>
  ['title', 'logline', 'worldOverview', 'powerSystemOutline', 'mcProfile', 'firstArcPromise']
    .some(field => typeof value[field] === 'string' && Boolean((value[field] as string).trim()));

const hasLegacyIntakeShape = (value: Record<string, unknown>): boolean =>
  ['novelTitle', 'corePremise', 'worldType', 'startingPowerConcept', 'startingIdentity']
    .some(field => typeof value[field] === 'string' && Boolean((value[field] as string).trim()));

const extractSeedPayload = (value: unknown): StorySeedPayload => {
  if (!isRecord(value)) throw new Error('Each seed must be a JSON object.');
  if (isGeneratedStoryPackage(value)) {
    throw new Error('This is a generated story package, not a portable story seed.');
  }
  if (isRecord(value.seed)) return extractSeedPayload(value.seed);
  if (isRecord(value.blueprint)) {
    if (!hasBlueprintShape(value.blueprint)) throw new Error('The seed blueprint is empty.');
    return normalizeStorySeedPayload(value);
  }
  if (hasBlueprintShape(value)) {
    return {
      intake: normalizeSeedIntake({}),
      blueprint: normalizeSeedBlueprint(value),
    };
  }
  if (hasLegacyIntakeShape(value)) {
    return {
      intake: normalizeSeedIntake(value),
      blueprint: normalizeSeedBlueprint(value),
    };
  }
  throw new Error('No reusable story seed data was found in this JSON file.');
};

export const parseStorySeedJson = (input: string): StorySeedPayload[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  let candidates: unknown[];
  if (Array.isArray(parsed)) {
    candidates = parsed;
  } else if (isRecord(parsed) && Array.isArray(parsed.seeds)) {
    candidates = parsed.seeds;
  } else {
    candidates = [parsed];
  }

  if (candidates.length === 0) throw new Error('The seed file is empty.');
  return candidates.map(extractSeedPayload);
};

const safeFilenamePart = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'untitled';

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const isMobileShareDevice = (): boolean => {
  const shareNavigator = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  if (shareNavigator.userAgentData?.mobile) return true;

  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
    // iPadOS can identify itself as macOS, but still exposes touch points.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Uses the native share sheet for file-capable mobile browsers (including
 * iOS Safari's Save to Files flow), then falls back to a normal browser
 * download for desktop and unsupported browsers.
 */
export const downloadJsonFile = async (value: unknown, filename: string): Promise<void> => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  if (typeof File !== 'undefined' && typeof navigator !== 'undefined' && isMobileShareDevice()) {
    const file = new File([blob], filename, { type: blob.type });
    const shareNavigator = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    const shareData: ShareData = { files: [file], title: filename };
    const canShareFiles = typeof shareNavigator.share === 'function'
      && (typeof shareNavigator.canShare !== 'function' || shareNavigator.canShare(shareData));

    if (canShareFiles) {
      try {
        await shareNavigator.share!(shareData);
        return;
      } catch (error) {
        // Closing the native share sheet is an intentional cancellation, not a
        // failed export that should unexpectedly open a second download UI.
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
  }

  triggerBrowserDownload(blob, filename);
};

export const downloadStorySeed = (payload: StorySeedPayload): Promise<void> => {
  const normalized = normalizeStorySeedPayload(payload);
  return downloadJsonFile(
    createStorySeedExport(normalized),
    `seihouse_story_seed_${safeFilenamePart(normalized.blueprint.title)}.json`,
  );
};

export const downloadStorySeedCollection = (payloads: StorySeedPayload[]): Promise<void> => {
  return downloadJsonFile(
    createStorySeedCollectionExport(payloads),
    `seihouse_story_seeds_${new Date().toISOString().slice(0, 10)}.json`,
  );
};
