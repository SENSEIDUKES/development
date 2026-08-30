/** Independent Harness Generation contracts. Phase 3 adds deterministic,
 * replayable story understanding without changing the Phase 2 model reply. */
export const HARNESS_GENERATION_SCHEMA_VERSION = 2 as const;
export const HARNESS_GENERATION_PHASE_2_SCHEMA_VERSION = 1 as const;

export interface StoryFoundationInput {
  title?: string;
  /** The only author field required to start a Harness story. */
  premise: string;
  permanentInstructions?: string;
  toneStyle?: string;
  genre?: string;
  openingSituation?: string;
  declaredCanon?: string;
  characters?: string;
  worldFacts?: string;
  intendedDirection?: string;
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
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  activeFoundationRevisionId: string;
  foundationRevisionIds: string[];
  head: HarnessStoryHead;
  contextPolicy?: HarnessContextSelectionPolicy;
}

export type HarnessModelPlan = string | {
  intent?: string;
  beats?: string[];
};

/** The intentionally small transport shape requested from the provider. */
export interface HarnessModelChapterReply {
  prose: string;
  title?: string;
  plan?: HarnessModelPlan;
  events?: Array<{
    description: string;
    category?: string;
    subjects?: string[];
    significance?: 'minor' | 'major';
    evidence?: string;
    requestedEffects?: string[];
  }>;
}

export interface HarnessAcceptedChapterDraft {
  prose: string;
  title: string;
  titleSource: 'model' | 'harness-fallback';
  plan?: HarnessModelPlan;
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
  significance?: 'minor' | 'major';
  evidence?: string;
  requestedEffects?: string[];
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
    | 'provider_outcome_unknown'
    | 'persistence_retry_required'
    | 'event_preservation_retry_required'
    | 'usage_unavailable'
    | 'capability_failed'
    | 'capability_unresolved'
    | 'projection_failed'
    | 'projection_unresolved'
    | 'post_commit_processing_pending'
    | 'batch_paused';
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
    'id' | 'description' | 'category' | 'subjects' | 'significance' | 'evidence' | 'requestedEffects'
  >>;
}

export interface HarnessContextSnapshot {
  id: string;
  storyId: string;
  attemptId: string;
  foundationRevision: StoryFoundationRevision;
  storyHead: HarnessStoryHead;
  chapterNumber: number;
  createdAt: string;
  committedChapters: HarnessContextChapter[];
  /** Phase 3 additions are optional so frozen Phase 2 snapshots remain valid. */
  contextVersion?: 2;
  selectionPolicy?: HarnessContextSelectionPolicy;
  canonicalContext?: HarnessCanonicalContext;
  selectionAudit?: HarnessContextSelectionAudit;
}

export interface HarnessChapter {
  id: string;
  storyId: string;
  attemptId: string;
  foundationRevisionId: string;
  contextSnapshotId: string;
  chapterNumber: number;
  title: string;
  titleSource: 'model' | 'harness-fallback';
  prose: string;
  plan?: HarnessModelPlan;
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
  contextSnapshot: HarnessContextSnapshot;
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
  candidateRecordIds?: string[];
}

export interface HarnessCanonicalRecord {
  id: string;
  storyId: string;
  chapterId?: string;
  sourceEventId?: string;
  sourceCorrectionId?: string;
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
  | 'resolve-entity'
  | 'correct-fact'
  | 'mark-incorrect'
  | 'add-missing-fact'
  | 'supersede-interpretation';

export interface HarnessAuthorCorrection {
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

export interface HarnessCanonicalStoryView {
  storyId: string;
  records: HarnessCanonicalRecord[];
  characters: HarnessCanonicalRecord[];
  relationships: HarnessCanonicalRecord[];
  locations: HarnessCanonicalRecord[];
  factions: HarnessCanonicalRecord[];
  threads: HarnessCanonicalRecord[];
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
  corrections: HarnessAuthorCorrection[];
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
}

export interface HarnessGenerationServerInfo {
  provider: 'gemini';
  configured: boolean;
  models: Array<{ id: string; label: string }>;
  defaultModel: string;
}

export interface HarnessGenerationRequest {
  storyId: string;
  attemptId: string;
  chapterNumber: number;
  model: string;
  foundation: StoryFoundationRevision;
  context: HarnessContextSnapshot;
}

export interface HarnessGenerationResponse {
  rawProviderResponse: string;
  providerReceipt: HarnessProviderReceipt;
}

export interface HarnessGenerationModelAdapter {
  getServerInfo(): Promise<HarnessGenerationServerInfo>;
  generate(request: HarnessGenerationRequest): Promise<HarnessGenerationResponse>;
}
