/**
 * Workshop stubs for the Story Seed (`CreationModal`) replica.
 *
 * Every production dependency the copied presentation components import is
 * replaced here with a lightweight, fully local stand-in — same approach as
 * `reader-chamber/shared/stubs.ts`:
 *
 * - `useAppStore` — a tiny external store on `useSyncExternalStore` (no
 *   zustand), exposing `currentUser`, `activeAgentId`, `stories`,
 *   `routingConfig`, and `activeStoryId` with the same call signatures
 *   (`useAppStore(selector)` + `.getState()`).
 * - `selectIsGenerating` — matches `store/useGenerationStore`'s selector
 *   signature.
 * - `LOCAL_ONLY_MODE` — always `true` (no Firebase in the Workshop), so
 *   `CreationModal`'s auth-gated screen is reachable only via the
 *   `auth-gated` preview state, which forces it with a local override.
 * - `AGENTS` — just the `VERSA` profile object CreationModal/BlueprintReview
 *   render for the "VERSA is drafting…" generating state.
 * - `mockLogin` — stands in for `signInWithPopup(auth, new
 *   GoogleAuthProvider())`; flips the mock `currentUser` instead of opening
 *   real Google auth.
 * - `storySeedStorage` — in-memory replacements for
 *   `createStorySeed`/`updateStorySeed`/`listStorySeeds`/`importStorySeeds`
 *   (production talks to Postgres through `lib/persistence`). Genuinely
 *   mutates local state so Save/Import/Library-panel interactions work.
 * - `getApiHeaders` — inert stand-in for
 *   `hooks/storyEngineHelpers.getApiHeaders` (production reads API keys out
 *   of secure device storage); returns a plain JSON content-type header.
 * - `suggestTagsStub` — replaces the real `fetch('/api/suggest-tags', …)`
 *   call inside `CoreSeedForm` with a canned, genre-aware suggestion list
 *   after a short simulated delay. No network call is ever made.
 */

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { generateUUID } from './id';
import { normalizeStorySeedPayload } from './referenceIntake';
import type { IntakeData, StorySeed, StorySeedPayload } from './referenceIntake';

/**
 * Production reads this from `localStorage` once at module load and never
 * changes it without a page reload (`setLocalOnlyMode` there calls
 * `window.location.reload()`). The Workshop needs a live toggle instead so
 * the `auth-gated` preview state can faithfully reach `CreationModal`'s
 * `!currentUser && !LOCAL_ONLY_MODE` branch without a real reload — so this
 * is a mutable `let` with a setter, not the frozen `true` reader-chamber
 * uses. Every other preview state keeps it `true` (no auth gate, matching
 * reader-chamber's precedent).
 */
export let LOCAL_ONLY_MODE = true;

export function setMockLocalOnlyMode(enabled: boolean) {
  LOCAL_ONLY_MODE = enabled;
}

// ─── Agents (VERSA profile only) ─────────────────────────────────────────────

export interface AgentProfile {
  id: 'versa' | 'scout';
  name: string;
  title: string;
  purpose: string;
  role: string;
  logoUrl: string;
  colorClass: string;
}

export const AGENTS = {
  VERSA: {
    id: 'versa',
    name: 'VERSA',
    title: 'The Writer',
    purpose: 'Language / lyrics',
    role: 'Wordsmith. Drafts, rewrites, sharpens phrasing.',
    logoUrl: 'https://images.seihouse.org/AGENT%20EMBLEM/Versa/VERSA_OFFICAL.png',
    colorClass: 'text-human',
  } as AgentProfile,
};

// ─── Mock app store ──────────────────────────────────────────────────────────

export interface MockUser {
  uid: string;
  /** Optional display metadata; never substitute the account id for a creator name. */
  displayName?: string;
}

export interface MockStoryRef {
  id: string;
  sourceSeedId?: string;
  genre?: string;
  intake?: { genrePath?: string };
}

export interface MockAppState {
  currentUser: MockUser | null;
  activeAgentId: string | null;
  stories: MockStoryRef[];
  activeStoryId: string | null;
  routingConfig: { storyMaker?: Record<string, unknown> };
  isGenerating: boolean;
}

export const createInitialMockState = (overrides: Partial<MockAppState> = {}): MockAppState => ({
  currentUser: null,
  activeAgentId: null,
  stories: [],
  activeStoryId: null,
  routingConfig: { storyMaker: {} },
  isGenerating: false,
  ...overrides,
});

type Listener = () => void;
const listeners = new Set<Listener>();
let state: MockAppState = createInitialMockState();

const emit = () => {
  listeners.forEach(listener => listener());
};

export function setMockState(partial: Partial<MockAppState>) {
  state = { ...state, ...partial };
  emit();
}

export function resetMockState(overrides: Partial<MockAppState> = {}) {
  state = createInitialMockState(overrides);
  emit();
}

const mockActions = {
  setActiveAgentId: (activeAgentId: string | null) => setMockState({ activeAgentId }),
  setIsGenerating: (isGenerating: boolean) => setMockState({ isGenerating }),
};

export type MockAppStore = MockAppState & typeof mockActions;

const haveShallowEqualValues = (previous: unknown, next: unknown): boolean => {
  if (Object.is(previous, next)) return true;
  if (
    previous === null || next === null
    || typeof previous !== 'object' || typeof next !== 'object'
  ) return false;

  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const previousKeys = Object.keys(previousRecord);
  const nextKeys = Object.keys(nextRecord);
  return previousKeys.length === nextKeys.length
    && previousKeys.every(key => Object.prototype.hasOwnProperty.call(nextRecord, key)
      && Object.is(previousRecord[key], nextRecord[key]));
};

function useAppStoreBase(): MockAppStore;
function useAppStoreBase<T>(selector: (store: MockAppStore) => T): T;
function useAppStoreBase<T>(selector?: (store: MockAppStore) => T): T | MockAppStore {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const selectionRef = useRef<{ value: T | MockAppStore } | null>(null);
  const getSnapshot = useCallback(() => {
    const store = { ...state, ...mockActions } as MockAppStore;
    const nextSelection = selectorRef.current
      ? selectorRef.current(store)
      : store;
    if (selectionRef.current && haveShallowEqualValues(selectionRef.current.value, nextSelection)) {
      return selectionRef.current.value;
    }
    selectionRef.current = { value: nextSelection };
    return nextSelection;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot) as T | MockAppStore;
}

/** Zustand-shaped stand-in for `store/useAppStore` (selector + getState). */
export const useAppStore = Object.assign(useAppStoreBase, {
  getState: (): MockAppStore => ({ ...state, ...mockActions }),
});

/** Stand-in for `store/useGenerationStore`'s `selectIsGenerating`. */
export const selectIsGenerating = (store: { isGenerating?: boolean }) =>
  Boolean(store?.isGenerating);

// ─── Mock login (stands in for signInWithPopup + GoogleAuthProvider) ────────

export async function mockLogin(): Promise<void> {
  setMockState({ currentUser: { uid: 'mock-user-workshop', displayName: 'Workshop Creator' } });
}

// ─── Inert API headers (stands in for hooks/storyEngineHelpers.getApiHeaders) ──

export async function getApiHeaders(): Promise<Record<string, string>> {
  return { 'Content-Type': 'application/json' };
}

// ─── Tag suggestion stub (stands in for fetch('/api/suggest-tags', …)) ──────

const GENRE_TAG_HINTS: Record<string, string[]> = {
  Xianxia: ['cultivation realms', 'sect politics', 'dao comprehension'],
  Xuanhuan: ['bloodline awakening', 'martial techniques', 'tribulation events'],
  'LitRPG / System': ['game systems', 'level progression', 'system rewards'],
  'Academy Cultivation': ['academy cultivation', 'exam arcs', 'rival schools'],
  'Kingdom Building': ['kingdom building', 'territory control', 'resource management'],
};

/** Genre-aware canned response — never calls `/api/suggest-tags`. */
export async function suggestTagsStub(
  intake: Pick<IntakeData, 'corePremise' | 'genrePath'>,
): Promise<{ suggestedTags: string[]; reasoning: string }> {
  await new Promise(resolve => setTimeout(resolve, 400));
  const genreHints = GENRE_TAG_HINTS[intake.genrePath || ''] || ['fate bonds', 'sect politics', 'cultivation realms'];
  return {
    suggestedTags: genreHints,
    reasoning: `Workshop mock recommendation based on the "${intake.genrePath || 'Xianxia'}" genre path. No live model call was made.`,
  };
}

// ─── Story seed storage (in-memory; stands in for lib/storySeedStorage) ─────

let mockSeeds: StorySeed[] = [];

const buildMockSeed = (
  userId: string,
  id: string,
  payload: StorySeedPayload,
  createdAt = new Date().toISOString(),
): StorySeed => {
  const normalized = normalizeStorySeedPayload(payload);
  return {
    schemaVersion: 1,
    id,
    userId,
    title: normalized.blueprint.title || normalized.intake.novelTitle || 'Untitled Seed',
    intake: normalized.intake,
    blueprint: normalized.blueprint,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
};

const requireMockUid = (): string => {
  const uid = state.currentUser?.uid;
  if (!uid) throw new Error('Sign in to save story seeds to your account.');
  return uid;
};

export async function createStorySeed(payload: StorySeedPayload): Promise<StorySeed> {
  const userId = requireMockUid();
  const seed = buildMockSeed(userId, `seed-${generateUUID()}`, payload);
  mockSeeds = [seed, ...mockSeeds];
  return seed;
}

export async function updateStorySeed(existingSeed: StorySeed, payload: StorySeedPayload): Promise<StorySeed> {
  const userId = requireMockUid();
  if (existingSeed.userId !== userId) {
    throw new Error('Cannot update a story seed owned by another account.');
  }
  const updated = buildMockSeed(userId, existingSeed.id, payload, existingSeed.createdAt);
  mockSeeds = mockSeeds.map(seed => (seed.id === updated.id ? updated : seed));
  return updated;
}

export async function listStorySeeds(): Promise<StorySeed[]> {
  const userId = state.currentUser?.uid;
  if (!userId) return [];
  return mockSeeds
    .filter(seed => seed.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function importStorySeeds(payloads: StorySeedPayload[]): Promise<StorySeed[]> {
  if (payloads.length === 0) return [];
  const userId = requireMockUid();
  const saved = payloads.map(payload => buildMockSeed(userId, `seed-${generateUUID()}`, payload));
  mockSeeds = [...saved, ...mockSeeds];
  return saved;
}

/** Workshop-only reset hook so the preview can clear the seed library between scenarios. */
export function resetMockSeeds(seeds: StorySeed[] = []) {
  mockSeeds = seeds;
}
