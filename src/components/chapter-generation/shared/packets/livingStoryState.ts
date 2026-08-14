/**
 * Living Story State — story-owned data that changes as chapters are written.
 * Permanent world rules and Story Seed settings intentionally live in the
 * Story Constitution instead of being duplicated here.
 */
import type { MockChapterGenerationScenario } from "../fixtures/mockGenerationData";
import { deriveSceneAnchors, type SceneAnchors, type SceneType } from "../lib/sceneRhythm";
import type {
  ChapterHandoff,
  ContextBlock,
  SceneFingerprint,
} from "../types";
import type { ArcChapterPosition } from "./types";

export interface LivingStoryCharacterState {
  currentPowerStage: string;
  abilities: unknown[];
}

export interface LivingStoryThreads {
  unresolved: Array<{ description: string; originChapter: number }>;
  resolved: string[];
}

export interface LivingStoryCodex {
  characters: Record<string, unknown>[];
  /** Species records; named non-human individuals remain in `characters`. */
  bestiary?: Record<string, unknown>[];
  factions: Record<string, unknown>[];
  locations: Record<string, unknown>[];
  artifacts: Record<string, unknown>[];
}

export interface LivingStoryCharacterStateUpdate {
  currentPowerStage?: string;
  abilities: unknown[];
}

export interface LivingStoryCodexUpdates {
  characters: Record<string, unknown>[];
  bestiary?: Record<string, unknown>[];
  factions: Record<string, unknown>[];
  locations: Record<string, unknown>[];
  artifacts: Record<string, unknown>[];
}

/**
 * Explicit carry-forward ledger for processed changes that do not yet have a
 * more specific canonical field. Nothing discovered by Process Result is
 * discarded merely because Pass 2 has no permanent Codex/persistence layer.
 */
export interface LivingStoryChangeLogEntry {
  chapterNumber: number;
  characterChanges: string[];
  worldStateChanges: string[];
  threadChanges: string[];
  completedThreads: string[];
  characterStateUpdates: LivingStoryCharacterStateUpdate;
  codexUpdates: LivingStoryCodexUpdates;
}

export interface LivingStorySceneState {
  worldBuildingSeed: string;
  recentSceneTypes: SceneType[];
  carriedAnchors?: SceneAnchors;
}

export interface LivingStoryState {
  position: ArcChapterPosition;
  contextBlocks: ContextBlock[];
  previousHandoff?: ChapterHandoff;
  recentFingerprints: SceneFingerprint[];
  characterState: LivingStoryCharacterState;
  threads: LivingStoryThreads;
  codex: LivingStoryCodex;
  scene: LivingStorySceneState;
  carriedChanges: LivingStoryChangeLogEntry[];
}

/** Formats the internal arc-local position used by packet assembly. */
export function createArcChapterPosition(
  chapterNumber: number,
  chaptersInArc: number = 100,
): ArcChapterPosition {
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    throw new Error("chapterNumber must be a positive integer.");
  }
  if (!Number.isInteger(chaptersInArc) || chaptersInArc < 1) {
    throw new Error("chaptersInArc must be a positive integer.");
  }

  const arcNumber = Math.floor((chapterNumber - 1) / chaptersInArc) + 1;
  const chapterInArc = ((chapterNumber - 1) % chaptersInArc) + 1;
  return {
    arcNumber,
    chapterInArc,
    chaptersInArc,
    display: `Arc ${arcNumber} — Chapter ${chapterInArc}/${chaptersInArc}`,
  };
}

export interface LivingStoryStateOptions {
  recentSceneTypes?: SceneType[];
}

/** Projects the evolving half of the current Workshop scenario. */
export function livingStoryStateFromScenario(
  scenario: MockChapterGenerationScenario,
  options: LivingStoryStateOptions = {},
): LivingStoryState {
  return {
    position: createArcChapterPosition(scenario.currentChapter.number),
    contextBlocks: scenario.contextBlocks,
    previousHandoff: scenario.previousHandoff,
    recentFingerprints: scenario.recentFingerprints,
    characterState: {
      currentPowerStage: scenario.memory.currentPowerStage,
      abilities: scenario.memory.abilities,
    },
    threads: {
      unresolved: scenario.memory.unresolvedPlotThreads,
      resolved: scenario.memory.resolvedPlotThreads,
    },
    codex: {
      characters: scenario.memory.characters,
      bestiary: scenario.memory.bestiary ?? [],
      factions: scenario.memory.factions,
      locations: scenario.memory.locations,
      artifacts: scenario.memory.artifacts,
    },
    scene: {
      worldBuildingSeed: scenario.worldBuildingSeed,
      recentSceneTypes: [...(options.recentSceneTypes ?? [])],
      carriedAnchors: scenario.previousHandoff
        ? deriveSceneAnchors({
            handoff: scenario.previousHandoff,
            worldBuildingSeed: scenario.worldBuildingSeed,
          })
        : undefined,
    },
    carriedChanges: [],
  };
}
