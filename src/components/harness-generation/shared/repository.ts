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

/** Explicit upgrade steps, keyed by the version they upgrade from. */
const HARNESS_WORKSPACE_MIGRATIONS: Record<number, (stored: StoredWorkspace) => StoredWorkspace> = {
  18: migrateV18ToV19,
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
