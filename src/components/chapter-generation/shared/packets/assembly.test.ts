import { describe, expect, it } from "vitest";
import { ESTABLISHED_SCENARIO } from "../fixtures/mockGenerationData";
import { buildChapterContract } from "../lib/chapterHandoff";
import type { ChapterInstructionOwnerId } from "./types";
import {
  assembleChapterGenerationPacket,
  buildLegacyGenerationMemory,
} from "./assembly";

const EXPECTED_TRACE_IDS = [
  "story-identity",
  "style-bible",
  "trope-rules",
  "story-style",
  "cultural-prose-setting",
  "accessibility-style-setting",
  "fate-survival-settings",
  "permanent-world-rules",
  "power-system-definition",
  "destined-ending",
  "glossary-guidance-data",
  "arc-chapter-position",
  "current-power-stage",
  "ability-ledger",
  "active-threads-data",
  "resolved-threads",
  "codex-characters",
  "codex-bestiary",
  "codex-factions",
  "codex-locations",
  "codex-artifacts",
  "previous-ending-anchor",
  "recent-chapter-blocks",
  "rag-memories",
  "arc-summaries",
  "previous-handoff",
  "recent-fingerprints",
  "carried-scene-anchors",
  "recent-scene-rhythm",
  "chapter-number-title-premise",
  "chapter-contract-objective",
  "chapter-required-opening",
  "chapter-starting-state",
  "chapter-do-not-repeat",
  "chapter-completion-criteria",
  "pacing-directive",
  "next-scene-direction",
  "fallback-opening-summary",
  "fixed-system-prompt",
  "user-prompt-template",
  "pinned-premise-template",
  "main-character-state-renderer",
  "history-anchor-selection",
  "style-directive-template",
  "author-context-authority",
  "immediate-continuation-rule",
  "chapter-length-expansion-directives",
  "ndjson-output-structure",
  "story-block-metadata-format",
  "system-event-format",
  "world-card-format",
  "music-atmosphere-cue-format",
  "beast-event-format",
  "content-safety-protocols",
  "anti-drift-continuity",
  "narrative-surface-hygiene",
  "glossary-block-renderer",
  "writing-style-renderer",
  "cultural-prose-renderer",
  "fate-pressure-renderer",
  "pacing-block-renderer",
  "next-scene-block-renderer",
  "thread-aging-renderer",
  "context-budgeting-rules",
  "context-manifest-envelope",
  "response-cleanup-rules",
] as const;

const EXPECTED_FLAG_IDS = [
  "fixture-fate-pressure-field",
  "chapter-writing-style-ownership",
  "fate-pressure-vocabulary-bridge",
  "story-style-cultural-prose-bridge",
  "workshop-inspection-only-modules",
  "story-administrative-metadata",
  "legacy-context-engine-v1-prompt-branch",
  "seed-world-rules-bridge",
  "seed-glossary-bridge",
] as const;

describe("Chapter Generation packet assembly", () => {
  it("assembles all four packages from the existing scenario", () => {
    const packet = assembleChapterGenerationPacket(ESTABLISHED_SCENARIO, {
      recentSceneTypes: ["worldBuilding", "conflict", "progression"],
    });

    expect(packet.storyConstitution.mainCharacterName).toBe("Wen Shu");
    expect(packet.livingStoryState.position.display).toBe("Arc 1 — Chapter 6/100");
    expect(packet.chapterMission).toMatchObject({
      number: 6,
      title: "What the Seal Let Out",
      premise: ESTABLISHED_SCENARIO.currentChapter.premise,
      pacingDirective: ESTABLISHED_SCENARIO.pacingDirective,
    });
    expect(packet.chapterMission.contract).toEqual(buildChapterContract({
      chapterNumber: 6,
      premise: ESTABLISHED_SCENARIO.currentChapter.premise,
      previousHandoff: ESTABLISHED_SCENARIO.previousHandoff,
      recentFingerprints: ESTABLISHED_SCENARIO.recentFingerprints,
    }));
    expect(packet.chapterMission).not.toHaveProperty("selectedScenePath");
    expect(packet.generationRules.prompts.system).toContain("OUTPUT FORMAT TARGET");
    expect(buildLegacyGenerationMemory(packet)).toEqual(ESTABLISHED_SCENARIO.memory);
  });

  it("traces every tracked instruction exactly once into a valid owner", () => {
    const packet = assembleChapterGenerationPacket(ESTABLISHED_SCENARIO);
    const validOwners: ChapterInstructionOwnerId[] = [
      "storyConstitution",
      "livingStoryState",
      "chapterMission",
      "generationRules",
      "chapterPlan",
    ];
    const ids = packet.trace.map(entry => entry.id);

    expect(packet.trace).toHaveLength(66);
    expect(new Set(ids).size).toBe(ids.length);
    packet.trace.forEach(entry => {
      expect(validOwners).toContain(entry.packageId);
      if (entry.rendererPackageId) expect(entry.rendererPackageId).toBe("generationRules");
    });

    expect([...ids].sort()).toEqual([...EXPECTED_TRACE_IDS].sort());
  });

  it("retains unresolved or foreign items as explicit flags", () => {
    const packet = assembleChapterGenerationPacket(ESTABLISHED_SCENARIO);
    const flagIds = packet.flags.map(flag => flag.id);
    const flags = Object.fromEntries(packet.flags.map(flag => [flag.id, flag]));

    expect(packet.flags).toHaveLength(9);
    expect(new Set(flagIds).size).toBe(flagIds.length);
    expect([...flagIds].sort()).toEqual([...EXPECTED_FLAG_IDS].sort());
    expect(flags["fixture-fate-pressure-field"]?.severity).toBe("dead-field");
    expect(flags["chapter-writing-style-ownership"]?.severity).toBe("needs-owner-decision");
    expect(flags["fate-pressure-vocabulary-bridge"]?.severity).toBe("needs-owner-decision");
    expect(flags["story-style-cultural-prose-bridge"]?.severity).toBe("needs-owner-decision");
    expect(flags["workshop-inspection-only-modules"]?.severity).toBe("out-of-scope");
    expect(flags["legacy-context-engine-v1-prompt-branch"]?.severity).toBe("dead-field");
    expect(flags["seed-world-rules-bridge"]?.severity).toBe("needs-owner-decision");
    expect(flags["seed-glossary-bridge"]?.severity).toBe("needs-owner-decision");
  });
});
