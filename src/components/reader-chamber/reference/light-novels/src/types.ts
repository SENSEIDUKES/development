export interface StreamingChapter {
  number: number;
  content: string;
  blocks?: StoryBlock[];
}

export interface StatusEffectDef {
  name: string;
  type: "Curse" | "Blessing" | "Affliction" | "Mutation";
  description: string;
  durationMs: number;
  scope: "Account-wide" | "Story-specific";
  visual?: string;
  counterplay?: string;
  rewardHook?: string;
  qiMultiplier?: number;
  sectQiMultiplier?: number;
  targetProgress?: number;
}

export interface ActiveStatusEffect {
  id: string;
  effectDef: StatusEffectDef;
  appliedAt: string;
  expiresAt: string;
  sourceArtifactId?: string;
  progress?: number;
  targetProgress?: number;
  completedAt?: string;
  isUnlockedReward?: boolean;
}

export interface SpecialUnlockDef {
  type: "cosmetic" | "sen_workshop" | "customization" | "profile_item" | "badge" | "theme" | "other";
  label: string;
  description?: string;
}

export interface CosmicArtifact {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
  sourceStoryId?: string;
  sourceStoryTitle?: string;
  sourceChapterNumber?: number;
  eventKey?: string;
  milestoneType:
    | "chapter_seal"
    | "rank_up"
    | "challenge_complete"
    | "first_breakthrough"
    | "streak_attained"
    | "codex_linked";
  milestoneName: string;
  imageUrl?: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Mythic" | "Transcendent";
  attributeBoost?: string;
  statusEffectDef?: StatusEffectDef;
  
  // Flexible Special Unlock field supporting interchangeable future rewards
  specialUnlock?: SpecialUnlockDef | string;
  
  // Weekly Offering System
  offeringWeekId?: string;
  gatheredAt?: string;
  status?: "unsubmitted" | "submitted" | "auto_submitted";
  rewardValueQi?: number;
  rewardValueSectMerit?: number;
}

export type ProfilePictureMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ProfilePictureCustomization {
  frameId: string | null;
  glowId: string | null;
  bannerId: string | null;
  effectIds: string[];
}

export interface ProfilePictureGeneration {
  prompt: string;
  description: string;
  daoRank: string;
  daoXp: number;
  powerStage: string;
  equippedArtifactId: string | null;
  usedReferenceImage: boolean;
}

export interface ProfilePictureAsset {
  schemaVersion: 1;
  id: string;
  userId: string;
  imageUrl: string;
  /** Canonical durable metadata. Signed delivery URLs are blanked before caching. */
  avatarMediaDescriptor: import("./contracts/mediaAssets").MediaAssetDescriptor;
  assetVersion?: number;
  checksumSha256?: string;
  deliveryUrlExpiresAt?: string;
  mimeType: ProfilePictureMimeType;
  source: 'generated';
  createdAt: string;
  updatedAt: string;
  generation: ProfilePictureGeneration;
  customization: ProfilePictureCustomization;
}

export type ChapterWritingStyle =
  | "Standard"
  | "Clear Reading"
  | "Easy Read"
  | "Literal Reading";

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  displayNameColor?: string;
  avatarUrl: string;
  /** Account-owned portrait selected from users/{uid}/portraits. */
  activePortraitId?: string;
  /** Transient/canonical portrait metadata; signed delivery URLs are never cached. */
  avatarMediaDescriptor?: import("./contracts/mediaAssets").MediaAssetDescriptor;
  /**
   * Structured profile state remains usable when only portrait delivery fails.
   * This is a transient projection and is never written back to PostgreSQL.
   */
  avatarDeliveryError?: {
    code:
      | 'portrait_descriptor_unavailable'
      | 'portrait_delivery_unavailable'
      | 'portrait_download_unavailable';
    message: string;
    recoverable: boolean;
  };
  preferredLanguage: string;
  defaultTranslationLanguage: string;
  /** Default copied onto newly created stories; existing stories keep their saved value. */
  defaultChapterWritingStyle?: ChapterWritingStyle;
  savedStoryCount: number;
  activeStories: string[];
  inactiveStories: string[];
  joinedDate: string;
  updatedAt: string;
  role?: "owner" | "admin" | "user";
  qi?: number; // legacy
  dao_xp?: number;
  dao_rank?: string;
  heavenly_qi?: number;
  sect_qi?: number;
  demonic_qi?: number;
  premiumTier?: "mortal" | "outer_sect" | "inner_sect" | "sect_master" | "immortal";
  imageGenerationCount?: number;
  imageQuotaResetAt?: string;
  writingStreak?: number;

  // Idle Cultivation & Dao Pillar
  lastSessionEnd?: string;
  daoPillarStreak?: number;
  daoPillarCracked?: boolean;
  lastReadDate?: string;

  lastInteractionDate?: string;
  cosmicInventory?: CosmicArtifact[];
  equippedArtifactId?: string;
  activeStatusEffects?: ActiveStatusEffect[];
}

export interface DaoXpEvent {
  id?: string;
  user_id: string;
  event_type: string;
  xp_amount: number;
  source_id?: string;
  source_type?: string;
  created_at: string;
}

export interface GeneratedImage {
  id: string;
  /** Canonical PostgreSQL/R2 asset identity. `imageUrl` is only a transient delivery URL. */
  assetId?: string;
  assetVersion?: number;
  checksumSha256?: string;
  deliveryUrlExpiresAt?: string;
  entityId: string;
  entityType:
    | "cover"
    | "character"
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
  element?:
    | "fire"
    | "ice"
    | "lightning"
    | "earth"
    | "void"
    | "blood"
    | "wind"
    | "poison"
    | "none"
    | (string & {});
  movement?:
    | "crawling"
    | "flying"
    | "burrowing"
    | "teleporting"
    | "stomping"
    | "none"
    | (string & {});
  intelligence?: "animal" | "cunning" | "ancient" | "divine" | (string & {});
  threatTier?: "common" | "elite" | "boss" | "calamity" | "mythic" | (string & {});
  signatureSound?:
    | "screech"
    | "roar"
    | "chitter"
    | "hum"
    | "pulse"
    | "chant"
    | "silence"
    | (string & {});
}

export interface FateResultData {
  outcome: "FATE AVERTED" | "FATE SCARRED" | "DOOM MANIFESTED";
  timelineScar: string;
  permanentCosts: string[];
  newStoryState?: string;
  newActiveStats?: string[];
  genreShift?: string;
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
  rarity?: CosmicArtifact["rarity"];
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

export interface PlotThread {
  id?: string;
  description: string;
  status: "active" | "resolved";
  provenance?: MemoryProvenance;
  originChapter?: number;
}

export interface AbilityProgressionEvent {
  chapter: number;
  fromMastery?: string;
  toMastery?: string;
  /** e.g. "duplicate acquisition merged", "breakthrough during duel" */
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
  /** Append-only mastery history (Context Engine 2.5). */
  progression?: AbilityProgressionEvent[];
}

export interface BaseCodexEntry {
  /** Canonical Data Connect row identity for relational/media associations. */
  persistenceId?: string;
  /** Current immutable R2 manifestation asset. */
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
  /** Editorial evidence that this entity warrants automatic visual manifestation. */
  manifestationImportance?: import('./lib/manifestationEligibility').ManifestationImportance;
  pendingEvolution?: boolean;
  arcAccumulation?: string;
}

export interface Character extends BaseCodexEntry {
  id: string;
  name: string;
  role: string;
  description: string;
  relationshipToMC: string;
  status: "alive" | "deceased" | "unknown" | "ascended";
  powerLevel?: string;
  abilities?: Array<string | Ability>;
  faction?: string;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  isBeast?: boolean;
  beastProfile?: BeastSonicProfile;
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
  voicePresetId?: string;
  signatureQuote?: string;
  voiceClipUrl?: string;
  voiceAssetId?: string;
}

export interface Faction extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  alignment: "Righteous" | "Demonic" | "Neutral" | "Mysterious" | string;
  headquarters?: string;
  status?: "Active" | "Destroyed" | "Fractured" | string;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
}

export interface Location extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  realm?: string;
  safetyLevel?: "Safe" | "Dangerous" | "Lethal" | string;
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
  tier?: "Mortal" | "Earth" | "Heaven" | "Primordial" | string;
  currentOwner?: string;
  /** Physical state (Context Engine 2.5). Absent = intact (legacy default). */
  condition?: ArtifactCondition;
  /** Where the artifact physically is, when known. */
  holderLocation?: string;
  /** Last chapter that changed owner/condition/location. */
  lastStateChapter?: number;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
}

export interface StoryMemory {
  powerSystem: string;
  currentPowerStage: string;
  worldRules: string[];
  characters: Character[];
  unresolvedPlotThreads: Array<string | PlotThread>;
  resolvedPlotThreads: Array<string | PlotThread>;
  memoryWarnings?: string[];

  // Living Codex expansions
  factions?: Faction[];
  locations?: Location[];
  artifacts?: Artifact[];
  abilities?: Array<string | Ability>; // MC-specific learned arts & skills
}

export interface StoryBlockMetadata {
  sceneType?: string;
  environment?: string[];
  /** Dominant looping bed family; omitted when the scene has no clear fit. */
  atmosphereCategory?: "wind" | "crowd" | "waves" | "rain" | "combat" | "noise";
  /** Explicit scene terms used only to match curated atmosphere-bed tags. */
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

/**
 * Intentional sound roles a World Card can carry. Character quotes stay on
 * the separate "tts_line" audioType — spoken lines are never SFX assets.
 */
export type WorldCardSoundRole =
  // Beast
  | "roar"
  | "call"
  | "hiss"
  | "howl"
  | "screech"
  | "wingbeat"
  // Weapon
  | "unsheathe"
  | "metallic_ring"
  | "reload"
  | "activation_hum"
  // Artifact / relic
  | "resonance"
  | "awakening"
  | "pulse"
  | "magical_activation"
  // Location
  | "signature"
  // Faction / ritual
  | "chant"
  // System
  | "chime";

/**
 * The two catalog families that can back an artifact World Card. Keeping this
 * explicit prevents a weapon effect from competing with a relic effect when
 * their roles happen to overlap (for example, magical_activation).
 */
export type WorldCardArtifactAssetFamily = "weapon" | "relic";

/**
 * Optional semantic hints for curated sound resolution. All fields reuse
 * vocabulary that already exists elsewhere in the model (BeastSonicProfile
 * sizes/tiers, element names) so generation doesn't need a new taxonomy.
 */
export interface WorldCardSoundHints {
  /** Author-only pin for a specific curated catalog entry. Generated cards never retain this. */
  assetId?: string;
  element?: string;
  size?: BeastSonicProfile["size"];
  threatTier?: BeastSonicProfile["threatTier"];
  assetFamily?: WorldCardArtifactAssetFamily;
  weaponType?: string;
  artifactCategory?: string;
  tags?: string[];
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
  /** Opening-scene context for the chapter's initial curated atmosphere bed. */
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

export interface VoiceClip {
  blockId: string;
  audioUrl: string;
  speakerVoice: string;
}

export interface AudioManifest {
  version: string;
  language: string;
  clips: VoiceClip[];
  generatedAt: number;
}

export interface ChapterContent {
  storyId: string;
  /** Cloud owner tag. Optional only while legacy chapter documents are backfilled. */
  userId?: string;
  chapterNumber: number;
  generatedContent: string;
  blocks?: StoryBlock[];
  archivedBlocks?: StoryBlock[]; // For offloading older dialogue/non-essential blocks
  summary?: string;
  episodicSummary?: string; // Episodic summaries
  statsChangeMessage?: string;
  cuePayload?: StoryCuePayload;
  translations?: {
    [langCode: string]: {
      title: string;
      content: string;
      translatedAt: number;
    };
  };
  audioManifest?: AudioManifest;
  syncStatus?: "local" | "synced" | "conflict";
  revisionId?: string;
  /** Unique cloud write token used for optimistic cross-device concurrency. */
  syncRevision?: string;
  updatedAt?: string;
  contextManifest?: ContextManifest;
  /** Canonical end state of this chapter (Context Engine 2.5). */
  handoff?: ChapterHandoff;
  /** The contract this chapter was generated against (debug/inspection). */
  contract?: ChapterContract;
}

// ── Context Engine 2.5: canonical chapter handoff & contract ────────────────

export type SceneActionType =
  | "battle"
  | "duel"
  | "breakthrough"
  | "acquisition"
  | "discovery"
  | "death"
  | "travel-arrival"
  | "social"
  | "training"
  | "ritual"
  | "escape"
  | "revelation"
  | "other";

export interface SceneFingerprint {
  /** Closed-enum action class; unknown model output maps to "other". */
  actionType: SceneActionType;
  /** Canonical entity names (resolved through entityResolver at persist time). */
  participants: string[];
  location?: string;
  /** One-line outcome, e.g. "Li Wei wins, Elder Kang crippled". */
  outcome: string;
  chapterNumber: number;
}

export interface ChapterEndState {
  location?: string;
  /** Freeform but short: "dusk, same day", "three days later". */
  timeMarker?: string;
  charactersPresent?: string[];
  /** Physical/emotional MC condition: "exhausted, qi depleted". */
  mcCondition?: string;
  /** The live tension the chapter ends on (hook), one line. */
  openTension?: string;
}

/** Authoritative machine-readable end state of a generated chapter. */
export interface ChapterHandoff {
  version: 1;
  chapterNumber: number;
  endState: ChapterEndState;
  /** 2–6 one-line canonical, irreversible facts established this chapter. */
  completedEvents: string[];
  /** The single immediate beat the next chapter opens on. */
  nextImmediateAction?: string;
  fingerprints: SceneFingerprint[];
}

/** What the next chapter must accomplish; built deterministically client-side. */
export interface ChapterContract {
  version: 1;
  chapterNumber: number;
  /** Copied from the previous handoff's endState; absent for chapter 1 / gaps. */
  startingState?: ChapterEndState;
  /** Copied from the previous handoff's nextImmediateAction. */
  requiredOpening?: string;
  /** The chapter premise, verbatim. */
  objective: string;
  /** Completed-event lines from recent handoffs/fingerprints, newest first. */
  doNotRepeat: string[];
  completionCriteria?: string[];
}

/** Self-report from the metadata extraction pass about contract fulfillment. */
export interface ContractReport {
  objectiveFulfilled: boolean;
  /** One-line evidence quote/paraphrase when fulfilled. */
  evidence?: string;
  /** Whether the chapter opened consistent with requiredOpening/startingState. */
  openingMatched?: boolean;
}

export type ContextBlockKind =
  | "anchor"
  | "recent-full"
  | "recent-summary"
  | "rag"
  | "arc-summary";

export interface ContextBlock {
  kind: ContextBlockKind;
  chapterNumber?: number;
  text: string;
  summaryText?: string;
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

// ── Chapter lifecycle shapes ────────────────────────────────────────────────
//
// A chapter is not one thing. It is produced by the generation pipeline, then
// stripped down to a scaffold when it is written to the Story document (the
// prose moves to its own `ChapterContent` row), then re-hydrated for reading.
// Those three stages carry genuinely different fields, and conflating them is
// what let the reader and the persistence layer disagree about which fields
// survive a round trip.
//
// The groups below are the vocabulary; `GeneratedChapter`, `PersistedChapter`
// and `ReaderChapter` compose them into the three stages. `Chapter` remains
// the permissive superset so existing call sites keep compiling — prefer a
// stage-specific type in new code, and see `lib/chapterViews.ts` for the
// conversions between them.

/**
 * Identity and scaffold fields. Present at every stage, and the only chapter
 * fields guaranteed to survive being written to the Story document.
 */
export interface ChapterScaffold {
  /** Canonical Data Connect row identity. */
  persistenceId?: string;
  number: number;
  title: string;
  premise: string;
  status: "unlocked" | "generating" | "read" | "unread";
  hasContent?: boolean; // Indicates if the content was generated and stored
  isSealed?: boolean; // Indicates the chapter is published/locked for editing
  contentHash?: string;
  sealedAt?: number;
  versionId?: string;
  branchAnchor?: string;
  summary?: string; // Kept on the scaffold for lightweight context retrieval
  embedding?: number[]; // Optional vector embedding for RAG continuity searches
  translationCache?: Record<string, string>;
  audioCueCache?: Record<string, string>;
  translations?: {
    [langCode: string]: {
      title: string;
      content: string;
      translatedAt: number;
    };
  };
  audioManifest?: AudioManifest;
  hasContinuityFaults?: boolean;
  continuityWarnings?: string[];
  continuitySoftNotes?: string[];
  /**
   * Compact scene fingerprints kept on the always-loaded chapter scaffold so
   * contract building and duplicate detection never require content loads.
   */
  sceneFingerprints?: SceneFingerprint[];
  /** Contract fulfillment self-report, surfaced next to continuity notes. */
  contractReport?: ContractReport;
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
  generatedContent?: string; // Optional, only populated when currently viewed
  blocks?: StoryBlock[];
  statsChangeMessage?: string;
  cuePayload?: StoryCuePayload;
}

/**
 * Inspectable record of how a chapter was generated. Stripped off the Story
 * document like prose, stored on `ChapterContent`, and re-hydrated for the
 * reader's context inspector — so unlike the internals below, it is genuinely
 * reader-visible.
 */
export interface ChapterDiagnostics {
  /** Debug record of the exact context classes available to this generation. */
  contextManifest?: ContextManifest;
}

/**
 * Pipeline-internal carriers. These ride a freshly generated chapter only far
 * enough to reach persistence, then move onto `ChapterContent`. Nothing in the
 * reading surface depends on them — that is the point of keeping them off
 * `ReaderChapter`.
 */
export interface ChapterGenerationInternals {
  _isNewContent?: boolean;
  /**
   * Transient carrier for the full handoff/contract between generation and
   * persistence; moved onto ChapterContent (like contextManifest) at save time.
   */
  handoff?: ChapterHandoff;
  contract?: ChapterContract;
}

/** What the generation pipeline produces and hands to persistence. */
export interface GeneratedChapter
  extends ChapterScaffold,
    ChapterMedia,
    ChapterProse,
    ChapterDiagnostics,
    ChapterGenerationInternals {}

/**
 * What is actually written into the Story document: scaffold and media only.
 * Prose and pipeline internals are stripped into `ChapterContent`. Typing a
 * value as this is a claim that it has already been through that strip.
 */
export interface PersistedChapter extends ChapterScaffold, ChapterMedia {}

/**
 * What the reading surface consumes: scaffold, media, and — once hydrated —
 * the prose and its generation diagnostics. Deliberately excludes
 * `ChapterGenerationInternals`, so reader code cannot reach into pipeline
 * state that persistence has already moved onto `ChapterContent`.
 */
export interface ReaderChapter
  extends ChapterScaffold,
    ChapterMedia,
    ChapterProse,
    ChapterDiagnostics {}

/**
 * Permissive superset covering every stage.
 *
 * Retained so the existing call sites that pass one chapter object through
 * generation, persistence and rendering keep compiling. New code should name
 * the stage it means: `GeneratedChapter`, `PersistedChapter`, or
 * `ReaderChapter`.
 */
export type Chapter = GeneratedChapter;

export interface StoryArc {
  /** Canonical Data Connect row identity. */
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
  dropCapStyle?: "off" | "classic" | "celestial" | "calligraphy";
  systemBlockStyle?: "hologram" | "scroll" | "runic" | "minimal";
}

export interface ReaderAccessibilitySettings {
  fontSizeRem: number; // defaults to 1.0, ranges from 0.85 to 2.5
  lineHeightScale: number; // spacing weight, e.g., 1.5 to 2.2
  fontFamilyId: 'system' | 'serif' | 'dyslexic' | 'custom';
  colorPaletteId: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'high_contrast_dark';
  letterSpacing: number;
}

export interface KarmaFateNode {
  id: string;
  sourceId: string; // ID of character, location, or thread
  sourceName: string;
  targetId: string; // ID of character, location, or thread
  targetName: string;
  description: string;
  severity: "Minor" | "Major" | "Cosmic";
  type: "Debt" | "Boon" | "Enmity" | "Destiny";
  status: "active" | "resolved";
  createdAt: string;
}

export interface CharacterRelationship {
  id: string;
  sourceCharId: string;
  sourceCharName: string;
  targetCharId: string;
  targetCharName: string;
  affinity: number; // -100 to +100
  threat?: number; // -100 to +100
  description: string;
  updatedAt: string;
}

export interface IntakeCharacter {
  id: string;
  name: string;
  aliases?: string[];
  age?: string;
  skinTone?: string;
  eyeColor?: string;
  powerType?: string;
  rankLevel?: string;
  role?: string;
  connectionToMC?: string;
  bio?: string;
}

export interface IntakeFaction {
  id: string;
  name: string;
  aliases?: string[];
  role?: string;
  powerLevel?: string;
  alignment?: string;
  connectionToMC?: string;
  description?: string;
}

export interface IntakeData {
  // 1. Core Seed
  novelTitle?: string;
  mcName?: string;
  genrePath?: string;
  corePremise?: string;
  desiredPlotDirection?: string;
  storyTags?: string[];
  destinedEnding?: string;
  estimatedArcs?: number;

  // 2. World Setting
  worldType?: string;
  startingLocation?: string;
  societyStructure?: string;
  dangerLevel?: string;
  generalAtmosphere?: string;

  // 3. Main Character Setup
  startingIdentity?: string;
  personality?: string;
  mainFlaw?: string;
  secretAdvantage?: string;
  startingWeakness?: string;
  moralAlignment?: string;
  mcBio?: string;

  // 3.5. Character Intake
  customCharacters?: IntakeCharacter[];

  // 3.8. Faction Intake
  customFactions?: IntakeFaction[];

  // 4. Power System Seed
  startingPowerConcept?: string;
  powerFlavor?: string;
  powerPace?: string;
  knownRanks?: string;
  uniquePath?: string;

  // 5. Plot & Trope Control
  longTermGoal?: string;
  firstMajorConflict?: string;
  mainAntagonistPressure?: string;
  romanceLevel?: string;
  faceSlappingLevel?: string;
  comedyLevel?: string;
  tournamentArcPreference?: string;
  haremPreference?: string;
  betrayalLevel?: string;
  thingsToAvoid?: string;
  mustIncludeElements?: string;
  hardcoreFateMode?: boolean;
  fatePressure?: "Relaxed" | "Balanced" | "Hardcore" | "Dao Master";

  // 6. Make it Work (Absolute Custom Rule)
  makeItWorkInstruction?: string;
}

export interface WorldBlueprint {
  title: string;
  logline: string;
  worldOverview: string;
  startingLocation: string;
  societyStructure: string;
  powerSystemOutline: string;
  mcProfile: string;
  majorFactions: string[];
  initialCharacters: string[];
  majorMysteries: string[];
  firstArcPromise: string;
  tropeRules: string;
  styleBible: string;
  destinedEnding?: string;
  estimatedArcs: number;
  unresolvedPlotThreads: string[];
}

/** The complete, reusable inputs required to generate a story from a seed. */
export interface StorySeedPayload {
  intake: IntakeData;
  blueprint: WorldBlueprint;
}

/** Private account-owned seed metadata. Internal fields are never exported. */
export interface StorySeed extends StorySeedPayload {
  schemaVersion: 1;
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryWorld {
  /** Catalog rows remain compact until the story is explicitly opened. */
  persistenceHydration?: "summary" | "full";
  /**
   * Authoritative chapter tallies carried by every catalog row.
   *
   * A summary has no `arcs`, so counting them yields 0/0 and the Library used
   * to render a restored story as empty until its full graph was downloaded.
   * These two fields are computed from persisted server state — the Chapter
   * rows themselves — so the Hub renders real progress without hydrating a
   * single story graph. They are advisory display state: `arcs` remains the
   * authority whenever a story is fully hydrated.
   */
  totalChapterCount?: number;
  generatedChapterCount?: number;
  /** Transient current-surface descriptors; delivery URLs are never authoritative state. */
  mediaDescriptors?: Record<string, import("./contracts/mediaAssets").MediaAssetDescriptor>;
  /** Canonical Data Connect row identity; new stories use this as `id`. */
  persistenceId?: string;
  userId?: string;
  id: string;
  /** Account-owned seed used to create this story. */
  sourceSeedId?: string;
  parentStoryId?: string;
  forkChapterNumber?: number;
  title: string;
  genre: string;
  mcName: string;
  customPremise: string;
  createdAt: string;
  updatedAt: string;
  /** Unique cloud write token used for optimistic cross-device concurrency. */
  syncRevision?: string;
  memory: StoryMemory;
  arcs: StoryArc[];
  currentChapterNumber: number;
  imageUrl?: string;
  coverAssetId?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
  intake?: IntakeData;
  blueprint?: WorldBlueprint;
  isEdited?: boolean; // Track if the user has modified/actively worked on the demo story
  motionCoverActive?: boolean; // Alternative video covers active state
  /** This story's own Cloudflare R2 motion cover video. No fallback to another story's video when unset. */
  videoUrl?: string;
  hardcoreFateMode?: boolean;
  fatePressure?: "Relaxed" | "Balanced" | "Hardcore" | "Dao Master";
  /** Applies only to future chapter prose generation. */
  chapterWritingStyle?: ChapterWritingStyle;
  deleted?: boolean; // Soft delete for synchronization

  // Local-first persistent storage properties
  relationships?: CharacterRelationship[];
  karmaNodes?: KarmaFateNode[];
  readerPreferences?: ReaderPreferences;
  bookmarks?: Bookmark[];
  assignedRevealBackdrops?: Record<string, string>;

  // Reader experience tracking
  lastReadChapter?: number;
  /**
   * Legacy raw pixel offset. Read once for migration to `readingAnchor`,
   * never written anymore.
   */
  lastReadScrollPosition?: number;
  /** Semantic reading position — survives layout, font, and viewport changes. */
  readingAnchor?: import('./lib/cinematicScroll/anchors').ReadingAnchor;
  readingStats?: {
    totalReadingTimeMs?: number;
    arcReadingTimeMs?: Record<number, number>;
  };
  lastReadAt?: string;
  conflictResolvedAt?: string;
  /** Persisted lifecycle for a sequential five-chapter manifestation run. */
  chapterGenerationBatch?: ChapterGenerationBatch;
}

export interface Bookmark {
  id: string;
  chapterNumber: number;
  paragraphIndex: number;
  paragraphExcerpt: string;
  note?: string;
  createdAt: string;
}

export type Story = StoryWorld;

/** Metadata policy applied by the store-owned story patch queue. */
export interface StoryUpdateOptions {
  markEdited?: boolean;
  touchUpdatedAt?: boolean;
}

/**
 * The only story fields Reader and Living Codex surfaces may patch directly.
 * Aggregate identity, chapter collections, arcs, and story-level media
 * ownership deliberately do not appear here. `mediaDescriptors` is only the
 * disposable local cache index for those owner records, never ownership.
 * `memory` remains available because the Codex owns its entity records and
 * their manifestation media.
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

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface LoreGlossary {
  id: string;
  novel_id: string;
  source_text: string;
  target_text: string;
  target_lang: string;
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

// Fate Survival Challenge Types
export interface FateChoice {
  id: string;
  label: string;
  description?: string;
  effects: {
    survival?: number;
    relationship?: number;
    danger?: number;
    fateResistance?: number;
    trust?: number;
  };
}

export interface FateChoicePoint {
  id: string;
  stepNumber: number;
  prompt: string;
  choices: FateChoice[];
}

export interface FateSurvivalChallenge {
  id: string;
  title: string;
  genre: string;
  description: string;
  fatedOutcome: string;
  startingScenario: string;
  totalSteps: number;
  choicePoints: FateChoicePoint[];
  successCondition: string;
  failureCondition: string;
  rewards: {
    attemptQi: number;
    failureQi: number;
    partialSuccessQi: number;
    successQi: number;
  };
}

export interface FateSurvivalRun {
  id: string;
  challengeId: string;
  userId: string;
  currentStep: number;
  status: "not_started" | "active" | "completed" | "failed";
  selectedChoices: string[]; // Store IDs of chosen choices
  state: {
    survival: number;
    relationship: number;
    danger: number;
    fateResistance: number;
    trust: number;
  };
  result?: "failure" | "partial_success" | "success";
  qiAwarded?: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * The frozen chapter draft a crash left behind, offered back to the reader.
 *
 * Both fields come from the snapshot the interrupted run wrote when it
 * started, so the offer stays bound to that story and chapter no matter where
 * the reader has navigated since.
 */
export interface DraftRecoverySession {
  storyId: string;
  chapterNumber: number;
}
