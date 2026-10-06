import { arcGoalResolved, arcGoalSegments, arcPlanFromDraft, createArcChapterPosition, editArcPlan, normalizeArcLookahead, type ArcPlan } from '../../arc-goals/shared/arcGoals';
import { DEFAULT_SEN_LANGUAGE_CODE, type SenLanguageCode } from '../../../lib/language';
import { emptyNarrativeMedia, soundVocabulary, type FrozenNarrativeMedia, type NarrativeMediaPort, type MediaResourceReference, type MediaSelectionSlot } from '../../../audio/media';
import type { SoundWord } from '../../../audio/soundWords';
import { arcGoalEditState, arcPlanGap, arcPlanningContext, arcReviewGap, commitHarnessArc, harnessArcContext, harnessArcPlan, harnessStoryMode, missingRequiredEnding, needsArcPlan, readArcReply, routeCompleteGap, storyConclusionGap, withArcGoalReview, arcGoalReview } from './arcState';
import {
  createHarnessStory,
  findFoundationRevision,
  findStory,
  reviseStoryFoundation,
} from './foundation';
import { compileStoryInformationPacket } from './context';
import { createHarnessSenStory } from './senAdapter';
import { diffHarnessReaderPatch } from './readerEdits';
import type { ReaderCodexStoryPatchUpdater } from '../../../narrative/story';
import { normalizeChapterWritingStyle, type ChapterWritingStyle } from '../../../narrative/readingMode';
import { buildImmediateChapterRequest } from './immediateChapterRequest';
import { attemptChapterPath, chapterDirectionGap, pendingChapterDirection, validateChapterDirectionChoice } from './chapterDirection';
import { appendHarnessCorrection, type AppendHarnessCorrectionInput } from './canonicalState';
import { HarnessCapabilityRegistry } from './capabilities';
import {
  CAPA_SCHEMA,
  managedCapaSkillSignature,
  managedCapaSlotReason,
  assembleCapaPrompt,
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  resolveHarnessSkill,
  resolveManagedCapaSkills,
} from './skills';
import {
  includeBundledHarnessSkills,
  SEN_NOVEL_AUTHOR_SKILL,
} from './authorSkill';
import { cloneHarnessValue, defaultHarnessRuntime, stableHarnessId, type HarnessRuntime } from './ids';
import { buildRhythmRecommendation, type ChapterFunctionRecord } from './rhythm';
import { buildMissionReminder } from './missionReminder';
import { CHAPTER_RECAP_TEXT_LIMIT, validateHardPinInputs, type HardPin, type HardPinInput } from '../../../narrative/storyDirection';
import {
  acceptHarnessModelResponse,
  preserveSemanticEvents,
  verifyHarnessEventEvidence,
  type SemanticEventPreservationInput,
  type SemanticEventPreservationResult,
} from './responseAcceptance';
import { activeAttemptForStory } from './attempts';
import { chapterRewriteGap, latestStoryChapter, readRewriteNote, withoutLatestChapter } from './chapterRewrite';
import { protagonistNames } from './speakers';
import { declaredCharacters, resolveHoldingChanges } from './holdings';
import {
  createEmptyHarnessWorkspaceState,
  type HarnessGenerationRepository,
} from './repository';
import type { ChapterDirectionChoice, HarnessChapterRewrite, HarnessAttemptFailure, HarnessAttemptStage, HarnessArcPlanOperation, HarnessGenerationAttempt, HarnessGenerationModelAdapter, HarnessBatchRun, HarnessBatchUsageAggregate, HarnessCapabilityReceipt, HarnessStory, HarnessStoryVisibility, HarnessWarning, HarnessWorkspaceState, StoryFoundationInput, HarnessSkillManifest, HarnessSkillReference, HarnessSkillSlotId } from '../../../narrative/generation';

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
  /** Host-owned installed skills. The Harness stores only per-story references and frozen request copies. */
  installedSkills?: HarnessSkillManifest[];
  /** Host-authorized media selection and freezing. Never enters CAPA or provider requests. */
  media?: NarrativeMediaPort;
}

type WorkspaceListener = (state: HarnessWorkspaceState) => void;
type PersistedCheckpoint = 'raw_received' | 'prose_accepted' | 'events_preserved' | 'committed' | 'generation_failed';

const duplicateWarning = (warnings: HarnessWarning[], next: HarnessWarning) =>
  warnings.some(existing => existing.code === next.code && existing.message === next.message);

const addWarnings = (attempt: HarnessGenerationAttempt, warnings: HarnessWarning[]) => {
  for (const warning of warnings) {
    if (!duplicateWarning(attempt.warnings, warning)) attempt.warnings.push(warning);
  }
};

/** A Foundation has its Destined Ending; a blank or missing one is asked of the arc planner. */
const hasDestinedEnding = (input: StoryFoundationInput) => Boolean(input.destinedEnding?.trim());

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const attemptById = (state: HarnessWorkspaceState, attemptId: string): HarnessGenerationAttempt => {
  const attempt = state.attempts.find(candidate => candidate.id === attemptId);
  if (!attempt) throw new Error('The requested Harness generation attempt no longer exists.');
  return attempt;
};

/** Saved chapter functions, oldest first. Chapters without a saved function are skipped. */
const chapterFunctionHistory = (state: HarnessWorkspaceState, storyId: string): ChapterFunctionRecord[] =>
  state.chapters
    .filter(chapter => chapter.storyId === storyId && chapter.rhythm?.chapterFunction)
    .sort((left, right) => left.chapterNumber - right.chapterNumber)
    .map(chapter => ({ chapterNumber: chapter.chapterNumber, chapterFunction: chapter.rhythm!.chapterFunction! }));

/**
 * Refreshes the story's persisted Fate Pressure recommendation from its own
 * saved chapter functions and the centralized rhythm configuration. Runs on
 * the candidate state inside the same write as the change that made it stale.
 */
const refreshRhythmRecommendation = (state: HarnessWorkspaceState, story: HarnessStory, now: string) => {
  const foundation = findFoundationRevision(state, story.activeFoundationRevisionId);
  story.rhythmRecommendation = buildRhythmRecommendation({
    fatePressure: foundation?.input.fatePressure,
    forChapterNumber: story.head.nextChapterNumber,
    history: chapterFunctionHistory(state, story.id),
    computedAt: now,
  });
};

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
  private skillCatalog: ReadonlyMap<string, HarnessSkillManifest>;
  private media?: NarrativeMediaPort;
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
    this.skillCatalog = createHarnessSkillCatalog(includeBundledHarnessSkills(options.installedSkills ?? []));
    this.media = options.media;
  }

  subscribe(listener: WorkspaceListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  /** Host inventory updates never replace the controller or an in-flight frozen request. */
  setInstalledSkills(manifests: HarnessSkillManifest[]): void {
    this.skillCatalog = createHarnessSkillCatalog(includeBundledHarnessSkills(manifests));
  }

  /**
   * Replaces only the port used by future attempts. Saved snapshots remain
   * immutable; listeners hear of it so views derived from the port (the
   * story's sound words) refresh.
   */
  setMediaPort(media?: NarrativeMediaPort): void {
    this.media = media;
    this.notify();
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
      // A rewrite never holds the story: the chapter it was replacing is still
      // saved, so the reader can simply ask again.
      if (attempt.immediateChapterRequest.rewrite) {
        attempt.stage = 'generation_failed';
        attempt.failure = {
          stage: 'provider',
          message: `The browser closed while Chapter ${attempt.chapterNumber} was being rewritten, so it was kept as it was.`,
        };
        changed = true;
        continue;
      }
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
    for (const operation of recovered.arcPlanOperations) {
      if (operation.status !== 'request_started') continue;
      operation.status = 'provider_outcome_unknown';
      operation.failure = 'The browser closed after Arc planning started. The provider outcome is unknown; explicitly retry planning before generating a chapter.';
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
    for (const story of recovered.stories) {
      if (story.skillLoadout?.author) continue;
      story.skillLoadout = {
        ...(story.skillLoadout ?? {}),
        author: {
          id: SEN_NOVEL_AUTHOR_SKILL.id,
          version: SEN_NOVEL_AUTHOR_SKILL.version,
        },
      };
      changed = true;
    }
    if (changed) await this.repository.save(recovered);
    this.state = recovered;
    this.hydrated = true;
    this.notify();
    return this.snapshot();
  }

  async createStory(
    input: StoryFoundationInput,
    originalLanguage: SenLanguageCode = DEFAULT_SEN_LANGUAGE_CODE,
    initialSkillLoadout?: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>,
    options: {
      visibility?: HarnessStoryVisibility;
      /** The story's Reading Mode from its Story Seed. Absent is Standard. */
      chapterWritingStyle?: ChapterWritingStyle;
    } = {},
  ): Promise<HarnessStory> {
    this.assertHydrated();
    const created = createHarnessStory(this.state, input, originalLanguage, this.runtime);
    created.story.visibility = options.visibility ?? 'private';
    created.story.chapterWritingStyle = normalizeChapterWritingStyle(options.chapterWritingStyle);
    if (initialSkillLoadout) {
      const unsupportedSlot = Object.keys(initialSkillLoadout)
        .find(slot => !CAPA_SCHEMA.some(definition => definition.id === slot));
      if (unsupportedSlot) throw new Error(`${unsupportedSlot} is not a supported CAPA skill slot.`);
      const loadout: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>> = {};
      for (const slot of CAPA_SCHEMA) {
        const reference = initialSkillLoadout[slot.id];
        if (!reference) continue;
        const managed = managedCapaSlotReason(slot.id);
        if (managed) throw new Error(managed);
        const manifest = resolveHarnessSkill(this.skillCatalog, reference);
        if (!manifest) throw new Error(`${slot.label} skill ${reference.id}@${reference.version} is not installed in this host.`);
        if (manifest.slot !== slot.id) throw new Error(`${manifest.name} cannot be equipped in the ${slot.label} slot.`);
        loadout[slot.id] = cloneHarnessValue(reference);
      }
      if (!loadout.author) throw new Error('Choose an installed Author skill before creating a Harness story.');
      created.story.skillLoadout = loadout;
    } else {
      created.story.skillLoadout = {
        author: {
          id: SEN_NOVEL_AUTHOR_SKILL.id,
          version: SEN_NOVEL_AUTHOR_SKILL.version,
        },
      };
    }
    refreshRhythmRecommendation(created.state, created.story, created.story.createdAt);
    await this.persist(created.state);
    return cloneHarnessValue(created.story);
  }

  async saveFoundationRevision(storyId: string, input: StoryFoundationInput): Promise<HarnessStory> {
    this.assertHydrated();
    const story = findStory(this.state, storyId);
    const previous = story ? findFoundationRevision(this.state, story.activeFoundationRevisionId)?.input : undefined;
    // The Destined Ending is the novel's fixed destination and the arc count
    // its planned route: once set, a revision can carry them but never change them.
    if (previous?.destinedEnding?.trim() && input.destinedEnding?.trim() !== previous.destinedEnding.trim()) {
      throw new Error('The Destined Ending is this novel\'s fixed destination and cannot be changed by a revision.');
    }
    if (previous?.plannedArcCount && input.plannedArcCount !== previous.plannedArcCount) {
      throw new Error('The planned arc count is fixed once the novel begins.');
    }
    if (previous && Boolean(input.fateSurvival?.enabled) !== Boolean(previous.fateSurvival?.enabled)) {
      throw new Error('A novel\'s Fate mode (Regular Reader or Fate Survival) is fixed once it begins.');
    }
    const revised = reviseStoryFoundation(this.state, storyId, input, this.runtime);
    // A revision may change the story's Fate Pressure, so the recommendation follows it.
    refreshRhythmRecommendation(revised.state, revised.story, revised.story.updatedAt);
    await this.persist(revised.state);
    return cloneHarnessValue(revised.story);
  }

  /**
   * Replaces the story's ordered Hard Pins. This is the only writer: the user
   * creates, edits, reorders, and removes them here, and no provider reply,
   * arc plan, or replay can reach this list.
   */
  async setHardPins(storyId: string, pins: HardPinInput[]): Promise<HardPin[]> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active Harness operation before changing Hard Pins.');
    const inputs = validateHardPinInputs(pins);
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before changing its Hard Pins.');
    const now = this.runtime.now();
    const existing = new Map((story.hardPins ?? []).map(pin => [pin.id, pin]));
    story.hardPins = inputs.map(input => {
      const previous = input.id ? existing.get(input.id) : undefined;
      if (input.id && !previous) throw new Error('A Hard Pin identity did not match this story.');
      if (previous) return previous.text === input.text ? previous : { ...previous, text: input.text, updatedAt: now };
      return { id: this.runtime.createId('hpin'), text: input.text, createdAt: now, updatedAt: now };
    });
    story.updatedAt = now;
    await this.persist(candidate);
    return cloneHarnessValue(story.hardPins);
  }

  /** Author edit of a saved "Previously On" recap. Empty text removes it; prose is never touched. */
  async editChapterRecap(chapterId: string, text: string): Promise<void> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active Harness operation before editing a recap.');
    const trimmed = text.trim();
    if (trimmed.length > CHAPTER_RECAP_TEXT_LIMIT) throw new Error(`A recap must stay within ${CHAPTER_RECAP_TEXT_LIMIT} characters.`);
    const candidate = cloneHarnessValue(this.state);
    const chapter = candidate.chapters.find(entry => entry.id === chapterId);
    if (!chapter) throw new Error('Choose a saved chapter before editing its recap.');
    const now = this.runtime.now();
    if (trimmed) chapter.recap = { text: trimmed, source: 'author', updatedAt: now };
    else delete chapter.recap;
    const story = findStory(candidate, chapter.storyId);
    if (story) story.updatedAt = now;
    await this.persist(candidate);
  }

  /** The Mission Reminder the next attempt would freeze, for inspection. Never persisted here and never sent. */
  describeMissionReminder(storyId: string) {
    this.assertHydrated();
    const story = findStory(this.state, storyId);
    if (!story) throw new Error('Open a Harness story before inspecting its Mission Reminder.');
    const mode = harnessStoryMode(findFoundationRevision(this.state, story.activeFoundationRevisionId)?.input);
    return buildMissionReminder(assembleCapaPrompt(freezeHarnessSkillLoadout(story, this.skillCatalog, this.runtime.now(), mode)));
  }

  /**
   * The sound words the next attempt would freeze for this story: its equipped
   * Sound Cue Pack's, or the default library's. For inspection; never persisted here.
   */
  describeSoundVocabulary(storyId: string): SoundWord[] {
    this.assertHydrated();
    const story = findStory(this.state, storyId);
    if (!story) throw new Error('Open a Harness story before inspecting its sound words.');
    return soundVocabulary(this.media?.freeze(story.mediaLoadout, this.runtime.now()));
  }

  async setSkillSlot(
    storyId: string,
    slot: HarnessSkillSlotId,
    reference?: HarnessSkillReference,
  ): Promise<HarnessStory> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active Harness update before changing skills.');
    if (!CAPA_SCHEMA.some(definition => definition.id === slot)) {
      throw new Error(`${slot} is not a supported CAPA skill slot.`);
    }
    const managed = managedCapaSlotReason(slot);
    if (managed) throw new Error(managed);
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before changing its skills.');
    if (activeAttemptForStory(candidate, storyId)) {
      throw new Error('Finish or explicitly retry the current chapter checkpoint before changing skills.');
    }
    const loadout = { ...(story.skillLoadout ?? {}) };
    if (!reference) {
      if (slot === 'author') throw new Error('Choose an installed Author skill before changing this slot.');
      delete loadout[slot];
    } else {
      const manifest = resolveHarnessSkill(this.skillCatalog, reference);
      if (!manifest) throw new Error('That Harness skill is not installed in this host.');
      if (manifest.slot !== slot) throw new Error(`${manifest.name} cannot be equipped in that slot.`);
      loadout[slot] = cloneHarnessValue(reference);
    }
    story.skillLoadout = loadout;
    story.updatedAt = this.runtime.now();
    this.generating = true;
    try {
      await this.persist(candidate);
      return cloneHarnessValue(story);
    } finally {
      this.generating = false;
    }
  }

  /**
   * Changes the story's Reading Mode, a Story Setting owned by the story's
   * owner. It applies to chapters written from now on; committed chapters keep
   * the mode they were written in. The HARNESS resolves the matching
   * Accessibility skill itself at every chapter call.
   */
  async setChapterWritingStyle(storyId: string, mode: ChapterWritingStyle): Promise<HarnessStory> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active Harness update before changing the Reading Mode.');
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before changing its Reading Mode.');
    if (activeAttemptForStory(candidate, storyId)) {
      throw new Error('Finish or explicitly retry the current chapter checkpoint before changing the Reading Mode.');
    }
    story.chapterWritingStyle = normalizeChapterWritingStyle(mode);
    story.updatedAt = this.runtime.now();
    await this.persist(candidate);
    return cloneHarnessValue(story);
  }

  async setMediaSelection(
    storyId: string,
    slot: MediaSelectionSlot,
    reference?: MediaResourceReference,
  ): Promise<HarnessStory> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active Harness update before changing the Media Loadout.');
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before changing its Media Loadout.');
    if (activeAttemptForStory(candidate, storyId)) {
      throw new Error('Finish or explicitly retry the current chapter checkpoint before changing the Media Loadout.');
    }
    const loadout = { ...(story.mediaLoadout ?? {}) };
    if (!reference) {
      delete loadout[slot];
    } else {
      if (!this.media) throw new Error('The host has not supplied media access.');
      loadout[slot] = { id: reference.id, version: reference.version };
      this.media.validateSelection(loadout, this.runtime.now());
    }
    story.mediaLoadout = loadout;
    story.updatedAt = this.runtime.now();
    this.generating = true;
    try {
      await this.persist(candidate);
      return cloneHarnessValue(story);
    } finally {
      this.generating = false;
    }
  }

  async addCorrection(storyId: string, input: AppendHarnessCorrectionInput) {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active operation before changing canon.');
    if (!findStory(this.state, storyId)) throw new Error('Open a Harness story before adding a correction.');
    this.generating = true;
    try {
      const corrected = appendHarnessCorrection(this.state, storyId, input, this.runtime);
      await this.persist(corrected.state);
      return cloneHarnessValue(corrected.correction);
    } finally { this.generating = false; }
  }

  /** Reader/Codex edits use the same repository and correction journal as all HARNESS canon. */
  async updateReaderStory(storyId: string, chapterNumber: number, updates: ReaderCodexStoryPatchUpdater): Promise<void> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active operation before editing the Reader.');
    if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) throw new Error('Choose a valid chapter.');
    if (!findStory(this.state, storyId)) throw new Error('Open a Harness story before editing the Reader.');
    if (activeAttemptForStory(this.state, storyId)) throw new Error('Recover the pending chapter before editing the Reader.');
    this.generating = true;
    try {
      const before = createHarnessSenStory(this.state, storyId, chapterNumber);
      const patch = typeof updates === 'function' ? updates(before) : updates;
      const changes = diffHarnessReaderPatch(before, patch);
      if (!changes.length) return;
      const corrected = appendHarnessCorrection(this.state, storyId, { kind: 'reader-edit', reason: 'Author edit from Reader/Codex.' }, this.runtime);
      corrected.correction.readerEdit = { chapterNumber, changes };
      // appendHarnessCorrection clones the state: update its stored journal entry too.
      corrected.state.corrections.find(item => item.id === corrected.correction.id)!.readerEdit = corrected.correction.readerEdit;
      await this.persist(corrected.state);
    } finally { this.generating = false; }
  }

  /**
   * Saves the reader's choice for the next chapter only, or clears it so Rhythm
   * chooses automatically (Regular Reader; Fate Survival then waits for a new
   * choice). Both modes accept one of the three chapter functions (with the
   * idea the reader picked) or the reader's own direction. The choice survives
   * a failed attempt and is consumed when that chapter commits.
   */
  async chooseChapterDirection(storyId: string, choice: ChapterDirectionChoice | null) {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the chapter being written before changing its direction.');
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before choosing its direction.');
    if (activeAttemptForStory(candidate, storyId)) {
      throw new Error('Finish or explicitly retry the current chapter checkpoint before changing direction.');
    }
    const ended = storyConclusionGap(story);
    if (ended) throw new Error(ended);
    const now = this.runtime.now();
    if (!choice) {
      delete story.nextChapterDirection;
    } else {
      const mode = harnessStoryMode(findFoundationRevision(candidate, story.activeFoundationRevisionId)?.input);
      story.nextChapterDirection = {
        id: this.runtime.createId('hdir'),
        forChapter: story.head.nextChapterNumber,
        choice: validateChapterDirectionChoice(choice, mode),
        chosenAt: now,
      };
    }
    story.updatedAt = now;
    await this.persist(candidate);
    return cloneHarnessValue(story.nextChapterDirection);
  }

  private async prepareArcPlan(storyId: string, model: string) {
    const story = findStory(this.state, storyId)!;
    const foundation = findFoundationRevision(this.state, story.activeFoundationRevisionId)!;
    const planNeeded = needsArcPlan(story, foundation.input);
    if (!this.modelAdapter.arcOperation) throw new Error('This Harness adapter cannot create the authoritative Arc Plan required before chapter generation.');
    if (!planNeeded && hasDestinedEnding(foundation.input)) return;
    const pending = this.state.arcPlanOperations.filter(operation => operation.storyId === storyId
      && ['request_started', 'provider_outcome_unknown', 'raw_received', 'failed'].includes(operation.status)).at(-1);
    if (pending?.status === 'raw_received') return this.applyArcPlanOperation(pending.id);
    if (pending?.status === 'failed') throw new Error(`The last Arc planning request failed: ${pending.failure ?? 'no reason was saved'}. Plan the arc again.`);
    if (pending) throw new Error('The previous Arc planning provider outcome is unknown. Explicitly retry Arc planning before generating a chapter.');

    const startedAt = this.runtime.now();
    const storyInformation = compileStoryInformationPacket(this.state, story, foundation, this.runtime.createId('hplan'), this.runtime);
    // Only the arc planner receives where the arc sits in the story's length,
    // how the earlier arcs went, and the hidden look-ahead.
    const planning = arcPlanningContext(story, foundation.input, createArcChapterPosition(story.head.nextChapterNumber).arcNumber);
    const operation: HarnessArcPlanOperation = {
      id: this.runtime.createId('harc'), storyId, foundationRevisionId: foundation.id, startedAt,
      status: 'request_started', request: { operation: 'plan-arc', storyId, model, storyInformation, planning },
    };
    const started = cloneHarnessValue(this.state);
    started.arcPlanOperations.push(operation);
    await this.persist(started);
    let response;
    try { response = await this.modelAdapter.arcOperation(operation.request); }
    catch (error) {
      const failed = cloneHarnessValue(this.state);
      const saved = failed.arcPlanOperations.find(item => item.id === operation.id)!;
      saved.status = 'failed';
      saved.failure = errorMessage(error, 'The Arc planner could not complete the required plan.');
      await this.persist(failed);
      throw error;
    }
    const received = cloneHarnessValue(this.state);
    const saved = received.arcPlanOperations.find(item => item.id === operation.id)!;
    saved.status = 'raw_received';
    saved.rawProviderResponse = response.rawProviderResponse;
    saved.providerReceipt = response.providerReceipt;
    saved.failure = undefined;
    await this.persist(received);
    return this.applyArcPlanOperation(operation.id);
  }

  private async applyArcPlanOperation(operationId: string) {
    const operation = this.state.arcPlanOperations.find(item => item.id === operationId);
    if (!operation?.rawProviderResponse) throw new Error('The saved Arc planning response is unavailable. Explicitly retry Arc planning.');
    const story = findStory(this.state, operation.storyId)!;
    const foundation = findFoundationRevision(this.state, operation.foundationRevisionId)!;
    try {
      const reply = readArcReply(operation.rawProviderResponse);
      // The HARNESS owns arc numbers and goal identities: the planner's draft
      // becomes the plan for the arc being begun, with identities no other arc uses.
      const arcNumber = createArcChapterPosition(story.head.nextChapterNumber).arcNumber;
      const takenGoalIds = (story.arcPlans ?? []).filter(revision => revision.plan.arcNumber !== arcNumber)
        .flatMap(revision => revision.plan.goals.map(goal => goal.id));
      const plan = needsArcPlan(story, foundation.input) ? arcPlanFromDraft(reply.plan, arcNumber, takenGoalIds) : undefined;
      if (!hasDestinedEnding(foundation.input) && (typeof reply.destinedEnding !== 'string' || !reply.destinedEnding.trim())) throw new Error('The arc planner must supply the novel Destined Ending.');
      let candidate = cloneHarnessValue(this.state);
      const target = findStory(candidate, operation.storyId)!;
      if (plan) {
        target.arcPlans = [...(target.arcPlans ?? []), { plan, effectiveChapter: story.head.nextChapterNumber, reason: 'initial' }];
        // The planner's fresh look-ahead replaces the old one; a reply without one keeps nothing stale.
        const lookahead = normalizeArcLookahead(reply.lookahead, { afterArc: arcNumber, plannedArcCount: foundation.input.plannedArcCount });
        if (lookahead.length) target.arcLookahead = lookahead;
        else delete target.arcLookahead;
      }
      const saved = candidate.arcPlanOperations.find(item => item.id === operationId)!;
      saved.status = 'completed';
      saved.failure = undefined;
      if (!hasDestinedEnding(foundation.input) && typeof reply.destinedEnding === 'string') {
        candidate = reviseStoryFoundation(candidate, operation.storyId, { ...foundation.input, destinedEnding: reply.destinedEnding.trim() }, this.runtime).state;
      }
      await this.persist(candidate);
    } catch (error) {
      const failed = cloneHarnessValue(this.state);
      const saved = failed.arcPlanOperations.find(item => item.id === operationId)!;
      saved.status = 'failed';
      saved.failure = errorMessage(error, 'The saved Arc plan could not be applied.');
      await this.persist(failed);
      throw error;
    }
  }

  /**
   * Plans the goals of the arc the next chapter begins, whatever state its
   * planning is in: never asked, failed, interrupted, or answered but not yet
   * saved. A story with a planned length plans each arc this way, when the
   * reader begins it; its goals then wait on the reader's review. A story
   * missing only its Destined Ending asks the planner for it the same way.
   */
  async planNextArc(storyId: string, model: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active Harness operation to finish.');
    if (!model.trim()) throw new Error('Choose a configured Harness model before planning an arc.');
    const story = findStory(this.state, storyId);
    if (!story) throw new Error('Open a Harness story before planning its next arc.');
    const ended = storyConclusionGap(story);
    if (ended) throw new Error(ended);
    const foundation = findFoundationRevision(this.state, story.activeFoundationRevisionId);
    if (!foundation) throw new Error('The active Story Foundation revision is missing. Restore a local export before continuing.');
    if (!needsArcPlan(story, foundation.input) && hasDestinedEnding(foundation.input)) return this.snapshot();
    const stale = this.state.arcPlanOperations.filter(item => item.storyId === storyId
      && ['provider_outcome_unknown', 'failed'].includes(item.status));
    if (stale.length) {
      const candidate = cloneHarnessValue(this.state);
      for (const operation of candidate.arcPlanOperations) if (stale.some(item => item.id === operation.id)) operation.status = 'abandoned';
      await this.persist(candidate);
    }
    this.generating = true;
    try { await this.prepareArcPlan(storyId, model.trim()); }
    finally { this.generating = false; }
    return this.snapshot();
  }

  async retryArcPlan(storyId: string, model: string): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    if (this.generating) throw new Error('Wait for the active Harness operation to finish.');
    const candidate = cloneHarnessValue(this.state);
    const operation = candidate.arcPlanOperations.filter(item => item.storyId === storyId
      && ['provider_outcome_unknown', 'failed'].includes(item.status)).at(-1);
    if (!operation) throw new Error('This story has no failed or unknown Arc planning request to retry.');
    operation.status = 'abandoned';
    await this.persist(candidate);
    this.generating = true;
    try { await this.prepareArcPlan(storyId, model); }
    finally { this.generating = false; }
    return this.snapshot();
  }

  /**
   * Saves an edit to one arc's goals as a new revision effective from the next
   * chapter; committed chapters keep the plan they were written against.
   * `arcGoalEditState` decides what is allowed: Regular Reader mode edits the
   * active and upcoming arcs while the novel is private; Fate Survival edits an
   * arc once, immediately before it begins. Completed goals and completed arcs
   * never change, a goal not yet reached never gets a deadline before the next
   * chapter, and a locked Survival plan is never revised.
   */
  async editArcGoals(storyId: string, proposed: ArcPlan) {
    this.assertHydrated();
    if (this.generating || activeAttemptForStory(this.state, storyId)) throw new Error('Finish the current chapter checkpoint before editing goals.');
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before editing its goals.');
    const foundation = findFoundationRevision(candidate, story.activeFoundationRevisionId)?.input;
    const arcNumber = proposed?.arcNumber;
    const previous = Number.isInteger(arcNumber) ? harnessArcPlan(story, arcNumber) : undefined;
    if (!previous) throw new Error('This story has no saved plan for that arc yet.');
    const permission = arcGoalEditState(story, foundation, arcNumber);
    if (!permission.editable) throw new Error(permission.reason ?? `Arc ${arcNumber}'s goals cannot be edited now.`);
    const plan = editArcPlan(previous, proposed);
    permission.lockedGoalIds.forEach(goalId => {
      const index = previous.goals.findIndex(goal => goal.id === goalId);
      if (JSON.stringify(plan.goals[index]) !== JSON.stringify(previous.goals[index])) {
        throw new Error(`“${previous.goals[index].text}” is complete. Completed goals keep their wording, chapters, and place in the arc.`);
      }
    });
    // A goal not yet reached keeps its deadline ahead of the story, so the next chapter never works toward an overdue goal.
    const nextChapter = story.head.nextChapterNumber;
    const overdue = arcGoalSegments(plan).find(goal => goal.endChapter < nextChapter && !arcGoalResolved(plan, goal, story.goalCompletions));
    if (overdue) throw new Error(`Chapter ${nextChapter} is next, so “${overdue.text}” cannot have a deadline before Chapter ${nextChapter}.`);
    const otherArcGoalIds = new Set((story.arcPlans ?? []).filter(revision => revision.plan.arcNumber !== arcNumber)
      .flatMap(revision => revision.plan.goals.map(goal => goal.id)));
    const reused = plan.goals.find(goal => otherArcGoalIds.has(goal.id));
    if (reused) throw new Error(`Goal identity “${reused.id}” already belongs to another arc.`);
    const now = this.runtime.now();
    story.arcPlans = [...(story.arcPlans ?? []), { plan, effectiveChapter: story.head.nextChapterNumber, reason: 'edit' }];
    // An edit made while the arc's review is pending is that review, in both modes.
    if (permission.review === 'pending') {
      story.arcGoalReviews = withArcGoalReview(story, { arcNumber, reviewedAt: now, edited: true, source: 'novel-blueprint' });
    }
    story.updatedAt = now;
    await this.persist(candidate);
  }

  /** Reviews an arc before its first chapter by accepting its saved plan as written (in Fate Survival, its one-time review). */
  async acceptArcGoals(storyId: string, arcNumber: number) {
    this.assertHydrated();
    if (this.generating || activeAttemptForStory(this.state, storyId)) throw new Error('Finish the current chapter checkpoint before reviewing goals.');
    const candidate = cloneHarnessValue(this.state);
    const story = findStory(candidate, storyId);
    if (!story) throw new Error('Open a Harness story before reviewing its goals.');
    const permission = arcGoalEditState(story, findFoundationRevision(candidate, story.activeFoundationRevisionId)?.input, arcNumber);
    if (!permission.canAccept) throw new Error(permission.reason ?? `Arc ${arcNumber}'s plan is not awaiting review.`);
    const now = this.runtime.now();
    story.arcGoalReviews = withArcGoalReview(story, { arcNumber, reviewedAt: now, edited: false, source: 'novel-blueprint' });
    story.updatedAt = now;
    await this.persist(candidate);
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

  async generateNextChapter(
    storyId: string,
    model: string,
    batchId?: string,
  ): Promise<HarnessWorkspaceState> {
    return this.generateNextChapterInternal(storyId, model, batchId);
  }

  /**
   * Rewrite this chapter: writes the story's latest chapter again, as one new
   * attempt with the reader's optional note on what to change. The request is
   * prepared from the story as it stood before that chapter, with the same
   * direction the chapter was written with, and shows the writer the replaced
   * version's title and recap. The chapter stays saved, and is what the reader
   * reads, until the new version commits in its place; if the rewrite fails,
   * nothing about the story changes.
   */
  async rewriteLatestChapter(storyId: string, model: string, note?: string): Promise<HarnessWorkspaceState> {
    return this.generateNextChapterInternal(storyId, model, undefined, undefined, { note: readRewriteNote(note) });
  }

  /**
   * The story as it stood before its latest chapter, ready to write that
   * chapter again: its direction back in place and Rhythm's recommendation
   * worked out again for it.
   */
  private rewriteSource(storyId: string) {
    const gap = chapterRewriteGap(this.state, storyId);
    if (gap) throw new Error(gap);
    const replaced = latestStoryChapter(this.state, storyId)!;
    const source = withoutLatestChapter(this.state, storyId);
    const story = findStory(source, storyId)!;
    const direction = this.state.attempts.find(attempt => attempt.id === replaced.attemptId)?.immediateChapterRequest.direction;
    if (direction) story.nextChapterDirection = cloneHarnessValue(direction);
    refreshRhythmRecommendation(source, story, this.runtime.now());
    return { source, replaced };
  }

  /**
   * Frozen-input reuse is reachable only from the explicit retry path: a
   * retried provider request resends exactly what the abandoned attempt froze
   * instead of rebuilding it from newer story state. A rewrite (`rewrite`, or
   * frozen inputs that carry one) prepares and checks everything against the
   * story as it stood before the chapter it replaces.
   */
  private async generateNextChapterInternal(
    storyId: string,
    model: string,
    batchId?: string,
    frozen?: Pick<HarnessGenerationAttempt, 'capaPrompt' | 'storyInformation' | 'immediateChapterRequest' | 'missionReminder' | 'mediaLoadout'>,
    rewrite?: { note?: string },
  ): Promise<HarnessWorkspaceState> {
    this.assertHydrated();
    if (this.generating) throw new Error('A Harness chapter request is already running.');
    if (!model.trim()) throw new Error('Choose a configured Harness model before generating a chapter.');
    if (!findStory(this.state, storyId)) throw new Error('Open a Harness story before generating a chapter.');
    const activeAttempt = activeAttemptForStory(this.state, storyId);
    if (activeAttempt) {
      throw new Error('Finish or explicitly retry the current chapter checkpoint before generating another chapter.');
    }
    const rewriting = Boolean(rewrite || frozen?.immediateChapterRequest.rewrite);
    const prepared = rewriting ? this.rewriteSource(storyId) : undefined;
    if (prepared && frozen?.immediateChapterRequest.rewrite && frozen.immediateChapterRequest.rewrite.replacesChapterId !== prepared.replaced.id) {
      throw new Error(`Chapter ${prepared.replaced.chapterNumber} is not the chapter this rewrite was asked for.`);
    }
    const source = prepared?.source ?? this.state;
    const story = findStory(source, storyId)!;
    const foundation = findFoundationRevision(source, story.activeFoundationRevisionId);
    if (!foundation) throw new Error('The active Story Foundation revision is missing. Restore a local export before continuing.');
    if (!this.modelAdapter.arcOperation) {
      throw new Error('This Harness adapter cannot create the authoritative Arc Plan required before chapter generation.');
    }

    // An ended story never requests another chapter or plans another arc.
    const ended = storyConclusionGap(story);
    if (ended) throw new Error(ended);
    // Beyond the story's planned length no arc begins.
    const routeComplete = routeCompleteGap(story, foundation.input);
    if (routeComplete) throw new Error(routeComplete);
    // A story with a planned length plans each arc when the reader begins it,
    // never inside a chapter write; one without plans its next arc here.
    const planGap = arcPlanGap(story, foundation.input);
    if (planGap) throw new Error(planGap);
    if (needsArcPlan(story, foundation.input) || !hasDestinedEnding(foundation.input)) {
      // A chapter being written again was planned when it was first written.
      if (prepared) throw new Error(`Chapter ${prepared.replaced.chapterNumber} has no saved arc plan, so it cannot be rewritten.`);
      this.generating = true;
      try { await this.prepareArcPlan(storyId, model); }
      finally { this.generating = false; }
      return this.generateNextChapterInternal(storyId, model, batchId, frozen);
    }
    if (!harnessArcContext(story, foundation.input, story.head.nextChapterNumber)) {
      throw new Error(`Chapter ${story.head.nextChapterNumber} has no saved Arc Plan.`);
    }
    const reviewGap = arcReviewGap(story, foundation.input);
    if (reviewGap) throw new Error(reviewGap);
    // Fate Survival is written one reader-directed chapter at a time. A retry
    // resends the direction its attempt already carries.
    const directionGap = frozen?.immediateChapterRequest.direction ? undefined : chapterDirectionGap(story, harnessStoryMode(foundation.input));
    if (directionGap) throw new Error(directionGap);
    const attemptId = this.runtime.createId('hga');
    const startedAt = this.runtime.now();
    // The HARNESS prepares the Generation Model Call inputs separately: the
    // CAPA Prompt (how the model authors), the Story Information Packet (what
    // it authors) with its distinct sections, the Mission Reminder, and the
    // Immediate Chapter Request. Story Information and the Immediate Chapter
    // Request are frozen first so an equipped Translation glossary is selected
    // against exactly the inputs this attempt sends, and replays with them.
    const storyInformation = frozen ? cloneHarnessValue({ ...frozen.storyInformation, attemptId }) : compileStoryInformationPacket(source, story, foundation, attemptId, this.runtime);
    // A rewrite shows the writer what it replaces: the title and recap, never the prose.
    const rewriteRequest: HarnessChapterRewrite | undefined = prepared && !frozen ? {
      replacesChapterId: prepared.replaced.id,
      ...(rewrite?.note ? { note: rewrite.note } : {}),
      previous: { title: prepared.replaced.title, ...(prepared.replaced.recap?.text ? { recap: prepared.replaced.recap.text } : {}) },
    } : undefined;
    const immediateChapterRequest = frozen ? cloneHarnessValue(frozen.immediateChapterRequest) : buildImmediateChapterRequest(story, rewriteRequest);
    // Media is frozen before CAPA: its sound words fill the Sound Cues slot.
    const mediaLoadout = frozen
      ? cloneHarnessValue(frozen.mediaLoadout)
      : this.media?.freeze(story.mediaLoadout, startedAt) ?? emptyNarrativeMedia(startedAt);
    // The Fate slot follows the chapter's frozen Fate mode: every Fate Survival call carries its skill.
    const capaPrompt = frozen ? cloneHarnessValue(frozen.capaPrompt) : assembleCapaPrompt(
      freezeHarnessSkillLoadout(story, this.skillCatalog, startedAt, storyInformation.storyDirection.fateMode ?? 'regular', soundVocabulary(mediaLoadout)),
      { storyInformation, immediateChapterRequest },
    );
    // Frozen beside the CAPA Prompt; presented as its own section at the provider boundary.
    const missionReminder = frozen ? cloneHarnessValue(frozen.missionReminder) : buildMissionReminder(capaPrompt);
    const attempt: HarnessGenerationAttempt = {
      id: attemptId,
      storyId,
      foundationRevisionId: foundation.id,
      foundationSnapshot: cloneHarnessValue(foundation),
      capaPrompt,
      mediaLoadout,
      storyInformation,
      immediateChapterRequest,
      missionReminder,
      model: model.trim(),
      chapterNumber: story.head.nextChapterNumber,
      stage: 'request_started',
      startedAt,
      ...(batchId ? { batchId } : {}),
      warnings: [],
    };
    const requestStarted = cloneHarnessValue(this.state);
    requestStarted.attempts.push(attempt);
    // Fate Survival: the arc's goals lock when its generation begins, in the
    // same write as the request checkpoint. The chapter ending a broken route begins no arc.
    const startedStory = findStory(requestStarted, storyId)!;
    const arcNumber = createArcChapterPosition(attempt.chapterNumber).arcNumber;
    if (harnessStoryMode(foundation.input) === 'survival' && !startedStory.brokenRoute && !arcGoalReview(startedStory, arcNumber)?.lockedAt) {
      startedStory.arcGoalReviews = withArcGoalReview(startedStory, { ...arcGoalReview(startedStory, arcNumber), arcNumber, lockedAt: startedAt });
    }
    if (batchId) {
      const batch = requestStarted.batches.find(entry => entry.id === batchId);
      if (!batch || batch.storyId !== storyId) throw new Error('The persisted Harness batch no longer matches this story.');
      batch.currentAttemptId = attemptId;
      batch.updatedAt = startedAt;
    }
    // This must succeed before the request leaves the browser. On reload a
    // saved request_started checkpoint becomes provider_outcome_unknown (a
    // rewrite's fails instead: the chapter it was replacing is still saved).
    this.generating = true;
    try {
      await this.persist(requestStarted);
      let response;
      try {
        response = await this.modelAdapter.generate({
          storyId,
          attemptId,
          model: attempt.model,
          capaPrompt: attempt.capaPrompt,
          storyInformation: attempt.storyInformation,
          missionReminder: attempt.missionReminder,
          immediateChapterRequest: attempt.immediateChapterRequest,
        });
      } catch (error) {
        return await this.appendFailure(attemptId, {
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
      // The host measured the exact serialized request it sent; keep it with the attempt.
      if (response.requestMeasurement) rawAttempt.requestMeasurement = cloneHarnessValue(response.requestMeasurement);
      rawAttempt.failure = undefined;
      if (!await this.persistCheckpoint(rawReceived, attemptId, 'raw_received')) return this.snapshot();

      await this.acceptRawResponse(attemptId);
    } finally {
      this.generating = false;
    }
    return this.snapshot();
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
    // Prose is accepted on its own, read out of the writer's marks. Sound Cues
    // are placed only for the sound words the writer was given, on recordings
    // from the attempt's frozen Media Loadout.
    const acceptance = acceptHarnessModelResponse(raw, attempt.chapterNumber, {
      media: attempt.mediaLoadout,
      soundVocabulary: attempt.capaPrompt.soundVocabulary,
      locale: findStory(this.state, attempt.storyId)?.originalLanguage,
      paragraphTarget: attempt.immediateChapterRequest.chapterScale.paragraphs,
      // A reply far below the size asked for is a failed write: it is never committed, and the raw reply stays on the attempt.
      minWords: attempt.immediateChapterRequest.chapterScale.minWords,
      // Whose lines are the protagonist's comes from what the writer was shown, so a retry decides the same.
      protagonistNames: protagonistNames(attempt.storyInformation.currentStory, attempt.storyInformation.canonicalState.characters),
      speakersExpected: attempt.capaPrompt.skills.some(skill => skill.slot === 'speakers' && skill.authoring),
      holdingsExpected: attempt.capaPrompt.skills.some(skill => skill.slot === 'holdings' && skill.authoring),
    });
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
    // The chapter reply carries no memory; legacy event checkpoints remain readable.
    // New chapter state comes from the writer's tags, not another model call.
    const rawEvents = providedRawEvents ?? [];
    let preserved: SemanticEventPreservationResult;
    try {
      preserved = this.eventPreserver(rawEvents, {
        storyId: attempt.storyId,
        attemptId: attempt.id,
        chapterNumber: attempt.chapterNumber,
        createdAt: this.runtime.now(),
        prose: attempt.acceptedDraft.prose,
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
    // A rewrite commits only over the chapter it was asked to replace, while
    // that is still the latest. Otherwise it is set aside: the chapter stays.
    const rewrite = attempt.immediateChapterRequest.rewrite;
    if (rewrite) {
      if (story.head.lastCommittedChapterId !== rewrite.replacesChapterId || story.head.nextChapterNumber !== attempt.chapterNumber + 1) {
        return this.appendFailure(attemptId, {
          stage: 'persistence',
          message: `Chapter ${attempt.chapterNumber} changed before its new version could be saved, so it was kept as it was.`,
        });
      }
    } else if (story.head.nextChapterNumber !== attempt.chapterNumber) {
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
    if (!attempt.storyInformation.arc) {
      return this.appendFailure(attemptId, { stage: 'response', message: 'The frozen Story Information Packet has no authoritative Arc Plan.' });
    }
    // After a broken route, the chapter commits only when its prose shows the ending. Otherwise it
    // stays uncommitted and its reader direction stays in place for the retry; no recovery call is made.
    const missingEnding = missingRequiredEnding(attempt);
    if (missingEnding) {
      return this.appendFailure(attemptId, { stage: 'response', message: missingEnding.message }, missingEnding.warnings);
    }

    const committedAt = this.runtime.now();
    // A rewrite first takes the story back to before the chapter it replaces,
    // in the same write that commits the new version.
    const candidate = rewrite ? withoutLatestChapter(base, attempt.storyId) : cloneHarnessValue(base);
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
    // Every name a holding change uses becomes a Codex entry now, in the same
    // write that commits its chapter: the app assigns the IDs, never the writer.
    const holdings = acceptedDraft.holdingChanges?.length
      ? resolveHoldingChanges({
        storyId: commitAttempt.storyId,
        chapter: { id: chapterId, chapterNumber: commitAttempt.chapterNumber },
        changes: acceptedDraft.holdingChanges,
        entries: candidate.codexEntries,
        declared: declaredCharacters(commitAttempt.storyInformation.currentStory),
        createdAt: committedAt,
        createId: () => this.runtime.createId('hcx'),
      })
      : undefined;
    const chapter = {
      id: chapterId,
      storyId: commitAttempt.storyId,
      attemptId: commitAttempt.id,
      foundationRevisionId: commitAttempt.foundationRevisionId,
      storyInformationPacketId: commitAttempt.storyInformation.id,
      chapterNumber: commitAttempt.chapterNumber,
      title: acceptedDraft.title,
      titleSource: acceptedDraft.titleSource,
      prose: acceptedDraft.prose,
      paragraphs: cloneHarnessValue(acceptedDraft.paragraphs),
      metrics: cloneHarnessValue(acceptedDraft.metrics),
      ...(acceptedDraft.soundCues ? { soundCues: cloneHarnessValue(acceptedDraft.soundCues) } : {}),
      ...(acceptedDraft.speakers ? { speakers: cloneHarnessValue(acceptedDraft.speakers) } : {}),
      ...(holdings?.changes.length ? { holdingChanges: holdings.changes } : {}),
      ...(acceptedDraft.closingHoldings ? { closingHoldings: [...acceptedDraft.closingHoldings] } : {}),
      mediaLoadout: cloneHarnessValue(commitAttempt.mediaLoadout),
      ...(acceptedDraft.plan ? { plan: acceptedDraft.plan } : {}),
      // The recap and rhythm metadata are saved exactly once, with their own
      // chapter. Later chapters never regenerate or overwrite them.
      ...(acceptedDraft.recap ? { recap: { text: acceptedDraft.recap, source: 'model' as const, updatedAt: committedAt } } : {}),
      ...(acceptedDraft.rhythm ? { rhythm: cloneHarnessValue(acceptedDraft.rhythm) } : {}),
      ...(attemptChapterPath(commitAttempt) ? { path: attemptChapterPath(commitAttempt)! } : {}),
      eventIds: committedEvents.map(event => event.id),
      responseMode: acceptedDraft.responseMode,
      createdAt: commitAttempt.proseAcceptedAt ?? commitAttempt.startedAt,
      committedAt,
    };
    candidate.chapters.push(chapter);
    candidate.events.push(...committedEvents);
    if (holdings?.created.length) candidate.codexEntries.push(...holdings.created);
    if (rewrite) {
      // The replaced version's attempt keeps its reply, so an export still shows it.
      const replacedAttemptId = base.chapters.find(entry => entry.id === rewrite.replacesChapterId)?.attemptId;
      const replaced = candidate.attempts.find(entry => entry.id === replacedAttemptId);
      if (replaced) replaced.replacedByChapterId = chapter.id;
    }
    commitStory.head = {
      nextChapterNumber: commitAttempt.chapterNumber + 1,
      lastCommittedChapterId: chapter.id,
      lastCommittedAt: committedAt,
    };
    // Records the goal honestly (achieved or missed) and applies the Fate mode's consequence.
    addWarnings(commitAttempt, commitHarnessArc(commitStory, commitAttempt, committedAt));
    // The reader's direction was for this chapter only: it is consumed here,
    // in the same write that commits the chapter it directed.
    if (commitStory.nextChapterDirection && commitStory.nextChapterDirection.forChapter <= commitAttempt.chapterNumber) {
      delete commitStory.nextChapterDirection;
    }
    refreshRhythmRecommendation(candidate, commitStory, committedAt);
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
    // A story without a planned length plans its next arc as soon as the
    // last chapter of one commits; a story with one waits for the reader.
    const committedStory = findStory(this.state, commitAttempt.storyId);
    const committedFoundation = committedStory ? findFoundationRevision(this.state, committedStory.activeFoundationRevisionId)?.input : undefined;
    if (createArcChapterPosition(commitAttempt.chapterNumber + 1).chapterInArc === 1 && !committedStory?.conclusion && !committedFoundation?.plannedArcCount) {
      try { await this.prepareArcPlan(commitAttempt.storyId, commitAttempt.model); }
      catch (error) {
        const pending = cloneHarnessValue(this.state);
        addWarnings(attemptById(pending, attemptId), [{ code: 'arc_plan_pending', message: errorMessage(error, 'The next arc plan could not be prepared. The committed chapter is safe.') }]);
        await this.persist(pending);
      }
    }
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

    const upsert = <T extends { id: string }>(items: T[], next: T) => {
      const index = items.findIndex(item => item.id === next.id);
      if (index >= 0) items[index] = next;
      else items.push(next);
    };
    const upsertCanonical = (next: HarnessWorkspaceState['canonicalRecords'][number]) => {
      const existing = candidate.canonicalRecords.find(record => record.id === next.id)
        ?? candidate.canonicalRecords.find(record => record.storyId === next.storyId && record.sourceEventId === next.sourceEventId
          && !!next.sourceEventId && record.capabilityId === next.capabilityId && record.kind === next.kind
          && record.label === next.label && !!record.supersededByCorrectionId);
      const resolved = existing ? {
        ...next,
        id: existing.id,
        ...(existing.supersededByCorrectionId ? {
          supersededAt: existing.supersededAt,
          supersededByCorrectionId: existing.supersededByCorrectionId,
          supersededByRecordId: existing.supersededByRecordId,
        } : {}),
      } : next;
      upsert(candidate.canonicalRecords, resolved);
      return resolved.id;
    };
    const events = candidate.events.filter(event => event.chapterId && committedChapterIds.has(event.chapterId));
    for (const sourceEvent of events) {
      const chapter = candidate.chapters.find(chapter => chapter.id === sourceEvent.chapterId)!;
      const event = verifyHarnessEventEvidence(sourceEvent, chapter.prose);
      try {
        const results = this.capabilityRegistry.processEvent({ state: candidate, event, now: this.runtime.now() });
        for (const previous of candidate.capabilityReceipts) {
          if (previous.sourceEventId !== event.id || previous.status === 'superseded'
            || results.some(result => result.receipt.id === previous.id)) continue;
          const result = results.find(result => result.receipt.capabilityId === previous.capabilityId) ?? results[0];
          if (!result) continue;
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
        for (const result of results) {
          upsert(candidate.capabilityReceipts, result.receipt);
          const canonicalRecordIds = new Map<string, string>();
          for (const record of result.records) canonicalRecordIds.set(record.id, upsertCanonical(record));
          result.receipt.canonicalRecordIds = result.receipt.canonicalRecordIds.map(id => canonicalRecordIds.get(id) ?? id);
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
        : receipts.some(receipt => receipt.status === 'unresolved')
          || Boolean(attempt.rejectedEvents?.length)
          || attempt.warnings.some(warning => ['optional_event_field_omitted', 'invalid_events_omitted'].includes(warning.code))
          ? 'warnings' : 'complete';
      if (attempt.postCommitProcessing === 'complete') {
        attempt.warnings = attempt.warnings.filter(warning => warning.code !== 'capability_failed');
      }
      if (attempt.postCommitProcessing === 'failed') addWarnings(attempt, [{
        code: 'capability_failed',
        message: 'One or more deterministic capabilities failed. The chapter remains committed and can be replayed.',
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
    await this.retryAppropriateStageInternal(attemptId);
    return this.snapshot();
  }

  private async retryAppropriateStageInternal(attemptId: string): Promise<HarnessWorkspaceState> {
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
    // A rewrite is tried again only while the chapter it replaces is still the latest.
    const rewrite = attempt.immediateChapterRequest.rewrite;
    if (rewrite && latestStoryChapter(this.state, attempt.storyId)?.id !== rewrite.replacesChapterId) {
      throw new Error(`Chapter ${attempt.chapterNumber} is no longer the latest chapter, so its rewrite cannot be tried again.`);
    }
    const abandoned = cloneHarnessValue(this.state);
    const abandonedAttempt = attemptById(abandoned, attemptId);
    abandonedAttempt.stage = 'abandoned';
    abandonedAttempt.recoveryStage = undefined;
    abandonedAttempt.failure = undefined;
    await this.persist(abandoned);
    // A frozen packet without its Arc Plan was never a sendable request, and a
    // failed attempt does not block later chapters, so frozen inputs are
    // resent unchanged only while the story head still points at the chapter
    // they were prepared for. Otherwise the retry rebuilds for the current head.
    const story = findStory(this.state, attempt.storyId);
    // A rewrite's chapter is the latest one (checked above), and its direction
    // is the one that chapter was written with, which cannot change.
    const sameChapter = rewrite ? true : story?.head.nextChapterNumber === attempt.immediateChapterRequest.chapterNumber;
    // A reader who changed this chapter's direction after the failure gets the
    // new direction: the request is rebuilt instead of resent.
    const sameDirection = rewrite ? true : (story ? pendingChapterDirection(story)?.id : undefined) === attempt.immediateChapterRequest.direction?.id;
    // The same holds for the managed skills: a changed Reading Mode or a
    // different Translation package resolution rebuilds the request, so a
    // stale CAPA Prompt is never resent.
    const sameManagedSkills = story ? this.managedSkillsStillMatch(story, attempt) : false;
    const frozen = attempt.storyInformation.arc && sameChapter && sameDirection && sameManagedSkills ? {
      capaPrompt: attempt.capaPrompt,
      storyInformation: attempt.storyInformation,
      immediateChapterRequest: attempt.immediateChapterRequest,
      missionReminder: attempt.missionReminder,
      mediaLoadout: attempt.mediaLoadout,
    } : undefined;
    // A rebuilt rewrite keeps the reader's note.
    if (rewrite) return this.generateNextChapterInternal(attempt.storyId, attempt.model, undefined, frozen, { note: rewrite.note });
    return this.generateNextChapterInternal(attempt.storyId, attempt.model, attempt.batchId, frozen);
  }

  /**
   * Whether the story's managed CAPA skills resolve now to exactly what the
   * attempt froze. A resolution that fails (competing Translation packages,
   * for example) never matches, so the rebuild reports it.
   */
  private managedSkillsStillMatch(story: HarnessStory, attempt: HarnessGenerationAttempt): boolean {
    try {
      const fateMode = attempt.storyInformation.storyDirection.fateMode ?? 'regular';
      // The Sound Cues slot compares against the attempt's own frozen media, which a retry reuses.
      const current = Object.values(resolveManagedCapaSkills(story, this.skillCatalog, fateMode, soundVocabulary(attempt.mediaLoadout)))
        .filter((skill): skill is HarnessSkillManifest => Boolean(skill));
      return managedCapaSkillSignature(current) === managedCapaSkillSignature(attempt.capaPrompt.skills);
    } catch {
      return false;
    }
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
      try {
        await this.generateNextChapter(batch.storyId, batch.model, batch.id);
      } catch (error) {
        // A chapter that waits on the reader (an arc to plan or review, a
        // direction) pauses the batch with the reason instead of leaving it running.
        const paused = cloneHarnessValue(this.state);
        const target = paused.batches.find(entry => entry.id === batchId);
        if (!target || activeAttemptForStory(paused, target.storyId)) throw error;
        target.status = 'paused';
        target.failure = errorMessage(error, 'The batch paused before its next chapter.');
        target.updatedAt = this.runtime.now();
        await this.persist(paused);
        return this.snapshot();
      }
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
    if (harnessStoryMode(findFoundationRevision(this.state, story.activeFoundationRevisionId)?.input) === 'survival') {
      throw new Error('Fate Survival is written one reader-directed chapter at a time, so it cannot run a batch.');
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
    memoryRecoveries: state.memoryRecoveries?.filter(recovery => recovery.storyId === storyId) ?? [],
    codexEntries: state.codexEntries.filter(entry => entry.storyId === storyId),
  };
};
