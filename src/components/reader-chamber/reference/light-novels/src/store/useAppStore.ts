/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/store/useAppStore.ts` (Light-Novels main @ 647165a) builds
 * the whole application's state from five zustand slices and persists stories
 * through IndexedDB and Firebase. This stand-in keeps the same path and the
 * same `useAppStore` export, so the copied Reader files import it unchanged,
 * but it holds only the fields the Reader, Codex and keyboard shortcuts read,
 * in memory, with the same setter behavior as the production slices.
 *
 * The hook follows zustand v5: `useAppStore()` returns the whole state,
 * `useAppStore(selector)` re-renders on that selection, and `getState`,
 * `setState`, `subscribe` and `getInitialState` hang off the hook.
 */
import { useSyncExternalStore } from 'react';
import type {
  AppUser,
  CosmicArtifact,
  MultiModelRouting,
  Story,
  StoryUpdateOptions,
  StreamingChapter,
  UserProfile,
} from '../types';

export type AppScreen =
  | 'home'
  | 'detail'
  | 'reader'
  | 'codex'
  | 'creator'
  | 'profile'
  | 'pricing'
  | 'challenge'
  | 'sects';

export type ReaderMode = 'teleprompter' | 'sen' | 'basic-tts';

export interface ImmersionState {
  master: boolean;
  imagePopups: boolean;
  autoScroll: boolean;
}

/** Mirrors production's `ActiveGenerationRun`; the Workshop sets it to show a run in flight. */
export interface ActiveGenerationRun {
  runId: string;
  authSessionGeneration: number;
  userId: string | null;
  operation: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover';
  storyId: string | null;
  chapterNumber: number | null;
  startedAt: string;
}

export interface AppState {
  // Story slice
  stories: Story[];
  activeStoryId: string | null;
  appError: string | null;
  setStories: (stories: Story[]) => void;
  setActiveStoryId: (id: string | null) => void;
  setAppError: (error: string | null) => void;
  saveStories: (updated: Story[] | ((current: Story[]) => Story[])) => Promise<void>;
  updateStory: (
    storyId: string,
    updates: Partial<Story> | ((current: Story) => Partial<Story>),
    options?: StoryUpdateOptions,
  ) => Promise<void>;

  // UI slice
  currentScreen: AppScreen;
  selectedChapterNum: number;
  nexusTab: 'reader' | 'codex' | 'memory';
  isSettingsOpen: boolean;
  isCodexSheetOpen: boolean;
  isReaderFullscreen: boolean;
  isShortcutsOpen: boolean;
  routingConfig: MultiModelRouting;
  readerMode: ReaderMode;
  immersion: ImmersionState;
  autoPlayNarration: boolean;
  pendingRelicQueue: CosmicArtifact[];
  canShowRelicInReader: boolean;
  setCurrentScreen: (screen: AppScreen) => void;
  setSelectedChapterNum: (num: number) => void;
  setNexusTab: (tab: 'reader' | 'codex' | 'memory') => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsCodexSheetOpen: (isOpen: boolean) => void;
  setIsReaderFullscreen: (isFull: boolean) => void;
  setIsShortcutsOpen: (isOpen: boolean) => void;
  setRoutingConfig: (config: MultiModelRouting) => void;
  setReaderMode: (mode: ReaderMode) => void;
  setImmersion: (immersion: Partial<ImmersionState>) => void;
  setAutoPlayNarration: (autoPlay: boolean) => void;
  enqueueRelicReveal: (artifact: CosmicArtifact) => void;
  popPendingRelic: () => CosmicArtifact | null;
  setCanShowRelicInReader: (allowed: boolean) => void;

  // Generation slice
  streamingChapter: StreamingChapter | null;
  activeAgentId: 'versa' | 'scout' | null;
  activeGenerationRun: ActiveGenerationRun | null;

  // Auth slice
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  setCurrentUser: (user: AppUser | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
}

type Listener = (state: AppState, previous: AppState) => void;
type StatePatch = Partial<AppState> | ((state: AppState) => Partial<AppState>);

const listeners = new Set<Listener>();
let state: AppState;

function setState(patch: StatePatch, replace = false): void {
  const next = typeof patch === 'function' ? patch(state) : patch;
  if (Object.is(next, state)) return;
  const previous = state;
  state = replace ? (next as AppState) : { ...state, ...next };
  listeners.forEach((listener) => listener(state, previous));
}

function getState(): AppState {
  return state;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The production defaults from `createUISlice`, `createGenerationSlice` and `createAuthSlice`. */
function createInitialState(): AppState {
  return {
    stories: [],
    activeStoryId: null,
    appError: null,
    setStories: (stories) => setState({ stories }),
    setActiveStoryId: (id) => setState({ activeStoryId: id }),
    setAppError: (error) => setState({ appError: error }),
    saveStories: async (updated) => {
      setState((current) => ({
        stories: typeof updated === 'function' ? updated(current.stories) : updated,
      }));
    },
    updateStory: (storyId, updates, options) => {
      const markEdited = options?.markEdited !== false;
      const touchUpdatedAt = options?.touchUpdatedAt === true;
      return state.saveStories((current) => current.map((story) => {
        if (story.id !== storyId) return story;
        const patch = typeof updates === 'function' ? updates(story) : updates;
        return {
          ...story,
          ...patch,
          ...(markEdited ? { isEdited: true } : {}),
          ...(touchUpdatedAt ? { updatedAt: new Date().toISOString() } : {}),
        };
      }));
    },

    currentScreen: 'reader',
    selectedChapterNum: 1,
    nexusTab: 'reader',
    isSettingsOpen: false,
    isCodexSheetOpen: false,
    isReaderFullscreen: false,
    isShortcutsOpen: false,
    routingConfig: {
      storyMaker: { provider: 'gemini', model: 'google/gemini-3.1-flash-lite' },
      imageGenerator: { provider: 'gemini', model: 'gemini-3.1-flash-lite-image' },
    },
    readerMode: 'teleprompter',
    immersion: { master: true, imagePopups: true, autoScroll: true },
    autoPlayNarration: false,
    pendingRelicQueue: [],
    canShowRelicInReader: true,
    setCurrentScreen: (screen) => setState({ currentScreen: screen }),
    setSelectedChapterNum: (num) => setState({ selectedChapterNum: num }),
    setNexusTab: (tab) => setState({ nexusTab: tab }),
    setIsSettingsOpen: (isOpen) => setState({ isSettingsOpen: isOpen }),
    setIsCodexSheetOpen: (isOpen) => setState({ isCodexSheetOpen: isOpen }),
    setIsReaderFullscreen: (isFull) => setState({ isReaderFullscreen: isFull }),
    setIsShortcutsOpen: (isOpen) => setState({ isShortcutsOpen: isOpen }),
    setRoutingConfig: (config) => setState({ routingConfig: config }),
    setReaderMode: (mode) => setState({ readerMode: mode }),
    setImmersion: (immersion) => setState((current) => ({
      immersion: { ...current.immersion, ...immersion },
    })),
    setAutoPlayNarration: (autoPlayNarration) => setState({ autoPlayNarration }),
    enqueueRelicReveal: (artifact) => setState((current) => ({
      pendingRelicQueue: [...current.pendingRelicQueue, artifact],
    })),
    popPendingRelic: () => {
      const [first, ...rest] = state.pendingRelicQueue;
      if (first === undefined) return null;
      setState({ pendingRelicQueue: rest });
      return first;
    },
    setCanShowRelicInReader: (allowed) => setState({ canShowRelicInReader: allowed }),

    streamingChapter: null,
    activeAgentId: null,
    activeGenerationRun: null,

    currentUser: null,
    userProfile: null,
    setCurrentUser: (user) => setState({ currentUser: user }),
    setUserProfile: (profile) => setState({ userProfile: profile }),
  };
}

state = createInitialState();
const initialState = state;

interface AppStoreHook {
  (): AppState;
  <T>(selector: (state: AppState) => T): T;
  getState: () => AppState;
  getInitialState: () => AppState;
  setState: (patch: StatePatch, replace?: boolean) => void;
  subscribe: (listener: Listener) => () => void;
}

const selectAll = (current: AppState) => current;

export const useAppStore = (<T>(selector?: (state: AppState) => T) => {
  const select = (selector ?? selectAll) as (state: AppState) => T;
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(initialState),
  );
}) as AppStoreHook;

useAppStore.getState = getState;
useAppStore.getInitialState = () => initialState;
useAppStore.setState = setState;
useAppStore.subscribe = subscribe;

/**
 * Workshop only: start a fresh mock session. Production code never calls
 * this; the Reader Chamber preview uses it to load its story and scenario.
 */
export function resetWorkshopAppState(overrides: Partial<AppState> = {}): void {
  setState({ ...createInitialState(), ...overrides }, true);
}
