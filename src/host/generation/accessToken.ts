/**
 * The owner's Development access token, saved on this device. It unlocks World
 * Blueprints and lifts the chapter limit (6 every 30 minutes for a visitor
 * without it). The app and the Workshop share it.
 */
export const DEVELOPMENT_ACCESS_TOKEN_KEY = 'seihouse-development-access-token';

export interface AccessTokenStore {
  current: string | undefined;
}

/** Saved in this browser; held in memory alone when storage is unavailable. */
export const createSavedAccessToken = (storageKey = DEVELOPMENT_ACCESS_TOKEN_KEY): AccessTokenStore => {
  let memory: string | undefined;
  return {
    get current() {
      try {
        return globalThis.localStorage?.getItem(storageKey) || memory;
      } catch {
        return memory;
      }
    },
    set current(value: string | undefined) {
      memory = value?.trim() || undefined;
      try {
        if (memory) globalThis.localStorage?.setItem(storageKey, memory);
        else globalThis.localStorage?.removeItem(storageKey);
      } catch {
        // Kept in memory for this visit.
      }
    },
  };
};
