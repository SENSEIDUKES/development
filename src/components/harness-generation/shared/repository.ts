import { cloneHarnessValue } from './ids';
import { createArcChapterPosition } from '../../arc-goals/shared/arcGoals';
import { HARNESS_GENERATION_SCHEMA_VERSION, type HarnessArcGoalReview, type HarnessWorkspaceState } from '../../../narrative/generation';

export const createEmptyHarnessWorkspaceState = (): HarnessWorkspaceState => ({
  schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION,
  stories: [],
  foundations: [],
  attempts: [],
  chapters: [],
  events: [],
  capabilityReceipts: [],
  canonicalRecords: [],
  projections: [],
  corrections: [],
  batches: [],
  arcPlanOperations: [],
});

export interface HarnessGenerationRepository {
  load(): Promise<HarnessWorkspaceState>;
  save(state: HarnessWorkspaceState): Promise<void>;
}

export const isCurrentHarnessWorkspaceState = (value: unknown): value is HarnessWorkspaceState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<HarnessWorkspaceState> & { schemaVersion?: number };
  return candidate.schemaVersion === HARNESS_GENERATION_SCHEMA_VERSION
    && Array.isArray(candidate.stories)
    && Array.isArray(candidate.foundations)
    && Array.isArray(candidate.attempts)
    && Array.isArray(candidate.chapters)
    && Array.isArray(candidate.events)
    && Array.isArray(candidate.capabilityReceipts)
    && Array.isArray(candidate.canonicalRecords)
    && Array.isArray(candidate.projections)
    && Array.isArray(candidate.corrections)
    && Array.isArray(candidate.batches)
    && Array.isArray(candidate.arcPlanOperations);
};

const hasWorkspaceShape = (value: unknown): value is Record<string, unknown> & { schemaVersion?: unknown } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return ['stories', 'foundations', 'attempts', 'chapters', 'events', 'capabilityReceipts', 'canonicalRecords',
    'projections', 'corrections', 'batches', 'arcPlanOperations'].every(field => Array.isArray(candidate[field]));
};

type StoredWorkspace = Record<string, unknown> & { schemaVersion: number };

/**
 * Schema 18 -> 19: arc roadmaps, the arc count, novel visibility and Fate
 * Survival arc reviews are all new optional fields, so every saved story,
 * chapter, plan, completion and journal entry carries over unchanged. A Fate
 * Survival story's arcs that already have committed chapters began before
 * this version, so they are recorded as locked; a Regular Reader story gains
 * nothing. Absent visibility reads as private.
 */
const migrateV18ToV19 = (stored: StoredWorkspace): StoredWorkspace => {
  const state = stored as unknown as HarnessWorkspaceState;
  return {
    ...stored,
    schemaVersion: 19,
    stories: state.stories.map(story => {
      const foundation = state.foundations.find(revision => revision.id === story.activeFoundationRevisionId);
      if (!foundation?.input.fateSurvival?.enabled) return story;
      const firstCommitByArc = new Map<number, string>();
      for (const chapter of state.chapters.filter(entry => entry.storyId === story.id)) {
        const arc = createArcChapterPosition(chapter.chapterNumber).arcNumber;
        const earlier = firstCommitByArc.get(arc);
        if (!earlier || chapter.committedAt < earlier) firstCommitByArc.set(arc, chapter.committedAt);
      }
      const reviews: HarnessArcGoalReview[] = [...firstCommitByArc.entries()].sort(([left], [right]) => left - right)
        .map(([arcNumber, lockedAt]) => ({ arcNumber, source: 'migration', lockedAt }));
      return reviews.length ? { ...story, arcGoalReviews: reviews } : story;
    }),
  };
};

type StoredRecord = Record<string, unknown>;

/** Fate Survival keeps only its switch; the old visibility setting and mystery/thread proposals served the retired Survival design. */
const survivalSwitchOnly = (input: StoredRecord | undefined) => {
  const survival = input?.fateSurvival as StoredRecord | undefined;
  if (input && survival) input.fateSurvival = { enabled: survival.enabled === true };
};

/** A frozen packet loses the retired Survival section and persistent directions; everything else stays as frozen. */
const retirePacketFields = (packet: StoredRecord | undefined) => {
  if (!packet) return;
  delete packet.fateSurvival;
  delete (packet.currentStory as StoredRecord | undefined)?.authorDirections;
  const diagnostics = packet.diagnostics as { sections?: Array<{ section?: string }>; omitted?: Array<{ section?: string }> } | undefined;
  if (diagnostics?.sections) diagnostics.sections = diagnostics.sections.filter(entry => entry.section !== 'fateSurvival');
  if (diagnostics?.omitted) diagnostics.omitted = diagnostics.omitted.filter(entry => entry.section !== 'fateSurvival');
};

/**
 * v19 → v20: persistent steering became the reader's one-chapter direction.
 * A direction saved since the last commit becomes the next chapter's pending
 * direction; every saved direction is kept as the story's earlier-steering
 * record, which is never sent to the writer again. Fate Survival keeps only
 * its switch, and frozen attempts drop the retired packet fields.
 */
const migrateV19ToV20 = (stored: StoredWorkspace): StoredWorkspace => {
  const state = stored as unknown as { stories: StoredRecord[]; foundations: StoredRecord[]; attempts: StoredRecord[]; arcPlanOperations: StoredRecord[] };
  return {
    ...stored,
    schemaVersion: 20,
    stories: state.stories.map(story => {
      const { steering, ...rest } = story as StoredRecord & { steering?: Array<{ id: string; direction: string; mode: 'future' | 'revise-history'; effectiveChapter: number; createdAt: string }> };
      if (!steering?.length) return rest;
      const nextChapter = (story.head as { nextChapterNumber: number }).nextChapterNumber;
      const latest = steering.at(-1)!;
      return {
        ...rest,
        earlierSteering: steering.map(({ direction, mode, effectiveChapter, createdAt }) => ({ direction, mode, effectiveChapter, createdAt })),
        ...(latest.effectiveChapter === nextChapter ? { nextChapterDirection: {
          id: latest.id, forChapter: nextChapter, choice: { kind: 'reader', text: latest.direction }, chosenAt: latest.createdAt,
        } } : {}),
      };
    }),
    foundations: state.foundations.map(foundation => { survivalSwitchOnly(foundation.input as StoredRecord); return foundation; }),
    attempts: state.attempts.map(attempt => {
      survivalSwitchOnly((attempt.foundationSnapshot as StoredRecord | undefined)?.input as StoredRecord | undefined);
      retirePacketFields(attempt.storyInformation as StoredRecord | undefined);
      delete (attempt.immediateChapterRequest as StoredRecord | undefined)?.assignment;
      return attempt;
    }),
    arcPlanOperations: state.arcPlanOperations.map(operation => {
      retirePacketFields((operation.request as StoredRecord | undefined)?.storyInformation as StoredRecord | undefined);
      return operation;
    }),
  };
};

/** Explicit upgrade steps, keyed by the version they upgrade from. */
const HARNESS_WORKSPACE_MIGRATIONS: Record<number, (stored: StoredWorkspace) => StoredWorkspace> = {
  18: migrateV18ToV19,
  19: migrateV19ToV20,
};

/**
 * Upgrades saved storage from an earlier schema version through each explicit
 * step to the current version. Returns undefined when no path exists or the
 * stored value is not a workspace; the caller then preserves it untouched.
 */
export const migrateHarnessWorkspaceState = (value: unknown): HarnessWorkspaceState | undefined => {
  if (!hasWorkspaceShape(value) || typeof value.schemaVersion !== 'number') return undefined;
  let current = cloneHarnessValue(value) as StoredWorkspace;
  while (current.schemaVersion !== HARNESS_GENERATION_SCHEMA_VERSION) {
    const step = HARNESS_WORKSPACE_MIGRATIONS[current.schemaVersion];
    if (!step) return undefined;
    current = step(current);
  }
  return isCurrentHarnessWorkspaceState(current) ? current as unknown as HarnessWorkspaceState : undefined;
};

/**
 * Reads saved Harness Generation storage. Current storage is read as is;
 * storage from an earlier version with an explicit migration is upgraded with
 * every story, chapter and plan kept. Anything else (an unknown version or an
 * unrecognized shape) cannot be read and yields an empty workspace; hosts keep
 * an untouched copy of it (see the IndexedDB repository) before replacing it.
 * Every structural change to a persisted field must bump
 * `HARNESS_GENERATION_SCHEMA_VERSION` and add its migration step here.
 */
export const readHarnessWorkspaceState = (value: unknown): HarnessWorkspaceState =>
  isCurrentHarnessWorkspaceState(value) ? cloneHarnessValue(value) : migrateHarnessWorkspaceState(value) ?? createEmptyHarnessWorkspaceState();
