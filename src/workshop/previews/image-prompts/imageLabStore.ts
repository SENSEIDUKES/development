import type { ImageLabAspectRatio } from '../../../server/image-lab/limits';

/** One kept result, including the exact prompt and settings that made it. */
export interface SavedLabImage {
  id: string;
  blob: Blob;
  prompt: string;
  shape: ImageLabAspectRatio;
  model: string;
  modelLabel: string;
  seconds: number;
  madeAt: string;
  attachmentName?: string;
}

export interface ImageLabStore {
  loadAll(): Promise<SavedLabImage[]>;
  save(image: SavedLabImage): Promise<void>;
  remove(id: string): Promise<void>;
}

type StoredImage = Omit<SavedLabImage, 'blob'> & { bytes: ArrayBuffer; mimeType: string };
const DATABASE_NAME = 'seihouse-workshop-image-lab-v1';
const STORE_NAME = 'images';

const completed = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = transaction.onabort = () => reject(transaction.error ?? new Error('The saved images could not be updated.'));
});

/** Workshop-only device storage, following the host's IndexedDB media pattern. */
export class IndexedDbImageLabStore implements ImageLabStore {
  private databasePromise?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Saving images needs browser storage. You can still download your results.'));
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('The saved images could not be opened.'));
      request.onblocked = () => reject(new Error('Close other Image Prompts tabs, then reload to open saved images.'));
    });
    this.databasePromise.catch(() => { this.databasePromise = undefined; });
    return this.databasePromise;
  }

  async loadAll(): Promise<SavedLabImage[]> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const done = completed(transaction);
    const request = transaction.objectStore(STORE_NAME).getAll();
    // The transaction owns both read errors and completion.
    await done;
    return (request.result as StoredImage[]).map(({ bytes, mimeType, ...image }) => ({
      ...image, blob: new Blob([bytes], { type: mimeType }),
    })).sort((a, b) => b.madeAt.localeCompare(a.madeAt));
  }

  async save(image: SavedLabImage): Promise<void> {
    // Bytes also work in WebKit implementations that cannot clone a Blob into IndexedDB.
    const { blob, ...metadata } = image;
    const bytes = await blob.arrayBuffer();
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const done = completed(transaction);
    transaction.objectStore(STORE_NAME).put({ ...metadata, bytes, mimeType: blob.type } satisfies StoredImage);
    await done;
  }

  async remove(id: string): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const done = completed(transaction);
    transaction.objectStore(STORE_NAME).delete(id);
    await done;
  }
}

export const imageExtension = (blob: Blob) => blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
