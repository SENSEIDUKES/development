import { cloneHarnessValue, stableHarnessId } from './ids';
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

type LegacyWorkspaceState = Omit<HarnessWorkspaceState,
  'schemaVersion' | 'capabilityReceipts' | 'canonicalRecords' | 'projections' | 'corrections' | 'batches'
> & { schemaVersion: 1 };

export const migrateHarnessWorkspaceState = (value: unknown): HarnessWorkspaceState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Harness Generation storage is unreadable. Restore a local export or clear this feature’s local data.');
  }
  const candidate = value as Partial<HarnessWorkspaceState> & { schemaVersion?: number };
  if (
    ![1, HARNESS_GENERATION_SCHEMA_VERSION].includes(candidate.schemaVersion ?? -1)
    || !Array.isArray(candidate.stories)
    || !Array.isArray(candidate.foundations)
    || !Array.isArray(candidate.attempts)
    || !Array.isArray(candidate.chapters)
    || !Array.isArray(candidate.events)
  ) {
    throw new Error('Harness Generation storage has an unsupported version or shape. Restore a local export before continuing.');
  }
  if (candidate.schemaVersion === HARNESS_GENERATION_SCHEMA_VERSION) {
    if (
      !Array.isArray(candidate.capabilityReceipts)
      || !Array.isArray(candidate.canonicalRecords)
      || !Array.isArray(candidate.projections)
      || !Array.isArray(candidate.corrections)
      || !Array.isArray(candidate.batches)
    ) throw new Error('Harness Generation storage has an unsupported Phase 3 shape. Restore a local export before continuing.');
    return cloneHarnessValue(candidate as HarnessWorkspaceState);
  }

  const legacy = cloneHarnessValue(candidate as unknown as LegacyWorkspaceState);
  const migratedAt = new Date().toISOString();
  return {
    ...legacy,
    schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION,
    capabilityReceipts: legacy.events.map(event => ({
      id: stableHarnessId('hcr', event.id, 'legacy-unresolved'),
      storyId: event.storyId,
      chapterId: event.chapterId,
      sourceEventId: event.id,
      capabilityId: 'general-narrative-event',
      capabilityVersion: 'phase-2-unprocessed',
      status: 'unresolved',
      canonicalRecordIds: [],
      projectionIntentIds: [],
      warnings: ['This Phase 2 event remains preserved and awaits deterministic replay.'],
      unresolvedReferences: [],
      processedAt: migratedAt,
      replayCount: 0,
    })),
    canonicalRecords: [],
    projections: [],
    corrections: [],
    batches: [],
  };
};

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
    const migrated = migrateHarnessWorkspaceState(stored);
    if ((stored as { schemaVersion?: number }).schemaVersion !== HARNESS_GENERATION_SCHEMA_VERSION) {
      await this.save(migrated);
    }
    return migrated;
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

  constructor(initial: HarnessWorkspaceState | LegacyWorkspaceState = createEmptyHarnessWorkspaceState()) {
    this.state = migrateHarnessWorkspaceState(initial);
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
