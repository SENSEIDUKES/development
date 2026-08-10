/**
 * Story Constitution — permanent, per-story generation inputs.
 *
 * The canonical source of this package is the finalized Story Seed contract
 * (`StorySeedInput`) plus its generated World Blueprint. The Workshop's older
 * mock scenarios are projected into the same shape so the current generator
 * can adopt the package boundary without changing its output.
 */
import type { MockChapterGenerationScenario } from "../fixtures/mockGenerationData";
import type { CulturalProseStyleId } from "../lib/culturalProse";
import {
  DEFAULT_CHAPTER_WRITING_STYLE,
  normalizeChapterWritingStyle,
} from "../lib/chapterWritingStyle";
import type { GlossaryGenerationResult } from "../lib/glossaryFormatter";
import type { FatePressureTier } from "../lib/sceneRhythm";
import type { ChapterWritingStyle } from "../types";
import {
  assertValidStorySeedInput,
  STORY_SEED_SCHEMA_VERSION,
  WORLD_BLUEPRINT_VERSION,
  type StorySeedFateSurvivalSettings,
  type StorySeedInput,
} from "../../../story-seed/shared/storySeedSchema";
import { normalizeStoryStyle, type StoryStyle } from "../../../story-seed/shared/storyStyle";
import type { WorldBlueprint } from "../../../story-seed/shared/types";

export type StoryConstitutionSource =
  | {
      kind: "story-seed";
      schemaVersion: typeof STORY_SEED_SCHEMA_VERSION;
      blueprintVersion: string;
    }
  | {
      kind: "workshop-fixture";
      contract: "StorySeedInput";
      schemaVersion: typeof STORY_SEED_SCHEMA_VERSION;
      note: string;
    };

export interface StoryConstitution {
  source: StoryConstitutionSource;
  /** Exact canonical input retained for real runs; Workshop fixtures never set it. */
  storySeed?: StorySeedInput;
  /** Exact reviewed sibling artifact retained for real runs; never folded into Story Seed. */
  worldBlueprint?: WorldBlueprint;
  mainCharacterName: string;
  genre: string;
  storyTags: string[];
  corePremise: string;
  /** Story Seed storytelling tradition. Older Workshop fixtures predate it. */
  storyStyle?: StoryStyle;
  styleBible: string;
  tropeRules: string;
  /** Story-level Cultural Prose setting; no approved Story Style bridge exists yet. */
  culturalProseStyleId?: CulturalProseStyleId;
  /** Accessibility prose setting used by the current chapter prompt. */
  accessibilityStyle: ChapterWritingStyle;
  /** Canonical Story Seed Fate Survival settings when the source has them. */
  fateSurvival?: StorySeedFateSurvivalSettings;
  /** Existing generation tier. Kept separate until an approved bridge exists. */
  fatePressureTier?: FatePressureTier;
  worldRules: string[];
  powerSystem: string;
  destinedEnding: string;
  glossaryEntries: GlossaryGenerationResult[];
}

/** Projects the current Workshop fixture without inventing missing Seed data. */
export function storyConstitutionFromScenario(
  scenario: MockChapterGenerationScenario,
): StoryConstitution {
  return {
    source: {
      kind: "workshop-fixture",
      contract: "StorySeedInput",
      schemaVersion: STORY_SEED_SCHEMA_VERSION,
      note: "Existing Workshop mock projected into the Story Constitution package; canonical generation sources should use storyConstitutionFromSeed.",
    },
    mainCharacterName: scenario.mcName,
    genre: scenario.genre,
    storyTags: [...scenario.storyTags],
    corePremise: scenario.customPremise,
    storyStyle: undefined,
    styleBible: scenario.styleBible,
    tropeRules: scenario.tropeRules,
    culturalProseStyleId: scenario.culturalProseStyleId,
    accessibilityStyle: normalizeChapterWritingStyle(scenario.chapterWritingStyle),
    fateSurvival: undefined,
    fatePressureTier: scenario.fatePressure,
    worldRules: [...scenario.memory.worldRules],
    powerSystem: scenario.memory.powerSystem,
    destinedEnding: scenario.memory.destinedEnding,
    glossaryEntries: scenario.glossaryEntries,
  };
}

/**
 * Canonical adapter from the finalized Story Seed contract and its reviewed
 * Blueprint. Unapproved vocabulary bridges are deliberately left undefined;
 * packet assembly flags them instead of guessing.
 */
export function storyConstitutionFromSeed(
  seed: StorySeedInput,
  blueprint?: WorldBlueprint,
): StoryConstitution {
  assertValidStorySeedInput(seed);
  const foundations = seed.world.optional.worldFoundations;

  return {
    source: {
      kind: "story-seed",
      schemaVersion: STORY_SEED_SCHEMA_VERSION,
      blueprintVersion: blueprint?.blueprintVersion ?? WORLD_BLUEPRINT_VERSION,
    },
    storySeed: seed,
    ...(blueprint ? { worldBlueprint: blueprint } : {}),
    mainCharacterName: blueprint?.mainCharacter?.name || foundations.mainCharacter?.name || "",
    genre: seed.story.required.genre,
    storyTags: [...seed.story.required.storyTags],
    corePremise: seed.story.required.premise,
    storyStyle: normalizeStoryStyle(seed.story.required.style),
    styleBible: blueprint?.styleBible ?? "",
    tropeRules: blueprint?.tropeRules ?? "",
    culturalProseStyleId: undefined,
    accessibilityStyle: DEFAULT_CHAPTER_WRITING_STYLE,
    fateSurvival: { ...seed.story.optional.fateSurvival },
    fatePressureTier: undefined,
    worldRules: [],
    powerSystem: blueprint?.powerSystemOutline
      || foundations.powerSystem?.knownRanks
      || foundations.abilities?.startingPowerConcept
      || "",
    destinedEnding: blueprint?.destinedEnding || foundations.destinedEnding || "",
    glossaryEntries: [],
  };
}
