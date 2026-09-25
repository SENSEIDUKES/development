/**
 * The canonical creator-controlled Story Seed contract.
 *
 * ```text
 * STORY SEED
 * ├── creator
 * ├── story
 * │   ├── required   storyTags · premise · genre · style
 * │   └── optional   intendedForMatureAudiences · fateSurvival · funSettings · hardPins · activeArcGoal · makeItWorkInstruction
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

import { ARC_LENGTH, MAX_ROADMAP_ARCS, arcsCanBeAddedBeforeFinal, createInitialArcPlan, validateArcPlan, validateArcRoadmap, type ArcGoal, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import { normalizeFunSettings, validateHardPinInputs, type FunSettings, type HardPinInput } from '../../../narrative/storyDirection';
export { normalizeFunSettings, HARD_PIN_LIMIT, HARD_PIN_TEXT_LIMIT, validateHardPinInputs, type FunSettings, type FunSettingLevel, type HardPinInput } from '../../../narrative/storyDirection';
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
export const STORY_SEED_SCHEMA_VERSION = 5 as const;
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
export type StorySeedFateVisibility = 'full' | 'partial' | 'none';
export type StorySeedSurvivalPressure = 'heaven' | 'immortal' | 'mortal';

export interface StorySeedFateSurvivalSettings {
  enabled: boolean;
  visibility: StorySeedFateVisibility;
  pressure: StorySeedSurvivalPressure;
}

export interface StorySeedStoryOptional {
  activeArcGoal?: ArcGoal;
  hardPins?: HardPinInput[];
  /** Story metadata only; this does not request explicit generated content. */
  intendedForMatureAudiences: boolean;
  fateSurvival: StorySeedFateSurvivalSettings;
  funSettings: FunSettings;
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
  age?: string;
  appearance?: string;
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
  mainOpposition?: string;
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
  /**
   * The number of arcs the author asked the Blueprint to plan. Absent, the
   * model chooses a realistic length for the story.
   */
  arcCount?: number;
}

/** Names an arc extension request on the Blueprint endpoint. */
export const ARC_ROADMAP_EXTENSION_OPERATION = 'extend-arc-roadmap' as const;

/**
 * Asks for only the arcs an author is adding to a reviewed Blueprint. The
 * saved roadmap travels as context and is never re-planned; the new arcs go in
 * before its final arc (see `insertArcsBeforeFinal`).
 */
export interface ArcRoadmapExtensionPayload {
  operation: typeof ARC_ROADMAP_EXTENSION_OPERATION;
  storySeed: StorySeedInput;
  blueprint: WorldBlueprint;
  /** The roadmap's length once the new arcs are added. */
  arcCount: number;
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


const normalizeFateVisibility = (value: unknown): StorySeedFateVisibility => {
  const normalized = text(value)?.toLowerCase();
  return normalized === 'full' || normalized === 'none' ? normalized : 'partial';
};

const normalizeSurvivalPressure = (value: unknown): StorySeedSurvivalPressure => {
  const normalized = text(value)?.toLowerCase();
  return normalized === 'heaven' || normalized === 'mortal' ? normalized : 'immortal';
};

const WORLD_IDENTITY_FIELDS = ['title', 'worldType', 'societyStructure', 'startingLocation'] as const;
const MAIN_CHARACTER_FIELDS = [
  'name', 'age', 'appearance', 'startingIdentity', 'personality', 'mainFlaw',
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
  const normalized: StorySeedStoryOptional = {
    intendedForMatureAudiences: source.intendedForMatureAudiences === true,
    fateSurvival: {
      enabled: isRecord(source.fateSurvival) ? source.fateSurvival.enabled === true : false,
      visibility: normalizeFateVisibility(isRecord(source.fateSurvival) ? source.fateSurvival.visibility : undefined),
      pressure: normalizeSurvivalPressure(isRecord(source.fateSurvival) ? source.fateSurvival.pressure : undefined),
    },
    funSettings: normalizeFunSettings(source.funSettings),
    hardPins: validateHardPinInputs(source.hardPins ?? []),
  };
  if (source.activeArcGoal !== undefined) normalized.activeArcGoal = createInitialArcPlan(source.activeArcGoal as ArcGoal).goals[0];
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

  const mainOpposition = text(source.mainOpposition);
  if (mainOpposition) normalized.mainOpposition = mainOpposition;
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
      funSettings: {
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

  if (isRecord(value.story) && isRecord(value.story.optional)) {
    try { validateHardPinInputs(value.story.optional.hardPins ?? []); }
    catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid Hard Pins.'); }
    if (value.story.optional.activeArcGoal !== undefined) {
      try { createInitialArcPlan(value.story.optional.activeArcGoal as ArcGoal); }
      catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid Active Arc Goal.'); }
    }
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
    if (!text(required.premise)) errors.push('Synopsis is required.');
    if (typeof required.premise === 'string' && required.premise.length > STORY_PREMISE_MAX_LENGTH) {
      errors.push(`Synopsis cannot exceed ${STORY_PREMISE_MAX_LENGTH.toLocaleString('en-US')} characters.`);
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
/** A draft Blueprint's placeholder title; never promoted into the Seed as a real title. */
const UNTITLED_BLUEPRINT_TITLE = 'Untitled Story';

/**
 * Reads a saved roadmap. Blueprints saved before roadmaps held one Arc 1
 * `arcPlan`; it is read as a one-arc roadmap rather than discarded.
 */
const readArcRoadmap = (source: Record<string, unknown>): ArcPlan[] | undefined => {
  if (Array.isArray(source.arcPlans) && source.arcPlans.length) return validateArcRoadmap(source.arcPlans);
  return source.arcPlan ? [validateArcPlan(source.arcPlan)] : undefined;
};

/**
 * Keeps the roadmap's opening goal in step with the Seed's Active Arc Goal,
 * the one arc-goal value the Seed owns. Allocations, identities and every other
 * goal and arc stay exactly as the roadmap saved them.
 */
export const alignArcRoadmapWithSeed = (roadmap: ArcPlan[] | undefined, seed: StorySeedInput): ArcPlan[] | undefined => {
  const seedGoal = seed.story.optional.activeArcGoal;
  if (!roadmap?.length) return seedGoal ? [createInitialArcPlan(seedGoal)] : undefined;
  if (!seedGoal || roadmap[0].goals[0]?.text === seedGoal.text) return roadmap;
  const [first, ...rest] = roadmap;
  return [{ ...first, goals: first.goals.map((goal, index) => index === 0 ? { ...goal, text: seedGoal.text } : goal) }, ...rest];
};

/**
 * The Manifest gate for the arc roadmap: a validated plan for every arc the
 * Blueprint counts, with no arc left for automatic planning.
 */
export const validateBlueprintArcRoadmap = (blueprint: Pick<WorldBlueprint, 'arcPlans' | 'estimatedArcs'>): ArcPlan[] => {
  if (!blueprint.arcPlans?.length) {
    throw new Error('Generate the Blueprint to plan every arc before beginning the story.');
  }
  if (blueprint.arcPlans.length !== blueprint.estimatedArcs) {
    throw new Error(`The Blueprint plans ${blueprint.arcPlans.length} of its ${blueprint.estimatedArcs} arcs. Regenerate the Blueprint to plan every arc before beginning the story.`);
  }
  return validateArcRoadmap(blueprint.arcPlans, blueprint.estimatedArcs);
};

/** Human-readable roadmap problem for the review, or undefined when ready. */
export const describeBlueprintArcRoadmapProblem = (blueprint: Pick<WorldBlueprint, 'arcPlans' | 'estimatedArcs'>): string | undefined => {
  try { validateBlueprintArcRoadmap(blueprint); return undefined; }
  catch (error) { return error instanceof Error ? error.message : 'The arc roadmap is not ready.'; }
};

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
    title: worldIdentity.title || UNTITLED_BLUEPRINT_TITLE,
    // Generated summaries stay blank until Blueprint generation.
    // The initial Active Arc Goal has its own canonical contract.
    logline: '',
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
    arcPlans: alignArcRoadmapWithSeed(undefined, seed),
    hardPins: validateHardPinInputs(seed.story.optional.hardPins ?? []),
    funSettings: normalizeFunSettings(seed.story.optional.funSettings),
    firstArcPromise: '',
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
    name: text(normalizedSeed.world.optional.worldFoundations.mainCharacter?.name)
      || readString(sourceMainCharacter, 'name', fallbackMainCharacter.name),
    age: text(normalizedSeed.world.optional.worldFoundations.mainCharacter?.age)
      || readString(sourceMainCharacter, 'age', fallbackMainCharacter.age),
    personality: text(normalizedSeed.world.optional.worldFoundations.mainCharacter?.personality)
      || readString(sourceMainCharacter, 'personality', fallbackMainCharacter.personality),
    appearance: text(normalizedSeed.world.optional.worldFoundations.mainCharacter?.appearance)
      || readString(sourceMainCharacter, 'appearance', fallbackMainCharacter.appearance),
    backgroundProfile: hasString(sourceMainCharacter, 'backgroundProfile')
      ? readString(sourceMainCharacter, 'backgroundProfile')
      : legacyProfile,
  };
  // An explicit empty string is an edit, not a missing value. Only absent or
  // non-string fields receive safe defaults for older Blueprint records.
  const read = (field: string, fallbackValue = ''): string =>
    readString(source, field, fallbackValue);
  // Values the Seed and the Blueprint review both edit have one owner: an
  // authored Seed value is authoritative, and review edits write through to it.
  const seedIdentity = normalizedSeed.world.optional.worldIdentity;
  const seedFoundations = normalizedSeed.world.optional.worldFoundations;
  const requestedTitle = seedIdentity.title;
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
    worldOverview: text(seedIdentity.worldType) || read('worldOverview', fallback.worldOverview),
    startingLocation: text(seedIdentity.startingLocation) || read('startingLocation', fallback.startingLocation),
    societyStructure: text(seedIdentity.societyStructure) || read('societyStructure', fallback.societyStructure),
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
    arcPlans: alignArcRoadmapWithSeed(readArcRoadmap(source), normalizedSeed),
    hardPins: validateHardPinInputs(seed ? normalizedSeed.story.optional.hardPins ?? [] : source.hardPins ?? []),
    funSettings: normalizeFunSettings(seed ? normalizedSeed.story.optional.funSettings : source.funSettings),
    firstArcPromise: read('firstArcPromise', fallback.firstArcPromise),
    tropeRules: read('tropeRules', fallback.tropeRules),
    styleBible: read('styleBible', fallback.styleBible),
    destinedEnding: text(seedFoundations.destinedEnding) || read('destinedEnding', fallback.destinedEnding || ''),
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

const mainCharacterAuthoredDetails = (
  mainCharacter: StorySeedMainCharacter,
): Array<[label: string, value: string | undefined]> => [
  ['Starting identity', mainCharacter.startingIdentity],
  ['Main flaw', mainCharacter.mainFlaw],
  ['Secret advantage', mainCharacter.secretAdvantage],
  ['Starting weakness', mainCharacter.startingWeakness],
  ['Moral alignment', mainCharacter.moralAlignment],
  ['Creator profile', mainCharacter.bio],
];

const powerSystemAuthoredDetails = (
  worldFoundations: StorySeedWorldFoundations,
): Array<[label: string, value: string | undefined]> => [
  ['Starting power concept', worldFoundations.abilities?.startingPowerConcept],
  ['Unique path', worldFoundations.abilities?.uniquePath],
  ['Power flavor', worldFoundations.powerSystem?.flavor],
  ['Known ranks', worldFoundations.powerSystem?.knownRanks],
];

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

/** Blueprint list entries that do not name a creator-authored entity. */
const entriesWithoutAuthoredNames = (
  generated: string[],
  authored: Array<{ name: string }>,
): string[] => {
  const normalizeEntry = (entry: string) => entry
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const authoredNames = authored.map(entry => normalizeEntry(entry.name)).filter(Boolean);
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const authoredNamePattern = authoredNames.length > 0
    ? new RegExp(authoredNames.map(name => ` ${escapeRegExp(name)} `).join('|'))
    : undefined;
  return generated.filter(entry => {
    const candidate = ` ${normalizeEntry(entry)} `;
    return !(authoredNamePattern?.test(candidate) ?? false);
  });
};

const mergeAuthoritativeEntries = <T extends { name: string }>(
  generated: string[],
  authored: T[],
  describe: (entry: T) => string,
): string[] => {
  const validAuthored = authored.filter(entry => Boolean(text(entry.name)));
  return [
    ...validAuthored.map(describe),
    ...entriesWithoutAuthoredNames(generated, validAuthored),
  ];
};

export interface StorySeedWorldEntity {
  name: string;
  aliases?: string[];
  /** One self-contained description; the only place this entity's details travel. */
  description: string;
}

/** The reviewed world canon a Story Seed hands to generation, one value per concept. */
export interface StorySeedWorldCanon {
  mainCharacter?: StorySeedWorldEntity;
  characters: StorySeedWorldEntity[];
  factions: StorySeedWorldEntity[];
  worldOverview?: string;
  societyStructure?: string;
  powerSystem?: string;
}

const labeledDetails = (entries: Array<[label: string, value: string | undefined]>): string =>
  entries.flatMap(([label, value]) => text(value) ? [`${label}: ${text(value)}`] : []).join('\n');

// Blueprint list convention: `Name (role)`, `Name — details`, `Name: details`, or `Name - details`.
const parseBlueprintEntry = (entry: string): { name: string; role?: string; details?: string } => {
  const match = entry.trim().match(/^(.+?)(?:\s+\(([^)]*)\))?(?:\s*(?:—|–|:|\s-)\s*(.*))?$/su);
  const name = (match?.[1] ?? entry).trim();
  const role = text(match?.[2]);
  const details = text(match?.[3]);
  return { name, ...(role ? { role } : {}), ...(details ? { details } : {}) };
};

const uniqueEntityId = (prefix: string, name: string, taken: Set<string>): string => {
  const slug = name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'entry';
  let id = `${prefix}-${slug}`;
  for (let index = 2; taken.has(id); index += 1) id = `${prefix}-${slug}-${index}`;
  taken.add(id);
  return id;
};

/**
 * Copies Blueprint values into the Seed wherever the Seed owns that concept
 * and has no value yet: generated world identity, ending, initial goal,
 * main-character basics, and every side character or faction the Seed does
 * not already name. The Seed never loses a value it already has.
 */
export const promoteBlueprintIntoSeed = (seed: StorySeedInput, blueprint: WorldBlueprint): StorySeedInput => {
  const source = normalizeStorySeedInput(seed);
  const identity = source.world.optional.worldIdentity;
  const foundations = source.world.optional.worldFoundations;
  const mainCharacter = foundations.mainCharacter || {};
  const reviewed = blueprint.mainCharacter;
  const fill = (current: string | undefined, candidate: string | undefined) => text(current) || text(candidate);
  const mainName = fill(mainCharacter.name, reviewed?.name);

  const characters = [...(foundations.additionalCharacters || [])];
  const characterIds = new Set(characters.map(entry => entry.id));
  for (const line of entriesWithoutAuthoredNames((blueprint.initialCharacters || []).filter(entry => text(entry)), characters)) {
    const parsed = parseBlueprintEntry(line);
    if (!parsed.name || parsed.name.toLocaleLowerCase() === mainName?.toLocaleLowerCase()) continue;
    characters.push({
      id: uniqueEntityId('blueprint-character', parsed.name, characterIds), name: parsed.name,
      ...(parsed.role ? { role: parsed.role } : {}), ...(parsed.details ? { bio: parsed.details } : {}),
    });
  }
  const factions = [...(foundations.factions || [])];
  const factionIds = new Set(factions.map(entry => entry.id));
  for (const line of entriesWithoutAuthoredNames((blueprint.majorFactions || []).filter(entry => text(entry)), factions)) {
    const parsed = parseBlueprintEntry(line);
    if (!parsed.name) continue;
    factions.push({
      id: uniqueEntityId('blueprint-faction', parsed.name, factionIds), name: parsed.name,
      ...(parsed.role ? { role: parsed.role } : {}), ...(parsed.details ? { description: parsed.details } : {}),
    });
  }
  // The roadmap's opening goal fills an empty Seed Active Arc Goal. The Seed
  // keeps it as the creator's statement of intent; its real chapter
  // allocation lives in the Blueprint roadmap.
  const openingGoal = blueprint.arcPlans?.[0]?.goals[0];
  const suggestedGoal = openingGoal ? { id: openingGoal.id, text: openingGoal.text, chapters: ARC_LENGTH } : undefined;

  return normalizeStorySeedInput({
    ...source,
    story: { ...source.story, optional: {
      ...source.story.optional,
      ...(!source.story.optional.activeArcGoal && suggestedGoal ? { activeArcGoal: suggestedGoal } : {}),
    } },
    world: { ...source.world, optional: {
      worldIdentity: {
        ...identity,
        title: fill(identity.title, blueprint.title === UNTITLED_BLUEPRINT_TITLE ? undefined : blueprint.title),
        worldType: fill(identity.worldType, blueprint.worldOverview),
        startingLocation: fill(identity.startingLocation, blueprint.startingLocation),
        societyStructure: fill(identity.societyStructure, blueprint.societyStructure),
      },
      worldFoundations: {
        ...foundations,
        mainCharacter: {
          ...mainCharacter,
          name: mainName,
          age: fill(mainCharacter.age, reviewed?.age),
          appearance: fill(mainCharacter.appearance, reviewed?.appearance),
          personality: fill(mainCharacter.personality, reviewed?.personality),
        },
        additionalCharacters: characters,
        factions,
        destinedEnding: fill(foundations.destinedEnding, blueprint.destinedEnding),
      },
    } },
  });
};

/**
 * Rewrites every Seed-owned Blueprint field from the Seed, exactly. The
 * Blueprint keeps only what the Seed has no field for: background and power
 * outline prose, style bible, arc estimate, mysteries, threads, metadata.
 */
export const mirrorSeedIntoBlueprint = (blueprint: WorldBlueprint, seed: StorySeedInput): WorldBlueprint => {
  const { worldIdentity, worldFoundations } = seed.world.optional;
  const mainCharacter = worldFoundations.mainCharacter || {};
  const backgroundProfile = blueprint.mainCharacter?.backgroundProfile ?? blueprint.mcProfile ?? '';
  return {
    ...blueprint,
    originSnapshot: createBlueprintOriginSnapshot(seed),
    title: text(worldIdentity.title) || blueprint.title,
    worldOverview: text(worldIdentity.worldType) || '',
    startingLocation: text(worldIdentity.startingLocation) || '',
    societyStructure: text(worldIdentity.societyStructure) || '',
    mainCharacter: {
      name: text(mainCharacter.name) || '',
      age: text(mainCharacter.age) || '',
      appearance: text(mainCharacter.appearance) || '',
      personality: text(mainCharacter.personality) || '',
      backgroundProfile,
    },
    mcProfile: backgroundProfile,
    initialCharacters: (worldFoundations.additionalCharacters || []).filter(entry => text(entry.name)).map(characterBlueprintEntry),
    majorFactions: (worldFoundations.factions || []).filter(entry => text(entry.name)).map(factionBlueprintEntry),
    arcPlans: alignArcRoadmapWithSeed(blueprint.arcPlans, seed),
    hardPins: validateHardPinInputs(seed.story.optional.hardPins ?? []),
    funSettings: normalizeFunSettings(seed.story.optional.funSettings),
    destinedEnding: text(worldFoundations.destinedEnding) || '',
  };
};

/**
 * The single Seed <-> Blueprint boundary for a stored, imported, or newly
 * generated pair: Blueprint values the Seed can hold are copied into the
 * Seed, then the Blueprint mirrors the Seed. Every reviewed value lives in
 * the Seed, and no Blueprint copy can disagree with it.
 */
export const reconcileStorySeedBlueprint = (
  seed: StorySeedInput,
  blueprint: unknown,
  context: WorldBlueprintContext = {},
): { seed: StorySeedInput; blueprint: WorldBlueprint } => {
  const normalizedSeed = normalizeStorySeedInput(seed);
  const promotedSeed = promoteBlueprintIntoSeed(normalizedSeed, normalizeWorldBlueprint(blueprint, normalizedSeed, context));
  return {
    seed: promotedSeed,
    blueprint: mirrorSeedIntoBlueprint(normalizeWorldBlueprint(blueprint, promotedSeed, context), promotedSeed),
  };
};

/**
 * Resolves a reconciled Story Seed and Blueprint into one value per concept
 * for generation. Every structured value comes from the Seed; the Blueprint
 * adds only prose the Seed has no field for, never a second copy of a fact.
 */
export const resolveStorySeedWorldCanon = (
  seed: StorySeedInput,
  blueprint?: WorldBlueprint,
): StorySeedWorldCanon => {
  const { worldIdentity, worldFoundations } = seed.world.optional;
  const authoredMain = worldFoundations.mainCharacter || {};
  const mainName = text(authoredMain.name);
  const structuredMain = labeledDetails([
    ['Age', authoredMain.age],
    ['Appearance', authoredMain.appearance],
    ['Personality', authoredMain.personality],
    ...mainCharacterAuthoredDetails(authoredMain),
  ]);
  const background = text(blueprint?.mainCharacter?.backgroundProfile) || text(blueprint?.mcProfile);
  const mainDescription = [structuredMain, background ? `Background: ${background}` : ''].filter(Boolean).join('\n');
  const authoredEntity = (entry: StorySeedCharacter | StorySeedFaction, description: string): StorySeedWorldEntity => ({
    name: entry.name.trim(),
    ...(entry.aliases?.length ? { aliases: [...entry.aliases] } : {}),
    description,
  });
  const worldOverview = text(worldIdentity.worldType);
  const societyStructure = text(worldIdentity.societyStructure);
  const powerSystem = text(withAuthoritativeDetails(
    blueprint?.powerSystemOutline || '',
    powerSystemAuthoredDetails(worldFoundations),
  ));

  return {
    ...(mainName ? { mainCharacter: { name: mainName, description: mainDescription || mainName } } : {}),
    // Aliases travel structurally, so descriptions do not repeat them.
    characters: (worldFoundations.additionalCharacters || []).filter(entry => text(entry.name))
      .map(entry => authoredEntity(entry, characterBlueprintEntry({ ...entry, aliases: undefined }))),
    factions: (worldFoundations.factions || []).filter(entry => text(entry.name))
      .map(entry => authoredEntity(entry, factionBlueprintEntry({ ...entry, aliases: undefined }))),
    ...(worldOverview ? { worldOverview } : {}),
    ...(societyStructure ? { societyStructure } : {}),
    ...(powerSystem ? { powerSystem } : {}),
  };
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
  // Structured Seed details stay in their Seed fields; Blueprint prose never
  // carries a second, separately editable copy of them.
  const backgroundProfile = generatedMainCharacter.backgroundProfile;

  return {
    ...generated,
    blueprintVersion: WORLD_BLUEPRINT_VERSION,
    originSnapshot: createBlueprintOriginSnapshot(storySeed),
    title: text(worldIdentity.title) || generated.title,
    logline: generated.logline,
    worldOverview: text(worldIdentity.worldType) || generated.worldOverview,
    startingLocation: text(worldIdentity.startingLocation) || generated.startingLocation,
    societyStructure: text(worldIdentity.societyStructure) || generated.societyStructure,
    powerSystemOutline: generated.powerSystemOutline,
    mainCharacter: {
      ...generatedMainCharacter,
      name: text(mainCharacter.name) || generatedMainCharacter.name,
      age: text(mainCharacter.age) || generatedMainCharacter.age,
      appearance: text(mainCharacter.appearance) || generatedMainCharacter.appearance,
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
    firstArcPromise: generated.firstArcPromise,
    destinedEnding: text(worldFoundations.destinedEnding) || generated.destinedEnding,
  };
};

/** A requested arc count is a whole number of arcs a roadmap can hold. */
export const validateRequestedArcCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_ROADMAP_ARCS) {
    throw new Error(`The arc count must be a whole number from 1 to ${MAX_ROADMAP_ARCS}.`);
  }
  return value;
};

export const buildBlueprintGenerationPayload = (
  seed: StorySeedInput,
  options: { arcCount?: number } = {},
): BlueprintGenerationPayload => {
  const storySeed = applyInferredStoryTags(normalizeStorySeedInput(seed));
  assertValidStorySeedInput(storySeed);
  return { storySeed, ...(options.arcCount === undefined ? {} : { arcCount: validateRequestedArcCount(options.arcCount) }) };
};

/**
 * Validates a request to add arcs to a reviewed Blueprint: a valid Seed, a
 * complete saved roadmap with a place before its final arc, and a longer
 * target length.
 */
export const buildArcRoadmapExtensionPayload = (
  seed: StorySeedInput,
  blueprint: WorldBlueprint,
  arcCount: number,
): ArcRoadmapExtensionPayload => {
  const storySeed = applyInferredStoryTags(normalizeStorySeedInput(seed));
  assertValidStorySeedInput(storySeed);
  const arcPlans = validateBlueprintArcRoadmap(blueprint);
  if (!arcsCanBeAddedBeforeFinal(arcPlans)) {
    throw new Error('This roadmap plans the whole story as one arc, which is both its opening and its final arc. Regenerate the Blueprint with more arcs instead.');
  }
  const target = validateRequestedArcCount(arcCount);
  if (target <= arcPlans.length) {
    throw new Error(`The roadmap already plans ${arcPlans.length} ${arcPlans.length === 1 ? 'arc' : 'arcs'}. Choose a larger arc count to add arcs, or regenerate the Blueprint to plan fewer.`);
  }
  return { operation: ARC_ROADMAP_EXTENSION_OPERATION, storySeed, blueprint: { ...blueprint, arcPlans }, arcCount: target };
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
  const arcPlans = validateBlueprintArcRoadmap(blueprint);
  return { storySeed, administrative, blueprint: { ...blueprint, arcPlans }, chapterCount };
};
