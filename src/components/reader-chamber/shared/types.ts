/**
 * Reader Chamber shared types.
 *
 * Focused subset of `src/types.ts` from SENSEIDUKES/Light-Novels, lifted
 * verbatim wherever the copied presentation components reference the shapes.
 * Pipeline/persistence-only fields that nothing in the reading surface
 * consumes were intentionally left out. `CodexTerm` is deliberately absent —
 * the codex menu system is a separate future Workshop job (see README).
 */

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
}

/**
 * Intentional sound roles a World Card can carry. Character quotes stay on
 * the separate "tts_line" audioType — spoken lines are never SFX assets.
 */
export type WorldCardSoundRole =
  | "roar"
  | "call"
  | "hiss"
  | "howl"
  | "screech"
  | "wingbeat"
  | "unsheathe"
  | "metallic_ring"
  | "reload"
  | "activation_hum"
  | "resonance"
  | "awakening"
  | "pulse"
  | "magical_activation"
  | "signature"
  | "chant"
  | "chime";

export type WorldCardArtifactAssetFamily = "weapon" | "relic";

export interface WorldCardSoundHints {
  assetId?: string;
  element?: string;
  size?: string;
  threatTier?: string;
  assetFamily?: WorldCardArtifactAssetFamily;
  weaponType?: string;
  artifactCategory?: string;
  tags?: string[];
}

export interface WorldCardEvent {
  id?: string;
  entityType:
    | "character"
    | "creature"
    | "artifact"
    | "location"
    | "faction"
    | "system"
    | "fate_event";
  entityName: string;
  displayTitle: string;
  imageUrl?: string;
  quote?: string;
  audioText?: string;
  audioType?: "tts_line" | WorldCardSoundRole;
  sound?: WorldCardSoundHints;
  voicePreset?: string;
  codexEntryId?: string;
  rarity?: string;
}

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
    type: "character" | "artifact" | "location" | "beast" | "faction";
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

export interface SystemEvent {
  kind:
    | "status"
    | "skill_acquired"
    | "level_up"
    | "quest"
    | "appraisal"
    | "fate_result";
  promptType?:
    | "neutral"
    | "codex_update"
    | "friendly_scan"
    | "enemy_scan"
    | "warning"
    | "critical_danger"
    | "progression"
    | "breakthrough"
    | "reward"
    | "romance"
    | "karmic_bond"
    | "mystery"
    | "fate_event"
    | "corruption"
    | "death_event"
    | "quest_update"
    | "choice_consequence"
    | "system_error";
  title: string;
  rows?: { label: string; value: string }[];
  rarity?: string;
  fateResult?: FateResultData;
}

export interface StoryBlock {
  id: string;
  type: string;
  text: string;
  metadata?: StoryBlockMetadata;
  system?: SystemEvent;
  worldCard?: WorldCardEvent;
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
}

/**
 * The readable body of a chapter. Stripped off the Story document at save time
 * and stored as a `ChapterContent` row, so it is absent until hydrated.
 */
export interface ChapterProse {
  generatedContent?: string;
  blocks?: StoryBlock[];
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
}

export interface Bookmark {
  id: string;
  chapterNumber: number;
  paragraphIndex: number;
  paragraphExcerpt: string;
  note?: string;
  createdAt: string;
}

export interface Character {
  id?: string;
  name: string;
  role?: string;
  status?: "alive" | "deceased" | "unknown" | "ascended" | string;
  powerLevel?: string;
  relationshipToMC?: string;
  description?: string;
}

export interface Faction {
  id?: string;
  name: string;
  alignment?: string;
  description?: string;
}

export interface Location {
  id?: string;
  name: string;
  safetyLevel?: string;
  description?: string;
}

export interface Artifact {
  id?: string;
  name: string;
  tier?: string;
  condition?: string;
  description?: string;
}

export interface PlotThread {
  id?: string;
  description: string;
  originChapter?: number;
}

/** StoryMemory shape consumed by the reading surface and living Codex. */
export interface StoryMemory {
  currentPowerStage?: string;
  powerSystem?: string;
  characters?: Character[];
  factions?: Faction[];
  locations?: Location[];
  artifacts?: Artifact[];
  unresolvedPlotThreads?: Array<string | PlotThread>;
  resolvedPlotThreads?: Array<string | PlotThread>;
  worldRules?: string[];
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
  readerPreferences?: ReaderPreferences;
  bookmarks?: Bookmark[];
  assignedRevealBackdrops?: Record<string, string>;
  lastReadChapter?: number;
  chapterGenerationBatch?: ChapterGenerationBatch;
}

export type Story = StoryWorld;

/** Metadata policy applied by the store-owned story patch queue. */
export interface StoryUpdateOptions {
  markEdited?: boolean;
  touchUpdatedAt?: boolean;
}

/**
 * The story fields Reader and Living Codex surfaces may patch directly.
 * Widened to `Partial<StoryWorld>` in the Workshop subset because the full
 * production Pick lists fields this trimmed StoryWorld does not carry.
 */
export type ReaderCodexStoryPatch = Partial<StoryWorld>;

export type ReaderCodexStoryPatchUpdater =
  | ReaderCodexStoryPatch
  | ((current: StoryWorld) => ReaderCodexStoryPatch);

/** Store-owned Reader/Codex mutation boundary. Never accepts a StoryWorld. */
export type UpdateStoryFields = (
  storyId: string,
  updates: ReaderCodexStoryPatchUpdater,
  options?: StoryUpdateOptions,
) => Promise<void>;
