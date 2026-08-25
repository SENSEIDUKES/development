/**
 * Reader Chamber shared types.
 *
 * Focused subset of `src/types.ts` from SENSEIDUKES/Light-Novels, lifted
 * verbatim wherever the copied presentation components reference the shapes.
 * Pipeline/persistence-only fields that nothing in the reading or Codex
 * surfaces consumes were intentionally left out. The Codex entities below
 * preserve the production Reader/Codex contracts used by this replica.
 */

import type { StoryEntityType } from "../../chapter-generation/shared/types";
import type { ResolvedAudioMoment } from "../../../audio/inlineAudio";

export interface FateResultData {
  outcome: "FATE AVERTED" | "FATE SCARRED" | "DOOM MANIFESTED";
  timelineScar: string;
  permanentCosts: string[];
  newStoryState?: string;
  newActiveStats?: string[];
  genreShift?: string;
}

/** Minimal sonic profile shape used by the auto-cue policy and sound hints. */
export interface BeastSonicProfile {
  threatTier: string;
  size?: string;
  bodyType?: string;
  element?: string;
  movement?: string;
  intelligence?: string;
  signatureSound?: string;
}

/** Canonical sonic metadata for creature species and non-human portraits. */
export interface CreatureSonicProfile extends BeastSonicProfile {}

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
    mood:
      | "war"
      | "duel"
      | "serenity"
      | "romance"
      | "dread"
      | "mystery"
      | "triumph"
      | "tribulation"
      | "travel"
      | "tragedy"
      | "fighting"
      | "adventure"
      | "ambient"
      | "boss-fight"
      | "tension"
      | "sad"
      | "mystical"
      | "excitement"
      | "tired"
      | "horror";
    region?: "chinese" | "japanese" | "western";
    intensity?: number;
    customUrl?: string;
    trackId?: string;
  };
  beastEvent?: {
    type:
      | "reveal"
      | "power-up"
      | "technique"
      | "injury"
      | "turning-point"
      | "death"
      | "breakthrough";
    profile: BeastSonicProfile;
  };
}

import type {
  SystemEventKind,
  SystemPromptBadge,
  SystemPromptChange,
  SystemPromptPresentation,
  SystemStatusAbility,
  SystemStatusBar,
  SystemStatusEffect,
  SystemStatusScreen,
  SystemStatusStat,
  WorldNoticeDetail,
  WorldNoticeEntry,
  WorldNoticeData,
  BaseSystemEvent,
  RegularSystemEvent,
  FateSystemEvent,
  SystemEvent as ChapterSystemEvent,
} from '../../chapter-generation/shared/types';

export type {
  SystemEventKind,
  SystemPromptBadge,
  SystemPromptChange,
  SystemPromptPresentation,
  SystemStatusAbility,
  SystemStatusBar,
  SystemStatusEffect,
  SystemStatusScreen,
  SystemStatusStat,
  WorldNoticeDetail,
  WorldNoticeEntry,
  WorldNoticeData,
  BaseSystemEvent,
  RegularSystemEvent,
  FateSystemEvent,
};

/**
 * Reader extension point for the shared chapter System event.
 *
 * The retired Codex-shaped `expanded` payload is gone: the one expanded System
 * presentation is now the Structured Mechanical stat panel, which reads the
 * generation-owned `status` screen rather than a Reader-only display contract.
 */
export type SystemEvent = ChapterSystemEvent;

export interface StoryBlock {
  id: string;
  type: string;
  text: string;
  metadata?: StoryBlockMetadata;
  system?: SystemEvent;
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
  music?: StoryBlockMetadata['music'];
  beastEvent?: {
    type:
      | "reveal"
      | "power-up"
      | "technique"
      | "injury"
      | "turning-point"
      | "death"
      | "breakthrough";
    profile: BeastSonicProfile;
  };
}

export type ContextManifestSectionKey =
  | "pinnedRules"
  | "premise"
  | "chapterContract"
  | "anchor"
  | "recentChapters"
  | "entityCards"
  | "threads"
  | "rag"
  | "arcSummaries";

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
    | "relevance_or_cap"
    | "token_budget"
    | "selection_or_token_budget"
    | "demoted_to_brief"
    | "budget_drop";
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

/**
 * Identity and scaffold fields. Present at every stage, and the only chapter
 * fields guaranteed to survive being written to the Story document.
 */
export interface ChapterScaffold {
  persistenceId?: string;
  number: number;
  title: string;
  premise: string;
  status: "unlocked" | "generating" | "read" | "unread";
  hasContent?: boolean;
  isSealed?: boolean;
  contentHash?: string;
  sealedAt?: number;
  versionId?: string;
  branchAnchor?: string;
  summary?: string;
  translations?: {
    [langCode: string]: {
      title: string;
      content: string;
      translatedAt: number;
    };
  };
  hasContinuityFaults?: boolean;
  continuityWarnings?: string[];
  continuitySoftNotes?: string[];
}

/** Media attached to a chapter. Survives persistence alongside the scaffold. */
export interface ChapterMedia {
  assetManifest?: Record<string, string>;
  heroImageAssetId?: string;
  /** Every generated chapter hero belongs to this chapter, never story history. */
  imageHistory?: GeneratedImage[];
}

/**
 * The readable body of a chapter. Stripped off the Story document at save time
 * and stored as a `ChapterContent` row, so it is absent until hydrated.
 */
export interface ChapterProse {
  generatedContent?: string;
  blocks?: StoryBlock[];
  /** Validated, block-scoped Worldcues and dialogue artifacts. */
  audioMoments?: ResolvedAudioMoment[];
  statsChangeMessage?: string;
  cuePayload?: StoryCuePayload;
}

/**
 * Inspectable record of how a chapter was generated, re-hydrated for the
 * reader's context inspector.
 */
export interface ChapterDiagnostics {
  contextManifest?: ContextManifest;
  /** Disposable generation observability carried into a generated Reader session. */
  generationUsage?: ReaderChapterGenerationUsage;
  /** Original generated arc position, retained without changing Reader navigation. */
  generationPosition?: {
    arcNumber: number;
    chapterInArc: number;
    chaptersInArc: number;
    display: string;
  };
  repairApplied?: boolean;
  /** Exact processed power state after this chapter, when DEV produced one. */
  codexPowerStage?: string;
}

export interface ReaderTokenUsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  generationTimeMs: number;
  hasEstimatedUsage: boolean;
}

export interface ReaderUsageBreakdown {
  callCount: number;
  totals: ReaderTokenUsageTotals;
}

export interface ReaderChapterGenerationUsage {
  totals: ReaderTokenUsageTotals;
  attemptCount: number;
  repair?: ReaderUsageBreakdown;
  retry?: ReaderUsageBreakdown & { attemptCount: number };
}

/**
 * What the reading surface consumes: scaffold, media, and — once hydrated —
 * the prose and its generation diagnostics.
 */
export interface ReaderChapter
  extends ChapterScaffold,
    ChapterMedia,
    ChapterProse,
    ChapterDiagnostics {}

/**
 * Permissive superset covering every stage. Production aliases this to
 * `GeneratedChapter`; the Workshop replica only ever reads chapters.
 */
export type Chapter = ReaderChapter;

export interface StoryArc {
  persistenceId?: string;
  title: string;
  chapters: Chapter[];
  isCompleted: boolean;
  summary?: string;
  episodicSummaries?: string[];
}

export interface ChapterGenerationBatch {
  id: string;
  chapterNumbers: number[];
  status: 'queued' | 'generating' | 'paused' | 'completed' | 'failed';
  currentChapterNumber: number | null;
  completedChapterNumbers: number[];
  failedChapterNumber?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ReaderPreferences {
  fontSize: "xs" | "sm" | "base" | "lg" | "xl";
  fontFamily: "serif" | "sans" | "mono";
  lineHeight: "snug" | "normal" | "relaxed" | "loose";
  paragraphSpacing: "normal" | "wide" | "double";
  /** Fine-grained reader typography. These remain optional for saved legacy stories. */
  lineHeightScale?: number;
  paragraphSpacingScale?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  readingWidth?: number;
  textAlignment?: "start" | "justify";
  contextEngine?: "v1" | "v2";
  themeOverride?: "void" | "crimson" | "abyss" | "sepia" | "emerald";
  colorPaletteId?: "default" | "protanopia" | "deuteranopia" | "tritanopia" | "high_contrast_dark";
  highlightStyle?: "full" | "underline" | "tint";
  playerStyle?: "vinyl" | "minimal" | "ethereal";
  particleIntensity?: "off" | "low" | "default" | "high";
  dividerStyle?: "default" | "celestial" | "sword_qi" | "lotus_path";
  vignetteStyle?: "off" | "radial" | "cosmic" | "scroll";
}

export interface Bookmark {
  id: string;
  chapterNumber: number;
  paragraphIndex: number;
  paragraphExcerpt: string;
  note?: string;
  createdAt: string;
}

export interface GeneratedImage {
  id: string;
  /** Canonical persisted asset identity. `imageUrl` is only a delivery URL. */
  assetId?: string;
  assetVersion?: number;
  checksumSha256?: string;
  deliveryUrlExpiresAt?: string;
  entityId: string;
  entityType:
    | "cover"
    | "character"
    | "creature"
    /** Legacy media history value retained for source-replica compatibility. */
    | "beast"
    | "location"
    | "artifact"
    | "faction"
    | "chapterHero";
  imageUrl: string;
  chapterNumber?: number;
  arcTitle?: string;
  label?: string;
  promptUsed: string;
  createdAt: string;
  isCurrent: boolean;
}

export type RelevanceState =
  | "active"
  | "warm"
  | "dormant"
  | "archived"
  | "reactivated";

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
  relevanceState?: RelevanceState;
  firstAppeared?: number;
  lastMajorInvolvement?: number;
  unresolvedThreads?: string[];
  currentRelevance?: string;
  toneMemory?: string;
  provenance?: MemoryProvenance;
  manifestationImportance?: import('./manifestationEligibility').ManifestationImportance;
  pendingEvolution?: boolean;
  arcAccumulation?: string;
}

export interface AbilityProgressionEvent {
  chapter: number;
  fromMastery?: string;
  toMastery?: string;
  note?: string;
}

export interface Ability extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  source?: string;
  acquiredChapter?: number;
  acquisitionMethod?: string;
  cost?: string;
  limits?: string;
  masteryLevel?: string;
  lastUsedChapter?: number;
  canonStatus?: 'confirmed' | 'rumored' | 'forbidden' | 'lost';
  progression?: AbilityProgressionEvent[];
}

export interface Character extends BaseCodexEntry {
  id: string;
  name: string;
  role: string;
  status: "alive" | "deceased" | "unknown" | "ascended";
  powerLevel?: string;
  relationshipToMC: string;
  description: string;
  abilities?: Array<string | Ability>;
  faction?: string;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  /** Human and important non-human individuals share one Portrait system. */
  portraitKind?: "human" | "non-human";
  /** Application-owned link to a Bestiary species record, when one exists. */
  speciesId?: string;
  creatureProfile?: CreatureSonicProfile;
  /** @deprecated Normalize legacy source data to portraitKind at the Reader boundary. */
  isBeast?: boolean;
  /** @deprecated Normalize legacy source data to creatureProfile at the Reader boundary. */
  beastProfile?: BeastSonicProfile;
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
  /** Stable provider-neutral voice identity assigned by server application logic. */
  voiceKey?: string;
  signatureQuote?: string;
  voiceAssetId?: string;
}

/** A species-level Bestiary record, intentionally separate from named individuals. */
export interface CreatureSpecies extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  classification: string;
  traits: string[];
  threatLevel: string;
  signatureSound?: string;
  firstEncounteredChapter: number;
  appearanceChapters: number[];
  notableIndividualIds: string[];
  /** Legacy read-only media remains loadable; species no longer generate Codex artwork. */
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
}

export interface Faction extends BaseCodexEntry {
  id: string;
  name: string;
  alignment: "Righteous" | "Demonic" | "Neutral" | "Mysterious" | string;
  description: string;
  headquarters?: string;
  status?: "Active" | "Destroyed" | "Fractured" | string;
  /** Legacy read-only media remains loadable; Factions no longer generate Codex artwork. */
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
}

export interface Location extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  realm?: string;
  safetyLevel?: string;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
}

export type ArtifactCondition =
  | "intact"
  | "damaged"
  | "destroyed"
  | "consumed"
  | "lost"
  | string;

export interface Artifact extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  tier?: string;
  currentOwner?: string;
  condition?: ArtifactCondition;
  holderLocation?: string;
  lastStateChapter?: number;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
}

export interface PlotThread {
  id?: string;
  description: string;
  status?: "active" | "resolved";
  provenance?: MemoryProvenance;
  originChapter?: number;
}

/** StoryMemory shape consumed by the reading surface and living Codex. */
export interface StoryMemory {
  currentPowerStage?: string;
  powerSystem?: string;
  characters?: Character[];
  bestiary?: CreatureSpecies[];
  factions?: Faction[];
  locations?: Location[];
  artifacts?: Artifact[];
  unresolvedPlotThreads?: Array<string | PlotThread>;
  resolvedPlotThreads?: Array<string | PlotThread>;
  worldRules?: string[];
  memoryWarnings?: string[];
  abilities?: Array<string | Ability>;
}

export interface CharacterRelationship {
  id: string;
  sourceCharId: string;
  sourceCharName: string;
  targetCharId: string;
  targetCharName: string;
  affinity: number;
  threat?: number;
  description: string;
  updatedAt: string;
}

export interface KarmaFateNode {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  description: string;
  severity: "Minor" | "Major" | "Cosmic";
  type: "Debt" | "Boon" | "Enmity" | "Destiny";
  status: "active" | "resolved";
  createdAt: string;
}

export interface RouteConfig {
  provider: "gemini" | "openrouter" | "ollama";
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface MultiModelRouting {
  storyMaker: RouteConfig;
  imageGenerator: RouteConfig;
}

export interface MediaAssetDescriptor {
  id: string;
  assetType: string;
  purpose: string;
  visibility: "PRIVATE" | "PUBLIC";
  status: string;
  mimeType: string;
  byteSize: string;
  checksumSha256: string;
  width?: number | null;
  height?: number | null;
  durationMs?: string | null;
  version: number;
  deliveryUrl: string;
  deliveryUrlExpiresAt?: string | null;
  createdAt: string;
  readyAt?: string | null;
}

/** Subset of production IntakeData consumed by the dialect resolver. */
export interface IntakeData {
  genrePath?: string;
}

/**
 * StoryWorld subset: only the fields the copied Reader Chamber components
 * actually read. Production carries many more (persistence, media, karma).
 */
export interface StoryWorld {
  persistenceId?: string;
  userId?: string;
  id: string;
  parentStoryId?: string;
  forkChapterNumber?: number;
  title: string;
  genre: string;
  mcName: string;
  customPremise: string;
  createdAt: string;
  updatedAt: string;
  memory?: StoryMemory;
  arcs: StoryArc[];
  currentChapterNumber: number;
  intake?: IntakeData;
  hardcoreFateMode?: boolean;
  imageUrl?: string;
  coverAssetId?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
  motionCoverActive?: boolean;
  readerPreferences?: ReaderPreferences;
  bookmarks?: Bookmark[];
  assignedRevealBackdrops?: Record<string, string>;
  relationships?: CharacterRelationship[];
  karmaNodes?: KarmaFateNode[];
  mediaDescriptors?: Record<string, MediaAssetDescriptor>;
  lastReadChapter?: number;
  lastReadScrollPosition?: number;
  readingAnchor?: import('./cinematicScroll/anchors').ReadingAnchor;
  readingStats?: {
    totalReadingTimeMs?: number;
    arcReadingTimeMs?: Record<number, number>;
  };
  lastReadAt?: string;
  chapterGenerationBatch?: ChapterGenerationBatch;
}

export type Story = StoryWorld;

/** Metadata policy applied by the store-owned story patch queue. */
export interface StoryUpdateOptions {
  markEdited?: boolean;
  touchUpdatedAt?: boolean;
}

/**
 * The only story fields Reader and Reader Codex surfaces may patch directly.
 * Identity, arcs/chapter collections, and story-level media ownership are
 * deliberately excluded so a stale whole-story object cannot overwrite them.
 */
export type ReaderCodexStoryPatch = Partial<Pick<StoryWorld,
  | 'assignedRevealBackdrops'
  | 'bookmarks'
  | 'karmaNodes'
  | 'lastReadAt'
  | 'lastReadChapter'
  | 'lastReadScrollPosition'
  | 'mediaDescriptors'
  | 'memory'
  | 'motionCoverActive'
  | 'readerPreferences'
  | 'readingAnchor'
  | 'readingStats'
  | 'relationships'
>>;

export type ReaderCodexStoryPatchUpdater =
  | ReaderCodexStoryPatch
  | ((current: StoryWorld) => ReaderCodexStoryPatch);

/** Store-owned Reader/Codex mutation boundary. Never accepts a StoryWorld. */
export type UpdateStoryFields = (
  storyId: string,
  updates: ReaderCodexStoryPatchUpdater,
  options?: StoryUpdateOptions,
) => Promise<void>;
