import { cloneHarnessValue } from './ids';
import {
  HARNESS_GENERATION_SCHEMA_VERSION,
  type HarnessWorkspaceState,
} from './types';

export const HARNESS_GENERATION_INDEXED_DB_NAME = 'seihouse-harness-generation-v1';
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'state';

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
    && Array.isArray(candidate.batches);
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

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Harness Generation storage request failed.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error ?? new Error('Harness Generation storage write failed.'));
  transaction.onabort = () => reject(transaction.error ?? new Error('Harness Generation storage write was aborted.'));
});

export class IndexedDbHarnessGenerationRepository implements HarnessGenerationRepository {
  private databasePromise?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('Harness Generation requires IndexedDB, which is unavailable in this browser.'));
    }
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(HARNESS_GENERATION_INDEXED_DB_NAME, HARNESS_GENERATION_SCHEMA_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Harness Generation could not open IndexedDB.'));
      request.onblocked = () => reject(new Error('Harness Generation storage is blocked by another open tab. Close that tab and retry.'));
    });
    return this.databasePromise;
  }

  async load(): Promise<HarnessWorkspaceState> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const stored = await requestResult(transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY));
    await transactionDone(transaction);
    if (stored === undefined) return createEmptyHarnessWorkspaceState();
    const current = readHarnessWorkspaceState(stored);
    if ((stored as { schemaVersion?: number }).schemaVersion !== HARNESS_GENERATION_SCHEMA_VERSION) {
      // Stale-version or malformed storage was reset above; persist the
      // reset so a later load sees the current empty workspace directly.
      await this.save(current);
    }
    return current;
  }

  async save(state: HarnessWorkspaceState): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(cloneHarnessValue(state), WORKSPACE_KEY);
    await transactionDone(transaction);
  }
}

/** Test-only repository port; it models reload by retaining one durable snapshot. */
export class InMemoryHarnessGenerationRepository implements HarnessGenerationRepository {
  private state: HarnessWorkspaceState;
  private pendingFailures: Error[] = [];

  constructor(initial: HarnessWorkspaceState = createEmptyHarnessWorkspaceState()) {
    this.state = readHarnessWorkspaceState(initial);
  }

  failNextSave(error = new Error('Simulated Harness Generation persistence failure.')) {
    this.pendingFailures.push(error);
  }

  async load(): Promise<HarnessWorkspaceState> {
    return cloneHarnessValue(this.state);
  }

  async save(state: HarnessWorkspaceState): Promise<void> {
    const failure = this.pendingFailures.shift();
    if (failure) throw failure;
    this.state = cloneHarnessValue(state);
  }

  snapshot(): HarnessWorkspaceState {
    return cloneHarnessValue(this.state);
  }
}
