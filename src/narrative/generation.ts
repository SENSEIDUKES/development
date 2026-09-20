import type { ResolvedAudioMoment } from '../audio/inlineAudio';
import type { FrozenNarrativeMedia, ResolvedSoundscape, StoryMediaSelection } from '../audio/media';
import type { SenLanguageCode } from '../lib/language';
import type { StoryBlock } from './chapter';
import type { ChapterFunction, ChapterRecap, FatePressure, HardPin, NextChapterSuggestions } from './storyDirection';

/** Independent Harness Generation contracts. Bump this on any change to a
 * persisted shape (attempt, chapter, or workspace state fields). This is a
 * development system: storage at any other version is reset, never
 * migrated — see `readHarnessWorkspaceState` in `repository.ts`. */
export const HARNESS_GENERATION_SCHEMA_VERSION = 15 as const;

/** Output buckets assign processor categories; legacy event arrays remain readable. */
export const HARNESS_MEMORY_CATEGORIES = {
  characters: 'character', decisions: 'decision', relationships: 'relationship', locations: 'location',
  factions: 'faction', deadlines: 'deadline', timeline: 'timeline', progression: 'progression',
  threads: 'plot-thread', mysteries: 'mystery', clues: 'clue', revelations: 'revelation', artifacts: 'artifact',
} as const;

export interface HarnessStorySeedSnapshot {
  kind: 'story-seed';
  sourceId: string;
  sourceUpdatedAt: string;
  schemaVersion: number;
  seed: unknown;
  blueprint?: unknown;
}

export interface StoryFoundationInput {
  destinedEnding?: string;
  /**
   * The story's canonical Fate Pressure tier (storyteller intensity). Copied
   * from the Story Seed domain value at the boundary; never read from a
   * visible label and never written by a model reply.
   */
  fatePressure?: FatePressure;
  initialArcPlan?: import('../components/arc-goals/shared/arcGoals').ArcPlan;
  title?: string;
  /** The only author field required to start a Harness story. */
  premise: string;
  permanentInstructions?: string;
  toneStyle?: string;
  genre?: string;
  openingSituation?: string;
  declaredCanon?: string;
  characters?: string;
  /** Known identities supplied by the host; never inferred from paragraph order. */
  cast?: NonNullable<HarnessEventDetails['character']>[];
  worldFacts?: string;
  intendedDirection?: string;
  /** Host-declared identities; names and aliases are author data, not model IDs. */
  identities?: Array<{ name: string; aliases?: string[]; kind: 'character' | 'location-world' | 'faction'; evidence: string }>;
  /** Immutable source evidence copied at the Story Seed -> Harness boundary. */
  sourceSnapshot?: HarnessStorySeedSnapshot;
}

export interface HarnessStorySeedOption {
  id: string;
  title: string;
  updatedAt: string;
  hasBlueprint: boolean;
  /** The seed's own Original Language, frozen onto the story it starts. */
  originalLanguage: SenLanguageCode;
  /** Host-resolved package identities to equip only when this story is created. */
  initialSkillLoadout?: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>;
  foundation: StoryFoundationInput;
}

/** Host-provided one-way input. The Harness never imports Story Seed internals. */
export interface HarnessStorySeedSource {
  list(): Promise<HarnessStorySeedOption[]>;
  manageHref?: string;
}

export interface StoryFoundationRevision {
  id: string;
  storyId: string;
  revision: number;
  createdAt: string;
  input: StoryFoundationInput;
}

export interface HarnessStoryHead {
  nextChapterNumber: number;
  lastCommittedChapterId?: string;
  lastCommittedAt?: string;
}

export interface HarnessStory {
  arcPlans?: import('../components/arc-goals/shared/arcGoals').ArcPlanRevision[];
  goalCompletions?: import('../components/arc-goals/shared/arcGoals').ArcGoalCompletion[];
  id: string;
  title: string;
  /**
   * Permanent story identity, assigned once at creation from the Story Seed.
   * Chapters are authored in this language. A Foundation revision can never
   * change it, and no reader preference is stored here.
   */
  originalLanguage: SenLanguageCode;
  createdAt: string;
  updatedAt: string;
  activeFoundationRevisionId: string;
  foundationRevisionIds: string[];
  head: HarnessStoryHead;
  contextPolicy?: HarnessContextSelectionPolicy;
  /** Append-only author directions, independent of the frozen opening outline. */
  steering?: HarnessSteering[];
  /** Per-story references to host-installed skills. The full manifests are frozen per request. */
  skillLoadout?: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>;
  /** Entitled Media Packs equipped for this story. Separate from CAPA skills. */
  mediaLoadout?: StoryMediaSelection;
  /** User-created story-wide intentions (at most `HARD_PIN_LIMIT`). Only the user writes them. */
  hardPins?: HardPin[];
  /** The deterministic Fate Pressure recommendation for the next chapter, refreshed at every commit. */
  rhythmRecommendation?: import('../components/harness-generation/shared/rhythm').HarnessRhythmRecommendation;
}

/**
 * Rhythm metadata the writer returns beside the chapter: the function this
 * chapter served and one short possibility per function for the next chapter.
 * HARNESS validates each piece independently; a malformed piece is omitted
 * with a warning and never touches the prose.
 */
export interface HarnessChapterRhythm {
  chapterFunction?: ChapterFunction;
  nextChapterSuggestions?: NextChapterSuggestions;
}

export type HarnessSkillSlotId =
  | 'author'
  | 'pacing'
  | 'continuity'
  | 'style'
  | 'accessibility'
  | 'translation';

export type HarnessSkillApplication =
  | 'generation'
  | 'post-commit'
  | 'reader';

export interface HarnessSkillReference {
  id: string;
  version: string;
}

/** One canonical term and the rendering an equipped Translation skill requires. */
export interface HarnessTranslationGlossaryEntry {
  /** The canonical (English) term, matched against frozen story information. */
  term: string;
  aliases?: string[];
  /** How the term must read in the skill's target language. */
  translation: string;
  note?: string;
}

/**
 * A language-specific glossary installed alongside a Translation skill. It is
 * a reference resource, never prompt text: only the entries a chapter actually
 * touches are selected into the CAPA Prompt.
 */
export interface HarnessTranslationGlossaryResource {
  /** Must equal the skill's declared target language. */
  targetLanguage: SenLanguageCode;
  entries: HarnessTranslationGlossaryEntry[];
  /** Provenance of the selected resource file inside its package. */
  source?: { path: string; sha256: string };
}

/**
 * Structural Translation metadata. The target language is declared, never
 * inferred from a skill's name, filename, instructions, or package title.
 */
export interface HarnessTranslationSkillMetadata {
  /** Exactly one supported target language. */
  targetLanguage: SenLanguageCode;
  glossary?: HarnessTranslationGlossaryResource;
}

/** A provider-neutral manifest supplied by the host's installed-skill library. */
export interface HarnessSkillManifest extends HarnessSkillReference {
  name: string;
  description: string;
  slot: HarnessSkillSlotId;
  applications: HarnessSkillApplication[];
  /** Trusted, author-installed directions included only when generation is declared. */
  instructions?: string;
  /** Required by a `translation` slot skill; forbidden on every other slot. */
  translation?: HarnessTranslationSkillMetadata;
  author?: string;
  assetCount?: number;
  runtimeLabel?: string;
  /** Original container identity and selected file; metadata is not model instruction text. */
  source?: {
    packageId: string;
    packageVersion: string;
    path: string;
    sha256: string;
    /** Optional whole-container identity retained by hosts that keep the original SPP. */
    archiveSha256?: string;
    /** Exact package inventory retained as provenance; resource bytes never enter CAPA. */
    resources?: Array<{ path: string; mediaType: string; sha256: string }>;
  };
}

/** Exact installed manifests frozen in CAPA Schema order before CAPA assembly. */
export interface HarnessSkillLoadoutSnapshot {
  skills: HarnessSkillManifest[];
  capturedAt: string;
}

/** One equipped CAPA Skill recorded in the CAPA Prompt. Its instructions live only in `CapaPrompt.text`. */
export interface CapaPromptSkill {
  id: string;
  version: string;
  name: string;
  slot: HarnessSkillSlotId;
  applications: HarnessSkillApplication[];
  /** Whether this skill's instructions are part of the assembled text. */
  authoring: boolean;
  /** Declared by a Translation skill; retained as frozen provenance. */
  targetLanguage?: SenLanguageCode;
  source?: HarnessSkillManifest['source'];
}

/**
 * CAPA Prompt: every active generation skill, including Author, assembled once
 * in CAPA Schema order. It is the model's complete authoring instruction and
 * never carries story information.
 */
export interface CapaPrompt {
  capturedAt: string;
  skills: CapaPromptSkill[];
  text: string;
  estimatedTokens: number;
  /**
   * The exact glossary entries selected for this attempt. Frozen so a retry or
   * replay reuses the same reference instead of reselecting against new state.
   */
  translationGlossary?: HarnessSelectedTranslationGlossary;
}

/**
 * A short, inspectable reminder that the model is the author of this novel,
 * sourced from the Author portion of the assembled CAPA Prompt. Built by
 * `buildMissionReminder`; it performs no story analysis and no model call.
 */
export interface HarnessMissionReminder {
  text: string;
  /** The equipped Author skill the excerpt was taken from. */
  sourceSkill: { id: string; version: string; name: string };
}

/** The selected, already-rendered glossary reference for one attempt. */
export interface HarnessSelectedTranslationGlossary {
  skillId: string;
  skillVersion: string;
  targetLanguage: SenLanguageCode;
  /** Exact installed resource that produced this attempt's selected entries. */
  source?: HarnessTranslationGlossaryResource['source'];
  entries: HarnessTranslationGlossaryEntry[];
  /** How many entries the installed resource held before selection. */
  availableEntryCount: number;
}

/**
 * Immediate Chapter Request: the HARNESS-owned instruction for the one chapter
 * being generated now. Persistent steering history stays in the Story
 * Information Packet; this names what this attempt must do.
 */
export interface ImmediateChapterRequest {
  chapterNumber: number;
  /** True when a committed chapter precedes this one; false for the story opening. */
  continuation: boolean;
  /** The latest persistent direction the model must make concrete progress on, if any. */
  assignment?: string;
  /**
   * The HARNESS-owned chapter-scale target for this attempt. It is mechanics,
   * not a CAPA skill and not canonical Story Information: the Pacing skill
   * decides how the chapter uses the space this range allows.
   */
  chapterScale: { minWords: number; maxWords: number };
}

export interface HarnessSteering {
  id: string;
  direction: string;
  mode: 'future' | 'revise-history';
  effectiveChapter: number;
  createdAt: string;
}

/** Provider-neutral semantic details. All identities are assigned by the host. */
export interface HarnessEventDetails {
  character?: { name: string; role?: string; relationshipToMC?: string; isMainCharacter?: boolean };
  speech?: { speaker: string; quote: string };
  mechanics?: { subject: string; name: string; value: string; unit?: string };
}

export type HarnessModelPlan = string | {
  intent?: string;
  beats?: string[];
};

/** Derived chapter measurements. Persisted with every frozen attempt and committed chapter. */
export interface HarnessChapterMetrics {
  wordCount: number;
  paragraphCount: number;
  /** False when the chapter falls below the HARNESS chapter-scale target; the prose is still preserved. */
  meetsScaleTarget: boolean;
}

export interface HarnessAcceptedChapterDraft {
  /** The authoritative model-authored chapter body, one entry per prose paragraph. */
  paragraphs: string[];
  /** Readable chapter derived by joining the accepted paragraphs with blank lines. */
  prose: string;
  metrics: HarnessChapterMetrics;
  /** HARNESS-built SEN blocks carrying only accepted, anchor-matched signals. */
  blocks?: StoryBlock[];
  audioMoments?: ResolvedAudioMoment[];
  soundscapes?: ResolvedSoundscape[];
  title: string;
  titleSource: 'model' | 'harness-fallback';
  plan?: HarnessModelPlan;
  /** The writer's short "Previously On" recap of this chapter, saved only when the chapter commits. */
  recap?: string;
  rhythm?: HarnessChapterRhythm;
  responseMode: 'json' | 'plain-prose-recovery';
}

export interface HarnessSemanticEvent {
  id: string;
  storyId: string;
  attemptId: string;
  /** Added only as part of the final chapter commit. */
  chapterId?: string;
  chapterNumber: number;
  createdAt: string;
  description: string;
  category?: string;
  subjects?: string[];
  subjectKinds?: Record<string, HarnessCanonicalKind>;
  significance?: 'minor' | 'major';
  evidence?: string;
  requestedEffects?: string[];
  details?: HarnessEventDetails;
  facts?: Record<string, string>;
  /** Checked against immutable chapter prose during interpretation. */
  evidenceVerified?: boolean;
  recoveryId?: string;
  /** Lossless source lane. Derived capabilities never replace this evidence. */
  capability: 'general-narrative-event';
}

export interface HarnessRejectedEventDiagnostic {
  index: number;
  reason: string;
  rawKind: 'null' | 'array' | 'boolean' | 'number' | 'object' | 'string' | 'unknown';
}

export interface HarnessWarning {
  code:
    | 'plain_prose_recovery'
    | 'missing_title'
    | 'invalid_plan_omitted'
    | 'invalid_events_omitted'
    | 'ignored_model_identity'
    | 'optional_event_rejected'
    | 'optional_event_field_omitted'
    | 'chapter_block_normalized'
    | 'chapter_structure_quality'
    | 'chapter_scale_below_target'
    | 'chapter_body_recovered'
    | 'optional_chapter_structure_omitted'
    | 'competing_prose_ignored'
    | 'provider_outcome_unknown'
    | 'persistence_retry_required'
    | 'event_preservation_retry_required'
    | 'usage_unavailable'
    | 'capability_failed'
    | 'capability_unresolved'
    | 'projection_failed'
    | 'projection_unresolved'
    | 'post_commit_processing_pending'
    | 'batch_paused'
    | 'arc_plan_pending'
    | 'optional_recap_omitted'
    | 'optional_rhythm_metadata_omitted'
    | 'ignored_model_story_direction';
  message: string;
}

export interface HarnessUsageReceipt {
  source: 'reported' | 'estimated' | 'unavailable';
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface HarnessProviderReceipt {
  provider: string;
  model: string;
  generatedAt: string;
  durationMs?: number;
  usage: HarnessUsageReceipt;
}

export interface HarnessContextChapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  prose: string;
  events: Array<Pick<
    HarnessSemanticEvent,
    'id' | 'description' | 'category' | 'subjects' | 'subjectKinds' | 'significance' | 'evidence' | 'evidenceVerified' | 'requestedEffects' | 'facts' | 'details'
  >>;
}

/**
 * Story Information Packet: the story information selected, weighted,
 * organized, and frozen by the HARNESS for one generation attempt. It contains
 * story data only; CAPA skill instructions never enter it.
 */
export interface StoryInformationPacket {
  arc?: import('../components/arc-goals/shared/arcGoals').ArcGenerationContext;
  id: string;
  storyId: string;
  attemptId: string;
  foundationRevision: StoryFoundationRevision;
  storyHead: HarnessStoryHead;
  /** The story's permanent authoring language, carried as explicit story information. */
  originalLanguage: SenLanguageCode;
  chapterNumber: number;
  createdAt: string;
  committedChapters: HarnessContextChapter[];
  /** Phase 3 additions are optional so frozen Phase 2 snapshots remain valid. */
  contextVersion?: 2;
  selectionPolicy?: HarnessContextSelectionPolicy;
  canonicalContext?: HarnessCanonicalContext;
  selectionAudit?: HarnessContextSelectionAudit;
  steering?: HarnessSteering[];
  /** Compact committed evidence survives capability failure and the prose window. */
  developments?: Array<{ chapterNumber: number; sourceId: string; description: string; evidence?: string; evidenceVerified?: boolean; details?: HarnessEventDetails }>;
  lookups?: Array<{ chapterNumber: number; sourceId: string; excerpt: string }>;
  mechanicalContinuity?: MechanicalContinuityObservation[];
}

export interface MechanicalContinuityObservation {
  sourceId: string;
  chapterNumber: number;
  subject: string;
  name: string;
  value: string;
  unit?: string;
  subsequentDevelopments: Array<{ sourceId: string; chapterNumber: number; description: string }>;
}

export interface HarnessChapter {
  id: string;
  storyId: string;
  attemptId: string;
  foundationRevisionId: string;
  storyInformationPacketId: string;
  chapterNumber: number;
  title: string;
  titleSource: 'model' | 'harness-fallback';
  /** The authoritative chapter result: the accepted model paragraphs joined with blank lines. */
  prose: string;
  /** The accepted model-authored paragraphs, preserved exactly and in order. */
  paragraphs: string[];
  metrics: HarnessChapterMetrics;
  /** Canonical SEN blocks the HARNESS built from the paragraphs and annotated from accepted signals. */
  blocks?: StoryBlock[];
  /** Application-resolved media records only; model proposals never persist here. */
  audioMoments?: ResolvedAudioMoment[];
  /** Application-resolved soundscapes; later loadout changes cannot rewrite them. */
  soundscapes?: ResolvedSoundscape[];
  /** Pack/version provenance of the frozen catalog that produced this media. */
  mediaLoadout: FrozenNarrativeMedia;
  plan?: HarnessModelPlan;
  /** Saved once at commit; later chapters never regenerate it, and the author may edit it. */
  recap?: ChapterRecap;
  /** The completed chapter's function and the three next-chapter possibilities, saved at commit. */
  rhythm?: HarnessChapterRhythm;
  eventIds: string[];
  responseMode: 'json' | 'plain-prose-recovery';
  createdAt: string;
  committedAt: string;
}

export type HarnessAttemptStage =
  | 'request_started'
  | 'provider_outcome_unknown'
  | 'raw_received'
  | 'prose_accepted'
  | 'events_preserved'
  | 'accepted_not_durable'
  | 'committed'
  | 'generation_failed'
  | 'abandoned';

export interface HarnessAttemptFailure {
  stage: 'provider' | 'response' | 'events' | 'persistence';
  message: string;
}

export interface HarnessGenerationAttempt {
  id: string;
  storyId: string;
  foundationRevisionId: string;
  foundationSnapshot: StoryFoundationRevision;
  /** The frozen CAPA Prompt: an installed skill update cannot change an in-flight attempt. */
  capaPrompt: CapaPrompt;
  /** Frozen runtime resources. Never serialized into the Generation Model Call. */
  mediaLoadout: FrozenNarrativeMedia;
  /** The frozen Story Information Packet for this attempt. */
  storyInformation: StoryInformationPacket;
  immediateChapterRequest: ImmediateChapterRequest;
  /** Frozen for inspection and later packet assembly; not part of the Generation Model Call yet. */
  missionReminder: HarnessMissionReminder;
  model: string;
  chapterNumber: number;
  stage: HarnessAttemptStage;
  startedAt: string;
  rawReceivedAt?: string;
  proseAcceptedAt?: string;
  eventsPreservedAt?: string;
  committedAt?: string;
  rawProviderResponse?: string;
  providerReceipt?: HarnessProviderReceipt;
  acceptedDraft?: HarnessAcceptedChapterDraft;
  /** Stable event IDs are assigned before the chapter commits. */
  preservedEvents?: HarnessSemanticEvent[];
  rejectedEvents?: HarnessRejectedEventDiagnostic[];
  pendingChapterId?: string;
  committedChapterId?: string;
  batchId?: string;
  postCommitProcessing?: 'not_started' | 'complete' | 'warnings' | 'failed';
  warnings: HarnessWarning[];
  failure?: HarnessAttemptFailure;
  /** The exact checkpoint that must be durably retried. */
  recoveryStage?: 'raw_received' | 'prose_accepted' | 'events_preserved' | 'committed' | 'generation_failed';
}

export type HarnessCapabilityId =
  | 'general-narrative-event'
  | 'characters'
  | 'relationships'
  | 'locations-world'
  | 'factions'
  | 'plot-threads'
  | 'mysteries'
  | 'timeline'
  | 'artifacts'
  | 'progression';

export type HarnessCanonicalKind =
  | 'narrative-event'
  | 'character'
  | 'relationship'
  | 'location-world'
  | 'faction'
  | 'plot-thread'
  | 'mystery'
  | 'timeline-event'
  | 'artifact'
  | 'progression';

export type HarnessConfidence = 'resolved' | 'unresolved' | 'conflicted';

export interface HarnessEntityReference {
  label: string;
  resolution: 'exact' | 'alias' | 'active-context' | 'unresolved' | 'conflicted';
  resolvedRecordId?: string;
  entityId?: string;
  candidateRecordIds?: string[];
}

export interface HarnessCanonicalRecord {
  id: string;
  storyId: string;
  chapterId?: string;
  sourceEventId?: string;
  sourceCorrectionId?: string;
  sourceFoundationRevisionId?: string;
  entityId?: string;
  aliases?: string[];
  capabilityId: HarnessCapabilityId | 'author-correction';
  capabilityVersion: string;
  kind: HarnessCanonicalKind;
  evidence: string;
  confidence: HarnessConfidence;
  label?: string;
  references?: HarnessEntityReference[];
  /** Small semantic facts only; never prose, provider output, or presentation payloads. */
  facts: Record<string, string | string[] | boolean | undefined>;
  createdAt: string;
  supersededAt?: string;
  supersededByCorrectionId?: string;
  supersededByRecordId?: string;
  warnings: string[];
}

export interface HarnessUnresolvedReference {
  label: string;
  reason: string;
  candidateRecordIds?: string[];
}

export interface HarnessCapabilityReceipt {
  id: string;
  storyId: string;
  chapterId?: string;
  sourceEventId: string;
  capabilityId: HarnessCapabilityId;
  capabilityVersion: string;
  status: 'succeeded' | 'unresolved' | 'failed' | 'superseded';
  canonicalRecordIds: string[];
  projectionIntentIds: string[];
  warnings: string[];
  unresolvedReferences: HarnessUnresolvedReference[];
  processedAt: string;
  replayCount: number;
  failure?: string;
  supersededByReceiptId?: string;
}

export type HarnessProjectionKind =
  | 'codex-candidate'
  | 'narrative-notification'
  | 'mechanical-display'
  | 'world-notice'
  | 'fate'
  | 'consequence-badge'
  | 'color-code';

export interface HarnessProjectionRecord {
  id: string;
  storyId: string;
  chapterId?: string;
  sourceEventId?: string;
  sourceCanonicalRecordIds: string[];
  kind: HarnessProjectionKind;
  status: 'ready' | 'unresolved' | 'failed' | 'superseded';
  label?: string;
  description: string;
  explanation: string;
  createdAt: string;
  projectorVersion: string;
  warnings: string[];
}

export type HarnessCorrectionKind =
  | 'reader-edit'
  | 'resolve-entity'
  | 'correct-fact'
  | 'mark-incorrect'
  | 'add-missing-fact'
  | 'supersede-interpretation';

export interface HarnessAuthorCorrection {
  /** Durable author deltas, applied to derived Reader/Codex views by HARNESS. */
  readerEdit?: { chapterNumber: number; changes: HarnessReaderChange[] };
  id: string;
  storyId: string;
  kind: HarnessCorrectionKind;
  reason: string;
  createdAt: string;
  targetRecordIds: string[];
  sourceEventId?: string;
  referenceLabel?: string;
  resolvedRecordId?: string;
  acceptedAlias?: string;
  replacement?: {
    kind: HarnessCanonicalKind;
    label?: string;
    evidence: string;
    facts: Record<string, string | string[] | boolean | undefined>;
  };
}

export interface HarnessReaderChange {
  path: Array<string | { id: string }>;
  value?: unknown;
  remove?: true;
}

export interface HarnessCanonicalStoryView {
  storyId: string;
  records: HarnessCanonicalRecord[];
  characters: HarnessCanonicalRecord[];
  relationships: HarnessCanonicalRecord[];
  locations: HarnessCanonicalRecord[];
  factions: HarnessCanonicalRecord[];
  threads: HarnessCanonicalRecord[];
  /** Latest supported status per thread; `threads` retains the full evidence history. */
  currentThreads: HarnessCanonicalRecord[];
  mysteries: HarnessCanonicalRecord[];
  timeline: HarnessCanonicalRecord[];
  artifacts: HarnessCanonicalRecord[];
  progression: HarnessCanonicalRecord[];
  narrativeEvents: HarnessCanonicalRecord[];
  unresolvedReferences: HarnessUnresolvedReference[];
  conflicts: HarnessCanonicalRecord[];
  corrections: HarnessAuthorCorrection[];
}

export interface HarnessContextSelectionPolicy {
  recentChapterCount: number;
  maxEstimatedTokens: number;
  includeMinorEvents: boolean;
}

export type HarnessContextSourceKind =
  | 'foundation'
  | 'correction'
  | 'chapter-prose'
  | 'semantic-event'
  | 'canonical-record'
  | 'derived-handoff';

export interface HarnessContextAuditItem {
  id: string;
  sourceKind: HarnessContextSourceKind;
  sourceRecordIds: string[];
  label: string;
  reason: string;
  estimatedTokens: number;
}

export interface HarnessContextSelectionAudit {
  included: HarnessContextAuditItem[];
  omitted: HarnessContextAuditItem[];
  totalEstimatedTokens: number;
}

export interface HarnessCanonicalContext {
  corrections: Array<HarnessAuthorCorrection & {
    /** Frozen referents remain intelligible even when their records are omitted. */
    targetEvidence?: Array<Pick<HarnessCanonicalRecord, 'id' | 'kind' | 'label' | 'evidence' | 'facts'>>;
    resolvedEntity?: Pick<HarnessCanonicalRecord, 'id' | 'kind' | 'label' | 'evidence' | 'facts'>;
  }>;
  records: HarnessCanonicalRecord[];
  handoff: Array<{ description: string; sourceRecordIds: string[] }>;
}

export interface HarnessBatchUsageAggregate {
  reportedCalls: number;
  estimatedCalls: number;
  unavailableCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface HarnessBatchRun {
  id: string;
  storyId: string;
  model: string;
  requestedChapterCount: number;
  startChapterNumber: number;
  completedChapterIds: string[];
  status: 'running' | 'pause_requested' | 'paused' | 'failed' | 'provider_outcome_unknown' | 'completed';
  currentAttemptId?: string;
  createdAt: string;
  updatedAt: string;
  failure?: string;
  usage: HarnessBatchUsageAggregate;
}

export interface HarnessWorkspaceState {
  schemaVersion: typeof HARNESS_GENERATION_SCHEMA_VERSION;
  stories: HarnessStory[];
  foundations: StoryFoundationRevision[];
  attempts: HarnessGenerationAttempt[];
  chapters: HarnessChapter[];
  events: HarnessSemanticEvent[];
  capabilityReceipts: HarnessCapabilityReceipt[];
  canonicalRecords: HarnessCanonicalRecord[];
  projections: HarnessProjectionRecord[];
  corrections: HarnessAuthorCorrection[];
  batches: HarnessBatchRun[];
  arcPlanOperations: HarnessArcPlanOperation[];
  memoryRecoveries?: HarnessMemoryRecovery[];
}

export interface HarnessMemoryRecoveryRequest {
  operation: 'recover-memory';
  storyId: string;
  chapterId: string;
  model: string;
  prose: string;
  foundation: StoryFoundationRevision;
}

export interface HarnessMemoryRecovery {
  id: string;
  storyId: string;
  chapterId: string;
  request: HarnessMemoryRecoveryRequest;
  startedAt: string;
  status: 'request_started' | 'provider_outcome_unknown' | 'raw_received' | 'applied' | 'failed';
  rawProviderResponse?: string;
  providerReceipt?: HarnessProviderReceipt;
  eventIds?: string[];
  failure?: string;
  warnings?: string[];
}

export interface HarnessGenerationServerInfo {
  provider: string;
  configured: boolean;
  models: Array<{ id: string; label: string }>;
  defaultModel: string;
}

/**
 * Generation Model Call input. The HARNESS prepares the CAPA Prompt (how the
 * model authors) and the Story Information Packet plus Immediate Chapter
 * Request (what it authors) separately, then combines them in one provider call.
 */
export interface HarnessGenerationRequest {
  storyId: string;
  attemptId: string;
  model: string;
  capaPrompt: CapaPrompt;
  storyInformation: StoryInformationPacket;
  immediateChapterRequest: ImmediateChapterRequest;
}

export interface HarnessGenerationResponse {
  rawProviderResponse: string;
  providerReceipt: HarnessProviderReceipt;
}

export interface HarnessGenerationModelAdapter {
  getServerInfo(): Promise<HarnessGenerationServerInfo>;
  generate(request: HarnessGenerationRequest): Promise<HarnessGenerationResponse>;
  arcOperation?(request: HarnessArcRequest): Promise<HarnessGenerationResponse>;
  recoverMemory?(request: HarnessMemoryRecoveryRequest): Promise<HarnessGenerationResponse>;
}

export interface HarnessArcRequest {
  operation: 'plan-arc';
  storyId: string;
  model: string;
  storyInformation: StoryInformationPacket;
  instruction?: string;
}

/** Durable checkpoint for the required Arc planner provider operation. */
export interface HarnessArcPlanOperation {
  id: string;
  storyId: string;
  foundationRevisionId: string;
  request: HarnessArcRequest;
  startedAt: string;
  status: 'request_started' | 'provider_outcome_unknown' | 'raw_received' | 'completed' | 'abandoned' | 'failed';
  rawProviderResponse?: string;
  providerReceipt?: HarnessProviderReceipt;
  failure?: string;
}
