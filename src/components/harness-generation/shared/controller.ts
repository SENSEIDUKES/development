import {
  createHarnessStory,
  findFoundationRevision,
  findStory,
  reviseStoryFoundation,
} from './foundation';
import { compileHarnessContext } from './context';
import { appendHarnessCorrection, type AppendHarnessCorrectionInput } from './canonicalState';
import { HarnessCapabilityRegistry } from './capabilities';
import { cloneHarnessValue, defaultHarnessRuntime, stableHarnessId, type HarnessRuntime } from './ids';
import {
  acceptHarnessModelResponse,
  preserveSemanticEvents,
  type SemanticEventPreservationInput,
  type SemanticEventPreservationResult,
} from './responseAcceptance';
import {
  createEmptyHarnessWorkspaceState,
  type HarnessGenerationRepository,
} from './repository';
import type {
  HarnessAttemptFailure,
  HarnessAttemptStage,
  HarnessGenerationAttempt,
  HarnessGenerationModelAdapter,
  HarnessBatchRun,
  HarnessBatchUsageAggregate,
  HarnessCapabilityReceipt,
  HarnessContextSelectionPolicy,
  HarnessStory,
  HarnessWarning,
  HarnessWorkspaceState,
  StoryFoundationInput,
} from './types';

export type HarnessEventPreserver = (
  rawEvents: unknown[],
  input: SemanticEventPreservationInput,
  runtime: HarnessRuntime,
) => SemanticEventPreservationResult;

export interface HarnessGenerationControllerOptions {
  repository: HarnessGenerationRepository;
  modelAdapter: HarnessGenerationModelAdapter;
  runtime?: HarnessRuntime;
  preserveEvents?: HarnessEventPreserver;
  capabilityRegistry?: HarnessCapabilityRegistry;
}

type WorkspaceListener = (state: HarnessWorkspaceState) => void;
type PersistedCheckpoint = 'raw_received' | 'prose_accepted' | 'events_preserved' | 'committed' | 'generation_failed';

const blockingAttempt = (attempt: HarnessGenerationAttempt) => ![
  'committed',
  'generation_failed',
  'abandoned',
].includes(attempt.stage);

const duplicateWarning = (warnings: HarnessWarning[], next: HarnessWarning) =>
  warnings.some(existing => existing.code === next.code && existing.message === next.message);

const addWarnings = (attempt: HarnessGenerationAttempt, warnings: HarnessWarning[]) => {
  for (const warning of warnings) {
    if (!duplicateWarning(attempt.warnings, warning)) attempt.warnings.push(warning);
  }
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const attemptById = (state: HarnessWorkspaceState, attemptId: string): HarnessGenerationAttempt => {
  const attempt = state.attempts.find(candidate => candidate.id === attemptId);
  if (!attempt) throw new Error('The requested Harness generation attempt no longer exists.');
  return attempt;
};

const activeAttemptForStory = (state: HarnessWorkspaceState, storyId: string) =>
  state.attempts.find(attempt => attempt.storyId === storyId && blockingAttempt(attempt));

/**
 * The single state owner for a local Harness story. It persists each durable
 * checkpoint before moving forward and never invokes the model while replaying
 * parsing, event preservation, or a failed commit.
 */
export class HarnessGenerationController {
  private readonly repository: HarnessGenerationRepository;
  private readonly modelAdapter: HarnessGenerationModelAdapter;
  private readonly runtime: HarnessRuntime;
  private readonly eventPreserver: HarnessEventPreserver;
  private readonly capabilityRegistry: HarnessCapabilityRegistry;
  private readonly listeners = new Set<WorkspaceListener>();
  private state = createEmptyHarnessWorkspaceState();
  private hydrated = false;
  private generating = false;

  constructor(options: HarnessGenerationControllerOptions) {
    this.repository = options.repository;
    this.modelAdapter = options.modelAdapter;
    this.runtime = options.runtime ?? defaultHarnessRuntime;
    this.eventPreserver = options.preserveEvents ?? preserveSemanticEvents;
    this.capabilityRegistry = options.capabilityRegistry ?? new HarnessCapabilityRegistry();
  }

  subscribe(listener: WorkspaceListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): HarnessWorkspaceState {
    return cloneHarnessValue(this.state);
  }

  private notify() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  private assertHydrated() {
    if (!this.hydrated) throw new Error('Harness Generation is still opening its local story storage.');
  }

  private async persist(candidate: HarnessWorkspaceState) {
    await this.repository.save(candidate);
    this.state = candidate;
    this.notify();
  }

  private persistenceFailure(
    candidate: HarnessWorkspaceState,
    attemptId: string,
    recoveryStage: PersistedCheckpoint,
    error: unknown,
  ) {
    const failed = cloneHarnessValue(candidate);
    const attempt = attemptById(failed, attemptId);
    attempt.stage = 'accepted_not_durable';
    attempt.recoveryStage = recoveryStage;
    attempt.failure = {
      stage: 'persistence',
      message: errorMessage(error, 'The local checkpoint could not be saved.'),
    };
    addWarnings(attempt, [{
      code: 'persistence_retry_required',
      message: `The ${recoveryStage.replace(/_/g, ' ')} checkpoint is still in memory and must be saved before the story can continue.`,
    }]);
    this.state = failed;
    this.notify();
  }

  private async persistCheckpoint(
    candidate: HarnessWorkspaceState,
    attemptId: string,
    recoveryStage: PersistedCheckpoint,
  ): Promise<boolean> {
    try {
      await this.persist(candidate);
      return true;
    } catch (error) {
      this.persistenceFailure(candidate, attemptId, recoveryStage, error);
      return false;
    }
  }

  async hydrate(): Promise<HarnessWorkspaceState> {
    const loaded = await this.repository.load();
    const recovered = cloneHarnessValue(loaded);
    let changed = false;
    for (const attempt of recovered.attempts) {
      if (attempt.stage !== 'request_started') continue;
      attempt.stage = 'provider_outcome_unknown';
      attempt.failure = {
        stage: 'provider',
        message: 'The browser closed after the provider request started. The provider outcome is unknown; choose an explicit retry to make another request.',
      };
      addWarnings(attempt, [{
        code: 'provider_outcome_unknown',
        message: 'This request may have reached the provider before the browser closed. It was not retried automatically.',
      }]);
      changed = true;
    }
    for (const batch of recovered.batches) {
      if (batch.status !== 'running' && batch.status !== 'pause_requested') continue;
      const activeAttempt = batch.currentAttemptId
        ? recovered.attempts.find(attempt => attempt.id === batch.currentAttemptId)
        : undefined;
      batch.status = activeAttempt?.stage === 'provider_outcome_unknown'
        ? 'provider_outcome_unknown'
        : 'paused';
      batch.failure = activeAttempt?.stage === 'provider_outcome_unknown'
        ? 'The active provider outcome is unknown. An explicit retry is required.'
        : 'The browser reloaded while this batch was active. Resume explicitly from the next uncommitted chapter.';
      batch.updatedAt = this.runtime.now();
      changed = true;
    }
    if (changed) await this.repository.save(recovered);
    this.state = recovered;
    this.hydrated = true;
    this.notify();
    return this.snapshot();
  }

  async createStory(input: StoryFoundationInput): Promise<HarnessStory> {
    this.assertHydrated();
    const created = createHarnessStory(this.state, input, this.runtime);
    await this.persist(created.state);
    return cloneHarnessValue(created.story);
  }

  async saveFoundationRevision(storyId: string, input: StoryFoundationInput): Promise<HarnessStory> {
    this.assertHydrated();
    const revised = reviseStoryFoundation(this.state, storyId, input, this.runtime);
    await this.persist(revised.state);
    return cloneHarnessValue(revised.story);
  }

  async setContextPolicy(storyId: string, policy: HarnessContextSelectionPolicy): Promise<HarnessStory> {
    this.assertHydrated();
    if (!Number.isInteger(policy.recentChapterCount) || policy.recentChapterCount < 1) {
      throw new Error('Recent chapter count must be a positive whole number.');
    }
    if (!Number.isInteger(policy.maxEstimatedTokens) || policy.maxEstimatedTokens < 1) {
      throw new Error('Context token budget must be a positive whole number.');
    }
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before changing its context policy.');
    story.contextPolicy = cloneHarnessValue(policy);
    story.updatedAt = this.runtime.now();
    await this.persist(candidate);
    return cloneHarnessValue(story);
  }

  async addCorrection(storyId: string, input: AppendHarnessCorrectionInput) {
    this.assertHydrated();
    if (!findStory(this.state, storyId)) throw new Error('Open a Harness story before adding a correction.');
    const corrected = appendHarnessCorrection(this.state, storyId, input, this.runtime);
    await this.persist(corrected.state);
    return cloneHarnessValue(corrected.correction);
  }

  private appendFailure(
    attemptId: string,
    failure: HarnessAttemptFailure,
    warnings: HarnessWarning[] = [],
  ): Promise<HarnessWorkspaceState> {
    const candidate = cloneHarnessValue(this.state);
    const attempt = attemptById(candidate, attemptId);
    attempt.stage = 'generation_failed';
    attempt.failure = failure;
    attempt.recoveryStage = undefined;
    addWarnings(attempt, warnings);
    return this.persistCheckpoint(candidate, attemptId, 'generation_failed')
      .then(() => this.snapshot());
  }

  private async blockForIntegrityReview(attemptId: string, message: string): Promise<HarnessWorkspaceState> {
    const candidate = cloneHarnessValue(this.state);
    const attempt = attemptById(candidate, attemptId);
    attempt.stage = 'accepted_not_durable';
    attempt.recoveryStage = undefined;
    attempt.failure = { stage: 'persistence', message };
    addWarnings(attempt, [{
      code: 'persistence_retry_required',
      message: 'The harness detected an integrity conflict. It did not advance the story head or create a replacement chapter.',
    }]);
    try {
      await this.persist(candidate);
    } catch {
      this.state = candidate;
      this.notify();
    }
    return this.snapshot();
  }

  async generateNextChapter(storyId: string, model: string, batchId?: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    if (this.generating) throw new Error('A Harness chapter request is already running.');
    if (!model.trim()) throw new Error('Choose a configured Harness model before generating a chapter.');
    const story = findStory(this.state, storyId);
    if (!story) throw new Error('Open a Harness story before generating a chapter.');
    const activeAttempt = activeAttemptForStory(this.state, storyId);
    if (activeAttempt) {
      throw new Error('Finish or explicitly retry the current chapter checkpoint before generating another chapter.');
    }
    const foundation = findFoundationRevision(this.state, story.activeFoundationRevisionId);
    if (!foundation) throw new Error('The active Story Foundation revision is missing. Restore a local export before continuing.');

    const attemptId = this.runtime.createId('hga');
    const contextSnapshot = compileHarnessContext(this.state, story, foundation, attemptId, this.runtime);
    const startedAt = this.runtime.now();
    const attempt: HarnessGenerationAttempt = {
      id: attemptId,
      storyId,
      foundationRevisionId: foundation.id,
      foundationSnapshot: cloneHarnessValue(foundation),
      contextSnapshot,
      model: model.trim(),
      chapterNumber: story.head.nextChapterNumber,
      stage: 'request_started',
      startedAt,
      ...(batchId ? { batchId } : {}),
      warnings: [],
    };
    const requestStarted = cloneHarnessValue(this.state);
    requestStarted.attempts.push(attempt);
    if (batchId) {
      const batch = requestStarted.batches.find(entry => entry.id === batchId);
      if (!batch || batch.storyId !== storyId) throw new Error('The persisted Harness batch no longer matches this story.');
      batch.currentAttemptId = attemptId;
      batch.updatedAt = startedAt;
    }
    // This must succeed before the request leaves the browser. On reload a
    // saved request_started checkpoint becomes provider_outcome_unknown.
    await this.persist(requestStarted);

    this.generating = true;
    try {
      let response;
      try {
        response = await this.modelAdapter.generate({
          storyId,
          attemptId,
          chapterNumber: attempt.chapterNumber,
          model: attempt.model,
          foundation: attempt.foundationSnapshot,
          context: attempt.contextSnapshot,
        });
      } catch (error) {
        return this.appendFailure(attemptId, {
          stage: 'provider',
          message: errorMessage(error, 'The configured provider could not complete the chapter request.'),
        });
      }

      const rawReceived = cloneHarnessValue(this.state);
      const rawAttempt = attemptById(rawReceived, attemptId);
      rawAttempt.stage = 'raw_received';
      rawAttempt.rawReceivedAt = this.runtime.now();
      rawAttempt.rawProviderResponse = response.rawProviderResponse;
      rawAttempt.providerReceipt = response.providerReceipt;
      rawAttempt.failure = undefined;
      if (!await this.persistCheckpoint(rawReceived, attemptId, 'raw_received')) return this.snapshot();

      return this.acceptRawResponse(attemptId);
    } finally {
      this.generating = false;
    }
  }

  private async acceptRawResponse(attemptId: string): Promise<HarnessWorkspaceState> {
    const attempt = attemptById(this.state, attemptId);
    const raw = attempt.rawProviderResponse;
    if (!raw) {
      return this.appendFailure(attemptId, {
        stage: 'response',
        message: 'The raw provider response checkpoint is empty, so chapter prose cannot be accepted.',
      });
    }
    const acceptance = acceptHarnessModelResponse(raw, attempt.chapterNumber);
    if (!acceptance.accepted) {
      return this.appendFailure(attemptId, {
        stage: 'response',
        message: acceptance.reason,
      }, acceptance.warnings);
    }

    const proseAccepted = cloneHarnessValue(this.state);
    const proseAttempt = attemptById(proseAccepted, attemptId);
    proseAttempt.stage = 'prose_accepted';
    proseAttempt.proseAcceptedAt = this.runtime.now();
    proseAttempt.acceptedDraft = acceptance.draft;
    proseAttempt.failure = undefined;
    proseAttempt.recoveryStage = undefined;
    addWarnings(proseAttempt, acceptance.warnings);
    if (!await this.persistCheckpoint(proseAccepted, attemptId, 'prose_accepted')) return this.snapshot();

    return this.preserveAttemptEvents(attemptId, acceptance.rawEvents);
  }

  private rawEventsForAttempt(attempt: HarnessGenerationAttempt): unknown[] {
    const raw = attempt.rawProviderResponse;
    if (!raw) return [];
    const acceptance = acceptHarnessModelResponse(raw, attempt.chapterNumber);
    return acceptance.accepted ? acceptance.rawEvents : [];
  }

  private async preserveAttemptEvents(
    attemptId: string,
    providedRawEvents?: unknown[],
  ): Promise<HarnessWorkspaceState> {
    const attempt = attemptById(this.state, attemptId);
    if (!attempt.acceptedDraft) {
      return this.appendFailure(attemptId, {
        stage: 'events',
        message: 'The prose checkpoint is missing, so semantic events cannot be preserved safely.',
      });
    }
    const rawEvents = providedRawEvents ?? this.rawEventsForAttempt(attempt);
    let preserved: SemanticEventPreservationResult;
    try {
      preserved = this.eventPreserver(rawEvents, {
        storyId: attempt.storyId,
        attemptId: attempt.id,
        chapterNumber: attempt.chapterNumber,
        createdAt: this.runtime.now(),
      }, this.runtime);
    } catch (error) {
      const candidate = cloneHarnessValue(this.state);
      const retryAttempt = attemptById(candidate, attemptId);
      retryAttempt.stage = 'events_preserved';
      retryAttempt.eventsPreservedAt = this.runtime.now();
      retryAttempt.preservedEvents = [];
      retryAttempt.rejectedEvents = [];
      retryAttempt.pendingChapterId ??= this.runtime.createId('hch');
      retryAttempt.postCommitProcessing = 'failed';
      retryAttempt.failure = undefined;
      addWarnings(retryAttempt, [{
        code: 'event_preservation_retry_required',
        message: `Optional semantic-event preservation failed (${errorMessage(error, 'unknown error')}). The prose will still commit; replay can recover events from the raw response without another model call.`,
      }]);
      if (!await this.persistCheckpoint(candidate, attemptId, 'events_preserved')) return this.snapshot();
      return this.commitAttempt(attemptId);
    }

    const eventsPreserved = cloneHarnessValue(this.state);
    const eventAttempt = attemptById(eventsPreserved, attemptId);
    eventAttempt.stage = 'events_preserved';
    eventAttempt.eventsPreservedAt = this.runtime.now();
    eventAttempt.preservedEvents = preserved.events;
    eventAttempt.rejectedEvents = preserved.rejected;
    eventAttempt.pendingChapterId ??= this.runtime.createId('hch');
    eventAttempt.failure = undefined;
    eventAttempt.recoveryStage = undefined;
    addWarnings(eventAttempt, preserved.warnings);
    if (!await this.persistCheckpoint(eventsPreserved, attemptId, 'events_preserved')) return this.snapshot();

    return this.commitAttempt(attemptId);
  }

  private async commitAttempt(attemptId: string): Promise<HarnessWorkspaceState> {
    const base = this.state;
    const attempt = attemptById(base, attemptId);
    const story = findStory(base, attempt.storyId);
    if (!story || !attempt.acceptedDraft || !attempt.pendingChapterId) {
      return this.blockForIntegrityReview(
        attemptId,
        'The accepted chapter checkpoint is incomplete and cannot be committed safely.',
      );
    }
    if (story.head.nextChapterNumber !== attempt.chapterNumber) {
      return this.blockForIntegrityReview(
        attemptId,
        'The story head changed before this chapter could commit. Resolve the competing local checkpoint before continuing.',
      );
    }
    if (base.chapters.some(chapter => chapter.id === attempt.pendingChapterId)) {
      return this.blockForIntegrityReview(
        attemptId,
        'The pending chapter identity already exists in this story. Restore a local export before continuing.',
      );
    }

    const committedAt = this.runtime.now();
    const candidate = cloneHarnessValue(base);
    const commitAttempt = attemptById(candidate, attemptId);
    const commitStory = findStory(candidate, attempt.storyId)!;
    if (!commitAttempt.acceptedDraft || !commitAttempt.pendingChapterId) {
      throw new Error('The accepted chapter checkpoint changed before it could commit.');
    }
    const chapterId = commitAttempt.pendingChapterId;
    const acceptedDraft = commitAttempt.acceptedDraft;
    const committedEvents = (commitAttempt.preservedEvents ?? []).map(event => ({
      ...event,
      chapterId,
    }));
    const chapter = {
      id: chapterId,
      storyId: commitAttempt.storyId,
      attemptId: commitAttempt.id,
      foundationRevisionId: commitAttempt.foundationRevisionId,
      contextSnapshotId: commitAttempt.contextSnapshot.id,
      chapterNumber: commitAttempt.chapterNumber,
      title: acceptedDraft.title,
      titleSource: acceptedDraft.titleSource,
      prose: acceptedDraft.prose,
      ...(acceptedDraft.plan ? { plan: acceptedDraft.plan } : {}),
      eventIds: committedEvents.map(event => event.id),
      responseMode: acceptedDraft.responseMode,
      createdAt: commitAttempt.proseAcceptedAt ?? commitAttempt.startedAt,
      committedAt,
    };
    candidate.chapters.push(chapter);
    candidate.events.push(...committedEvents);
    commitStory.head = {
      nextChapterNumber: commitAttempt.chapterNumber + 1,
      lastCommittedChapterId: chapter.id,
      lastCommittedAt: committedAt,
    };
    commitStory.updatedAt = committedAt;
    commitAttempt.stage = 'committed';
    commitAttempt.committedAt = committedAt;
    commitAttempt.committedChapterId = chapter.id;
    commitAttempt.recoveryStage = undefined;
    commitAttempt.failure = undefined;

    try {
      await this.persist(candidate);
    } catch (error) {
      // Keep the pre-commit head. The previous events_preserved checkpoint is
      // already durable, so retrying this cannot cause a new provider call.
      this.persistenceFailure(base, attemptId, 'committed', error);
      return this.snapshot();
    }
    await this.replayStory(commitAttempt.storyId, chapterId);
    return this.snapshot();
  }

  /**
   * Deterministic replay never calls the provider and only reads committed chapters.
   * Stable derived IDs make the operation idempotent across reloads and upgrades.
   */
  async replayStory(storyId: string, onlyChapterId?: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    const candidate = cloneHarnessValue(this.state);
    const committedChapters = candidate.chapters.filter(chapter =>
      chapter.storyId === storyId && (!onlyChapterId || chapter.id === onlyChapterId),
    );
    const committedChapterIds = new Set(committedChapters.map(chapter => chapter.id));

    // A Phase 2/custom preservation failure may have committed prose with no events.
    // Recover those events from the raw checkpoint before processing capabilities.
    for (const chapter of committedChapters) {
      const attempt = candidate.attempts.find(entry => entry.id === chapter.attemptId);
      if (!attempt || chapter.eventIds.length || !attempt.rawProviderResponse) continue;
      const rawEvents = this.rawEventsForAttempt(attempt);
      if (!rawEvents.length) continue;
      try {
        const preserved = this.eventPreserver(rawEvents, {
          storyId,
          attemptId: attempt.id,
          chapterNumber: chapter.chapterNumber,
          createdAt: attempt.eventsPreservedAt ?? attempt.proseAcceptedAt ?? attempt.startedAt,
        }, this.runtime);
        const recoveredEvents = preserved.events.map(event => ({ ...event, chapterId: chapter.id }));
        chapter.eventIds = recoveredEvents.map(event => event.id);
        candidate.events.push(...recoveredEvents.filter(event => !candidate.events.some(existing => existing.id === event.id)));
        attempt.preservedEvents = preserved.events;
        attempt.rejectedEvents = preserved.rejected;
        addWarnings(attempt, preserved.warnings);
      } catch (error) {
        addWarnings(attempt, [{
          code: 'post_commit_processing_pending',
          message: `Committed prose is safe, but semantic events still need replay: ${errorMessage(error, 'event recovery failed')}`,
        }]);
      }
    }

    const upsert = <T extends { id: string }>(items: T[], next: T) => {
      const index = items.findIndex(item => item.id === next.id);
      if (index >= 0) items[index] = next;
      else items.push(next);
    };
    const upsertCanonical = (next: HarnessWorkspaceState['canonicalRecords'][number]) => {
      const existing = candidate.canonicalRecords.find(record => record.id === next.id);
      upsert(candidate.canonicalRecords, existing?.supersededByCorrectionId ? {
        ...next,
        supersededAt: existing.supersededAt,
        supersededByCorrectionId: existing.supersededByCorrectionId,
        supersededByRecordId: existing.supersededByRecordId,
      } : next);
    };
    const events = candidate.events.filter(event => event.chapterId && committedChapterIds.has(event.chapterId));
    for (const event of events) {
      try {
        const results = this.capabilityRegistry.processEvent({ state: candidate, event, now: this.runtime.now() });
        for (const result of results) {
          for (const previous of candidate.capabilityReceipts) {
            if (
              previous.sourceEventId !== event.id
              || previous.capabilityId !== result.receipt.capabilityId
              || previous.capabilityVersion === result.receipt.capabilityVersion
              || previous.status === 'superseded'
            ) continue;
            previous.status = 'superseded';
            previous.supersededByReceiptId = result.receipt.id;
            for (const recordId of previous.canonicalRecordIds) {
              const oldRecord = candidate.canonicalRecords.find(record => record.id === recordId);
              if (oldRecord && !oldRecord.supersededAt) {
                oldRecord.supersededAt = result.receipt.processedAt;
                oldRecord.supersededByRecordId = result.records[0]?.id;
              }
            }
            for (const projectionId of previous.projectionIntentIds) {
              const oldProjection = candidate.projections.find(projection => projection.id === projectionId);
              if (oldProjection) oldProjection.status = 'superseded';
            }
          }
          upsert(candidate.capabilityReceipts, result.receipt);
          for (const record of result.records) upsertCanonical(record);
          for (const projection of result.projections) upsert(candidate.projections, projection);
          for (const legacy of candidate.capabilityReceipts) {
            if (legacy.sourceEventId === event.id && legacy.capabilityVersion === 'phase-2-unprocessed') {
              legacy.status = 'superseded';
              legacy.supersededByReceiptId = result.receipt.id;
            }
          }
        }
      } catch (error) {
        const receipt: HarnessCapabilityReceipt = {
          id: stableHarnessId('hcr', event.id, 'registry-failure', '1.0.0'),
          storyId,
          chapterId: event.chapterId,
          sourceEventId: event.id,
          capabilityId: 'general-narrative-event',
          capabilityVersion: '1.0.0',
          status: 'failed',
          canonicalRecordIds: [],
          projectionIntentIds: [],
          warnings: ['The registry failed in isolation; replay remains available.'],
          unresolvedReferences: [],
          processedAt: this.runtime.now(),
          replayCount: 0,
          failure: errorMessage(error, 'Capability registry failed.'),
        };
        upsert(candidate.capabilityReceipts, receipt);
      }
    }

    for (const chapter of committedChapters) {
      const attempt = candidate.attempts.find(entry => entry.id === chapter.attemptId);
      if (!attempt) continue;
      const receipts = candidate.capabilityReceipts.filter(receipt =>
        chapter.eventIds.includes(receipt.sourceEventId) && receipt.status !== 'superseded',
      );
      attempt.postCommitProcessing = receipts.some(receipt => receipt.status === 'failed')
        ? 'failed'
        : receipts.some(receipt => receipt.status === 'unresolved') ? 'warnings' : 'complete';
      if (attempt.postCommitProcessing === 'failed') addWarnings(attempt, [{
        code: 'capability_failed',
        message: 'One or more deterministic capabilities failed. The chapter remains committed and can be replayed.',
      }]);
      if (attempt.postCommitProcessing === 'warnings') addWarnings(attempt, [{
        code: 'capability_unresolved',
        message: 'Some story evidence remains unresolved. No identity or fact was guessed.',
      }]);
    }

    try {
      await this.persist(candidate);
    } catch (error) {
      const preserved = cloneHarnessValue(this.state);
      for (const chapter of committedChapters) {
        const attempt = preserved.attempts.find(entry => entry.id === chapter.attemptId);
        if (!attempt) continue;
        attempt.postCommitProcessing = 'failed';
        addWarnings(attempt, [{
          code: 'post_commit_processing_pending',
          message: `Canonical processing was not saved (${errorMessage(error, 'local write failed')}). The committed chapter and prose were not changed; replay can retry this write.`,
        }]);
      }
      this.state = preserved;
      this.notify();
    }
    return this.snapshot();
  }

  async retryAppropriateStage(attemptId: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    const attempt = attemptById(this.state, attemptId);
    if (attempt.stage === 'raw_received') return this.acceptRawResponse(attemptId);
    if (attempt.stage === 'prose_accepted') return this.preserveAttemptEvents(attemptId);
    if (attempt.stage === 'events_preserved') return this.commitAttempt(attemptId);
    if (attempt.stage !== 'accepted_not_durable' || !attempt.recoveryStage) {
      throw new Error('This attempt does not have a local parsing or persistence checkpoint to retry.');
    }

    if (attempt.recoveryStage === 'committed') return this.commitAttempt(attemptId);
    const restored = cloneHarnessValue(this.state);
    const restoredAttempt = attemptById(restored, attemptId);
    restoredAttempt.stage = attempt.recoveryStage;
    restoredAttempt.recoveryStage = undefined;
    restoredAttempt.failure = undefined;
    if (!await this.persistCheckpoint(restored, attemptId, attempt.recoveryStage)) return this.snapshot();
    if (attempt.recoveryStage === 'raw_received') return this.acceptRawResponse(attemptId);
    if (attempt.recoveryStage === 'prose_accepted') return this.preserveAttemptEvents(attemptId);
    if (attempt.recoveryStage === 'generation_failed') return this.snapshot();
    return this.commitAttempt(attemptId);
  }

  async retryModelRequest(attemptId: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    const attempt = attemptById(this.state, attemptId);
    if (attempt.stage !== 'generation_failed' && attempt.stage !== 'provider_outcome_unknown') {
      throw new Error('Only a failed or unknown provider request may be retried with a new model call.');
    }
    const abandoned = cloneHarnessValue(this.state);
    const abandonedAttempt = attemptById(abandoned, attemptId);
    abandonedAttempt.stage = 'abandoned';
    abandonedAttempt.recoveryStage = undefined;
    abandonedAttempt.failure = undefined;
    await this.persist(abandoned);
    return this.generateNextChapter(attempt.storyId, attempt.model, attempt.batchId);
  }

  private emptyBatchUsage(): HarnessBatchUsageAggregate {
    return { reportedCalls: 0, estimatedCalls: 0, unavailableCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  private async recordBatchAttempt(batchId: string, attemptId: string) {
    const candidate = cloneHarnessValue(this.state);
    const batch = candidate.batches.find(entry => entry.id === batchId);
    const attempt = candidate.attempts.find(entry => entry.id === attemptId);
    if (!batch || !attempt) return;
    batch.currentAttemptId = attempt.id;
    batch.updatedAt = this.runtime.now();
    if (attempt.stage === 'committed' && attempt.committedChapterId) {
      const isNew = !batch.completedChapterIds.includes(attempt.committedChapterId);
      if (isNew) {
        batch.completedChapterIds.push(attempt.committedChapterId);
        const usage = attempt.providerReceipt?.usage;
        if (usage?.source === 'reported') batch.usage.reportedCalls += 1;
        else if (usage?.source === 'estimated') batch.usage.estimatedCalls += 1;
        else batch.usage.unavailableCalls += 1;
        batch.usage.inputTokens += usage?.inputTokens ?? 0;
        batch.usage.outputTokens += usage?.outputTokens ?? 0;
        batch.usage.totalTokens += usage?.totalTokens ?? 0;
      }
      batch.failure = undefined;
      if (batch.completedChapterIds.length >= batch.requestedChapterCount) batch.status = 'completed';
      else if (batch.status === 'pause_requested') batch.status = 'paused';
      else batch.status = 'running';
    } else if (attempt.stage === 'provider_outcome_unknown') {
      batch.status = 'provider_outcome_unknown';
      batch.failure = 'The provider outcome is unknown. Explicitly retry or leave the batch paused.';
    } else {
      batch.status = 'failed';
      batch.failure = attempt.failure?.message ?? 'The active chapter did not commit.';
    }
    await this.persist(candidate);
  }

  private async runBatch(batchId: string): Promise<HarnessWorkspaceState> {
    while (true) {
      const batch = this.state.batches.find(entry => entry.id === batchId);
      if (!batch || batch.status !== 'running') return this.snapshot();
      if (batch.completedChapterIds.length >= batch.requestedChapterCount) {
        const completed = cloneHarnessValue(this.state);
        const target = completed.batches.find(entry => entry.id === batchId)!;
        target.status = 'completed';
        target.updatedAt = this.runtime.now();
        await this.persist(completed);
        return this.snapshot();
      }
      await this.generateNextChapter(batch.storyId, batch.model, batch.id);
      const attemptId = this.state.batches.find(entry => entry.id === batchId)?.currentAttemptId;
      if (!attemptId) throw new Error('The batch lost its current attempt checkpoint.');
      await this.recordBatchAttempt(batchId, attemptId);
    }
  }

  async startBatch(storyId: string, model: string, requestedChapterCount: number): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    if (!Number.isInteger(requestedChapterCount) || requestedChapterCount < 1) {
      throw new Error('Choose a positive whole number of chapters for this batch.');
    }
    if (!model.trim()) throw new Error('Choose a configured Harness model before starting a batch.');
    const story = findStory(this.state, storyId);
    if (!story) throw new Error('Open a Harness story before starting a batch.');
    if (activeAttemptForStory(this.state, storyId)) {
      throw new Error('Finish or explicitly retry the current chapter checkpoint before starting a batch.');
    }
    if (this.state.batches.some(batch => batch.storyId === storyId && ['running', 'pause_requested'].includes(batch.status))) {
      throw new Error('This story already has an active batch.');
    }
    const now = this.runtime.now();
    const batch: HarnessBatchRun = {
      id: this.runtime.createId('hbatch'),
      storyId,
      model: model.trim(),
      requestedChapterCount,
      startChapterNumber: story.head.nextChapterNumber,
      completedChapterIds: [],
      status: 'running',
      createdAt: now,
      updatedAt: now,
      usage: this.emptyBatchUsage(),
    };
    const candidate = cloneHarnessValue(this.state);
    candidate.batches.push(batch);
    await this.persist(candidate);
    return this.runBatch(batch.id);
  }

  async requestBatchPause(batchId: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    const candidate = cloneHarnessValue(this.state);
    const batch = candidate.batches.find(entry => entry.id === batchId);
    if (!batch || batch.status !== 'running') throw new Error('Only a running batch can be paused.');
    batch.status = batch.currentAttemptId ? 'pause_requested' : 'paused';
    batch.updatedAt = this.runtime.now();
    await this.persist(candidate);
    return this.snapshot();
  }

  async resumeBatch(batchId: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    const candidate = cloneHarnessValue(this.state);
    const batch = candidate.batches.find(entry => entry.id === batchId);
    if (!batch || batch.status !== 'paused') throw new Error('This batch is not paused and ready to resume.');
    batch.status = 'running';
    batch.failure = undefined;
    batch.currentAttemptId = undefined;
    batch.updatedAt = this.runtime.now();
    await this.persist(candidate);
    return this.runBatch(batchId);
  }

  async retryBatchChapter(batchId: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    const batch = this.state.batches.find(entry => entry.id === batchId);
    if (!batch?.currentAttemptId || !['failed', 'provider_outcome_unknown'].includes(batch.status)) {
      throw new Error('This batch has no failed or unknown provider attempt to retry.');
    }
    const failedAttemptId = batch.currentAttemptId;
    const running = cloneHarnessValue(this.state);
    const runningBatch = running.batches.find(entry => entry.id === batchId)!;
    runningBatch.status = 'running';
    runningBatch.failure = undefined;
    runningBatch.updatedAt = this.runtime.now();
    await this.persist(running);
    const failedAttempt = attemptById(this.state, failedAttemptId);
    if (
      ['raw_received', 'prose_accepted', 'events_preserved', 'accepted_not_durable'].includes(failedAttempt.stage)
    ) await this.retryAppropriateStage(failedAttemptId);
    else await this.retryModelRequest(failedAttemptId);
    const attemptId = this.state.batches.find(entry => entry.id === batchId)?.currentAttemptId;
    if (!attemptId) throw new Error('The retried batch did not create an attempt checkpoint.');
    await this.recordBatchAttempt(batchId, attemptId);
    return this.runBatch(batchId);
  }
}

export const exportHarnessStory = (state: HarnessWorkspaceState, storyId: string) => {
  const story = findStory(state, storyId);
  if (!story) throw new Error('Choose a Harness story to export.');
  const foundationIds = new Set(story.foundationRevisionIds);
  const chapterIds = new Set(state.chapters.filter(chapter => chapter.storyId === storyId).map(chapter => chapter.id));
  return {
    schemaVersion: state.schemaVersion,
    exportedAt: new Date().toISOString(),
    story,
    foundations: state.foundations.filter(foundation => foundationIds.has(foundation.id)),
    attempts: state.attempts.filter(attempt => attempt.storyId === storyId),
    chapters: state.chapters.filter(chapter => chapterIds.has(chapter.id)),
    events: state.events.filter(event => event.storyId === storyId),
    capabilityReceipts: state.capabilityReceipts.filter(receipt => receipt.storyId === storyId),
    canonicalRecords: state.canonicalRecords.filter(record => record.storyId === storyId),
    corrections: state.corrections.filter(correction => correction.storyId === storyId),
    projections: state.projections.filter(projection => projection.storyId === storyId),
    batches: state.batches.filter(batch => batch.storyId === storyId),
  };
};
