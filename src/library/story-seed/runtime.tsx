import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from 'react';
import type { StorySeedRepository } from '@seihouse/sen/story-seed';
import type { StoryAuthAttempt } from '../../components/story-seed/development/StoryAuthGate';

export interface StoryCreationSnapshot {
  currentUser: { uid: string; displayName?: string } | null;
  activeAgentId: string | null;
  stories: Array<{ sourceSeedId?: string }>;
  isGenerating: boolean;
}

export interface StoryCreationRuntime {
  store: { getSnapshot(): StoryCreationSnapshot; subscribe(listener: () => void): () => void };
  repository: StorySeedRepository;
  /** Explicit host policy for guest workspaces. Omit to require sign-in. */
  guestOwnerId?: string;
  authorMarkUrl?: string;
  authenticate(attempt: StoryAuthAttempt): Promise<void>;
  /**
   * Meaning fingerprints (encoded, in order) for a few texts, from the host's
   * embedding model. Omit it and tag suggestions work from the genre and the
   * words of the synopsis alone.
   */
  fingerprintMeaning?(texts: readonly string[], signal?: AbortSignal): Promise<string[]>;
}

const StoryCreationContext = createContext<StoryCreationRuntime | null>(null);

export function StoryCreationProvider({ value, children }: PropsWithChildren<{ value: StoryCreationRuntime }>) {
  return <StoryCreationContext.Provider value={value}>{children}</StoryCreationContext.Provider>;
}

export function useStoryCreationRuntime() {
  const runtime = useContext(StoryCreationContext);
  if (!runtime) throw new Error('Library Story Seed requires a host StoryCreationProvider.');
  return runtime;
}

/** The runtime when there is one: for parts that still work without a host. */
export function useOptionalStoryCreationRuntime() {
  return useContext(StoryCreationContext);
}

export function useStoryCreationStore<T>(selector: (snapshot: StoryCreationSnapshot) => T): T {
  const { store } = useStoryCreationRuntime();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return selector(snapshot);
}
