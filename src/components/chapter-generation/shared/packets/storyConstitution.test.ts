import { describe, expect, it } from "vitest";
import type { WorldBlueprint } from "../../../story-seed/shared/types";
import { STORY_SEED_SCHEMA_VERSION } from "../../../story-seed/shared/storySeedSchema";
import type { StorySeedInput } from "../../../story-seed/shared/storySeedSchema";
import { ESTABLISHED_SCENARIO } from "../fixtures/mockGenerationData";
import { storyConstitutionFromScenario, storyConstitutionFromSeed } from "./storyConstitution";

const finalizedSeed: StorySeedInput = {
  creator: {},
  story: {
    required: {
      storyTags: ["underdog", "mentor-bond"],
      premise: "A disgraced outer disciple discovers a forbidden manual.",
      genre: "Xianxia",
      style: "chinese",
    },
    optional: {
      intendedForMatureAudiences: false,
      fateSurvival: { enabled: true, visibility: "partial", pressure: "immortal" },
      plotAndTropeSettings: {},
    },
  },
  world: {
    required: {},
    optional: {
      worldIdentity: {},
      worldFoundations: {
        mainCharacter: { name: "Wen Shu" },
        powerSystem: { knownRanks: "Body Tempering > Qi Condensation" },
        destinedEnding: "Wen Shu masters or is consumed by the forbidden method.",
      },
    },
  },
};

const blueprint: WorldBlueprint = {
  title: "The Cauldron Wakes",
  logline: "A quiet disciple inherits a buried method.",
  worldOverview: "Sect territories under thinning spiritual qi.",
  startingLocation: "Azure Bell Sect",
  societyStructure: "Strict inner/outer disciple hierarchy",
  powerSystemOutline: "Body Tempering -> Qi Condensation -> Core Formation",
  mainCharacter: {
    name: "Wen Shu",
    age: "",
    personality: "Quiet and persistent",
    appearance: "",
    backgroundProfile: "Outer disciple",
  },
  mcProfile: "Outer disciple",
  majorFactions: ["Azure Bell Sect"],
  initialCharacters: ["Elder Nan"],
  majorMysteries: ["Who sealed the manual?"],
  firstArcPromise: "The tomb's seal wakes.",
  tropeRules: "No early face-slap.",
  styleBible: "Grounded, wistful prose.",
  destinedEnding: "Wen Shu masters the Ashfall Continuum on his own terms.",
  estimatedArcs: 1,
  unresolvedPlotThreads: [],
};

describe("Story Constitution packet", () => {
  it("projects the current Workshop scenario without inventing missing Seed fields", () => {
    const constitution = storyConstitutionFromScenario(ESTABLISHED_SCENARIO);

    expect(constitution.source).toMatchObject({
      kind: "workshop-fixture",
      contract: "StorySeedInput",
      schemaVersion: STORY_SEED_SCHEMA_VERSION,
    });
    expect(constitution).toMatchObject({
      mainCharacterName: "Wen Shu",
      genre: "Xianxia",
      storyTags: ["underdog", "mentor-bond", "slow-burn romance"],
      corePremise: ESTABLISHED_SCENARIO.customPremise,
      styleBible: ESTABLISHED_SCENARIO.styleBible,
      tropeRules: ESTABLISHED_SCENARIO.tropeRules,
      culturalProseStyleId: "chinese-classical-worldbuilding",
      accessibilityStyle: "Standard",
      fatePressureTier: "Balanced",
      worldRules: ESTABLISHED_SCENARIO.memory.worldRules,
      powerSystem: ESTABLISHED_SCENARIO.memory.powerSystem,
      destinedEnding: ESTABLISHED_SCENARIO.memory.destinedEnding,
      glossaryEntries: ESTABLISHED_SCENARIO.glossaryEntries,
    });
    expect(constitution.storyStyle).toBeUndefined();
    expect(constitution.fateSurvival).toBeUndefined();
  });

  it("uses the finalized Story Seed contract and Blueprint as its canonical source", () => {
    const constitution = storyConstitutionFromSeed(finalizedSeed, blueprint);

    expect(constitution.source).toEqual({
      kind: "story-seed",
      schemaVersion: STORY_SEED_SCHEMA_VERSION,
      blueprintVersion: "v1.0",
    });
    expect(constitution).toMatchObject({
      mainCharacterName: "Wen Shu",
      genre: "Xianxia",
      storyTags: ["underdog", "mentor-bond"],
      corePremise: "A disgraced outer disciple discovers a forbidden manual.",
      storyStyle: "chinese",
      styleBible: "Grounded, wistful prose.",
      tropeRules: "No early face-slap.",
      accessibilityStyle: "Standard",
      fateSurvival: { enabled: true, visibility: "partial", pressure: "immortal" },
      powerSystem: "Body Tempering -> Qi Condensation -> Core Formation",
      destinedEnding: "Wen Shu masters the Ashfall Continuum on his own terms.",
      glossaryEntries: [],
    });
  });

  it("falls back to Seed foundations when no Blueprint is supplied", () => {
    const constitution = storyConstitutionFromSeed(finalizedSeed);

    expect(constitution.source).toEqual({
      kind: "story-seed",
      schemaVersion: STORY_SEED_SCHEMA_VERSION,
      blueprintVersion: "v1.0",
    });
    expect(constitution).toMatchObject({
      mainCharacterName: "Wen Shu",
      styleBible: "",
      tropeRules: "",
      powerSystem: "Body Tempering > Qi Condensation",
      destinedEnding: "Wen Shu masters or is consumed by the forbidden method.",
    });
  });

  it("keeps the Story Seed main-character identity when an older Blueprint disagrees", () => {
    const constitution = storyConstitutionFromSeed(finalizedSeed, {
      ...blueprint,
      mainCharacter: {
        name: "Blueprint Placeholder",
        age: blueprint.mainCharacter?.age ?? "",
        personality: blueprint.mainCharacter?.personality ?? "",
        appearance: blueprint.mainCharacter?.appearance ?? "",
        backgroundProfile: blueprint.mainCharacter?.backgroundProfile ?? "",
      },
    });

    expect(constitution.mainCharacterName).toBe("Wen Shu");
  });

  it("leaves unapproved vocabulary bridges unset instead of guessing", () => {
    const constitution = storyConstitutionFromSeed(finalizedSeed, blueprint);

    expect(constitution.culturalProseStyleId).toBeUndefined();
    expect(constitution.fatePressureTier).toBeUndefined();
  });
});
