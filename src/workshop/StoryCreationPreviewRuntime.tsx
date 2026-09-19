import { useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { StoryCreationProvider, type StoryCreationRuntime } from '@seihouse/library/story-seed';
import { AGENTS, LOCAL_ONLY_MODE, mockLogin, storyCreationPreviewStore } from '../components/story-seed/shared/stubs';
import { LOCAL_WORKSHOP_STORY_SEED_OWNER_ID, previewStorySeedRepository } from './previews/story-seed/storySeedStorage';

/** Explicit preview-only identity, persistence and authentication. Never published. */
export function StoryCreationPreviewRuntime({ children }: PropsWithChildren) {
  const snapshot = useSyncExternalStore(storyCreationPreviewStore.subscribe, storyCreationPreviewStore.getSnapshot);
  const runtime = useMemo<StoryCreationRuntime>(() => ({
    store: storyCreationPreviewStore,
    repository: previewStorySeedRepository,
    guestOwnerId: LOCAL_ONLY_MODE ? LOCAL_WORKSHOP_STORY_SEED_OWNER_ID : undefined,
    authorMarkUrl: AGENTS.VERSA.logoUrl,
    authenticate: mockLogin,
  }), [snapshot]);
  return <StoryCreationProvider value={runtime}>{children}</StoryCreationProvider>;
}
