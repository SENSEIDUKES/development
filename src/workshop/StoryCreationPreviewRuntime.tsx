import { useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { StoryCreationProvider, type StoryCreationRuntime } from '@seihouse/library/story-seed';
import { requestMeaningFingerprints } from '../host/meaning/meaningFingerprintClient';
import { LOCAL_ONLY_MODE, mockLogin, storyCreationPreviewStore } from '../components/story-seed/shared/stubs';
import { AGENTS } from '../lib/agents';
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
    // The dev server serves the real route; without a model key suggestions fall back to genre and words.
    fingerprintMeaning: requestMeaningFingerprints,
  }), [snapshot]);
  return <StoryCreationProvider value={runtime}>{children}</StoryCreationProvider>;
}
