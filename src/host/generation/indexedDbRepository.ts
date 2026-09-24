import { createEmptyHarnessWorkspaceState, isCurrentHarnessWorkspaceState, readHarnessWorkspaceState, HARNESS_GENERATION_SCHEMA_VERSION, type HarnessWorkspaceState, type HarnessGenerationRepository } from '@seihouse/sen/harness-generation';
const cloneHarnessValue = <T,>(value: T): T => structuredClone(value);
export const HARNESS_GENERATION_INDEXED_DB_NAME = 'seihouse-harness-generation-v1';
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'state';
export const PRESERVED_WORKSPACE_PREFIX = 'preserved:';

/** An untouched copy of a workspace this build could not read, kept instead of discarded. */
export interface PreservedHarnessWorkspace {
  preservedAt: string;
  reason: 'schema-version' | 'unreadable';
  schemaVersion: number | null;
  workspace: unknown;
}

export interface PreservedHarnessWorkspaceSummary {
  key: string;
  preservedAt: string;
  reason: PreservedHarnessWorkspace['reason'];
  schemaVersion: number | null;
  storyCount: number;
  chapterCount: number;
}

const countOf = (value: unknown, field: string) => {
  const list = value && typeof value === 'object' ? (value as Record<string, unknown>)[field] : undefined;
  return Array.isArray(list) ? list.length : 0;
};

/**
 * Decides what a load must write. Stored data the current schema cannot read
 * is reset for this build, but only together with a preserved copy of it.
 */
export function planHarnessWorkspaceLoad(stored: unknown, now: () => string = () => new Date().toISOString()): {
  state: HarnessWorkspaceState;
  preserve?: { key: string; record: PreservedHarnessWorkspace };
} {
  if (stored === undefined) return { state: createEmptyHarnessWorkspaceState() };
  if (isCurrentHarnessWorkspaceState(stored)) return { state: readHarnessWorkspaceState(stored) };
  const version = (stored as { schemaVersion?: unknown } | null)?.schemaVersion;
  const schemaVersion = typeof version === 'number' ? version : null;
  const preservedAt = now();
  return {
    state: createEmptyHarnessWorkspaceState(),
    preserve: {
      key: `${PRESERVED_WORKSPACE_PREFIX}v${schemaVersion ?? 'unknown'}:${preservedAt}`,
      record: {
        preservedAt,
        reason: schemaVersion !== null && schemaVersion !== HARNESS_GENERATION_SCHEMA_VERSION ? 'schema-version' : 'unreadable',
        schemaVersion,
        workspace: stored,
      },
    },
  };
}

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
    const plan = planHarnessWorkspaceLoad(stored);
    if (plan.preserve) {
      // The copy and the reset commit atomically: the reset never lands without it.
      const write = database.transaction(STORE_NAME, 'readwrite');
      const store = write.objectStore(STORE_NAME);
      store.add(plan.preserve.record, plan.preserve.key);
      store.put(cloneHarnessValue(plan.state), WORKSPACE_KEY);
      await transactionDone(write);
    }
    return plan.state;
  }

  async save(state: HarnessWorkspaceState): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(cloneHarnessValue(state), WORKSPACE_KEY);
    await transactionDone(transaction);
  }

  async listPreservedWorkspaces(): Promise<PreservedHarnessWorkspaceSummary[]> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const range = IDBKeyRange.bound(PRESERVED_WORKSPACE_PREFIX, `${PRESERVED_WORKSPACE_PREFIX}￿`);
    const [keys, records] = await Promise.all([
      requestResult(store.getAllKeys(range)),
      requestResult(store.getAll(range)) as Promise<PreservedHarnessWorkspace[]>,
    ]);
    await transactionDone(transaction);
    return keys.map((key, index) => ({
      key: String(key),
      preservedAt: records[index].preservedAt,
      reason: records[index].reason,
      schemaVersion: records[index].schemaVersion,
      storyCount: countOf(records[index].workspace, 'stories'),
      chapterCount: countOf(records[index].workspace, 'chapters'),
    }));
  }

  async readPreservedWorkspace(key: string): Promise<PreservedHarnessWorkspace | undefined> {
    if (!key.startsWith(PRESERVED_WORKSPACE_PREFIX)) return undefined;
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(key)) as PreservedHarnessWorkspace | undefined;
    await transactionDone(transaction);
    return record;
  }
}
