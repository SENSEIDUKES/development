/**
 * The reader's profile record on this device, for a host with no account
 * server yet (the NovelExpanded app, until its database). It holds what the
 * Cave edits (the Dao Name and its aura, the languages, the default Reading
 * Mode, the equipped Familiar and its size) in the host's device preferences,
 * and is the one place every surface reads them from: the Cave, the floating
 * Familiar and the writing veil's Familiar, and Create's defaults.
 *
 * Balances, rewards and Familiar ownership are never here: they belong to the
 * Library economy's own ledgers.
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_SEN_LANGUAGE_CODE, normalizeSenLanguageCode } from '@seihouse/sen/contracts';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import type { UserProfile } from '@seihouse/library/profile';
import { defaultFamiliar } from '../familiar/catalogue';

/** Where the record is kept among the host's device preferences. */
export const DEVICE_PROFILE_KEY = 'profile';

export interface DeviceProfileStore {
  /** The record, the same object until it changes. A device with none gets a new one, saved at once. */
  read(): UserProfile;
  /** Saves the changed fields (never the account's identity) and tells every reader. */
  save(changes: Partial<UserProfile>): UserProfile;
  subscribe(listener: () => void): () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);

/**
 * The saved record, read defensively: missing or damaged fields take the new
 * reader's values, and the account's identity is always this device's reader.
 */
function restore(raw: string | null, fresh: UserProfile): UserProfile {
  let saved: unknown;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  if (!isRecord(saved)) return fresh;
  const record = { ...fresh, ...saved } as UserProfile;
  return {
    ...record,
    uid: fresh.uid,
    role: fresh.role,
    username: text(saved.username, fresh.username),
    displayName: text(saved.displayName, fresh.displayName),
    avatarUrl: text(saved.avatarUrl, fresh.avatarUrl),
    interfaceLanguage: normalizeSenLanguageCode(record.interfaceLanguage),
    defaultReadingLanguage: normalizeSenLanguageCode(record.defaultReadingLanguage),
    familiarSize: typeof saved.familiarSize === 'number' && Number.isFinite(saved.familiarSize) ? saved.familiarSize : undefined,
    activeStories: Array.isArray(saved.activeStories) ? record.activeStories : [],
    inactiveStories: Array.isArray(saved.inactiveStories) ? record.inactiveStories : [],
    joinedDate: text(saved.joinedDate, fresh.joinedDate),
    updatedAt: text(saved.updatedAt, fresh.updatedAt),
  };
}

export function createDeviceProfileStore({ storage, uid, now = () => new Date() }: {
  storage: ReaderPreferenceStorage;
  /** The device reader's account id, the same one the economy and Story Seeds use. */
  uid: string;
  now?: () => Date;
}): DeviceProfileStore {
  const listeners = new Set<() => void>();
  let current: UserProfile | undefined;
  const write = (record: UserProfile) => {
    current = record;
    try {
      storage.write(DEVICE_PROFILE_KEY, JSON.stringify(record));
    } catch {
      // Device storage is advisory: the record still holds for the visit.
    }
  };
  const read = (): UserProfile => {
    if (current) return current;
    const created = now().toISOString();
    const fresh: UserProfile = {
      uid,
      username: '',
      displayName: '',
      avatarUrl: '',
      familiarId: defaultFamiliar.definition.id,
      interfaceLanguage: DEFAULT_SEN_LANGUAGE_CODE,
      defaultReadingLanguage: DEFAULT_SEN_LANGUAGE_CODE,
      savedStoryCount: 0,
      activeStories: [],
      inactiveStories: [],
      joinedDate: created,
      updatedAt: created,
      role: 'user',
    };
    let raw: string | null = null;
    try {
      raw = storage.read(DEVICE_PROFILE_KEY);
    } catch {
      raw = null;
    }
    const restored = restore(raw, fresh);
    if (raw === null) write(restored);
    else current = restored;
    return current ?? restored;
  };
  return {
    read,
    save(changes) {
      // The account's identity and authority are never the reader's to edit.
      const editable: Partial<UserProfile> = { ...changes };
      delete editable.uid;
      delete editable.role;
      const next = { ...read(), ...editable, updatedAt: now().toISOString() };
      write(next);
      listeners.forEach(listener => listener());
      return next;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** The device reader's profile record, kept current as it is saved. */
export function useDeviceProfile(store: DeviceProfileStore): UserProfile {
  return useSyncExternalStore(store.subscribe, store.read, store.read);
}
