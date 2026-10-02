import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';

/**
 * A host's reader preferences (narration voices and speed) in the browser's
 * local storage, under one prefix so different hosts never share them.
 * Preferences are advisory: storage that is blocked or full reads as empty
 * and never fails the Reader.
 */
export function createLocalReaderPreferenceStorage(
  prefix: string,
  storage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined = () => globalThis.localStorage,
): ReaderPreferenceStorage {
  return {
    read: key => { try { return storage()?.getItem(`${prefix}${key}`) ?? null; } catch { return null; } },
    write: (key, value) => { try { storage()?.setItem(`${prefix}${key}`, value); } catch { /* advisory */ } },
    remove: key => { try { storage()?.removeItem(`${prefix}${key}`); } catch { /* advisory */ } },
  };
}
