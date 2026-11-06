/**
 * The canonical creator-controlled Story Seed contract.
 *
 * ```text
 * STORY SEED
 * ├── creator
 * ├── story
 * │   ├── required   storyTags · premise · genre · style
 * │   └── optional   intendedForMatureAudiences · fateSurvival · funSettings · hardPins · arcOneGoals · arcLookahead · makeItWorkInstruction
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
 */

import { ARC_LENGTH, ARC_LOOKAHEAD_TEXT_LIMIT, MAX_ARC_GOALS, MAX_ROADMAP_ARCS, STORY_LENGTH_ARCS, arcLookaheadFromPlans, createInitialArcPlan, normalizeArcLookahead, validateArcPlan, type ArcGoal, type ArcLookaheadEntry, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import { normalizeFunSettings, validateHardPinInputs, type FunSettings, type HardPinInput } from '../../../narrative/storyDirection';
import { worldCardKind, type WorldCardKindId } from '../../../narrative/worldRecord';
import { isChapterWritingStyle, type ChapterWritingStyle } from '../../../narrative/readingMode';
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
export type StorySeedSurvivalPressure = 'heaven' | 'immortal' | 'mortal';

/**
 * The novel's Fate settings. `enabled` chooses Fate Survival (the reader
 * directs every chapter and the Destined Ending is not guaranteed) instead of
 * Regular Reader mode; it is fixed once the novel begins. `pressure` is the
 * story's Fate Pressure tier, which shapes automatic Rhythm.
 */
export interface StorySeedFateSurvivalSettings {
  enabled: boolean;
  pressure: StorySeedSurvivalPressure;
}

/**
 * One of Arc 1's goals as the creator wrote it on the ARC page. The chapters it
 * takes are optional: the Blueprint gives the rest, so Arc 1 totals its
 * chapters.
 */
export interface StorySeedArcGoal {
  text: string;
  chapters?: number;
}

export interface StorySeedStoryOptional {
  /**
   * Arc 1's goals, in order, as the creator wrote them (SENSEI, 2026-11-06):
   * the first is what is happening when Chapter 1 opens. The Blueprint keeps
   * them word for word and plans any the creator left out. A Seed saved before
   * held only the first, as `activeArcGoal`, which is read as this list's first.
   */
  arcOneGoals?: StorySeedArcGoal[];
  /**
   * Where Arc 2 and Arc 3 head, one line each, as the creator wrote them. The
   * Blueprint keeps them word for word and writes any the creator left out.
   */
  arcLookahead?: ArcLookaheadEntry[];
  /**
   * The Story Length: how many arcs of 100 chapters the story takes to reach
   * its Destined Ending, as the creator chose it on the ARC page. Blueprint
   * generation plans for exactly this length, and the Blueprint's length
   * follows it. Absent, the Blueprint suggests a length and keeps it as its
   * own; a blank Story Length is never filled from it.
   */
  arcCount?: number;
  hardPins?: HardPinInput[];
  /**
   * Where this seed began, when it did not begin blank: a Story Spark planted
   * it. Provenance only — a host's Story Bank uses it to keep sparks apart
   * from seeds the writer built; nothing in a chapter or Blueprint reads it.
   */
  startedFrom?: 'story-spark';
  /** Story metadata only; this does not request explicit generated content. */
  intendedForMatureAudiences: boolean;
  fateSurvival: StorySeedFateSurvivalSettings;
  /**
   * The Reading Mode stories from this seed start with, chosen in Story Seed
   * Settings. A new seed takes the account's default; a saved seed keeps its
   * own. Absent means Standard. It is a Story Setting, never world content, so
   * it is left out of every Blueprint request.
   */
  chapterWritingStyle?: ChapterWritingStyle;
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

/**
 * The novel's name. What kind of world it is and who rules it live on the one
 * World rules card, and where the story opens is its first Place (SENSEI,
 * 2026-11-06); a Seed saved before then has them lifted onto the card when read.
 */
export interface StorySeedWorldIdentity {
  title?: string;
}

/**
 * A Character card as the world stands at Chapter 0. Its slots are the Codex
 * character card's slots (`WORLD_CARD_KINDS`), so what the Seed holds is what
 * the Codex shows. Every one is optional; the World Blueprint fills the blanks
 * before Chapter 1.
 */
export interface StorySeedCharacter {
  id: string;
  name: string;
  aliases?: string[];
  bio?: string;
  role?: string;
  gender?: string;
  age?: string;
  /** How they look, in one line: the look an artist draws them from. */
  appearance?: string;
  skinTone?: string;
  eyeColor?: string;
  species?: string;
  /** The place they are in when the story opens. */
  location?: string;
  powerType?: string;
  rankLevel?: string;
  /** The things they already have, by name. */
  holds?: string;
  /** The abilities they already know, by name. */
  knows?: string;
  status?: string;
  goals?: string;
  connectionToMC?: string;
  ties?: string;
  belongsTo?: string;
  voice?: string;
}

export interface StorySeedFaction {
  id: string;
  name: string;
  aliases?: string[];
  factionKind?: string;
  role?: string;
  appearance?: string;
  seat?: string;
  leader?: string;
  powerLevel?: string;
  standing?: string;
  alignment?: string;
  ties?: string;
  connectionToMC?: string;
  description?: string;
}

/** A Thing card: what already exists, who holds it, and where it lies. */
export interface StorySeedThing {
  id: string;
  name: string;
  appearance?: string;
  count?: string;
  holder?: string;
  location?: string;
  status?: string;
}

/** An Ability card: a technique the world already has, and how it looks when used. */
export interface StorySeedAbilityCard {
  id: string;
  name: string;
  appearance?: string;
  ladder?: string;
}

/** A Place card: somewhere the world already has, so the record knows where everyone is. */
export interface StorySeedPlace {
  id: string;
  name: string;
  appearance?: string;
  within?: string;
  heldBy?: string;
  condition?: string;
}

/** A Species card: the Bestiary's creatures, natural to the world. */
export interface StorySeedSpecies {
  id: string;
  name: string;
  appearance?: string;
  habitat?: string;
  strength?: string;
  mind?: string;
}

export interface StorySeedMainCharacter {
  name?: string;
  gender?: string;
  age?: string;
  appearance?: string;
  skinTone?: string;
  eyeColor?: string;
  species?: string;
  location?: string;
  powerType?: string;
  rankLevel?: string;
  holds?: string;
  knows?: string;
  status?: string;
  goals?: string;
  ties?: string;
  belongsTo?: string;
  voice?: string;
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

/**
 * The World rules sheet: the one sheet every other card refers to. The ladder
 * and how power works, with the laws that change what can happen and the age
 * the story stands in.
 */
export interface StorySeedPowerSystem {
  kindOfWorld?: string;
  whoRules?: string;
  flavor?: string;
  knownRanks?: string;
  laws?: string;
  era?: string;
}

/**
 * The world as it already stands when the novel opens: the Codex's card kinds,
 * in the Story Seed. What the author leaves blank the World Blueprint fills,
 * so the world is complete before Chapter 1 rather than invented when
 * something first appears.
 */
export interface StorySeedWorldFoundations {
  mainCharacter?: StorySeedMainCharacter;
  additionalCharacters?: StorySeedCharacter[];
  factions?: StorySeedFaction[];
  things?: StorySeedThing[];
  startingAbilities?: StorySeedAbilityCard[];
  places?: StorySeedPlace[];
  species?: StorySeedSpecies[];
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
  /**
   * The Seed. Its Story Length (`story.optional.arcCount`), when set, is the
   * exact length the Blueprint plans for; absent, the model chooses a realistic
   * one. The Blueprint plans only Arc 1 either way.
   */
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


const normalizeSurvivalPressure = (value: unknown): StorySeedSurvivalPressure => {
  const normalized = text(value)?.toLowerCase();
  return normalized === 'heaven' || normalized === 'mortal' ? normalized : 'immortal';
};

/** A Story Length is set: an absent or null value leaves the length to the Blueprint. */
const hasArcCount = (value: unknown): boolean => value !== undefined && value !== null;

/**
 * A saved length still loads: Seeds and Blueprints saved before the
 * `STORY_LENGTH_ARCS` range keep theirs, up to the longest a story may carry.
 */
const isSavedArcCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_ROADMAP_ARCS;

const STORY_LENGTH_MESSAGE = `Story Length must be a whole number of arcs from ${STORY_LENGTH_ARCS.min} to ${STORY_LENGTH_ARCS.max}.`;

/**
 * Why a Story Length cannot be generated from or begun, or undefined when it
 * can: blank, or a whole number of arcs within `STORY_LENGTH_ARCS`. The
 * Blueprint review edits the length, so a story with only this problem opens
 * there.
 */
export const describeStoryLengthProblem = (arcCount: unknown): string | undefined =>
  !hasArcCount(arcCount) || (isSavedArcCount(arcCount) && arcCount >= STORY_LENGTH_ARCS.min && arcCount <= STORY_LENGTH_ARCS.max)
    ? undefined : STORY_LENGTH_MESSAGE;

/** What Arc 1 is planned as in a story of this length. */
const arcOneScopeFor = (estimatedArcs: number): NonNullable<WorldBlueprint['arcOneScope']> =>
  estimatedArcs === 1 ? 'whole-story' : 'opening';

const WORLD_IDENTITY_FIELDS = ['title'] as const;

/** The creator's Arc 1 goals as saved: one-line wording, up to the arc's goal limit, chapters kept only when whole and within the arc. */
const normalizeSeedArcGoals = (value: unknown): StorySeedArcGoal[] => (Array.isArray(value) ? value : [])
  .flatMap(entry => {
    const goal = isRecord(entry) ? entry : {};
    const wording = text(goal.text)?.replace(/\s*[\r\n]+\s*/g, ' ');
    if (!wording) return [];
    const chapters = goal.chapters;
    return [{ text: wording, ...(Number.isInteger(chapters) && (chapters as number) >= 1 && (chapters as number) <= ARC_LENGTH ? { chapters: chapters as number } : {}) }];
  })
  .slice(0, MAX_ARC_GOALS);

/** The creator's directions for Arc 2 and Arc 3: one line each, the rest dropped. */
const normalizeSeedArcLookahead = (value: unknown): ArcLookaheadEntry[] => [2, 3].flatMap(arcNumber => {
  const entry = (Array.isArray(value) ? value : []).find(item => isRecord(item) && item.arcNumber === arcNumber);
  const direction = isRecord(entry) ? text(entry.direction)?.replace(/\s*[\r\n]+\s*/g, ' ').slice(0, ARC_LOOKAHEAD_TEXT_LIMIT) : undefined;
  return direction ? [{ arcNumber, direction }] : [];
});

/** Why the creator's Arc 1 goals cannot plan an arc, or undefined when they can. */
const describeSeedArcGoalsProblem = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return 'Arc 1 goals must be a list.';
  if (value.length > MAX_ARC_GOALS) return `Arc 1 has at most ${MAX_ARC_GOALS} goals.`;
  const goals = normalizeSeedArcGoals(value);
  const given = goals.reduce((sum, goal) => sum + (goal.chapters ?? 0), 0);
  const open = goals.filter(goal => goal.chapters === undefined).length;
  if (given + open > ARC_LENGTH) {
    return `Arc 1's goals take ${ARC_LENGTH} chapters in all.`;
  }
  return undefined;
};

/**
 * Every Story Seed card's fields come from the one definition of its Codex
 * card kind (`WORLD_CARD_KINDS`), so a kind's slots are the same in the Seed,
 * in the Blueprint's answer and on its Codex card. Aliases are kept out: only
 * the author writes them, and they are a list, not a fact.
 */
const cardFields = (kind: WorldCardKindId): string[] =>
  worldCardKind(kind).slots.filter(slot => !slot.aliases).map(slot => slot.id);

/** The main character is a character card with the slots only they have. */
const MAIN_CHARACTER_ONLY_FIELDS = [
  'personality', 'startingIdentity', 'mainFlaw', 'secretAdvantage', 'startingWeakness', 'moralAlignment',
] as const;
const MAIN_CHARACTER_FIELDS = [
  ...cardFields('character').filter(field => field !== 'role' && field !== 'connectionToMC'),
  ...MAIN_CHARACTER_ONLY_FIELDS,
];
const ABILITY_FIELDS = ['startingPowerConcept', 'uniquePath'] as const;
const CHARACTER_FIELDS = cardFields('character');
const FACTION_FIELDS = cardFields('faction');
const THING_FIELDS = cardFields('thing');
const ABILITY_CARD_FIELDS = cardFields('ability');
const PLACE_FIELDS = cardFields('place');
const SPECIES_FIELDS = cardFields('species');
/** The World rules sheet, which the Seed keeps in its power-system family. */
const POWER_SYSTEM_FIELDS = cardFields('world-rules');

/**
 * How many cards of each kind a Story Seed holds. The model only adds within
 * them; a creator's own cards are never trimmed.
 */
export const SEED_CHARACTER_LIMIT = 8 as const;
export const SEED_FACTION_LIMIT = 5 as const;
export const SEED_THING_LIMIT = 8 as const;
export const SEED_ABILITY_LIMIT = 8 as const;
export const SEED_PLACE_LIMIT = 6 as const;
export const SEED_SPECIES_LIMIT = 6 as const;

/** The main character's slots the Blueprint fills when blank, beside the name, age, appearance and personality it already carries. */
export const SEED_MAIN_CHARACTER_SLOT_FIELDS = MAIN_CHARACTER_FIELDS
  .filter(field => !['name', 'age', 'appearance', 'personality'].includes(field));
/** A card's slots, everything but its identity and its creator-only aliases. */
export const SEED_CHARACTER_SLOT_FIELDS = CHARACTER_FIELDS.filter(field => field !== 'name');
export const SEED_FACTION_SLOT_FIELDS = FACTION_FIELDS.filter(field => field !== 'name');
export const SEED_THING_SLOT_FIELDS = THING_FIELDS.filter(field => field !== 'name');
export const SEED_ABILITY_SLOT_FIELDS = ABILITY_CARD_FIELDS.filter(field => field !== 'name');
export const SEED_PLACE_SLOT_FIELDS = PLACE_FIELDS.filter(field => field !== 'name');
export const SEED_SPECIES_SLOT_FIELDS = SPECIES_FIELDS.filter(field => field !== 'name');
/** The World rules sheet's slots. It is one sheet for the whole story, so it has no name of its own. */
export const SEED_WORLD_RULES_FIELDS = POWER_SYSTEM_FIELDS;

/**
 * What the Blueprint model proposes for Story Seed slots: values for the main
 * character, every side character and faction (the creator's own by name,
 * then supporting ones), abilities, the power system and the main opposition.
 * Response-only: `fillBlankSeedSlots` applies it once, to blank slots only,
 * and it is never stored. Aliases and Hard Pins are never among it.
 */
export interface GeneratedSeedSlots {
  mainCharacter?: Partial<Record<string, string>>;
  characters?: Array<{ name: string } & Partial<Record<string, string>>>;
  factions?: Array<{ name: string } & Partial<Record<string, string>>>;
  /** The world's Chapter 0 cards for the kinds the Seed keeps as lists of their own. */
  things?: Array<{ name: string } & Partial<Record<string, string>>>;
  startingAbilities?: Array<{ name: string } & Partial<Record<string, string>>>;
  places?: Array<{ name: string } & Partial<Record<string, string>>>;
  species?: Array<{ name: string } & Partial<Record<string, string>>>;
  abilities?: Partial<StorySeedAbilities>;
  powerSystem?: Partial<StorySeedPowerSystem>;
  mainOpposition?: string;
}

/** A World Blueprint as the server returns it: the Blueprint plus the slot values it proposes for the Seed. */
export type GeneratedWorldBlueprint = WorldBlueprint & { generatedSeedSlots?: GeneratedSeedSlots };

/** One card of a kind the Seed keeps as a plain list: its name, its slots, and an id of its own. */
const normalizeCard = <Card extends { id: string; name: string }>(fields: readonly string[], prefix: string) =>
  (value: unknown, index: number): Card | null => {
    if (!isRecord(value) || !text(value.name)) return null;
    return {
      ...optionalTextFields<Partial<Card>>(value, fields),
      id: text(value.id) || `${prefix}-${index + 1}`,
    } as Card;
  };

const normalizeThing = normalizeCard<StorySeedThing>(THING_FIELDS, 'seed-thing');
const normalizeAbilityCard = normalizeCard<StorySeedAbilityCard>(ABILITY_CARD_FIELDS, 'seed-ability');
const normalizePlace = normalizeCard<StorySeedPlace>(PLACE_FIELDS, 'seed-place');
const normalizeSpecies = normalizeCard<StorySeedSpecies>(SPECIES_FIELDS, 'seed-species');

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
      pressure: normalizeSurvivalPressure(isRecord(source.fateSurvival) ? source.fateSurvival.pressure : undefined),
    },
    funSettings: normalizeFunSettings(source.funSettings),
    hardPins: validateHardPinInputs(source.hardPins ?? []),
  };
  if (isChapterWritingStyle(source.chapterWritingStyle)) normalized.chapterWritingStyle = source.chapterWritingStyle;
  if (hasArcCount(source.arcCount)) {
    if (!isSavedArcCount(source.arcCount)) throw new Error(STORY_LENGTH_MESSAGE);
    normalized.arcCount = source.arcCount;
  }
  const arcOneGoals = normalizeSeedArcGoals(source.arcOneGoals ?? (isRecord(source.activeArcGoal) ? [{ text: source.activeArcGoal.text }] : undefined));
  if (arcOneGoals.length) normalized.arcOneGoals = arcOneGoals;
  const arcLookahead = normalizeSeedArcLookahead(source.arcLookahead);
  if (arcLookahead.length) normalized.arcLookahead = arcLookahead;
  const makeItWorkInstruction = text(source.makeItWorkInstruction);
  if (makeItWorkInstruction) normalized.makeItWorkInstruction = makeItWorkInstruction;
  if (source.startedFrom === 'story-spark') normalized.startedFrom = 'story-spark';
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

  const cards = <Card extends { id: string; name: string }>(
    value: unknown,
    normalize: (entry: unknown, index: number) => Card | null,
  ): Card[] => (Array.isArray(value) ? value : []).map(normalize).filter((item): item is Card => item !== null);

  const things = cards(source.things, normalizeThing);
  if (things.length > 0) normalized.things = things;
  const startingAbilities = cards(source.startingAbilities, normalizeAbilityCard);
  if (startingAbilities.length > 0) normalized.startingAbilities = startingAbilities;
  const places = cards(source.places, normalizePlace);
  if (places.length > 0) normalized.places = places;
  const species = cards(source.species, normalizeSpecies);
  if (species.length > 0) normalized.species = species;

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

/**
 * A Seed saved before the world moved onto its card (SENSEI, 2026-11-06) wrote
 * what kind of world it is and who rules it as text beside the card. Read, each
 * fills its card slot when that slot is blank, so nothing written is lost and a
 * card the creator already filled wins.
 */
const RETIRED_WORLD_TEXT: ReadonlyArray<[from: string, to: 'kindOfWorld' | 'whoRules']> = [
  ['worldType', 'kindOfWorld'],
  ['societyStructure', 'whoRules'],
];

export const liftRetiredWorldText = (
  foundations: StorySeedWorldFoundations,
  retired: Record<string, unknown>,
): StorySeedWorldFoundations => {
  const lifted = { ...foundations.powerSystem };
  for (const [from, to] of RETIRED_WORLD_TEXT) {
    const value = text(retired[from]);
    if (value && !text(lifted[to])) lifted[to] = value;
  }
  return Object.keys(lifted).length > 0 ? { ...foundations, powerSystem: lifted } : foundations;
};

const normalizeWorldOptional = (value: unknown): StorySeedWorldOptional => {
  const source = isRecord(value) ? value : {};
  const identity = isRecord(source.worldIdentity) ? source.worldIdentity : {};
  return {
    worldIdentity: optionalTextFields<StorySeedWorldIdentity>(identity, WORLD_IDENTITY_FIELDS),
    worldFoundations: liftRetiredWorldText(normalizeWorldFoundations(source.worldFoundations), identity),
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
    const goalsProblem = describeSeedArcGoalsProblem(value.story.optional.arcOneGoals);
    if (goalsProblem) errors.push(goalsProblem);
    if (hasArcCount(value.story.optional.arcCount) && !isSavedArcCount(value.story.optional.arcCount)) {
      errors.push(STORY_LENGTH_MESSAGE);
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
  // A length saved before the current range loads, but a story is generated only within it.
  const arcCount = isRecord(value) && isRecord(value.story) && isRecord(value.story.optional) ? value.story.optional.arcCount : undefined;
  const lengthProblem = isSavedArcCount(arcCount) ? describeStoryLengthProblem(arcCount) : undefined;
  if (lengthProblem) errors.push(lengthProblem);
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
 * Reads a saved Blueprint's Arc 1 and never throws. Older Blueprints held one
 * Arc 1 `arcPlan`, or a plan for every arc; either way only a valid Arc 1 is
 * kept, and anything malformed is dropped rather than failing the read.
 */
const readArcOne = (source: Record<string, unknown>): ArcPlan | undefined => {
  const candidate = Array.isArray(source.arcPlans) ? source.arcPlans[0] : source.arcPlan;
  try { const plan = validateArcPlan(candidate); return plan.arcNumber === 1 ? plan : undefined; }
  catch { return undefined; }
};

/**
 * Reads the hidden look-ahead within the story's length. A Blueprint saved
 * before arcs were planned as they begin keeps its next planned arcs as the
 * look-ahead, until one is saved in its place.
 */
const readArcLookahead = (source: Record<string, unknown>, estimatedArcs: number): ArcLookaheadEntry[] => {
  const bounds = { afterArc: 1, plannedArcCount: estimatedArcs };
  if (Array.isArray(source.arcLookahead)) return normalizeArcLookahead(source.arcLookahead, bounds);
  if (!Array.isArray(source.arcPlans)) return [];
  const later = source.arcPlans.slice(1).flatMap(entry => {
    try { return [validateArcPlan(entry)]; } catch { return []; }
  });
  return arcLookaheadFromPlans(later, bounds);
};

/**
 * Arc 1's chapters, from the creator's: every count they gave is kept, and the
 * rest of the arc is shared among the goals left without one. Where `saved`
 * (the Blueprint's own allocation) already fills that rest exactly, it stands.
 * When every goal has a count and they leave chapters over, the last goal runs
 * to the arc's end. Counts that cannot fit the arc share it evenly; the ARC
 * page already says so.
 */
const allocateArcOneChapters = (given: ReadonlyArray<number | undefined>, saved: ReadonlyArray<number | undefined> = []): number[] => {
  const share = (total: number, count: number, index: number) => Math.floor(total / count) + (index === count - 1 ? total % count : 0);
  const even = given.map((_, index) => share(ARC_LENGTH, given.length, index));
  const rest = ARC_LENGTH - given.reduce<number>((sum, chapters) => sum + (chapters ?? 0), 0);
  const open = given.flatMap((chapters, index) => chapters === undefined ? [index] : []);
  if (!open.length) return rest < 0 ? even : given.map((chapters, index) => chapters! + (index === given.length - 1 ? rest : 0));
  if (rest < open.length) return even;
  const keepSaved = open.every(index => (saved[index] ?? 0) >= 1) && open.reduce((sum, index) => sum + saved[index]!, 0) === rest;
  let openIndex = 0;
  return given.map((chapters, index) => chapters ?? (keepSaved ? saved[index]! : share(rest, open.length, openIndex++)));
};

/**
 * Keeps Arc 1's goals in step with the creator's Arc 1 goals on the Seed: each
 * of the Blueprint's goals takes the wording of the Seed's goal in its place,
 * and the creator's chapters are kept (`allocateArcOneChapters`); identities
 * stay as saved. Once the Seed holds the whole plan (`promoteBlueprintIntoSeed`
 * copies in the goals a Blueprint added), the Seed's list is the plan: a goal
 * the creator adds joins it and a goal they clear leaves it. Only
 * `keepPlannedGoals` (a Blueprint just generated, or read with the Seed it was
 * made from) keeps the goals the Blueprint planned after the creator's, each
 * giving way when the creator's chapters leave it no room. A Blueprint that
 * has not planned Arc 1 yet gets none: Arc 1 comes only from the Blueprint,
 * never from the Seed's goals alone.
 */
export const alignArcOneWithSeed = (
  arcPlans: ArcPlan[] | undefined,
  seed: StorySeedInput,
  { keepPlannedGoals = false }: { keepPlannedGoals?: boolean } = {},
): ArcPlan[] | undefined => {
  const seedGoals = seed.story.optional.arcOneGoals ?? [];
  const first = arcPlans?.[0];
  if (!first) return undefined;
  if (!seedGoals.length) return [first];
  let count = keepPlannedGoals ? Math.min(MAX_ARC_GOALS, Math.max(seedGoals.length, first.goals.length)) : seedGoals.length;
  const givenSum = seedGoals.reduce((sum, goal) => sum + (goal.chapters ?? 0), 0);
  const openSeedGoals = seedGoals.filter(goal => goal.chapters === undefined).length;
  while (count > seedGoals.length && ARC_LENGTH - givenSum < openSeedGoals + (count - seedGoals.length)) count -= 1;
  const given = Array.from({ length: count }, (_, index) => seedGoals[index]?.chapters);
  const saved = first.goals.map(goal => goal.chapters);
  const chapters = given.some(value => value !== undefined) || count !== first.goals.length
    ? allocateArcOneChapters(given, saved) : saved;
  const ids = new Set(first.goals.map(goal => goal.id));
  const newId = () => {
    let number = first.goals.length + 1;
    while (ids.has(`arc-1-${number}`)) number += 1;
    ids.add(`arc-1-${number}`);
    return `arc-1-${number}`;
  };
  return [{ ...first, goals: Array.from({ length: count }, (_, index) => ({
    ...first.goals[index],
    id: first.goals[index]?.id ?? newId(),
    text: seedGoals[index]?.text ?? first.goals[index].text,
    chapters: chapters[index],
  })) }];
};

/**
 * The creator's directions for Arc 2 and Arc 3 take the place of the
 * Blueprint's own, and join it where it has none, within the arcs a story of
 * `estimatedArcs` has after Arc 1.
 */
export const alignArcLookaheadWithSeed = (entries: ArcLookaheadEntry[], seed: StorySeedInput, estimatedArcs: number): ArcLookaheadEntry[] => {
  const written = seed.story.optional.arcLookahead ?? [];
  const kept = entries.filter(entry => !written.some(line => line.arcNumber === entry.arcNumber));
  return fitArcLookahead([...written, ...kept].sort((a, b) => a.arcNumber - b.arcNumber), estimatedArcs);
};

/**
 * Arc 1's plan from the creator's own goals, for a story begun without a
 * Blueprint, its chapters from the creator's (`allocateArcOneChapters`).
 */
export const arcOnePlanFromSeedGoals = (goals: readonly StorySeedArcGoal[] | undefined): ArcPlan | undefined => {
  if (!goals?.length) return undefined;
  const chapters = allocateArcOneChapters(goals.map(goal => goal.chapters));
  return validateArcPlan({ arcNumber: 1, goals: goals.map((goal, index) => ({
    id: `arc-1-${index + 1}`, text: goal.text, chapters: chapters[index],
  })) });
};

/**
 * The Manifest gate: a Blueprint begins a story with a valid Arc 1 and a story
 * length. Every later arc is planned when the reader begins it. Arc 1 must
 * still be what its length needs: the whole story in a one-arc story, the
 * opening of a longer one. A Story Length changed across that line after the
 * Blueprint was generated needs Arc 1 planned again.
 */
export const validateBlueprintArcPlan = (blueprint: Pick<WorldBlueprint, 'arcPlans' | 'estimatedArcs' | 'arcOneScope'>): ArcPlan => {
  const first = blueprint.arcPlans?.[0];
  if (!first) throw new Error('Generate the Blueprint to plan Arc 1 before beginning the story.');
  if (blueprint.arcPlans!.length !== 1) throw new Error('A Blueprint plans only Arc 1; every later arc is planned when it begins.');
  const plan = validateArcPlan(first);
  if (plan.arcNumber !== 1) throw new Error('The Blueprint\'s plan must be Arc 1.');
  validateRequestedArcCount(blueprint.estimatedArcs);
  if (blueprint.arcOneScope && blueprint.arcOneScope !== arcOneScopeFor(blueprint.estimatedArcs)) {
    throw new Error(blueprint.arcOneScope === 'whole-story'
      ? `Arc 1 was planned as the whole story, reaching the Destined Ending. Regenerate the Blueprint to plan Arc 1 as the opening of ${blueprint.estimatedArcs} arcs.`
      : 'Arc 1 was planned as the opening of a longer story. Regenerate the Blueprint to plan a one-arc story that reaches the Destined Ending, or set a longer Story Length.');
  }
  return plan;
};

/** Human-readable Arc 1 problem for the review, or undefined when ready. */
export const describeBlueprintArcPlanProblem = (blueprint: Pick<WorldBlueprint, 'arcPlans' | 'estimatedArcs' | 'arcOneScope'>): string | undefined => {
  try { validateBlueprintArcPlan(blueprint); return undefined; }
  catch (error) { return error instanceof Error ? error.message : 'Arc 1 is not ready.'; }
};

/** Keeps a look-ahead to the arcs a story of `estimatedArcs` still has after Arc 1, for a story length the author changed. */
export const fitArcLookahead = (lookahead: ArcLookaheadEntry[] | undefined, estimatedArcs: number): ArcLookaheadEntry[] =>
  normalizeArcLookahead(lookahead, { afterArc: 1, plannedArcCount: estimatedArcs });

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
    // The creator's Arc 1 goals have their own canonical contract.
    logline: '',
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
    arcPlans: undefined,
    hardPins: validateHardPinInputs(seed.story.optional.hardPins ?? []),
    funSettings: normalizeFunSettings(seed.story.optional.funSettings),
    destinedEnding: worldFoundations.destinedEnding || '',
    estimatedArcs: seed.story.optional.arcCount ?? 10,
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
  const savedArcs = typeof source.estimatedArcs === 'number'
    && Number.isInteger(source.estimatedArcs)
    && source.estimatedArcs > 0
    ? source.estimatedArcs
    : undefined;
  // The creator's Story Length is the story's length; without one, the
  // Blueprint keeps the length it has.
  const estimatedArcs = normalizedSeed.story.optional.arcCount ?? savedArcs ?? fallback.estimatedArcs;
  const arcOne = readArcOne(source);
  // What Arc 1 was planned as. A Blueprint saved before this was recorded
  // could only change its length on its own side of the one-arc line, so its
  // saved length says.
  const arcOneScope = source.arcOneScope === 'whole-story' || source.arcOneScope === 'opening'
    ? source.arcOneScope
    : arcOneScopeFor(savedArcs ?? estimatedArcs);
  // The look-ahead was written for the Blueprint's saved length; a story now
  // set to another length drops it rather than steer toward the old ending.
  const arcLookahead = savedArcs !== undefined && savedArcs !== estimatedArcs ? [] : readArcLookahead(source, estimatedArcs);
  const alignedLookahead = alignArcLookaheadWithSeed(arcLookahead, normalizedSeed, estimatedArcs);

  return {
    blueprintVersion: sourceMetadata('blueprintVersion') || WORLD_BLUEPRINT_VERSION,
    ...(creator ? { creator } : {}),
    ...(status ? { status } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    originSnapshot,
    title: requestedTitle || read('title', fallback.title),
    logline: read('logline', fallback.logline),
    mainCharacter,
    mcProfile: mainCharacter.backgroundProfile,
    majorFactions: Array.isArray(source.majorFactions)
      ? stringList(source.majorFactions)
      : fallback.majorFactions,
    initialCharacters: Array.isArray(source.initialCharacters)
      ? stringList(source.initialCharacters)
      : fallback.initialCharacters,
    arcPlans: alignArcOneWithSeed(arcOne ? [arcOne] : undefined, normalizedSeed, { keepPlannedGoals: true }),
    ...(arcOne ? { arcOneScope } : {}),
    ...(alignedLookahead.length ? { arcLookahead: alignedLookahead } : {}),
    hardPins: validateHardPinInputs(seed ? normalizedSeed.story.optional.hardPins ?? [] : source.hardPins ?? []),
    funSettings: normalizeFunSettings(seed ? normalizedSeed.story.optional.funSettings : source.funSettings),
    destinedEnding: text(seedFoundations.destinedEnding) || read('destinedEnding', fallback.destinedEnding || ''),
    estimatedArcs,
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

/**
 * The labels of a main character's description whose facts a Chapter 0
 * character card carries in slots of its own (`age`, `appearance`, `bio`).
 * Every other label names something no card slot holds.
 */
const MAIN_CHARACTER_CARD_LABELS = new Set(['Age', 'Appearance', 'Biography']);

/**
 * The labels of the power system whose facts the one Chapter 0 World rules
 * sheet carries in slots of its own (`flavor`, `knownRanks`).
 */
const WORLD_RULES_CARD_LABELS = new Set(['Power flavor', 'Known ranks']);

const mainCharacterAuthoredDetails = (
  mainCharacter: StorySeedMainCharacter,
): Array<[label: string, value: string | undefined]> => [
  ['Starting identity', mainCharacter.startingIdentity],
  ['Main flaw', mainCharacter.mainFlaw],
  ['Secret advantage', mainCharacter.secretAdvantage],
  ['Starting weakness', mainCharacter.startingWeakness],
  ['Moral alignment', mainCharacter.moralAlignment],
  ['Biography', mainCharacter.bio],
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

/** A text's words for comparison, ignoring case, spacing, and punctuation. */
const comparableWords = (value: string): string[] =>
  value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Every name an entity answers to: its name and its aliases. */
const entityNames = (entries: ReadonlyArray<{ name?: string; aliases?: string[] }>): string[] =>
  entries.flatMap(entry => [entry.name ?? '', ...(entry.aliases ?? [])]).filter(name => Boolean(text(name)));

/**
 * Whether a Blueprint list entry's own name identifies a known entity: the
 * same name or alias, or a multi-word name with a title or honorific before
 * it ("Elder Qin", "The witness Minister Sui"), in either direction. Only
 * names are compared, never descriptions, so an addition that merely mentions
 * an author's character or faction is its own entity.
 */
const namesKnownEntity = (entryName: string, knownNames: readonly string[]): boolean => {
  const name = comparableWords(entryName);
  if (!name.length) return false;
  const isTitled = (longer: string[], shorter: string[]) => shorter.length >= 2
    && longer.length > shorter.length
    && longer.slice(-shorter.length).join(' ') === shorter.join(' ');
  return knownNames.some(known => {
    const key = comparableWords(known);
    return key.length > 0 && (key.join(' ') === name.join(' ') || isTitled(name, key) || isTitled(key, name));
  });
};

/**
 * The Blueprint list entries that add a new entity: not one the story already
 * has (by name or alias), and not a repeat of an earlier entry in the list.
 */
const newBlueprintEntries = (generated: string[], knownNames: readonly string[]): string[] => {
  const seen = [...knownNames];
  return generated.filter(entry => {
    const { name } = parseBlueprintEntry(entry);
    if (!name || namesKnownEntity(name, seen)) return false;
    seen.push(name);
    return true;
  });
};

/** The author's entries as written, then each generated entry that adds a new entity. */
const mergeAuthoritativeEntries = <T extends { name: string; aliases?: string[] }>(
  generated: string[],
  authored: T[],
  describe: (entry: T) => string,
  otherKnownNames: string[] = [],
): string[] => {
  const validAuthored = authored.filter(entry => Boolean(text(entry.name)));
  return [
    ...validAuthored.map(describe),
    ...newBlueprintEntries(generated, [...entityNames(validAuthored), ...otherKnownNames]),
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
  /**
   * The main character's description without the facts a Chapter 0 character
   * card carries in slots of its own (their age, their look and their
   * biography). What is left is what no card holds: their temper and the rest
   * of who they are, and the reviewed background the Blueprint owns rather
   * than the Seed (`mirrorSeedIntoBlueprint`). A consumer that sends the cards
   * takes this instead of the whole description, so no fact is sent twice.
   */
  mainCharacterBeyondItsCard?: string;
  /**
   * The power system without what the one Chapter 0 World rules sheet carries
   * in slots of its own: the outline prose and anything the sheet has no slot
   * for. Taken instead of `powerSystem` by a consumer that sends the sheet.
   */
  powerSystemBeyondItsCard?: string;
  characters: StorySeedWorldEntity[];
  factions: StorySeedWorldEntity[];
  /** The World rules card's kind of world and who rules, for a consumer that does not send the card. */
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

/** Reads the slot values a Blueprint answer proposes. Anything malformed is left out; names are required, aliases never read. */
export const readGeneratedSeedSlots = (value: unknown): GeneratedSeedSlots => {
  const source = isRecord(value) ? value : {};
  const pick = <F extends string>(record: unknown, fields: readonly F[]) => {
    const values = Object.fromEntries(fields.flatMap(field => {
      const valueText = isRecord(record) ? text(record[field]) : undefined;
      return valueText ? [[field, valueText]] : [];
    })) as Partial<Record<F, string>>;
    return Object.keys(values).length ? values : undefined;
  };
  const named = <F extends string>(list: unknown, fields: readonly F[]) => (Array.isArray(list) ? list : []).flatMap(entry => {
    const name = isRecord(entry) ? text(entry.name) : undefined;
    return name ? [{ name, ...pick(entry, fields) }] : [];
  });
  const mainCharacter = pick(source.mainCharacter, SEED_MAIN_CHARACTER_SLOT_FIELDS);
  const characters = named(source.characters, SEED_CHARACTER_SLOT_FIELDS);
  const factions = named(source.factions, SEED_FACTION_SLOT_FIELDS);
  const things = named(source.things, SEED_THING_SLOT_FIELDS);
  const startingAbilities = named(source.startingAbilities, SEED_ABILITY_SLOT_FIELDS);
  const places = named(source.places, SEED_PLACE_SLOT_FIELDS);
  const species = named(source.species, SEED_SPECIES_SLOT_FIELDS);
  const abilities = pick(source.abilities, ABILITY_FIELDS);
  const powerSystem = pick(source.powerSystem, POWER_SYSTEM_FIELDS);
  const mainOpposition = text(source.mainOpposition);
  return {
    ...(mainCharacter ? { mainCharacter } : {}),
    ...(characters.length ? { characters } : {}),
    ...(factions.length ? { factions } : {}),
    ...(things.length ? { things } : {}),
    ...(startingAbilities.length ? { startingAbilities } : {}),
    ...(places.length ? { places } : {}),
    ...(species.length ? { species } : {}),
    ...(abilities ? { abilities } : {}),
    ...(powerSystem ? { powerSystem } : {}),
    ...(mainOpposition ? { mainOpposition } : {}),
  };
};

/**
 * Fills every blank Story Seed slot from the Blueprint's proposed values, once.
 * A value the creator wrote is never changed, aliases are never written, and
 * the creator's own side characters and factions (matched by name, alias or
 * title) get their blanks filled. New cards are added only up to the Seed's
 * limits; the creator's are never trimmed.
 */
export const fillBlankSeedSlots = (seed: StorySeedInput, slots: GeneratedSeedSlots | undefined): StorySeedInput => {
  const source = normalizeStorySeedInput(seed);
  if (!slots) return source;
  const foundations = source.world.optional.worldFoundations;
  const fillFields = <T extends object>(current: T, proposed: Record<string, string | undefined> | undefined, fields: readonly string[]): T => {
    const next = { ...current } as Record<string, unknown>;
    for (const field of fields) if (!text(next[field]) && text(proposed?.[field])) next[field] = text(proposed![field]);
    return next as T;
  };
  const mainCharacter = fillFields(foundations.mainCharacter ?? {}, slots.mainCharacter, SEED_MAIN_CHARACTER_SLOT_FIELDS);
  const mainName = text(mainCharacter.name);
  const fillCards = <Card extends { id: string; name: string; aliases?: string[] }>(
    cards: Card[], proposed: Array<{ name: string } & Record<string, string | undefined>>, fields: readonly string[], limit: number, idPrefix: string, excluded: string[] = [],
  ): Card[] => {
    const next = cards.map(card => ({ ...card }));
    const ids = new Set(next.map(card => card.id));
    for (const entry of proposed) {
      if (namesKnownEntity(entry.name, excluded)) continue;
      const match = next.find(card => namesKnownEntity(entry.name, entityNames([card])));
      if (match) Object.assign(match, fillFields(match, entry, fields));
      else if (next.length < limit) next.push(fillFields({ id: uniqueEntityId(idPrefix, entry.name, ids), name: entry.name } as Card, entry, fields));
    }
    return next;
  };
  return normalizeStorySeedInput({
    ...source,
    world: { ...source.world, optional: { ...source.world.optional, worldFoundations: {
      ...foundations,
      mainCharacter,
      additionalCharacters: fillCards(foundations.additionalCharacters ?? [], slots.characters ?? [], SEED_CHARACTER_SLOT_FIELDS, SEED_CHARACTER_LIMIT, 'blueprint-character', mainName ? [mainName] : []),
      factions: fillCards(foundations.factions ?? [], slots.factions ?? [], SEED_FACTION_SLOT_FIELDS, SEED_FACTION_LIMIT, 'blueprint-faction'),
      things: fillCards(foundations.things ?? [], slots.things ?? [], SEED_THING_SLOT_FIELDS, SEED_THING_LIMIT, 'blueprint-thing'),
      startingAbilities: fillCards(foundations.startingAbilities ?? [], slots.startingAbilities ?? [], SEED_ABILITY_SLOT_FIELDS, SEED_ABILITY_LIMIT, 'blueprint-ability'),
      places: fillCards(foundations.places ?? [], slots.places ?? [], SEED_PLACE_SLOT_FIELDS, SEED_PLACE_LIMIT, 'blueprint-place'),
      species: fillCards(foundations.species ?? [], slots.species ?? [], SEED_SPECIES_SLOT_FIELDS, SEED_SPECIES_LIMIT, 'blueprint-species'),
      abilities: fillFields(foundations.abilities ?? {}, slots.abilities, ABILITY_FIELDS),
      powerSystem: fillFields(foundations.powerSystem ?? {}, slots.powerSystem, POWER_SYSTEM_FIELDS),
      ...(text(foundations.mainOpposition) || !slots.mainOpposition ? {} : { mainOpposition: slots.mainOpposition }),
    } } },
  });
};

/**
 * Copies Blueprint values into the Seed wherever the Seed owns that concept
 * and has no value yet: generated world identity, ending, initial goal,
 * main-character basics, and every side character or faction the Seed does
 * not already name. The Seed never loses a value it already has. The story's
 * length is never copied: a blank Story Length leaves the length to the
 * Blueprint, which keeps its own.
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
  for (const line of newBlueprintEntries((blueprint.initialCharacters || []).filter(entry => text(entry)), [...entityNames(characters), ...(mainName ? [mainName] : [])])) {
    const parsed = parseBlueprintEntry(line);
    characters.push({
      id: uniqueEntityId('blueprint-character', parsed.name, characterIds), name: parsed.name,
      ...(parsed.role ? { role: parsed.role } : {}), ...(parsed.details ? { bio: parsed.details } : {}),
    });
  }
  const factions = [...(foundations.factions || [])];
  const factionIds = new Set(factions.map(entry => entry.id));
  for (const line of newBlueprintEntries((blueprint.majorFactions || []).filter(entry => text(entry)), entityNames(factions))) {
    const parsed = parseBlueprintEntry(line);
    factions.push({
      id: uniqueEntityId('blueprint-faction', parsed.name, factionIds), name: parsed.name,
      ...(parsed.role ? { role: parsed.role } : {}), ...(parsed.details ? { description: parsed.details } : {}),
    });
  }
  // Arc 1's goals fill the Seed's, like any slot the creator left blank:
  // wording and chapters, so the ARC page shows the whole plan the Blueprint
  // made, and from then on the Seed's list is the plan. A Seed with fewer goals
  // than the plan keeps its own and gains the goals the Blueprint planned after
  // them.
  const ownGoals = source.story.optional.arcOneGoals ?? [];
  const plannedGoals = ownGoals.length < (blueprint.arcPlans?.[0]?.goals.length ?? 0)
    ? alignArcOneWithSeed(blueprint.arcPlans, source, { keepPlannedGoals: true })?.[0]?.goals : undefined;
  const suggestedGoals = plannedGoals?.map(goal => ({ text: goal.text, chapters: goal.chapters }));

  return normalizeStorySeedInput({
    ...source,
    story: { ...source.story, optional: {
      ...source.story.optional,
      ...(suggestedGoals?.length ? { arcOneGoals: suggestedGoals } : {}),
    } },
    world: { ...source.world, optional: {
      worldIdentity: {
        ...identity,
        title: fill(identity.title, blueprint.title === UNTITLED_BLUEPRINT_TITLE ? undefined : blueprint.title),
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
 * outline prose, style bible, metadata, and the story's length while the
 * Seed's Story Length is blank.
 */
export const mirrorSeedIntoBlueprint = (blueprint: WorldBlueprint, seed: StorySeedInput): WorldBlueprint => {
  const { worldIdentity, worldFoundations } = seed.world.optional;
  const mainCharacter = worldFoundations.mainCharacter || {};
  const backgroundProfile = blueprint.mainCharacter?.backgroundProfile ?? blueprint.mcProfile ?? '';
  const estimatedArcs = seed.story.optional.arcCount ?? blueprint.estimatedArcs;
  return {
    ...blueprint,
    originSnapshot: createBlueprintOriginSnapshot(seed),
    title: text(worldIdentity.title) || blueprint.title,
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
    arcPlans: alignArcOneWithSeed(blueprint.arcPlans, seed),
    estimatedArcs,
    // The Blueprint's look-ahead was written for one length: a changed length
    // drops it, and the next arcs are planned from where the story is. The
    // creator's own directions always travel.
    arcLookahead: (() => {
      const aligned = alignArcLookaheadWithSeed(estimatedArcs === blueprint.estimatedArcs ? blueprint.arcLookahead ?? [] : [], seed, estimatedArcs);
      return aligned.length ? aligned : undefined;
    })(),
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
  const readSeed = normalizeStorySeedInput(seed);
  // A Blueprint saved before the world moved onto its card held it as text:
  // it fills the card's blank slots, like any other Blueprint value.
  const retired = isRecord(blueprint) ? blueprint : {};
  const normalizedSeed: StorySeedInput = { ...readSeed, world: { ...readSeed.world, optional: {
    ...readSeed.world.optional,
    worldFoundations: liftRetiredWorldText(readSeed.world.optional.worldFoundations,
      { worldType: retired.worldOverview, societyStructure: retired.societyStructure }),
  } } };
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
  // The same description without what a Chapter 0 character card holds in its
  // own slots, for a consumer that sends those cards beside it.
  const offCardEntries: Array<[label: string, value: string | undefined]> = [
    ['Personality', authoredMain.personality],
    ...mainCharacterAuthoredDetails(authoredMain),
  ];
  const beyondItsCard = [
    labeledDetails(offCardEntries.filter(([label]) => !MAIN_CHARACTER_CARD_LABELS.has(label))),
    background ? `Background: ${background}` : '',
  ].filter(Boolean).join('\n');
  const authoredEntity = (entry: StorySeedCharacter | StorySeedFaction, description: string): StorySeedWorldEntity => ({
    name: entry.name.trim(),
    ...(entry.aliases?.length ? { aliases: [...entry.aliases] } : {}),
    description,
  });
  // What kind of world it is and who rules it live on the World rules card.
  const worldOverview = text(worldFoundations.powerSystem?.kindOfWorld);
  const societyStructure = text(worldFoundations.powerSystem?.whoRules);
  // Power travels as the creator's own slots only: the World rules card holds
  // it, and no Blueprint paragraph repeats it (SENSEI, 2026-11-06).
  const powerSystem = text(withAuthoritativeDetails(
    '',
    powerSystemAuthoredDetails(worldFoundations),
  ));
  // The same, without what the World rules sheet holds in its own slots.
  const powerSystemBeyondItsCard = text(withAuthoritativeDetails(
    '',
    powerSystemAuthoredDetails(worldFoundations).filter(([label]) => !WORLD_RULES_CARD_LABELS.has(label)),
  ));

  return {
    ...(mainName ? { mainCharacter: { name: mainName, description: mainDescription || mainName } } : {}),
    ...(mainName && beyondItsCard ? { mainCharacterBeyondItsCard: beyondItsCard } : {}),
    // Aliases travel structurally, so descriptions do not repeat them.
    characters: (worldFoundations.additionalCharacters || []).filter(entry => text(entry.name))
      .map(entry => authoredEntity(entry, characterBlueprintEntry({ ...entry, aliases: undefined }))),
    factions: (worldFoundations.factions || []).filter(entry => text(entry.name))
      .map(entry => authoredEntity(entry, factionBlueprintEntry({ ...entry, aliases: undefined }))),
    ...(worldOverview ? { worldOverview } : {}),
    ...(societyStructure ? { societyStructure } : {}),
    ...(powerSystem ? { powerSystem } : {}),
    ...(powerSystemBeyondItsCard ? { powerSystemBeyondItsCard } : {}),
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
): GeneratedWorldBlueprint => {
  const storySeed = normalizeStorySeedInput(seed);
  // Details are derived below from the author's facts, and what Arc 1 was
  // planned as from the answer's own length, never taken as sent.
  const modelOutput = Object.fromEntries(Object.entries(isRecord(value) ? value : {})
    .filter(([key]) => key !== 'arcOneScope'));
  const generated = normalizeWorldBlueprint(modelOutput, storySeed, {
    preserveSourceMetadata: false,
  });
  const { worldIdentity, worldFoundations } = storySeed.world.optional;
  const mainCharacter = worldFoundations.mainCharacter || {};
  const generatedMainCharacter = generated.mainCharacter as WorldBlueprintMainCharacter;
  // Structured Seed details stay in their Seed fields; Blueprint prose never
  // carries a second, separately editable copy of them.
  const backgroundProfile = generatedMainCharacter.backgroundProfile;
  const mainCharacterName = text(mainCharacter.name) || text(generatedMainCharacter.name);
  // The slot values the model proposed for the Seed travel with the reply, to
  // fill only the creator's blanks. When the answer gives structured cards, the
  // Blueprint's cast lists show the cast the Seed will hold once they are filled.
  const generatedSeedSlots = readGeneratedSeedSlots(modelOutput);
  const filledFoundations = fillBlankSeedSlots(storySeed, generatedSeedSlots).world.optional.worldFoundations;
  const structuredCast = Array.isArray(modelOutput.characters) || Array.isArray(modelOutput.factions);

  return {
    ...generated,
    blueprintVersion: WORLD_BLUEPRINT_VERSION,
    originSnapshot: createBlueprintOriginSnapshot(storySeed),
    title: text(worldIdentity.title) || generated.title,
    logline: generated.logline,
    mainCharacter: {
      ...generatedMainCharacter,
      name: text(mainCharacter.name) || generatedMainCharacter.name,
      age: text(mainCharacter.age) || generatedMainCharacter.age,
      appearance: text(mainCharacter.appearance) || generatedMainCharacter.appearance,
      personality: text(mainCharacter.personality) || generatedMainCharacter.personality,
      backgroundProfile,
    },
    mcProfile: backgroundProfile,
    majorFactions: structuredCast
      ? (filledFoundations.factions ?? []).map(factionBlueprintEntry)
      : mergeAuthoritativeEntries(generated.majorFactions, worldFoundations.factions || [], factionBlueprintEntry),
    initialCharacters: structuredCast
      ? (filledFoundations.additionalCharacters ?? []).map(characterBlueprintEntry)
      : mergeAuthoritativeEntries(
        generated.initialCharacters,
        worldFoundations.additionalCharacters || [],
        characterBlueprintEntry,
        mainCharacterName ? [mainCharacterName] : [],
      ),
    destinedEnding: text(worldFoundations.destinedEnding) || generated.destinedEnding,
    ...(Object.keys(generatedSeedSlots).length ? { generatedSeedSlots } : {}),
  };
};

/** A story length chosen now: a whole number of arcs within `STORY_LENGTH_ARCS`. */
export const validateRequestedArcCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < STORY_LENGTH_ARCS.min || value > STORY_LENGTH_ARCS.max) {
    throw new Error(STORY_LENGTH_MESSAGE);
  }
  return value;
};

/**
 * The Seed as world content for the Blueprint model: Story Settings that only
 * shape how chapters are later written stay out of it.
 */
const withoutStorySettings = (seed: StorySeedInput): StorySeedInput => {
  const { chapterWritingStyle: _readingMode, ...optional } = seed.story.optional;
  return { ...seed, story: { ...seed.story, optional } };
};

export const buildBlueprintGenerationPayload = (seed: StorySeedInput): BlueprintGenerationPayload => {
  const storySeed = withoutStorySettings(applyInferredStoryTags(normalizeStorySeedInput(seed)));
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
  const arcPlan = validateBlueprintArcPlan(blueprint);
  return { storySeed, administrative, blueprint: { ...blueprint, arcPlans: [arcPlan] }, chapterCount };
};
