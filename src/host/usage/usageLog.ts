import { useSyncExternalStore } from 'react';
import { gradedEnergyPrice, liveTalkEnergy } from '@seihouse/library/energy';

/**
 * What this device asked the models to make: one entry per chapter, story
 * upkeep call, Blueprint, image and live conversation, with the model and the
 * provider's own counts. Kept only in this browser, for 90 days; the Usage
 * page reads it. Chapter narration is not recorded yet: add a kind here when
 * that pipeline is finished.
 */
export type UsageKind = 'chapter' | 'story-upkeep' | 'blueprint' | 'image' | 'live';

export interface UsageEntry {
  /** When it was made, in milliseconds since 1970. */
  at: number;
  kind: UsageKind;
  /** The Model Router's model id, when known. */
  model?: string;
  /** For story upkeep: which step (Tagging, Arc planning, Holdings, Looks). */
  task?: string;
  inputTokens?: number;
  outputTokens?: number;
  /** Live talk: how long the conversation lasted. */
  seconds?: number;
}

export const USAGE_STORAGE_KEY = 'seihouse.usage.v1';
const KEEP_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_ENTRIES = 5_000;

const listeners = new Set<() => void>();
let cache: { raw: string | null; entries: UsageEntry[] } | undefined;

const storage = (): Storage | undefined => {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
};

const isEntry = (value: unknown): value is UsageEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<UsageEntry>;
  return typeof entry.at === 'number' && ['chapter', 'story-upkeep', 'blueprint', 'image', 'live'].includes(entry.kind as string);
};

/** Every kept entry, oldest first. */
export function readUsage(): UsageEntry[] {
  const store = storage();
  let raw: string | null = null;
  try { raw = store?.getItem(USAGE_STORAGE_KEY) ?? null; } catch { /* unreadable: empty */ }
  if (cache && cache.raw === raw) return cache.entries;
  let entries: UsageEntry[] = [];
  try { const parsed: unknown = raw ? JSON.parse(raw) : []; if (Array.isArray(parsed)) entries = parsed.filter(isEntry); } catch { /* damaged: start again */ }
  cache = { raw, entries };
  return entries;
}

/** Adds one entry. Never throws: a full or blocked storage only loses the record. */
export function recordUsage(entry: Omit<UsageEntry, 'at'> & { at?: number }): void {
  const store = storage();
  if (!store) return;
  const at = entry.at ?? Date.now();
  const kept = readUsage().filter(item => at - item.at < KEEP_MS);
  const clean = Object.fromEntries(Object.entries({ ...entry, at }).filter(([, value]) => value !== undefined)) as unknown as UsageEntry;
  const next = [...kept, clean].slice(-MAX_ENTRIES);
  try { store.setItem(USAGE_STORAGE_KEY, JSON.stringify(next)); } catch { return; }
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === USAGE_STORAGE_KEY) listener(); };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
};

const EMPTY: UsageEntry[] = [];

/** The kept entries, updating as new ones are recorded (here or in another tab). */
export const useUsageLog = (): UsageEntry[] => useSyncExternalStore(subscribe, readUsage, () => EMPTY);

/**
 * The Energy one entry costs at the Library's grade prices. Story upkeep is
 * part of the chapter (0). A Blueprint costs a chapter's price, as Create
 * shows on its button.
 */
export function usageEnergy(entry: UsageEntry): number {
  switch (entry.kind) {
    case 'chapter':
    case 'blueprint': return gradedEnergyPrice('chapter', entry.model);
    case 'image': return gradedEnergyPrice('image', entry.model);
    case 'live': return liveTalkEnergy(entry.model, entry.seconds ?? 0);
    case 'story-upkeep': return 0;
  }
}
