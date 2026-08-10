/**
 * The canonical creator-controlled Story Seed contract.
 *
 * ```text
 * STORY SEED
 * ├── creator
 * ├── story
 * │   ├── required   storyTags · premise · genre · style
 * │   └── optional   intendedForMatureAudiences · fateSurvival · plotAndTropeSettings · additionalStoryDirection · makeItWorkInstruction
 * └── world
 *     ├── required   (intentionally empty — World has no required inputs)
 *     └── optional   worldIdentity · worldFoundations
 * ```
 *
 * This is the *only* active Story Seed shape: it is what the creation
 * workspace edits, what is saved, what is exported, and what enters every
 * generation payload. System-owned data (ids, timestamps, status, ownership)
 * never appears inside `creator` / `story` / `world` — the temporary Workshop
 * record envelope lives in `storySeedRepository.ts`, and the story spine lives
 * in `storyAdministrativeMetadata.ts`.
 *
 * The frozen Phase-1 flat intake contract is not part of this file; it now
 * belongs to the locked `reference/` replica (see `referenceIntake.ts`).
 */

import type {
  WorldBlueprint,
  WorldBlueprintMainCharacter,
  WorldBlueprintOriginSnapshot,
} from './types';
import {
  assertValidStoryAdministrativeMetadata,
  type StoryAdministrativeMetadata,
} from './storyAdministrativeMetadata';
import { inferStoryTags } from './storyTagInference';
import { normalizeStoryStyle, type StoryStyle } from './storyStyle';

/**
 * Bumped when the persisted / portable Story Seed shape changes
 * incompatibly, so stale records are rejected instead of silently read as
 * empty. Version 3 is the Creator / Story / World hierarchy above.
 */
export const STORY_SEED_SCHEMA_VERSION = 3 as const;
export const WORLD_BLUEPRINT_VERSION = 'v1.0' as const;
export const STORY_PREMISE_MAX_LENGTH = 3_000;
export const STORY_TAG_LIMIT = 12;

// ─── Creator ─────────────────────────────────────────────────────────────────

/**
 * Creator-owned settings. The family is part of the contract even while no
 * creator-controlled field is collected yet, so nothing has to be restructured
 * when the first one arrives.
 */
export interface StorySeedCreator {}

// ─── Story ───────────────────────────────────────────────────────────────────

export interface StorySeedStoryRequired {
  storyTags: string[];
  premise: string;
  genre: string;
  /** The novel's storytelling tradition; `''` until the creator chooses one. */
  style: StoryStyle | '';
}

/** The narrative shape of the novel — where it is headed and what pushes back. */
export type StorySeedStorySauceLevel = 'low' | 'medium' | 'high';
export type StorySeedFateVisibility = 'full' | 'partial' | 'none';
export type StorySeedSurvivalPressure = 'heaven' | 'immortal' | 'mortal';

export interface StorySeedFateSurvivalSettings {
  enabled: boolean;
  visibility: StorySeedFateVisibility;
  pressure: StorySeedSurvivalPressure;
}

export interface StorySeedPlotAndTropeSettings {
  faceSlap?: StorySeedStorySauceLevel;
  plotArmor?: StorySeedStorySauceLevel;
  recognition?: StorySeedStorySauceLevel;
  longTermGoal?: string;
  firstMajorConflict?: string;
  mainAntagonistPressure?: string;
}

export interface StorySeedStoryOptional {
  /** Story metadata only; this does not request explicit generated content. */
  intendedForMatureAudiences: boolean;
  fateSurvival: StorySeedFateSurvivalSettings;
  plotAndTropeSettings: StorySeedPlotAndTropeSettings;
  /**
   * General freeform direction for the story. Legacy `desiredPlotDirection`,
   * `mustIncludeElements`, and `thingsToAvoid` values consolidate here.
   */
  additionalStoryDirection?: string;
  /**
   * High-priority creative intent for strange, difficult, contradictory, or
   * highly specific ideas. Generation should preserve and make the idea
   * believable unless safety or a required Story Seed field prevents it.
   */
  makeItWorkInstruction?: string;
}

export interface StorySeedStory {
  required: StorySeedStoryRequired;
  optional: StorySeedStoryOptional;
}

// ─── World ───────────────────────────────────────────────────────────────────

/** World has no required creator inputs. The family exists and stays empty. */
export interface StorySeedWorldRequired {}

/** Name, world type, society, and the place the story opens in. */
export interface StorySeedWorldIdentity {
  title?: string;
  worldType?: string;
  societyStructure?: string;
  startingLocation?: string;
}

export interface StorySeedCharacter {
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

export interface StorySeedFaction {
  id: string;
  name: string;
  aliases?: string[];
  role?: string;
  powerLevel?: string;
  alignment?: string;
  connectionToMC?: string;
  description?: string;
}

export interface StorySeedMainCharacter {
  name?: string;
  startingIdentity?: string;
  personality?: string;
  mainFlaw?: string;
  secretAdvantage?: string;
  startingWeakness?: string;
  moralAlignment?: string;
  bio?: string;
}

export interface StorySeedAbilities {
  startingPowerConcept?: string;
  uniquePath?: string;
}

export interface StorySeedPowerSystem {
  flavor?: string;
  knownRanks?: string;
}

/** The history already standing when the novel opens. */
export interface StorySeedWorldFoundations {
  mainCharacter?: StorySeedMainCharacter;
  additionalCharacters?: StorySeedCharacter[];
  factions?: StorySeedFaction[];
  abilities?: StorySeedAbilities;
  powerSystem?: StorySeedPowerSystem;
  destinedEnding?: string;
}

export interface StorySeedWorldOptional {
  worldIdentity: StorySeedWorldIdentity;
  worldFoundations: StorySeedWorldFoundations;
}

export interface StorySeedWorld {
  required: StorySeedWorldRequired;
  optional: StorySeedWorldOptional;
}

// ─── The seed ────────────────────────────────────────────────────────────────

export interface StorySeedInput {
  creator: StorySeedCreator;
  story: StorySeedStory;
  world: StorySeedWorld;
}

export interface BlueprintGenerationPayload {
  storySeed: StorySeedInput;
}

export interface InitialStoryGenerationPayload extends BlueprintGenerationPayload {
  administrative: StoryAdministrativeMetadata;
  blueprint: WorldBlueprint;
  chapterCount: number;
}

export interface StorySeedValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Normalization primitives ────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

const stringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(text).filter((item): item is string => Boolean(item))));
};

const optionalTextFields = <T extends object>(
  source: Record<string, unknown>,
  fields: readonly string[],
): T => Object.fromEntries(
  fields.flatMap(field => {
    const value = text(source[field]);
    return value ? [[field, value]] : [];
  }),
) as T;

const normalizeStorySauceLevel = (value: unknown): StorySeedStorySauceLevel => {
  const normalized = text(value)?.toLowerCase();
  return normalized === 'low' || normalized === 'high' ? normalized : 'medium';
};

const normalizeFateVisibility = (value: unknown): StorySeedFateVisibility => {
  const normalized = text(value)?.toLowerCase();
  return normalized === 'full' || normalized === 'none' ? normalized : 'partial';
};

const normalizeSurvivalPressure = (value: unknown): StorySeedSurvivalPressure => {
  const normalized = text(value)?.toLowerCase();
  return normalized === 'heaven' || normalized === 'mortal' ? normalized : 'immortal';
};

const PLOT_AND_TROPE_FIELDS = ['longTermGoal', 'firstMajorConflict', 'mainAntagonistPressure'] as const;
const WORLD_IDENTITY_FIELDS = ['title', 'worldType', 'societyStructure', 'startingLocation'] as const;
const MAIN_CHARACTER_FIELDS = [
  'name', 'startingIdentity', 'personality', 'mainFlaw',
  'secretAdvantage', 'startingWeakness', 'moralAlignment', 'bio',
] as const;
const ABILITY_FIELDS = ['startingPowerConcept', 'uniquePath'] as const;
const POWER_SYSTEM_FIELDS = ['flavor', 'knownRanks'] as const;
const CHARACTER_FIELDS = [
  'name', 'age', 'skinTone', 'eyeColor', 'powerType', 'rankLevel', 'role', 'connectionToMC', 'bio',
] as const;
const FACTION_FIELDS = ['name', 'role', 'powerLevel', 'alignment', 'connectionToMC', 'description'] as const;

const normalizeCharacter = (value: unknown, index: number): StorySeedCharacter | null => {
  if (!isRecord(value) || !text(value.name)) return null;
  const normalized = {
    ...optionalTextFields<Partial<StorySeedCharacter>>(value, CHARACTER_FIELDS),
    id: text(value.id) || `seed-character-${index + 1}`,
  } as StorySeedCharacter;
  const aliases = stringList(value.aliases);
  if (aliases.length > 0) normalized.aliases = aliases;
  return normalized;
};

const normalizeFaction = (value: unknown, index: number): StorySeedFaction | null => {
  if (!isRecord(value) || !text(value.name)) return null;
  const normalized = {
    ...optionalTextFields<Partial<StorySeedFaction>>(value, FACTION_FIELDS),
    id: text(value.id) || `seed-faction-${index + 1}`,
  } as StorySeedFaction;
  const aliases = stringList(value.aliases);
  if (aliases.length > 0) normalized.aliases = aliases;
  return normalized;
};

const normalizeStoryOptional = (value: unknown): StorySeedStoryOptional => {
  const source = isRecord(value) ? value : {};
  const plotAndTropeSettings = isRecord(source.plotAndTropeSettings) ? source.plotAndTropeSettings : {};
  const normalized: StorySeedStoryOptional = {
    intendedForMatureAudiences: source.intendedForMatureAudiences === true,
    fateSurvival: {
      enabled: isRecord(source.fateSurvival) ? source.fateSurvival.enabled === true : false,
      visibility: normalizeFateVisibility(isRecord(source.fateSurvival) ? source.fateSurvival.visibility : undefined),
      pressure: normalizeSurvivalPressure(isRecord(source.fateSurvival) ? source.fateSurvival.pressure : undefined),
    },
    plotAndTropeSettings: {
      ...optionalTextFields<StorySeedPlotAndTropeSettings>(plotAndTropeSettings, PLOT_AND_TROPE_FIELDS),
      faceSlap: normalizeStorySauceLevel(plotAndTropeSettings.faceSlap),
      plotArmor: normalizeStorySauceLevel(plotAndTropeSettings.plotArmor),
      recognition: normalizeStorySauceLevel(plotAndTropeSettings.recognition),
    },
  };
  const additionalStoryDirection = text(source.additionalStoryDirection);
  if (additionalStoryDirection) normalized.additionalStoryDirection = additionalStoryDirection;
  const makeItWorkInstruction = text(source.makeItWorkInstruction);
  if (makeItWorkInstruction) normalized.makeItWorkInstruction = makeItWorkInstruction;
  return normalized;
};

const normalizeWorldFoundations = (value: unknown): StorySeedWorldFoundations => {
  const source = isRecord(value) ? value : {};
  const normalized: StorySeedWorldFoundations = {};

  const mainCharacter = optionalTextFields<StorySeedMainCharacter>(
    isRecord(source.mainCharacter) ? source.mainCharacter : {},
    MAIN_CHARACTER_FIELDS,
  );
  if (Object.keys(mainCharacter).length > 0) normalized.mainCharacter = mainCharacter;

  const additionalCharacters = (Array.isArray(source.additionalCharacters) ? source.additionalCharacters : [])
    .map(normalizeCharacter)
    .filter((item): item is StorySeedCharacter => item !== null);
  if (additionalCharacters.length > 0) normalized.additionalCharacters = additionalCharacters;

  const factions = (Array.isArray(source.factions) ? source.factions : [])
    .map(normalizeFaction)
    .filter((item): item is StorySeedFaction => item !== null);
  if (factions.length > 0) normalized.factions = factions;

  const abilities = optionalTextFields<StorySeedAbilities>(
    isRecord(source.abilities) ? source.abilities : {},
    ABILITY_FIELDS,
  );
  if (Object.keys(abilities).length > 0) normalized.abilities = abilities;

  const powerSystem = optionalTextFields<StorySeedPowerSystem>(
    isRecord(source.powerSystem) ? source.powerSystem : {},
    POWER_SYSTEM_FIELDS,
  );
  if (Object.keys(powerSystem).length > 0) normalized.powerSystem = powerSystem;

  const destinedEnding = text(source.destinedEnding);
  if (destinedEnding) normalized.destinedEnding = destinedEnding;

  return normalized;
};

const normalizeWorldOptional = (value: unknown): StorySeedWorldOptional => {
  const source = isRecord(value) ? value : {};
  return {
    worldIdentity: optionalTextFields<StorySeedWorldIdentity>(
      isRecord(source.worldIdentity) ? source.worldIdentity : {},
      WORLD_IDENTITY_FIELDS,
    ),
    worldFoundations: normalizeWorldFoundations(source.worldFoundations),
  };
};

// ─── Construction ────────────────────────────────────────────────────────────

/** A structurally complete, creatively empty seed — what a new draft starts as. */
export const createEmptyStorySeedInput = (): StorySeedInput => ({
  creator: {},
  story: {
    required: {
      storyTags: [],
      premise: '',
      genre: '',
      // No hidden Style default: an untouched Style stays empty and reads as
      // incomplete rather than as a choice the creator never made.
      style: '',
    },
    optional: {
      intendedForMatureAudiences: false,
      fateSurvival: {
        enabled: false,
        visibility: 'partial',
        pressure: 'immortal',
      },
      plotAndTropeSettings: {
        faceSlap: 'medium',
        plotArmor: 'medium',
        recognition: 'medium',
      },
    },
  },
  world: {
    required: {},
    optional: { worldIdentity: {}, worldFoundations: {} },
  },
});

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Structural validation only — the rule a *draft* has to satisfy. Creative
 * content may be entirely missing: a draft exists to preserve progress.
 */
export const validateStorySeedDraft = (value: unknown): StorySeedValidationResult => {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['Story Seed must be an object.'] };

  if (!isRecord(value.creator)) errors.push('Creator is required.');

  if (!isRecord(value.story)) {
    errors.push('Story is required.');
  } else {
    if (!isRecord(value.story.required)) errors.push('Story required inputs must be an object.');
    if (!isRecord(value.story.optional)) errors.push('Story optional settings must be an object.');
  }

  if (!isRecord(value.world)) {
    errors.push('World is required.');
  } else {
    // World holds no required creator inputs, but the family must still exist.
    if (!isRecord(value.world.required)) errors.push('World required inputs must be an object.');
    if (!isRecord(value.world.optional)) errors.push('World optional settings must be an object.');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Generation readiness — the four required Story inputs. Story Tags belong
 * here like the other three; they never block a creator because
 * `applyInferredStoryTags` fills an empty set from Premise, Genre, and Style
 * before the generation payload builders assert.
 */
export const validateStorySeedInput = (value: unknown): StorySeedValidationResult => {
  const draft = validateStorySeedDraft(value);
  const errors = [...draft.errors];
  if (isRecord(value) && isRecord(value.story) && isRecord(value.story.required)) {
    const required = value.story.required;
    // Style first: it is the first decision the creation flow asks for.
    if (!normalizeStoryStyle(required.style)) errors.push('Style is required.');
    if (!text(required.genre)) errors.push('Genre is required.');
    if (!text(required.premise)) errors.push('Premise is required.');
    if (typeof required.premise === 'string' && required.premise.length > STORY_PREMISE_MAX_LENGTH) {
      errors.push(`Premise cannot exceed ${STORY_PREMISE_MAX_LENGTH.toLocaleString('en-US')} characters.`);
    }
    const storyTags = stringList(required.storyTags);
    if (storyTags.length === 0) errors.push('Story Tags are required.');
    if (storyTags.length > STORY_TAG_LIMIT) errors.push(`Story Tags cannot exceed ${STORY_TAG_LIMIT}.`);
  }
  return { valid: errors.length === 0, errors };
};

export function assertValidStorySeedDraft(value: unknown): asserts value is StorySeedInput {
  const result = validateStorySeedDraft(value);
  if (!result.valid) throw new Error(result.errors.join(' '));
}

export function assertValidStorySeedInput(value: unknown): asserts value is StorySeedInput {
  const result = validateStorySeedInput(value);
  if (!result.valid) throw new Error(result.errors.join(' '));
}

/**
 * Normalizes any structurally valid seed — including an incomplete draft, so
 * saving never depends on creative completeness. Generation payload builders
 * assert generation readiness separately.
 */
export const normalizeStorySeedInput = (value: unknown): StorySeedInput => {
  assertValidStorySeedDraft(value);
  const story = value.story as unknown as Record<string, unknown>;
  const world = value.world as unknown as Record<string, unknown>;
  const required = (isRecord(story.required) ? story.required : {}) as Record<string, unknown>;
  return {
    creator: {},
    story: {
      required: {
        storyTags: stringList(required.storyTags),
        premise: text(required.premise) || '',
        genre: text(required.genre) || '',
        style: normalizeStoryStyle(required.style) || '',
      },
      optional: normalizeStoryOptional(story.optional),
    },
    world: {
      required: {},
      optional: normalizeWorldOptional(world.optional),
    },
  };
};

/**
 * Fills empty Story Tags from Premise, Genre, and Style. Manually chosen tags
 * are always preserved untouched; this only ever fires on an empty set. The
 * returned seed is what gets saved *and* what enters the generation pipeline,
 * so the stored seed and the generated novel always share one tag set.
 */
export const applyInferredStoryTags = (seed: StorySeedInput): StorySeedInput => {
  if (seed.story.required.storyTags.length > 0) return seed;
  const storyTags = inferStoryTags({
    premise: seed.story.required.premise,
    genre: seed.story.required.genre,
    style: seed.story.required.style,
  });
  return { ...seed, story: { ...seed.story, required: { ...seed.story.required, storyTags } } };
};

// ─── Generation boundary ─────────────────────────────────────────────────────

/** Creator-authored Origin provenance, always read from the canonical seed. */
export const createBlueprintOriginSnapshot = (
  seed: StorySeedInput,
): WorldBlueprintOriginSnapshot => ({
  premise: seed.story.required.premise,
  genre: seed.story.required.genre,
  style: seed.story.required.style,
  storyTags: [...seed.story.required.storyTags],
});

export interface WorldBlueprintContext {
  creator?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Generated model output must not supply trusted artifact metadata. */
  preserveSourceMetadata?: boolean;
}

/**
 * A first-pass World Blueprint projected from the seed. One-way and
 * generation-facing only: the Blueprint is generated output and is never
 * stored back inside the Story Seed contract.
 */
export const createBlueprintDraftFromSeed = (
  seed: StorySeedInput,
  context: WorldBlueprintContext = {},
): WorldBlueprint => {
  const { worldIdentity, worldFoundations } = seed.world.optional;
  const mainCharacter = worldFoundations.mainCharacter || {};
  const backgroundProfile = mainCharacter.bio || mainCharacter.startingIdentity || '';
  return {
    blueprintVersion: WORLD_BLUEPRINT_VERSION,
    ...(text(context.creator) ? { creator: text(context.creator) } : {}),
    ...(text(context.status) ? { status: text(context.status) } : {}),
    ...(text(context.createdAt) ? { createdAt: text(context.createdAt) } : {}),
    ...(text(context.updatedAt) ? { updatedAt: text(context.updatedAt) } : {}),
    originSnapshot: createBlueprintOriginSnapshot(seed),
    title: worldIdentity.title || 'Untitled Story',
    // Origin owns the premise. Direction is intentionally projected from the
    // separate ARC field so a draft never disguises the premise as generated
    // blueprint guidance.
    logline: seed.story.optional.additionalStoryDirection || '',
    worldOverview: worldIdentity.worldType || '',
    startingLocation: worldIdentity.startingLocation || '',
    societyStructure: worldIdentity.societyStructure || '',
    powerSystemOutline: worldFoundations.abilities?.startingPowerConcept
      || worldFoundations.powerSystem?.knownRanks
      || '',
    mainCharacter: {
      name: mainCharacter.name || '',
      age: '',
      personality: mainCharacter.personality || '',
      appearance: '',
      backgroundProfile,
    },
    mcProfile: backgroundProfile,
    majorFactions: (worldFoundations.factions || []).map(faction => faction.name),
    initialCharacters: (worldFoundations.additionalCharacters || []).map(character => character.name),
    majorMysteries: [],
    firstArcPromise: seed.story.optional.plotAndTropeSettings.firstMajorConflict || '',
    tropeRules: '',
    styleBible: '',
    destinedEnding: worldFoundations.destinedEnding || '',
    estimatedArcs: 10,
    unresolvedPlotThreads: [],
  };
};

/**
 * Makes generated or previously saved Blueprints safe for the current review.
 * New fields are additive, old flat fields stay intact, and Origin provenance
 * is replaced from the canonical seed whenever that seed is available.
 */
export const normalizeWorldBlueprint = (
  value: unknown,
  seed?: StorySeedInput,
  context: WorldBlueprintContext = {},
): WorldBlueprint => {
  const source = isRecord(value) ? value : {};
  const normalizedSeed = seed ? normalizeStorySeedInput(seed) : createEmptyStorySeedInput();
  const fallback = createBlueprintDraftFromSeed(normalizedSeed, context);
  const sourceOrigin = isRecord(source.originSnapshot) ? source.originSnapshot : {};
  const originSnapshot = seed
    ? createBlueprintOriginSnapshot(normalizedSeed)
    : {
        premise: text(sourceOrigin.premise) || '',
        genre: text(sourceOrigin.genre) || '',
        style: text(sourceOrigin.style) || '',
        storyTags: stringList(sourceOrigin.storyTags),
      };
  const sourceMainCharacter = isRecord(source.mainCharacter) ? source.mainCharacter : {};
  const fallbackMainCharacter = fallback.mainCharacter as WorldBlueprintMainCharacter;
  const readString = (
    record: Record<string, unknown>,
    field: string,
    fallbackValue = '',
  ): string => typeof record[field] === 'string'
    ? record[field].trim()
    : fallbackValue;
  const hasString = (record: Record<string, unknown>, field: string): boolean =>
    typeof record[field] === 'string';
  const legacyProfile = readString(source, 'mcProfile', fallbackMainCharacter.backgroundProfile);
  const mainCharacter: WorldBlueprintMainCharacter = {
    name: readString(sourceMainCharacter, 'name', fallbackMainCharacter.name),
    age: readString(sourceMainCharacter, 'age', fallbackMainCharacter.age),
    personality: readString(sourceMainCharacter, 'personality', fallbackMainCharacter.personality),
    appearance: readString(sourceMainCharacter, 'appearance', fallbackMainCharacter.appearance),
    backgroundProfile: hasString(sourceMainCharacter, 'backgroundProfile')
      ? readString(sourceMainCharacter, 'backgroundProfile')
      : legacyProfile,
  };
  // An explicit empty string is an edit, not a missing value. Only absent or
  // non-string fields receive safe defaults for older Blueprint records.
  const read = (field: string, fallbackValue = ''): string =>
    readString(source, field, fallbackValue);
  const requestedTitle = normalizedSeed.world.optional.worldIdentity.title;
  const preserveSourceMetadata = context.preserveSourceMetadata !== false;
  const sourceMetadata = (field: string): string | undefined =>
    preserveSourceMetadata ? text(source[field]) : undefined;
  const creator = text(context.creator) || sourceMetadata('creator');
  const status = text(context.status) || sourceMetadata('status');
  const createdAt = text(context.createdAt) || sourceMetadata('createdAt');
  const updatedAt = text(context.updatedAt) || sourceMetadata('updatedAt');
  const estimatedArcs = typeof source.estimatedArcs === 'number'
    && Number.isInteger(source.estimatedArcs)
    && source.estimatedArcs > 0
    ? source.estimatedArcs
    : fallback.estimatedArcs;

  return {
    blueprintVersion: sourceMetadata('blueprintVersion') || WORLD_BLUEPRINT_VERSION,
    ...(creator ? { creator } : {}),
    ...(status ? { status } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    originSnapshot,
    title: requestedTitle || read('title', fallback.title),
    logline: read('logline', fallback.logline),
    worldOverview: read('worldOverview', fallback.worldOverview),
    startingLocation: read('startingLocation', fallback.startingLocation),
    societyStructure: read('societyStructure', fallback.societyStructure),
    powerSystemOutline: read('powerSystemOutline', fallback.powerSystemOutline),
    mainCharacter,
    mcProfile: mainCharacter.backgroundProfile,
    majorFactions: Array.isArray(source.majorFactions)
      ? stringList(source.majorFactions)
      : fallback.majorFactions,
    initialCharacters: Array.isArray(source.initialCharacters)
      ? stringList(source.initialCharacters)
      : fallback.initialCharacters,
    majorMysteries: Array.isArray(source.majorMysteries)
      ? stringList(source.majorMysteries)
      : fallback.majorMysteries,
    firstArcPromise: read('firstArcPromise', fallback.firstArcPromise),
    tropeRules: read('tropeRules', fallback.tropeRules),
    styleBible: read('styleBible', fallback.styleBible),
    destinedEnding: read('destinedEnding', fallback.destinedEnding || ''),
    estimatedArcs,
    unresolvedPlotThreads: Array.isArray(source.unresolvedPlotThreads)
      ? stringList(source.unresolvedPlotThreads)
      : fallback.unresolvedPlotThreads,
  };
};

const withAuthoritativeDetails = (
  generated: string,
  details: Array<[label: string, value: string | undefined]>,
): string => {
  const explicit = details
    .map(([label, value]) => [label, text(value)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  const missing = explicit.filter(([, value]) =>
    !generated.toLocaleLowerCase().includes(value.toLocaleLowerCase()));
  if (missing.length === 0) return generated;
  const authoritative = missing.map(([label, value]) => `${label}: ${value}`).join('\n');
  return [authoritative, generated].filter(Boolean).join('\n\n');
};

const characterBlueprintEntry = (character: StorySeedCharacter): string => {
  const details = [
    character.aliases?.length ? `aliases: ${character.aliases.join(', ')}` : '',
    character.age ? `age: ${character.age}` : '',
    character.skinTone ? `skin tone: ${character.skinTone}` : '',
    character.eyeColor ? `eyes: ${character.eyeColor}` : '',
    character.role ? `role: ${character.role}` : '',
    character.connectionToMC ? `connection to main character: ${character.connectionToMC}` : '',
    character.powerType ? `power: ${character.powerType}` : '',
    character.rankLevel ? `rank: ${character.rankLevel}` : '',
    character.bio ? `profile: ${character.bio}` : '',
  ].filter(Boolean);
  return details.length > 0 ? `${character.name} — ${details.join('; ')}` : character.name;
};

const factionBlueprintEntry = (faction: StorySeedFaction): string => {
  const details = [
    faction.aliases?.length ? `aliases: ${faction.aliases.join(', ')}` : '',
    faction.role ? `role: ${faction.role}` : '',
    faction.powerLevel ? `power level: ${faction.powerLevel}` : '',
    faction.alignment ? `alignment: ${faction.alignment}` : '',
    faction.connectionToMC ? `connection to main character: ${faction.connectionToMC}` : '',
    faction.description ? `profile: ${faction.description}` : '',
  ].filter(Boolean);
  return details.length > 0 ? `${faction.name} — ${details.join('; ')}` : faction.name;
};

const mergeAuthoritativeEntries = <T extends { name: string }>(
  generated: string[],
  authored: T[],
  describe: (entry: T) => string,
): string[] => {
  const validAuthored = authored.filter(entry => Boolean(text(entry.name)));
  const normalizeEntry = (entry: string) => entry
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const authoredNames = validAuthored.map(entry => normalizeEntry(entry.name));
  return [
    ...validAuthored.map(describe),
    ...generated.filter(entry => {
      const candidate = ` ${normalizeEntry(entry)} `;
      return !authoredNames.some(name => candidate.includes(` ${name} `));
    }),
  ];
};

/**
 * Finalizes provider output without giving the provider authority over any
 * creator-authored Story Seed value. Empty Blueprint fields come from the
 * model; explicit seed values remain exact or are retained as labeled canon.
 */
export const finalizeGeneratedWorldBlueprint = (
  value: unknown,
  seed: StorySeedInput,
): WorldBlueprint => {
  const storySeed = normalizeStorySeedInput(seed);
  const generated = normalizeWorldBlueprint(value, storySeed, {
    preserveSourceMetadata: false,
  });
  const { worldIdentity, worldFoundations } = storySeed.world.optional;
  const mainCharacter = worldFoundations.mainCharacter || {};
  const generatedMainCharacter = generated.mainCharacter as WorldBlueprintMainCharacter;
  const backgroundProfile = withAuthoritativeDetails(
    generatedMainCharacter.backgroundProfile,
    [
      ['Starting identity', mainCharacter.startingIdentity],
      ['Main flaw', mainCharacter.mainFlaw],
      ['Secret advantage', mainCharacter.secretAdvantage],
      ['Starting weakness', mainCharacter.startingWeakness],
      ['Moral alignment', mainCharacter.moralAlignment],
      ['Creator profile', mainCharacter.bio],
    ],
  );
  const powerSystemOutline = withAuthoritativeDetails(
    generated.powerSystemOutline,
    [
      ['Starting power concept', worldFoundations.abilities?.startingPowerConcept],
      ['Unique path', worldFoundations.abilities?.uniquePath],
      ['Power flavor', worldFoundations.powerSystem?.flavor],
      ['Known ranks', worldFoundations.powerSystem?.knownRanks],
    ],
  );

  return {
    ...generated,
    blueprintVersion: WORLD_BLUEPRINT_VERSION,
    originSnapshot: createBlueprintOriginSnapshot(storySeed),
    title: text(worldIdentity.title) || generated.title,
    logline: text(storySeed.story.optional.additionalStoryDirection) || generated.logline,
    worldOverview: text(worldIdentity.worldType) || generated.worldOverview,
    startingLocation: text(worldIdentity.startingLocation) || generated.startingLocation,
    societyStructure: text(worldIdentity.societyStructure) || generated.societyStructure,
    powerSystemOutline,
    mainCharacter: {
      ...generatedMainCharacter,
      name: text(mainCharacter.name) || generatedMainCharacter.name,
      personality: text(mainCharacter.personality) || generatedMainCharacter.personality,
      backgroundProfile,
    },
    mcProfile: backgroundProfile,
    majorFactions: mergeAuthoritativeEntries(
      generated.majorFactions,
      worldFoundations.factions || [],
      factionBlueprintEntry,
    ),
    initialCharacters: mergeAuthoritativeEntries(
      generated.initialCharacters,
      worldFoundations.additionalCharacters || [],
      characterBlueprintEntry,
    ),
    firstArcPromise: text(storySeed.story.optional.plotAndTropeSettings.firstMajorConflict)
      || generated.firstArcPromise,
    destinedEnding: text(worldFoundations.destinedEnding) || generated.destinedEnding,
  };
};

export const buildBlueprintGenerationPayload = (seed: StorySeedInput): BlueprintGenerationPayload => {
  const storySeed = applyInferredStoryTags(normalizeStorySeedInput(seed));
  assertValidStorySeedInput(storySeed);
  return { storySeed };
};

export const buildInitialStoryGenerationPayload = (
  seed: StorySeedInput,
  administrative: StoryAdministrativeMetadata,
  blueprint: WorldBlueprint,
  chapterCount: number,
): InitialStoryGenerationPayload => {
  const storySeed = applyInferredStoryTags(normalizeStorySeedInput(seed));
  assertValidStorySeedInput(storySeed);
  assertValidStoryAdministrativeMetadata(administrative);
  return { storySeed, administrative, blueprint, chapterCount };
};
