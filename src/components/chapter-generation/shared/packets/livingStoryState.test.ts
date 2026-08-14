import { describe, expect, it } from "vitest";
import { ESTABLISHED_SCENARIO, OPENING_SCENARIO } from "../fixtures/mockGenerationData";
import { createArcChapterPosition, livingStoryStateFromScenario } from "./livingStoryState";

describe("Living Story State packet", () => {
  it("formats the internal arc/chapter position", () => {
    expect(createArcChapterPosition(1)).toEqual({
      arcNumber: 1,
      chapterInArc: 1,
      chaptersInArc: 100,
      display: "Arc 1 — Chapter 1/100",
    });
    expect(createArcChapterPosition(100).display).toBe("Arc 1 — Chapter 100/100");
    expect(createArcChapterPosition(101).display).toBe("Arc 2 — Chapter 1/100");
    expect(createArcChapterPosition(6).display).toBe("Arc 1 — Chapter 6/100");
  });

  it("rejects invalid arc positions", () => {
    expect(() => createArcChapterPosition(0)).toThrow("positive integer");
    expect(() => createArcChapterPosition(1.5)).toThrow("positive integer");
    expect(() => createArcChapterPosition(1, 0)).toThrow("positive integer");
  });

  it("groups evolving state without duplicating Story Constitution fields", () => {
    const state = livingStoryStateFromScenario(ESTABLISHED_SCENARIO, {
      recentSceneTypes: ["worldBuilding", "conflict", "progression"],
    });

    expect(state.position.display).toBe("Arc 1 — Chapter 6/100");
    expect(state.contextBlocks).toBe(ESTABLISHED_SCENARIO.contextBlocks);
    expect(state.previousHandoff).toBe(ESTABLISHED_SCENARIO.previousHandoff);
    expect(state.recentFingerprints).toBe(ESTABLISHED_SCENARIO.recentFingerprints);
    expect(state.characterState).toEqual({
      currentPowerStage: ESTABLISHED_SCENARIO.memory.currentPowerStage,
      abilities: ESTABLISHED_SCENARIO.memory.abilities,
    });
    expect(state.threads).toEqual({
      unresolved: ESTABLISHED_SCENARIO.memory.unresolvedPlotThreads,
      resolved: ESTABLISHED_SCENARIO.memory.resolvedPlotThreads,
    });
    expect(state.codex).toEqual({
      characters: ESTABLISHED_SCENARIO.memory.characters,
      bestiary: ESTABLISHED_SCENARIO.memory.bestiary ?? [],
      factions: ESTABLISHED_SCENARIO.memory.factions,
      locations: ESTABLISHED_SCENARIO.memory.locations,
      artifacts: ESTABLISHED_SCENARIO.memory.artifacts,
    });
    expect(state.scene.recentSceneTypes).toEqual(["worldBuilding", "conflict", "progression"]);
    expect(state.scene.carriedAnchors).toEqual({
      worldBuilding: ESTABLISHED_SCENARIO.worldBuildingSeed,
      conflict: ESTABLISHED_SCENARIO.previousHandoff?.endState.openTension,
      progression: ESTABLISHED_SCENARIO.previousHandoff?.nextImmediateAction,
    });
    expect("powerSystem" in state.characterState).toBe(false);
    expect("worldRules" in state.characterState).toBe(false);
    expect("destinedEnding" in state.characterState).toBe(false);
  });

  it("keeps an opening chapter free of carried anchors", () => {
    const state = livingStoryStateFromScenario(OPENING_SCENARIO);

    expect(state.position.display).toBe("Arc 1 — Chapter 1/100");
    expect(state.previousHandoff).toBeUndefined();
    expect(state.scene.carriedAnchors).toBeUndefined();
  });
});
