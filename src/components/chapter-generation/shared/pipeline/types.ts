import type { GenerationStage } from "../stageTypes";
import type {
  ChapterContent,
  ChapterHandoff,
  ContextManifest,
} from "../types";
import type { ChapterMission } from "../packets/chapterMission";
import type {
  LivingStoryCharacterStateUpdate,
  LivingStoryCodexUpdates,
  LivingStoryState,
} from "../packets/livingStoryState";
import type { LivingStoryIdentityWarning } from "../packets/livingStoryEntityIdentity";
import type { StoryConstitution } from "../packets/storyConstitution";
import type {
  FatePressureTier,
  SceneAnchors,
  ScenePathSelection,
  SceneType,
} from "../lib/sceneRhythm";

export type ChapterPipelineStageKey =
  | "assemble-chapter-packet"
  | "plan-chapter"
  | "manifest-chapter"
  | "process-result";

export type ChapterModelCallKind = "plan" | "manifest" | "process" | "repair";

export interface ChapterPacketCulturalProse {
  source: "story-setting" | "workshop-override" | "fallback";
  styleId?: string;
  label?: string;
  instruction: string;
}

export interface ChapterPacketGenerationRules {
  systemInstruction: string;
  baseUserPrompt: string;
  permanentWritingInstructions: string;
  effectRules: string;
}

export interface ChapterPacketContextSection {
  key: string;
  text: string;
  estimatedTokens: number;
}

/** Serializable, model-visible packet assembled without a model call. */
export interface ChapterPacket {
  version: 1;
  /** The unresolved legacy FatePressureTier bridge is intentionally excluded. */
  storyConstitution: Omit<StoryConstitution, "fatePressureTier">;
  livingStoryState: LivingStoryState;
  chapterMission: ChapterMission;
  generationRules: ChapterPacketGenerationRules;
  existingAnchors?: SceneAnchors;
  relevantContext: {
    assembledText: string;
    sections: ChapterPacketContextSection[];
  };
  culturalProse: ChapterPacketCulturalProse;
  arcChapterPosition: LivingStoryState["position"];
  modelVisibleContext: string;
  contextManifest: ContextManifest;
}

export interface ChapterPlanningSignals {
  /** Workshop/adapter signal; separate from canonical Story Seed Fate Survival. */
  fatePressureTier?: FatePressureTier;
}

export interface ChapterFateDecision {
  configured: boolean;
  applies: boolean;
  /** Present only when Fate Survival is configured for the story. */
  visibility?: "full" | "partial" | "none";
  /** Present only when Fate Survival is configured for the story. */
  pressure?: "heaven" | "immortal" | "mortal";
  approach: string;
}

export type ChapterEffectKind =
  | "narration-metadata"
  | "beast-sound"
  | "system-panel"
  | "scene-music"
  | "atmosphere"
  | "narrative-cue";

export interface ChapterEffectSelection {
  kind: ChapterEffectKind;
  intent: string;
  required: boolean;
}

export interface ChapterPlan {
  version: 1;
  chapterNumber: number;
  arcChapterPosition: string;
  rhythmResponse: {
    recentSceneTypes: SceneType[];
    /** Present only when an adapter has an approved legacy pressure-tier source. */
    selectedPressureTier?: FatePressureTier;
    direction: string;
  };
  selectedScenePath?: ScenePathSelection;
  /** The selected path type, or the planner's explicit fallback when none exists. */
  resolvedSceneType: SceneType;
  fateSurvival: ChapterFateDecision;
  effects: ChapterEffectSelection[];
  sceneProgression: Array<{
    order: number;
    purpose: string;
    pacing: string;
  }>;
  pacing: {
    directive: string;
    shape: string;
  };
  intendedEnding: string;
  nextChapterHandoffTarget: string;
}

export interface ChapterProcessingFinding {
  severity: "info" | "warning" | "serious";
  code: string;
  message: string;
}

export interface ChapterProcessingResult {
  version: 1;
  newAnchors?: SceneAnchors;
  characterChanges: string[];
  worldStateChanges: string[];
  characterStateUpdates: LivingStoryCharacterStateUpdate;
  codexUpdates: LivingStoryCodexUpdates;
  threads: {
    completed: string[];
    changed: string[];
    unresolved: Array<{ description: string; originChapter: number }>;
  };
  missionCompletion: {
    completed: boolean;
    evidence: string;
  };
  continuityFindings: ChapterProcessingFinding[];
  repetitionFindings: ChapterProcessingFinding[];
  /** Code-generated diagnostics for conservative identity reconciliation. */
  identityWarnings: LivingStoryIdentityWarning[];
  nextChapterHandoff: ChapterHandoff;
  proposedLivingStoryState: LivingStoryState;
  repairRecommended: boolean;
}

export interface PlanChapterInput {
  chapterPacket: ChapterPacket;
  planningSignals: ChapterPlanningSignals;
}

export interface ManifestChapterInput {
  chapterPacket: ChapterPacket;
  chapterPlan: ChapterPlan;
  consolidatedPermanentInstructions: string;
}

export interface ProcessChapterInput {
  chapterPacket: ChapterPacket;
  chapterPlan: ChapterPlan;
  manifestedChapter: ChapterContent;
}

export interface RepairChapterInput extends ProcessChapterInput {
  processingResult: ChapterProcessingResult;
}

/**
 * Synchronous Workshop inspection boundary: three normal deterministic calls,
 * plus optional repair and reprocessing. Production services should preserve
 * these contracts behind their own asynchronous provider adapter.
 */
export interface ChapterGenerationModelCalls {
  planChapter(input: PlanChapterInput): ChapterPlan;
  manifestChapter(input: ManifestChapterInput): ChapterContent;
  processResult(input: ProcessChapterInput): ChapterProcessingResult;
  repairChapter?(input: RepairChapterInput): ChapterContent;
}

/** Server/provider boundary for the same calls when model work is asynchronous. */
export interface AsyncChapterGenerationModelCalls {
  planChapter(input: PlanChapterInput): Promise<ChapterPlan>;
  manifestChapter(input: ManifestChapterInput): Promise<ChapterContent>;
  processResult(input: ProcessChapterInput): Promise<ChapterProcessingResult>;
  repairChapter?(input: RepairChapterInput): Promise<ChapterContent>;
}

export interface ChapterPipelineRun {
  stages: GenerationStage[];
  finalOutput: ChapterContent;
  chapterPacket: ChapterPacket;
  chapterPlan: ChapterPlan;
  manifestedChapter: ChapterContent;
  processingResult: ChapterProcessingResult;
  modelCalls: ChapterModelCallKind[];
  repairApplied: boolean;
}
