/**
 * Types needed by the ported generation-flow logic in `shared/lib/`.
 * Trimmed from Light-Novels `src/types.ts` (verified against `main`) — the
 * full Codex entity types (Character/Faction/Location/Artifact) are
 * intentionally omitted because the ported ranking/rendering code
 * (`entityCards.ts`, `helpers.ts`) operates on `any`-typed entity records,
 * exactly as production does.
 */

import type { ResolvedAudioMoment, WorldCueIntent } from "../../../audio/inlineAudio";

export interface BeastSonicProfile {
  size?: "tiny" | "small" | "medium" | "large" | "giant" | "colossal";
  bodyType?:
    | "spirit"
    | "dragon"
    | "cosmic"
    | "insect"
    | "serpent"
    | "bird"
    | "mammal"
    | "undead"
    | (string & {});
  element?: string;
  movement?: string;
  intelligence?: string;
  threatTier?: string;
  signatureSound?: string;
}

export interface FateResultData {
  outcome: "FATE AVERTED" | "FATE SCARRED" | "DOOM MANIFESTED";
  timelineScar: string;
  permanentCosts: string[];
  newStoryState?: string;
  newActiveStats?: string[];
  genreShift?: string;
}

export interface RelevanceState {}
export type RelevanceStateValue = "active" | "warm" | "dormant" | "archived" | "reactivated";

export interface MemoryProvenance {
  sourceChapterNumber?: number;
  sourceBlockId?: string;
  createdBy?: string;
  confidence?: number;
  lastMentionedChapter?: number;
  supersedesMemoryId?: string;
  isUserPinned?: boolean;
}

export interface BaseCodexEntry {
  persistenceId?: string;
  imageAssetId?: string;
  aliases?: string[];
  contextPriority?: number;
  authorContextNote?: string;
  relevanceState?: RelevanceStateValue;
  firstAppeared?: number;
  lastMajorInvolvement?: number;
  unresolvedThreads?: string[];
  currentRelevance?: string;
  toneMemory?: string;
  provenance?: MemoryProvenance;
  pendingEvolution?: boolean;
  arcAccumulation?: string;
}

export const STORY_ENTITY_TYPES = ["character", "artifact", "location", "creature", "faction"] as const;

export type StoryEntityType = typeof STORY_ENTITY_TYPES[number];

export interface StoryBlockMetadata {
  sceneType?: string;
  environment?: string[];
  atmosphereCategory?: "wind" | "crowd" | "waves" | "rain" | "combat" | "noise";
  atmosphereTags?: string[];
  theme?: string | string[];
  motion?: string;
  emotion?: string;
  intensity?: number;
  tension?: number;
  danger?: number;
  mysticism?: number;
  audioSignature?: string;
  speakerName?: string;
  mode?: string;
  speakerRole?: string;
  entities?: {
    name: string;
    type: StoryEntityType;
    mention: "reveal" | "reference";
  }[];
  music?: {
    mood: string;
    region?: "chinese" | "japanese" | "western";
    intensity?: number;
    customUrl?: string;
    trackId?: string;
  };
  beastEvent?: {
    type: "reveal" | "power-up" | "technique" | "injury" | "turning-point" | "death" | "breakthrough";
    profile: BeastSonicProfile;
  };
  /** Model-safe, block-scoped audible actions; application code resolves them. */
  audioMoments?: WorldCueIntent[];
}

export type SystemEventKind = "system_prompt" | "fate_system_prompt";

/**
 * One short, genre-native System outcome. The compact System Prompt renders
 * at most the first two outcomes as flat slots separated by a divider, each
 * split into a neutral white subject and a meaning-colored state word with no
 * numbers: a label carrying a numeric quantity (QI 200, KARMA 15, HEALTH 30%)
 * compresses to its subject plus Increased/Decreased from `direction`
 * (KARMA DECREASED, LIFESPAN INCREASED), while any other label colors only
 * its final state word (REALM ASCENDED, TITLE STRIPPED). The expanded event
 * report lists every outcome in full with the direction's sign before any
 * quantity (QI +200, KARMA −15, HEALTH −30%); plain status outcomes render
 * unsigned. The state word is color-coded by meaning: `tone` overrides the
 * color explicitly ("positive" green, "uncertain" yellow, "warning" orange,
 * "negative" red); when omitted, the tone derives from `direction` ("gain" →
 * positive, "loss" → negative), so set `tone` whenever the literal direction
 * contradicts the meaning (a gained enmity is still negative).
 * Generated chapters may emit these when a visible outcome is earned; the
 * live parser validates and preserves them for the packaged card renderer.
 */
export interface SystemPromptChange {
  direction: "gain" | "loss";
  label: string;
  /** Optional meaning color override; defaults from `direction`. */
  tone?: "positive" | "uncertain" | "warning" | "negative";
}

/**
 * One compact, event-specific status badge rendered outside the visible serif
 * prose without changing the Reader's narration source (for example
 * THREAT ASSESSMENT · MODERATE).
 */
export interface SystemPromptBadge {
  label: string;
  value: string;
}

/**
 * Presentation family selects a regular System Prompt's Reader layout. It is
 * deliberately separate from `promptType`, which continues to communicate
 * semantic meaning and color only.
 */
export type SystemPromptPresentation = "narrative" | "mechanical" | "world_notice";

/** One labeled fact shown on a static World Notice entry. */
export interface WorldNoticeDetail {
  label: string;
  value: string;
}

/**
 * A single item on an in-world document. One entry is a notice; multiple
 * entries form a board without needing document-specific component variants.
 */
export interface WorldNoticeEntry {
  title: string;
  body?: string;
  details?: WorldNoticeDetail[];
}

export interface WorldNoticeData {
  entries: WorldNoticeEntry[];
}

export interface BaseSystemEvent {
  kind: SystemEventKind | (string & {});
  promptType?:
    | "neutral" | "codex_update" | "friendly_scan" | "enemy_scan" | "warning" | "critical_danger"
    | "progression" | "breakthrough" | "reward" | "romance" | "karmic_bond" | "mystery" | "fate_event"
    | "corruption" | "death_event" | "quest_update" | "choice_consequence" | "system_error";
  title: string;
  /** Secondary world-specific or dramatic flavor displayed beneath the direct title. */
  flavor?: string;
  /**
   * Concise key/value facts. The compact System Prompt renders at most three
   * and marks a changed value with a small direction arrow when `trend` is
   * set: "up" for an upgrade (green), "down" for a regression (red); leave it
   * unset for neutral facts. Generated rows retain this semantic direction
   * through parsing and Reader adaptation.
   */
  rows?: { label: string; value: string; trend?: "up" | "down" }[];
  rarity?: string;
  /** Optional event-specific status kept visually separate from narrated prose. */
  badge?: SystemPromptBadge;
  /**
   * Priority-ordered System outcomes. The compact card renders at most the
   * first two as flat subject/state slots with no numbers; the expanded
   * report lists them all with signed quantities.
   */
  changes?: SystemPromptChange[];
}

/**
 * One resource meter on a mechanical status screen. `tone` carries the
 * established semantic color: "health" renders Enemy red, "spirit" Main
 * Character blue, "progress" Mentor gold. `display` is the bright authored
 * figure ("780 / 780", "62%"); `value`/`max` drive the fill alone.
 */
export interface SystemStatusBar {
  label: string;
  value: number;
  max: number;
  display?: string;
  tone: "health" | "spirit" | "progress";
}

/**
 * One numerical attribute on a mechanical status screen. A signed `delta`
 * marks a recent change: positive renders gain green, negative loss red.
 */
export interface SystemStatusStat {
  label: string;
  value: string;
  delta?: number;
}

/** One active effect line; `tone` colors the trailing value, default positive. */
export interface SystemStatusEffect {
  name: string;
  detail?: string;
  value?: string;
  tone?: "positive" | "negative";
}

/** One ability line on a mechanical status screen; the name renders System blue. */
export interface SystemStatusAbility {
  name: string;
  detail?: string;
}

/**
 * The LitRPG status-screen payload of a mechanical System Prompt: character or
 * target header metadata, resource meters, a numerical stat grid, active
 * effects, and abilities. Generation may emit it for a mechanical presentation;
 * both the live parser and Reader boundary validate it. Events without it keep
 * the legacy plain-rows rendering.
 */
export interface SystemStatusScreen {
  level?: string;
  bars?: SystemStatusBar[];
  stats?: SystemStatusStat[];
  effects?: SystemStatusEffect[];
  abilities?: SystemStatusAbility[];
}

export interface RegularSystemEvent extends BaseSystemEvent {
  kind: "system_prompt" | (string & {});
  /**
   * Explicit presentation for newly generated prompts. Omitted values are
   * retained for legacy saved chapters and resolved at the Reader boundary.
   */
  presentation?: SystemPromptPresentation;
  /** Static in-world document data, valid only with `presentation: "world_notice"`. */
  worldNotice?: WorldNoticeData;
  /** LitRPG status-screen data, valid only with `presentation: "mechanical"`. */
  status?: SystemStatusScreen;
  fateResult?: never;
}

export interface FateSystemEvent extends BaseSystemEvent {
  kind: "fate_system_prompt";
  fateResult: FateResultData;
}

export type SystemEvent = RegularSystemEvent | FateSystemEvent;

export interface StoryBlock {
  id: string;
  type: string;
  text: string;
  metadata?: StoryBlockMetadata;
  system?: SystemEvent;
}

export type ChapterManifestStatus = "healthy" | "needs-review";

export type ChapterManifestWarningCode =
  | "block-id-generated"
  | "block-type-normalized"
  | "optional-field-removed"
  | "block-skipped"
  | "plain-prose-recovered"
  | "under-minimum-word-count";

/** Safe, exportable evidence of a non-fatal Manifest recovery. */
export interface ChapterManifestWarning {
  code: ChapterManifestWarningCode;
  message: string;
  blockIndex?: number;
  blockId?: string;
  field?: string;
}

export interface ChapterManifestDiagnostics {
  status: ChapterManifestStatus;
  wordCount: number;
  minimumWordCount: number;
  warnings: ChapterManifestWarning[];
}

export interface StoryCuePayload {
  sceneType?: string;
  environment?: string[];
  atmosphereCategory?: "wind" | "crowd" | "waves" | "rain" | "combat" | "noise";
  atmosphereTags?: string[];
  theme?: string | string[];
  intensity?: number;
  tension?: number;
  powerShift?: number;
  emotion?: string;
  relationshipShift?: number;
  danger?: number;
  mysticism?: number;
  element?: string;
  signature?: string;
  music?: StoryBlockMetadata["music"];
  beastEvent?: StoryBlockMetadata["beastEvent"];
  entities?: StoryBlockMetadata["entities"];
}

export type SceneActionType =
  | "battle" | "duel" | "breakthrough" | "acquisition" | "discovery" | "death"
  | "travel-arrival" | "social" | "training" | "ritual" | "escape" | "revelation" | "other";

export interface SceneFingerprint {
  actionType: SceneActionType;
  participants: string[];
  location?: string;
  outcome: string;
  chapterNumber: number;
}

export interface ChapterEndState {
  location?: string;
  timeMarker?: string;
  charactersPresent?: string[];
  mcCondition?: string;
  openTension?: string;
}

export interface ChapterHandoff {
  version: 1;
  chapterNumber: number;
  endState: ChapterEndState;
  completedEvents: string[];
  nextImmediateAction?: string;
  fingerprints: SceneFingerprint[];
}

export interface ChapterContract {
  version: 1;
  chapterNumber: number;
  startingState?: ChapterEndState;
  requiredOpening?: string;
  objective: string;
  doNotRepeat: string[];
  completionCriteria?: string[];
}

export interface ContractReport {
  objectiveFulfilled: boolean;
  evidence?: string;
  openingMatched?: boolean;
}

export type ContextBlockKind = "anchor" | "recent-full" | "recent-summary" | "rag" | "arc-summary";

export interface ContextBlock {
  kind: ContextBlockKind;
  chapterNumber?: number;
  text: string;
  summaryText?: string;
}

export type ContextManifestSectionKey =
  | "pinnedRules" | "premise" | "chapterContract" | "anchor" | "recentChapters"
  | "entityCards" | "threads" | "rag" | "arcSummaries";

export interface ContextManifestSection {
  key: ContextManifestSectionKey;
  label: string;
  estimatedTokens: number;
  includedItemCount: number;
  availableItemCount: number;
  includedItems: string[];
  demotedItems?: string[];
  omittedItems: string[];
  protectedOverflowTokens?: number;
  truncated: boolean;
  omissionReason?:
    | "relevance_or_cap" | "token_budget" | "selection_or_token_budget" | "demoted_to_brief" | "budget_drop";
}

export interface ContextManifest {
  version: 1;
  engine?: "v1" | "v2";
  route: "generate-chapter-stream" | "generate-chapter";
  generatedAt: string;
  chapterNumber: number;
  totalEstimatedTokens: number;
  providerInputEstimatedTokens?: number;
  memoryAndHistoryBudgetTokens: number;
  memoryAndHistoryEstimatedTokens: number;
  memoryAndHistoryBudgetExceeded: boolean;
  providerInputTruncated: boolean;
  sections: ContextManifestSection[];
}

export type ChapterWritingStyle = "Standard" | "Clear Reading" | "Easy Read" | "Literal Reading";

export interface ChapterContent {
  storyId: string;
  userId?: string;
  chapterNumber: number;
  generatedContent: string;
  /** Calculated from normalized prose by code; never accepted from a model response. */
  wordCount?: number;
  /** Under-length prose remains readable while this status makes review needs explicit. */
  manifestStatus?: ChapterManifestStatus;
  manifestDiagnostics?: ChapterManifestDiagnostics;
  blocks?: StoryBlock[];
  archivedBlocks?: StoryBlock[];
  /** Resolved, precisely placed World Cues and server-produced dialogue artifacts. */
  audioMoments?: ResolvedAudioMoment[];
  summary?: string;
  episodicSummary?: string;
  statsChangeMessage?: string;
  cuePayload?: StoryCuePayload;
  translations?: Record<string, { title: string; content: string; translatedAt: number }>;
  audioManifest?: { version: string; language: string; clips: unknown[]; generatedAt: number };
  syncStatus?: "local" | "synced" | "conflict";
  revisionId?: string;
  syncRevision?: string;
  updatedAt?: string;
  contextManifest?: ContextManifest;
  handoff?: ChapterHandoff;
  contract?: ChapterContract;
}
