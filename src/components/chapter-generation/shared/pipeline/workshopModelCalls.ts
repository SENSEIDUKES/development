/**
 * Deterministic local stand-ins for the three model boundaries. They make the
 * Workshop safe to inspect while preserving the exact provider-shaped call
 * contracts that production adapters will implement later.
 */
import {
  appendSceneType,
  deriveSceneAnchors,
  selectNextScenePath,
  type SceneType,
} from "../lib/sceneRhythm";
import { createArcChapterPosition } from "../packets/livingStoryState";
import type { ChapterHandoff } from "../types";
import type {
  ChapterEffectSelection,
  ChapterPlan,
  ChapterProcessingResult,
  PlanChapterInput,
  ProcessChapterInput,
} from "./types";

/** Selects chapter effects from the permanent packet rules for one planned scene type. */
const planEffects = (sceneType: SceneType): ChapterEffectSelection[] => {
  const shared: ChapterEffectSelection[] = [
    {
      kind: "narration-metadata",
      intent: "Annotate narration and dialogue only where the manifested scene needs Reader coordination.",
      required: true,
    },
    {
      kind: "atmosphere",
      intent: "Carry only atmosphere directly supported by the planned setting and action.",
      required: true,
    },
    {
      kind: "narrative-cue",
      intent: "Return normalized scene metadata without inventing summary or memory updates.",
      required: true,
    },
  ];

  if (sceneType === "conflict") {
    shared.push({
      kind: "scene-music",
      intent: "Use restrained escalation music that follows the confrontation's intensity curve.",
      required: true,
    });
  }
  if (sceneType === "progression") {
    shared.push({
      kind: "system-panel",
      intent: "Surface a progression panel only if the manifested chapter earns a concrete state change.",
      required: false,
    });
  }
  if (sceneType === "worldBuilding") {
    shared.push({
      kind: "world-card",
      intent: "Reveal a World Card only for a genuinely new story entity or location discovery.",
      required: false,
    });
  }

  return shared;
};

/** Deterministically simulates the structured Stage 2 planning call. */
export function buildWorkshopChapterPlan(input: PlanChapterInput): ChapterPlan {
  const { chapterPacket, planningSignals } = input;
  const pressureTier = planningSignals.fatePressureTier
    ?? "Balanced";
  const selectedScenePath = chapterPacket.existingAnchors
    ? selectNextScenePath(
        pressureTier,
        chapterPacket.livingStoryState.scene.recentSceneTypes,
        chapterPacket.existingAnchors,
      )
    : undefined;
  const sceneType = selectedScenePath?.type ?? "worldBuilding";
  const fateSettings = chapterPacket.storyConstitution.fateSurvival;
  const fateApplies = Boolean(
    fateSettings?.enabled
    && selectedScenePath?.type === "conflict",
  );

  return {
    version: 1,
    chapterNumber: chapterPacket.chapterMission.number,
    arcChapterPosition: chapterPacket.arcChapterPosition.display,
    rhythmResponse: {
      recentSceneTypes: [...chapterPacket.livingStoryState.scene.recentSceneTypes],
      selectedPressureTier: pressureTier,
      direction: selectedScenePath?.reason
        ?? "No carried ending anchors are available, so establish the chapter from its mission and current state.",
    },
    selectedScenePath,
    resolvedSceneType: sceneType,
    fateSurvival: {
      configured: Boolean(fateSettings),
      applies: fateApplies,
      ...(fateSettings
        ? {
            visibility: fateSettings.visibility,
            pressure: fateSettings.pressure,
          }
        : {}),
      approach: fateApplies && fateSettings
        ? `Apply ${fateSettings.pressure} survival pressure with ${fateSettings.visibility} reader visibility only where this chapter's choices earn it.`
        : fateSettings?.enabled
          ? "Fate Survival is configured, but this chapter plan does not call for a fate event. Preserve the setting without forcing one."
          : "Fate Survival is disabled or not configured; do not manufacture a fate event for this chapter.",
    },
    effects: planEffects(sceneType),
    sceneProgression: [
      {
        order: 1,
        purpose: chapterPacket.chapterMission.contract?.requiredOpening
          ?? "Establish the current state without replaying prior events.",
        pacing: "Immediate continuity beat",
      },
      {
        order: 2,
        purpose: selectedScenePath?.anchor ?? chapterPacket.chapterMission.premise,
        pacing: chapterPacket.chapterMission.pacingDirective,
      },
      {
        order: 3,
        purpose: "Resolve the chapter mission far enough to create a concrete changed end state.",
        pacing: "Escalate, turn, then land the consequence",
      },
    ],
    pacing: {
      directive: chapterPacket.chapterMission.pacingDirective,
      shape: "Continue immediately, build through one causal progression, and end on a forward-driving consequence.",
    },
    intendedEnding: selectedScenePath?.anchor
      ?? `End after materially advancing: ${chapterPacket.chapterMission.premise}`,
    nextChapterHandoffTarget:
      "Record the final location, time, present characters, protagonist condition, open tension, completed events, and one immediate next action.",
  };
}

/** Deterministically simulates Stage 4 inspection and proposed-state output. */
export function buildWorkshopProcessingResult(
  input: ProcessChapterInput,
  nextChapterHandoff: ChapterHandoff,
): ChapterProcessingResult {
  const { chapterPacket, chapterPlan, manifestedChapter } = input;
  const currentState = chapterPacket.livingStoryState;
  const sceneType = chapterPlan.resolvedSceneType;
  const newAnchors = deriveSceneAnchors({
    handoff: nextChapterHandoff,
    worldBuildingSeed: currentState.scene.worldBuildingSeed,
  });
  const characterChanges = manifestedChapter.statsChangeMessage
    && manifestedChapter.statsChangeMessage !== "None"
    ? [manifestedChapter.statsChangeMessage]
    : [];
  const worldStateChanges = [...nextChapterHandoff.completedEvents];
  const characterStateUpdates = { abilities: [] as unknown[] };
  const codexUpdates = {
    characters: [],
    bestiary: [],
    factions: [],
    locations: [],
    artifacts: [],
  };
  const proposedLivingStoryState = {
    ...currentState,
    position: createArcChapterPosition(
      chapterPacket.chapterMission.number + 1,
      currentState.position.chaptersInArc,
    ),
    contextBlocks: [
      ...currentState.contextBlocks,
      {
        kind: "recent-summary" as const,
        chapterNumber: manifestedChapter.chapterNumber,
        text: manifestedChapter.summary ?? manifestedChapter.generatedContent,
      },
    ],
    previousHandoff: nextChapterHandoff,
    recentFingerprints: [
      ...currentState.recentFingerprints,
      ...nextChapterHandoff.fingerprints,
    ],
    characterState: {
      ...currentState.characterState,
      abilities: [...currentState.characterState.abilities],
    },
    threads: {
      unresolved: currentState.threads.unresolved.map(thread => ({ ...thread })),
      resolved: [...currentState.threads.resolved],
    },
    codex: {
      characters: currentState.codex.characters.map(entry => ({ ...entry })),
      bestiary: (currentState.codex.bestiary ?? []).map(entry => ({ ...entry })),
      factions: currentState.codex.factions.map(entry => ({ ...entry })),
      locations: currentState.codex.locations.map(entry => ({ ...entry })),
      artifacts: currentState.codex.artifacts.map(entry => ({ ...entry })),
    },
    scene: {
      ...currentState.scene,
      recentSceneTypes: appendSceneType(currentState.scene.recentSceneTypes, sceneType),
      carriedAnchors: newAnchors,
    },
    carriedChanges: [
      ...(currentState.carriedChanges ?? []),
      {
        chapterNumber: chapterPacket.chapterMission.number,
        characterChanges,
        worldStateChanges,
        threadChanges: [],
        completedThreads: [],
        characterStateUpdates,
        codexUpdates,
      },
    ],
  };

  return {
    version: 1,
    newAnchors,
    characterChanges,
    worldStateChanges,
    characterStateUpdates,
    codexUpdates,
    threads: {
      completed: [],
      changed: [],
      unresolved: currentState.threads.unresolved.map(thread => ({ ...thread })),
    },
    missionCompletion: {
      completed: true,
      evidence: manifestedChapter.summary
        ?? "The manifested chapter advances the Chapter Mission and reaches a new end state.",
    },
    continuityFindings: [{
      severity: "info",
      code: "continuity-ok",
      message: "The chapter continues from the packet's opening state and supplies a forward handoff.",
    }],
    repetitionFindings: [],
    identityWarnings: [],
    nextChapterHandoff,
    proposedLivingStoryState,
    repairRecommended: false,
  };
}
