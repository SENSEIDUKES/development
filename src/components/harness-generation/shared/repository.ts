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

const isCurrentHarnessWorkspaceState = (value: unknown): value is HarnessWorkspaceState => {
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

/**
 * Reads saved Harness Generation storage. This is a development system:
 * storage at any version other than `HARNESS_GENERATION_SCHEMA_VERSION`, or
 * with an unrecognized shape, is reset to an empty workspace rather than
 * migrated. Every structural change to a persisted attempt, chapter, or
 * workspace field must bump that constant so stale local data is cleared
 * instead of silently accepted.
 */
export const readHarnessWorkspaceState = (value: unknown): HarnessWorkspaceState =>
  isCurrentHarnessWorkspaceState(value) ? cloneHarnessValue(value) : createEmptyHarnessWorkspaceState();
