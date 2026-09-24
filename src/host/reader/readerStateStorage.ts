import { readReaderStoryState, type ReaderStateRepository, type ReaderStoryState } from '@seihouse/sen/reader-runtime';

export const READER_STATE_INDEXED_DB_NAME = 'seihouse-reader-state-v1';
const DATABASE_VERSION = 1;
const STORE_NAME = 'stories';

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Reader state could not be read.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error ?? new Error('Reader state could not be saved.'));
  transaction.onabort = () => reject(transaction.error ?? new Error('Reader state save was aborted.'));
});

/**
 * Durable Reader state, one record per story. Separate from the HARNESS
 * workspace so a HARNESS storage reset can never remove a reader's place,
 * bookmarks, or settings.
 */
export class IndexedDbReaderStateRepository implements ReaderStateRepository {
  private databasePromise?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('Saving your reading place requires IndexedDB, which is unavailable in this browser.'));
    }
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(READER_STATE_INDEXED_DB_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Reader state storage could not be opened.'));
      request.onblocked = () => reject(new Error('Reader state storage is blocked by another open tab. Close that tab and retry.'));
    });
    this.databasePromise.catch(() => { this.databasePromise = undefined; });
    return this.databasePromise;
  }

  async load(storyId: string): Promise<ReaderStoryState | undefined> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const stored = await requestResult(transaction.objectStore(STORE_NAME).get(storyId));
    await transactionDone(transaction);
    return readReaderStoryState(stored, storyId);
  }

  async save(state: ReaderStoryState): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(structuredClone(state), state.storyId);
    await transactionDone(transaction);
  }
}
