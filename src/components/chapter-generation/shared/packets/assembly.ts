/**
 * Packet assembly and traceability for Chapter Generation 1.0.
 *
 * This module is the single internal boundary where the existing scenario
 * shape is reorganized into the four packages consumed by the four-stage
 * Chapter Generation 1.0 pipeline.
 */
import type { MockChapterGenerationScenario } from "../fixtures/mockGenerationData";
import type { SceneType } from "../lib/sceneRhythm";
import {
  chapterMissionFromScenario,
  type ChapterMission,
} from "./chapterMission";
import {
  buildGenerationRules,
  type GenerationRules,
} from "./generationRules";
import {
  livingStoryStateFromScenario,
  type LivingStoryState,
} from "./livingStoryState";
import {
  storyConstitutionFromScenario,
  type StoryConstitution,
} from "./storyConstitution";
import type {
  ChapterInstructionTrace,
  ChapterPackageFlag,
} from "./types";

export interface ChapterGenerationPacket {
  storyConstitution: StoryConstitution;
  livingStoryState: LivingStoryState;
  chapterMission: ChapterMission;
  generationRules: GenerationRules;
  trace: readonly ChapterInstructionTrace[];
  flags: readonly ChapterPackageFlag[];
}

export interface ChapterGenerationPacketOptions {
  recentSceneTypes?: SceneType[];
}

/** Projects one scenario into the four Pass 1 information contracts. */
export function assembleChapterGenerationPacket(
  scenario: MockChapterGenerationScenario,
  options: ChapterGenerationPacketOptions = {},
): ChapterGenerationPacket {
  const storyConstitution = storyConstitutionFromScenario(scenario);
  const livingStoryState = livingStoryStateFromScenario(scenario, {
    recentSceneTypes: options.recentSceneTypes,
  });
  const chapterMission = chapterMissionFromScenario(scenario, livingStoryState);

  return {
    storyConstitution,
    livingStoryState,
    chapterMission,
    generationRules: buildGenerationRules(),
    trace: CHAPTER_GENERATION_PACKAGE_TRACE,
    flags: CHAPTER_GENERATION_PACKAGE_FLAGS,
  };
}

/**
 * Rebuilds the legacy memory view expected by the ported production modules.
 * Permanent fields come from Story Constitution; evolving fields come from
 * Living Story State, so the two packages do not store duplicate copies.
 */
export function buildLegacyGenerationMemory(
  packet: Pick<ChapterGenerationPacket, "storyConstitution" | "livingStoryState">,
): MockChapterGenerationScenario["memory"] {
  const { storyConstitution, livingStoryState } = packet;
  return {
    powerSystem: storyConstitution.powerSystem,
    currentPowerStage: livingStoryState.characterState.currentPowerStage,
    worldRules: [...storyConstitution.worldRules],
    abilities: livingStoryState.characterState.abilities,
    unresolvedPlotThreads: livingStoryState.threads.unresolved,
    resolvedPlotThreads: livingStoryState.threads.resolved,
    destinedEnding: storyConstitution.destinedEnding,
    characters: livingStoryState.codex.characters,
    bestiary: livingStoryState.codex.bestiary ?? [],
    factions: livingStoryState.codex.factions,
    locations: livingStoryState.codex.locations,
    artifacts: livingStoryState.codex.artifacts,
  };
}

export const CHAPTER_GENERATION_PACKAGE_TRACE: readonly ChapterInstructionTrace[] = [
  // Story Constitution — permanent story-owned data.
  { id: "story-identity", packageId: "storyConstitution", source: "StorySeedInput + MockChapterGenerationScenario", description: "Main-character identity, genre, story tags, and core premise." },
  { id: "style-bible", packageId: "storyConstitution", source: "WorldBlueprint.styleBible / scenario.styleBible", description: "Permanent style guidance.", rendererPackageId: "generationRules" },
  { id: "trope-rules", packageId: "storyConstitution", source: "WorldBlueprint.tropeRules / scenario.tropeRules", description: "Permanent trope and genre constraints.", rendererPackageId: "generationRules" },
  { id: "story-style", packageId: "storyConstitution", source: "StorySeedInput.story.required.style", description: "Finalized storytelling tradition." },
  { id: "cultural-prose-setting", packageId: "storyConstitution", source: "scenario.culturalProseStyleId", description: "Story-level Cultural Prose Style selection.", rendererPackageId: "generationRules" },
  { id: "accessibility-style-setting", packageId: "storyConstitution", source: "scenario.chapterWritingStyle", description: "Story/reader accessibility prose setting.", rendererPackageId: "generationRules" },
  { id: "fate-survival-settings", packageId: "storyConstitution", source: "StorySeedInput.story.optional.fateSurvival", description: "Canonical Fate Survival enabled/visibility/pressure settings." },
  { id: "permanent-world-rules", packageId: "storyConstitution", source: "scenario.memory.worldRules", description: "Permanent world laws that must never be budgeted away." },
  { id: "power-system-definition", packageId: "storyConstitution", source: "scenario.memory.powerSystem / WorldBlueprint.powerSystemOutline", description: "Permanent power-system definition." },
  { id: "destined-ending", packageId: "storyConstitution", source: "StorySeed worldFoundations / WorldBlueprint.destinedEnding", description: "Authored ending pressure referenced by pinned character state." },
  { id: "glossary-guidance-data", packageId: "storyConstitution", source: "scenario.glossaryEntries", description: "Canonical terminology and usage data.", rendererPackageId: "generationRules" },

  // Living Story State — current story-owned state.
  { id: "arc-chapter-position", packageId: "livingStoryState", source: "scenario.currentChapter.number", description: "Internal arc-local position such as Arc 1 — Chapter 1/100." },
  { id: "current-power-stage", packageId: "livingStoryState", source: "scenario.memory.currentPowerStage", description: "Current main-character power stage." },
  { id: "ability-ledger", packageId: "livingStoryState", source: "scenario.memory.abilities", description: "Current acquired abilities and limits.", rendererPackageId: "generationRules" },
  { id: "active-threads-data", packageId: "livingStoryState", source: "scenario.memory.unresolvedPlotThreads", description: "Open plot threads and their origin chapters.", rendererPackageId: "generationRules" },
  { id: "resolved-threads", packageId: "livingStoryState", source: "scenario.memory.resolvedPlotThreads", description: "Resolved story history used by character state." },
  { id: "codex-characters", packageId: "livingStoryState", source: "scenario.memory.characters", description: "Character Codex records." },
  { id: "codex-bestiary", packageId: "livingStoryState", source: "scenario.memory.bestiary", description: "Species-level Bestiary records." },
  { id: "codex-factions", packageId: "livingStoryState", source: "scenario.memory.factions", description: "Faction Codex records." },
  { id: "codex-locations", packageId: "livingStoryState", source: "scenario.memory.locations", description: "Location Codex records." },
  { id: "codex-artifacts", packageId: "livingStoryState", source: "scenario.memory.artifacts", description: "Artifact Codex records." },
  { id: "previous-ending-anchor", packageId: "livingStoryState", source: "contextBlocks kind=anchor", description: "Immediate previous ending text." },
  { id: "recent-chapter-blocks", packageId: "livingStoryState", source: "contextBlocks recent-full/recent-summary", description: "Recent chapter text and summaries." },
  { id: "rag-memories", packageId: "livingStoryState", source: "contextBlocks kind=rag", description: "Recovered older memories." },
  { id: "arc-summaries", packageId: "livingStoryState", source: "contextBlocks kind=arc-summary", description: "Rolling current-arc summaries." },
  { id: "previous-handoff", packageId: "livingStoryState", source: "scenario.previousHandoff", description: "Previous chapter end state, completed events, next action, and fingerprints." },
  { id: "recent-fingerprints", packageId: "livingStoryState", source: "scenario.recentFingerprints", description: "Recent scene fingerprints used for anti-repetition." },
  { id: "carried-scene-anchors", packageId: "livingStoryState", source: "previous handoff + worldBuildingSeed", description: "Existing next-scene anchors carried into this chapter." },
  { id: "recent-scene-rhythm", packageId: "livingStoryState", source: "RHYTHM_SCENARIOS.recentSceneTypes", description: "Recent scene-type history." },

  // Chapter Mission — current chapter only.
  { id: "chapter-number-title-premise", packageId: "chapterMission", source: "scenario.currentChapter", description: "Current chapter number, title, and goal." },
  { id: "chapter-contract-objective", packageId: "chapterMission", source: "buildChapterContract", description: "What this chapter must accomplish." },
  { id: "chapter-required-opening", packageId: "chapterMission", source: "ChapterContract.requiredOpening", description: "Opening action required by the previous chapter." },
  { id: "chapter-starting-state", packageId: "chapterMission", source: "ChapterContract.startingState", description: "State at which this chapter must start." },
  { id: "chapter-do-not-repeat", packageId: "chapterMission", source: "ChapterContract.doNotRepeat", description: "Canon events this chapter must not re-narrate." },
  { id: "chapter-completion-criteria", packageId: "chapterMission", source: "ChapterContract.completionCriteria", description: "Current chapter completion checks." },
  { id: "pacing-directive", packageId: "chapterMission", source: "scenario.pacingDirective", description: "Temporary AI Director pacing instruction.", rendererPackageId: "generationRules" },
  { id: "next-scene-direction", packageId: "chapterPlan", source: "Stage 2 ChapterPlan.selectedScenePath", description: "Chapter-specific scene path chosen by the planner from current anchors and rhythm." },
  { id: "fallback-opening-summary", packageId: "chapterMission", source: "FIRST_CHAPTER_FALLBACK_SUMMARY", description: "Opening requirement when no previous history exists." },

  // Generation Rules — permanent generator-owned instructions.
  { id: "fixed-system-prompt", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "Fixed genre, anti-drift, safety, output, and effects instructions." },
  { id: "user-prompt-template", packageId: "generationRules", source: "CHAPTER_PROMPTS.userPrompt", description: "Permanent user-prompt assembly template." },
  { id: "pinned-premise-template", packageId: "generationRules", source: "pinnedPremiseBlock", description: "Permanent pinned chapter number, title, goal, genre, and core-premise block template." },
  { id: "main-character-state-renderer", packageId: "generationRules", source: "formatMainCharacterState", description: "Permanent pinned main-character state card renderer." },
  { id: "history-anchor-selection", packageId: "generationRules", source: "latestHistoryText + anchorTextFromBlocks", description: "Permanent helpers that select recent history and the immediate continuation anchor." },
  { id: "style-directive-template", packageId: "generationRules", source: "CHAPTER_PROMPTS.userPrompt", description: "Template that renders Constitution style, trope, tag, and premise data." },
  { id: "author-context-authority", packageId: "generationRules", source: "CHAPTER_PROMPTS.userPrompt", description: "Permanent author-canon authority rule." },
  { id: "immediate-continuation-rule", packageId: "generationRules", source: "CHAPTER_PROMPTS.userPrompt", description: "Permanent continuation-from-anchor rule." },
  { id: "chapter-length-expansion-directives", packageId: "generationRules", source: "CHAPTER_PROMPTS.userPrompt", description: "Permanent length and expansion requirements." },
  { id: "ndjson-output-structure", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "NDJSON chapter/block output structure." },
  { id: "story-block-metadata-format", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "Paragraph/dialogue metadata formatting." },
  { id: "system-event-format", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "Visible Celestial Library system-panel format." },
  { id: "music-atmosphere-cue-format", packageId: "generationRules", source: "CHAPTER_PROMPTS.system + cue payload rules", description: "Music, atmosphere, and audio cue formatting." },
  { id: "beast-event-format", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "Beast event metadata formatting." },
  { id: "content-safety-protocols", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "Permanent content-safety rules." },
  { id: "anti-drift-continuity", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "Permanent anti-drift and continuity mandate." },
  { id: "narrative-surface-hygiene", packageId: "generationRules", source: "CHAPTER_PROMPTS.system", description: "Permanent rules separating prose from UI/system surfaces." },
  { id: "glossary-block-renderer", packageId: "generationRules", source: "formatGlossaryForPrompt", description: "Permanent wrapper for glossary guidance data." },
  { id: "writing-style-renderer", packageId: "generationRules", source: "appendChapterWritingStyleInstruction", description: "Permanent wrapper for accessibility prose instructions." },
  { id: "cultural-prose-renderer", packageId: "generationRules", source: "renderCulturalProseInstruction", description: "Permanent Cultural Prose instruction included in the Chapter Packet and writing call." },
  { id: "fate-pressure-renderer", packageId: "chapterPlan", source: "Stage 2 ChapterPlan.fateSurvival", description: "Structured chapter-specific Fate Survival decision made by the planner from packet settings." },
  { id: "pacing-block-renderer", packageId: "chapterPlan", source: "Stage 2 ChapterPlan.pacing", description: "Structured chapter-specific pacing decision made by the planner." },
  { id: "next-scene-block-renderer", packageId: "chapterPlan", source: "Stage 2 ChapterPlan.selectedScenePath", description: "Structured selected path passed directly from planning to manifestation." },
  { id: "thread-aging-renderer", packageId: "generationRules", source: "formatThreadForRouter", description: "Permanent age annotation applied to unresolved threads." },
  { id: "context-budgeting-rules", packageId: "generationRules", source: "assembleContext + CONTEXT_BUDGET_DEFAULTS", description: "Permanent context section order, caps, demotion, and omission behavior." },
  { id: "context-manifest-envelope", packageId: "generationRules", source: "buildContextManifestFromOutcomes", description: "Permanent context-manifest summary envelope." },
  { id: "response-cleanup-rules", packageId: "generationRules", source: "cleanChapterResponse", description: "Permanent generated-response cleanup behavior." },
] as const;

export const CHAPTER_GENERATION_PACKAGE_FLAGS: readonly ChapterPackageFlag[] = [
  {
    id: "fixture-fate-pressure-field",
    severity: "dead-field",
    source: "fixtures/mockGenerationData.ts#fatePressure",
    message: "The existing scenario field is retained for traceability, but Reference hardcodes Balanced and Development reads the selected rhythm scenario instead.",
  },
  {
    id: "chapter-writing-style-ownership",
    severity: "needs-owner-decision",
    source: "fixtures/mockGenerationData.ts#chapterWritingStyle",
    message: "The current fixture treats accessibility prose as story-level constitution; it may need to become a reader preference in a later pass.",
  },
  {
    id: "fate-pressure-vocabulary-bridge",
    severity: "needs-owner-decision",
    source: "StorySeedFateSurvivalSettings.pressure vs FatePressureTier",
    message: "No approved mapping exists between Seed pressure (heaven/immortal/mortal) and generation tiers (Relaxed/Balanced/Hardcore/Dao Master).",
  },
  {
    id: "story-style-cultural-prose-bridge",
    severity: "needs-owner-decision",
    source: "StoryStyle vs CulturalProseStyleId",
    message: "No approved mapping exists between the three Story Style traditions and the six Cultural Prose leaf styles.",
  },
  {
    id: "workshop-inspection-only-modules",
    severity: "out-of-scope",
    source: "stageTypes.ts + shared/pipeline/workshopModelCalls.ts",
    message: "Inspection stage serialization and deterministic Workshop model adapters remain preview-only boundaries outside the four generation contracts.",
  },
  {
    id: "story-administrative-metadata",
    severity: "out-of-scope",
    source: "story-seed/shared/storyAdministrativeMetadata.ts",
    message: "System-owned story spine metadata is not creator-controlled generation information and is excluded from all four packages.",
  },
  {
    id: "legacy-context-engine-v1-prompt-branch",
    severity: "dead-field",
    source: "chapterPrompts.ts contextEngine === \"v1\" / !withCue branch",
    message: "Both current adapters use the v2 cue-enabled prompt branch; the retained v1 branch is not exercised by this replica.",
  },
  {
    id: "seed-world-rules-bridge",
    severity: "needs-owner-decision",
    source: "StorySeedInput / WorldBlueprint",
    message: "The finalized Seed and Blueprint contracts do not yet expose a canonical worldRules array, so the Seed adapter leaves it empty instead of deriving one from prose fields.",
  },
  {
    id: "seed-glossary-bridge",
    severity: "needs-owner-decision",
    source: "StorySeedInput / glossary retrieval",
    message: "The finalized Seed contract does not own generation glossary results; retrieval must be supplied by a later glossary boundary.",
  },
] as const;
