/**
 * Workshop stand-ins for the Story Seed preview runtime.
 *
 * - `useAppStore` — a tiny external store on `useSyncExternalStore` (no
 *   zustand), exposing `currentUser`, `activeAgentId`, `stories`,
 *   `routingConfig`, and `activeStoryId` (`useAppStore(selector)` +
 *   `.getState()`).
 * - `selectIsGenerating` — the generation-store selector signature.
 * - `LOCAL_ONLY_MODE` — `true` unless the `auth-gated` preview state turns it
 *   off with a local override.
 * - `AGENTS` — the `VERSA` profile shown beside the generating state.
 * - `mockLogin` — flips the mock `currentUser` instead of opening real auth.
 */

import { useCallback, useRef, useSyncExternalStore } from 'react';

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
  state = { ...state };
  emit();
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

/** Stable external-store snapshot for the explicit Workshop host adapter. */
export const storyCreationPreviewStore = {
  getSnapshot: () => state,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
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

