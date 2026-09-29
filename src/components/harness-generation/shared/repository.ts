import { cloneHarnessValue } from './ids';
import { HARNESS_GENERATION_SCHEMA_VERSION, type HarnessWorkspaceState } from '../../../narrative/generation';

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
 * Explicit upgrade steps, keyed by the version they upgrade from. Nothing
 * before schema 22 (Sound Cues in the tiny SEN language) upgrades, by the
 * product owner's decision: chapters saved before it carried blocks and World
 * Cues that no longer exist, so that storage is kept untouched and the page
 * starts fresh.
 */
const HARNESS_WORKSPACE_MIGRATIONS: Record<number, (stored: StoredWorkspace) => StoredWorkspace> = {
  // Schema 22 -> 23: the paragraph counter adds only optional fields (the
  // frozen request's `chapterScale.paragraphs` and `metrics.paragraphTarget`),
  // so every story, attempt and chapter carries over unchanged.
  22: stored => ({ ...stored, schemaVersion: 23 }),
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
 * every story, chapter and plan kept (schema 22 upgrades to 23 unchanged; nothing earlier upgrades). Anything else (an unknown version or an
 * unrecognized shape) cannot be read and yields an empty workspace; hosts keep
 * an untouched copy of it (see the IndexedDB repository) before replacing it.
 * Every structural change to a persisted field must bump
 * `HARNESS_GENERATION_SCHEMA_VERSION` and add its migration step here.
 */
export const readHarnessWorkspaceState = (value: unknown): HarnessWorkspaceState =>
  isCurrentHarnessWorkspaceState(value) ? cloneHarnessValue(value) : migrateHarnessWorkspaceState(value) ?? createEmptyHarnessWorkspaceState();
