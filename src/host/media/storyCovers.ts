import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryCoverChoice, StoryCoverRequest, StoryCoverService } from '@seihouse/library/stories';

/** The cover art the host keeps for its stories, one image per story. */
export interface StoryCoverStore {
  loadAll(): Promise<Array<{ storyId: string; image: Blob }>>;
  save(storyId: string, image: Blob): Promise<void>;
}

/** Makes several cover images at once; `problem` says why any could not be made. */
export type StoryCoverMaker = (story: StoryCoverRequest, count: StoryCoverChoice) => Promise<{ images: Blob[]; problem?: string }>;

const DATABASE_VERSION = 1;
const STORE_NAME = 'covers';

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('The covers could not be read.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error ?? new Error('The cover could not be saved.'));
  transaction.onabort = () => reject(transaction.error ?? new Error('Saving the cover was aborted.'));
});

/**
 * Covers kept on this device, in their own IndexedDB database beside the
 * stories, until the database keeps them (R2) for an account.
 */
export class IndexedDbStoryCoverStore implements StoryCoverStore {
  private databasePromise?: Promise<IDBDatabase>;

  constructor(private readonly databaseName: string) {}

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Keeping covers requires IndexedDB, which is unavailable in this browser.'));
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('The covers could not be opened.'));
      request.onblocked = () => reject(new Error('The covers are blocked by another open tab. Close that tab and retry.'));
    });
    this.databasePromise.catch(() => { this.databasePromise = undefined; });
    return this.databasePromise;
  }

  async loadAll(): Promise<Array<{ storyId: string; image: Blob }>> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const [keys, values] = await Promise.all([requestResult(store.getAllKeys()), requestResult(store.getAll())]);
    await transactionDone(transaction);
    return keys.flatMap((key, index) => typeof key === 'string' && values[index] instanceof Blob ? [{ storyId: key, image: values[index] as Blob }] : []);
  }

  async save(storyId: string, image: Blob): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(image, storyId);
    await transactionDone(transaction);
  }
}

/** Covers held for the visit only: tests, and a browser without IndexedDB. */
export function createMemoryStoryCoverStore(): StoryCoverStore {
  const covers = new Map<string, Blob>();
  return {
    loadAll: async () => [...covers].map(([storyId, image]) => ({ storyId, image })),
    save: async (storyId, image) => { covers.set(storyId, image); },
  };
}

/**
 * The Library's cover service over the host's store and cover server. Covers
 * just made are shown through object URLs until the reader keeps one; the kept
 * cover is saved and shown through its own URL, released when it is replaced
 * or the page goes. A cover the device cannot keep is still shown for the visit.
 */
export function useStoryCovers(store: StoryCoverStore, maker: StoryCoverMaker): StoryCoverService {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const shown = useRef(new Map<string, string>());
  /** Covers made and not yet kept or let go, by their address. */
  const made = useRef(new Map<string, Blob>());
  const show = useCallback((storyId: string, image: Blob) => {
    const url = URL.createObjectURL(image);
    const previous = shown.current.get(storyId);
    if (previous) URL.revokeObjectURL(previous);
    shown.current.set(storyId, url);
    setUrls(Object.fromEntries(shown.current));
    return url;
  }, []);

  useEffect(() => {
    let active = true;
    void store.loadAll().then(covers => {
      // A cover made while the device was still opening its covers is the newer one.
      if (active) for (const cover of covers) if (!shown.current.has(cover.storyId)) show(cover.storyId, cover.image);
    }, () => undefined);
    return () => { active = false; };
  }, [store, show]);
  useEffect(() => {
    const urlsShown = shown.current;
    const urlsMade = made.current;
    return () => {
      for (const url of [...urlsShown.values(), ...urlsMade.keys()]) URL.revokeObjectURL(url);
      urlsShown.clear();
      urlsMade.clear();
    };
  }, []);

  const make = useCallback(async (_storyId: string, story: StoryCoverRequest, count: StoryCoverChoice) => {
    const { images, problem } = await maker(story, count);
    const madeUrls = images.map(image => {
      const url = URL.createObjectURL(image);
      made.current.set(url, image);
      return url;
    });
    return { urls: madeUrls, ...(problem ? { problem } : {}) };
  }, [maker]);

  const letGo = useCallback((madeUrls: readonly string[]) => {
    for (const url of madeUrls) {
      if (!made.current.delete(url)) continue;
      URL.revokeObjectURL(url);
    }
  }, []);

  const keep = useCallback(async (storyId: string, madeUrl: string) => {
    const image = made.current.get(madeUrl);
    if (!image) throw new Error('That cover is no longer here. Make it again.');
    try { await store.save(storyId, image); } catch { /* Shown for the visit; the device would not keep it. */ }
    show(storyId, image);
    letGo([madeUrl]);
  }, [store, show, letGo]);

  return useMemo(() => ({ coverUrl: (storyId: string) => urls[storyId], make, keep, letGo }), [urls, make, keep, letGo]);
}
