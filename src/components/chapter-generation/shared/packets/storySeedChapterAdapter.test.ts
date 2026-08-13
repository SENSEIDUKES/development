import { describe, expect, it } from "vitest";
import type { StorySeedInput } from "../../../story-seed/shared/storySeedSchema";
import { parseStorySeedJson } from "../../../story-seed/shared/storySeedSerialization";
import type { WorldBlueprint } from "../../../story-seed/shared/types";
import { assembleChapterPacket } from "../pipeline/assembleChapterPacket";
import { adaptFinalizedStorySeedToChapterContracts } from "./storySeedChapterAdapter";

const seed = (): StorySeedInput => ({
  creator: {},
  story: {
    required: {
      storyTags: ["court intrigue", "fate"],
      premise: "A banished heir can remember the six timelines in which the capital fell.",
      genre: "Xianxia political fantasy",
      style: "chinese",
    },
    optional: {
      intendedForMatureAudiences: false,
      fateSurvival: { enabled: true, visibility: "partial", pressure: "heaven" },
      plotAndTropeSettings: {
        faceSlap: "low",
        plotArmor: "medium",
        recognition: "medium",
        longTermGoal: "Prevent the celestial regent from opening the dead gate.",
        firstMajorConflict: "Survive the succession hearing without revealing the remembered timelines.",
        mainAntagonistPressure: "The regent controls the tribunal.",
      },
      additionalStoryDirection: "Let alliances form through costly choices.",
      makeItWorkInstruction: "Make foreknowledge useful but never certain.",
    },
  },
  world: {
    required: {},
    optional: {
      worldIdentity: {
        title: "The Seventh Crown",
        worldType: "A cultivation empire beneath a sealed dead heaven",
        societyStructure: "Imperial clans and oath-bound sects",
        startingLocation: "The rain court beneath Vermilion Palace",
      },
      worldFoundations: {
        mainCharacter: {
          name: "Jin Rui",
          startingIdentity: "Banished seventh heir",
          personality: "Measured and relentlessly observant",
          startingWeakness: "A shattered oath meridian",
        },
        additionalCharacters: [{
          id: "seed-character-1",
          name: "Minister Sui",
          aliases: ["The Quiet Minister"],
          skinTone: "warm bronze",
          eyeColor: "silver",
          powerType: "Oath seals",
          rankLevel: "Seal Heart",
          role: "Reluctant witness",
          connectionToMC: "Uneasy ally",
          bio: "A tribunal minister who remembers one impossible verdict.",
        }],
        factions: [{
          id: "seed-faction-1",
          name: "Vermilion Tribunal",
          role: "Succession court",
          powerLevel: "Crown Soul authority",
          alignment: "Neutral",
          connectionToMC: "Controls Jin Rui's succession hearing",
          description: "The oath-bound court that verifies imperial succession.",
        }],
        abilities: {
          startingPowerConcept: "Oath-sight",
          uniquePath: "Read the fractures left by broken promises",
        },
        powerSystem: { knownRanks: "Oath Spark → Seal Heart → Crown Soul" },
        destinedEnding: "The seventh crown is accepted or destroyed by its final bearer.",
      },
    },
  },
});

const blueprint = (): WorldBlueprint => ({
  blueprintVersion: "v1.0",
  title: "The Seventh Crown",
  logline: "A banished heir returns to the hearing that killed the empire six times.",
  worldOverview: "Every imperial oath leaves a visible fracture in the dead heaven.",
  startingLocation: "The rain court beneath Vermilion Palace",
  societyStructure: "Imperial clans and oath-bound sects",
  powerSystemOutline: "Oaths become meridians; broken vows become weapons.",
  mainCharacter: {
    name: "Jin Rui",
    age: "Twenty-three",
    personality: "Measured and relentlessly observant",
    appearance: "Black court robes stitched with a severed seventh sun",
    backgroundProfile: "The banished seventh heir remembers six failed timelines.",
  },
  mcProfile: "The banished seventh heir remembers six failed timelines.",
  majorFactions: ["Vermilion Tribunal", "Regent's Bronze Guard"],
  initialCharacters: ["Minister Sui", "Regent Zhao"],
  majorMysteries: ["Who taught the dead heaven to remember broken oaths?"],
  firstArcPromise: "Jin Rui must survive the succession hearing and identify who changes the seventh timeline.",
  tropeRules: "Foreknowledge creates choices, not automatic victories.",
  styleBible: "Restrained court tension, precise sensory detail, and sudden ritual spectacle.",
  destinedEnding: "The seventh crown is accepted or destroyed by its final bearer.",
  estimatedArcs: 7,
  unresolvedPlotThreads: ["The regent recognizes a gesture Jin Rui only made in another timeline."],
});

describe("finalized Story Seed to Chapter Generation adapter", () => {
  it("maps canonical Story Seed and Blueprint data into all four packet contracts", () => {
    const adapted = adaptFinalizedStorySeedToChapterContracts({
      seed: seed(),
      blueprint: blueprint(),
      temporaryInstruction: "Keep the hearing quiet until the first oath breaks.",
    });
    const packet = assembleChapterPacket(adapted.contracts);

    expect(packet.storyConstitution.source.kind).toBe("story-seed");
    expect(packet.storyConstitution.storySeed?.story.optional.makeItWorkInstruction)
      .toBe("Make foreknowledge useful but never certain.");
    expect(packet.storyConstitution.worldBlueprint?.worldOverview)
      .toContain("imperial oath");
    expect(packet.storyConstitution.mainCharacterName).toBe("Jin Rui");
    expect(packet.storyConstitution.fateSurvival).toEqual({
      enabled: true,
      visibility: "partial",
      pressure: "heaven",
    });
    expect(packet.livingStoryState.position.display).toBe("Arc 1 — Chapter 1/100");
    expect(packet.livingStoryState.contextBlocks).toEqual([]);
    expect(packet.livingStoryState.previousHandoff).toBeUndefined();
    expect(packet.livingStoryState.codex.characters.map(character => character.name))
      .toEqual(["Jin Rui", "Minister Sui", "Regent Zhao"]);
    expect(packet.livingStoryState.codex.factions.map(faction => faction.name))
      .toEqual(["Vermilion Tribunal", "Regent's Bronze Guard"]);
    expect(packet.livingStoryState.codex.characters[1]).toMatchObject({
      id: "seed-character-1",
      aliases: ["The Quiet Minister"],
      rankLevel: "Seal Heart",
      connectionToMC: "Uneasy ally",
    });
    expect(packet.livingStoryState.threads.unresolved.map(thread => thread.description))
      .toEqual([
        "The regent recognizes a gesture Jin Rui only made in another timeline.",
      ]);
    expect(packet.livingStoryState.threads.unresolved.map(thread => thread.originChapter))
      .toEqual([1]);
    expect(packet.chapterMission.premise).toBe(blueprint().firstArcPromise);
    expect(packet.chapterMission.pacingDirective)
      .toBe("Keep the hearing quiet until the first oath breaks.");
    expect(packet.chapterMission.contract?.startingState?.location)
      .toBe("The rain court beneath Vermilion Palace");
    expect(packet.generationRules.permanentWritingInstructions)
      .toContain("PERMANENT SYSTEM AND FORMAT RULES");
    expect(packet.generationRules.permanentWritingInstructions)
      .toContain('containing an "id" (unique string), "type"');
    expect(packet.generationRules.permanentWritingInstructions)
      .not.toContain("code supplies them");
    expect(packet.generationRules.effectRules)
      .toContain("For any Celestial Library system moment");
    expect(adapted.mapping.chapterMissionSource).toBe("WorldBlueprint.firstArcPromise");
  });

  it("never substitutes Workshop fixture data when the Blueprint is missing", () => {
    expect(() => adaptFinalizedStorySeedToChapterContracts({
      seed: seed(),
      blueprint: undefined as unknown as WorldBlueprint,
    })).toThrow(/No Workshop fixture data was substituted/);

    expect(() => adaptFinalizedStorySeedToChapterContracts({
      seed: seed(),
      blueprint: {} as WorldBlueprint,
    })).toThrow(/Missing Blueprint fields/);

    expect(() => adaptFinalizedStorySeedToChapterContracts({
      seed: seed(),
      blueprint: { ...blueprint(), firstArcPromise: "", estimatedArcs: 0 },
    })).toThrow(/firstArcPromise, estimatedArcs/);

    const [strictUpload] = parseStorySeedJson(JSON.stringify({
      seed: seed(),
      blueprint: { blueprintVersion: "v1.0", title: "Partial Blueprint" },
    }), { normalizeBlueprint: false });
    expect(() => adaptFinalizedStorySeedToChapterContracts({
      seed: strictUpload.seed,
      blueprint: strictUpload.blueprint!,
    })).toThrow(/Missing Blueprint fields/);
  });

  it("keeps unresolved vocabulary bridges explicit instead of guessing", () => {
    const adapted = adaptFinalizedStorySeedToChapterContracts({
      seed: seed(),
      blueprint: blueprint(),
    });
    const serialized = JSON.stringify(adapted.contracts);

    expect(adapted.mapping.unresolved.map(note => note.id)).toEqual(expect.arrayContaining([
      "blueprint-finalization-status",
      "world-rules",
      "glossary",
      "story-style-cultural-prose",
      "accessibility-style",
      "fate-pressure-tier",
    ]));
    expect(adapted.contracts.storyConstitution.worldRules).toEqual([]);
    expect(adapted.contracts.storyConstitution.glossaryEntries).toEqual([]);
    expect(adapted.contracts.storyConstitution.fatePressureTier).toBeUndefined();
    expect(adapted.contracts.storyConstitution.culturalProseStyleId).toBeUndefined();
    expect(serialized).not.toContain("workshop-fixture");
    expect(serialized).not.toContain("Wen Shu");
  });

  it("keeps Blueprint labels generator-facing without identity reconciliation", () => {
    const identitySeed = seed();
    identitySeed.world.optional.worldIdentity.startingLocation = "The Lower Periphery";
    identitySeed.world.optional.worldFoundations.mainCharacter = {
      name: "Yan Shi",
      startingIdentity: "Outer disciple",
    };
    identitySeed.world.optional.worldFoundations.additionalCharacters = [{
      id: "seed-feng",
      name: "Sect Master Feng",
      role: "Outer sect master",
    }];
    const identityBlueprint = blueprint();
    identityBlueprint.mainCharacter = {
      ...identityBlueprint.mainCharacter!,
      name: "Yan Shi (Protagonist)",
    };
    identityBlueprint.initialCharacters = [
      "Yan Shi (Protagonist)",
      "Sect Master Feng (The antagonist of the outer sect)",
    ];
    identityBlueprint.startingLocation =
      "The Lower Periphery, a sprawling district beneath the outer sect";

    const state = adaptFinalizedStorySeedToChapterContracts({
      seed: identitySeed,
      blueprint: identityBlueprint,
    }).contracts.livingStoryState;

    expect(state.codex.characters.map(character => character.name)).toEqual([
      "Yan Shi",
      "Sect Master Feng",
      "Yan Shi (Protagonist)",
      "Sect Master Feng (The antagonist of the outer sect)",
    ]);
    expect(state.codex.characters[0]).toMatchObject({ name: "Yan Shi" });
    expect(state.codex.characters[0]).not.toHaveProperty("id");
    expect(state.codex.characters[0]).not.toHaveProperty("blueprintDescription");
    expect(state.codex.characters[1]).toMatchObject({
      id: "seed-feng",
      name: "Sect Master Feng",
    });
    expect(state.codex.characters[2]).toEqual({
      name: "Yan Shi (Protagonist)",
      source: "WorldBlueprint.initialCharacters",
    });
    expect(state.codex.characters[3]).toEqual({
      name: "Sect Master Feng (The antagonist of the outer sect)",
      source: "WorldBlueprint.initialCharacters",
    });
    expect(state.codex.locations).toHaveLength(1);
    expect(state.codex.locations[0]).toMatchObject({
      name: "The Lower Periphery",
    });
    expect(state.codex.locations[0]).not.toHaveProperty("id");
    expect(state.codex.locations[0]).not.toHaveProperty("aliases");
    expect(state.characterState.abilities[0]).not.toHaveProperty("id");
    expect(JSON.stringify(state)).not.toContain("dev-character-");
    expect(JSON.stringify(state)).not.toContain("dev-location-");
  });
});
