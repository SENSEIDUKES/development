import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from 'react';
import type { StorySeedRepository } from '@seihouse/sen/story-seed';
import type { StoryAuthAttempt } from '../../components/story-seed/development/StoryAuthGate';

export interface StoryCreationSnapshot {
  currentUser: { uid: string; displayName?: string } | null;
  activeAgentId: string | null;
  stories: Array<{ sourceSeedId?: string }>;
  routingConfig: { storyMaker?: { equippedRelicTitle?: string } };
  isGenerating: boolean;
}

export interface StoryCreationRuntime {
  store: { getSnapshot(): StoryCreationSnapshot; subscribe(listener: () => void): () => void };
  repository: StorySeedRepository;
  /** Explicit host policy for guest workspaces. Omit to require sign-in. */
  guestOwnerId?: string;
  authorMarkUrl?: string;
  authenticate(attempt: StoryAuthAttempt): Promise<void>;
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

export function useStoryCreationStore<T>(selector: (snapshot: StoryCreationSnapshot) => T): T {
  const { store } = useStoryCreationRuntime();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return selector(snapshot);
}
