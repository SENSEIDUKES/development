import { useEffect, useMemo, useState } from 'react';
import type { StoryCreationRuntime, StoryCreationSnapshot } from '@seihouse/library/story-seed';
import { findFoundationRevision, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import type { StorySeedRepository } from '@seihouse/sen/story-seed';
import { AGENTS } from '../lib/agents';

/** The app has no accounts yet: every Story Seed belongs to this browser's one reader. */
export const NOVEL_EXPANDED_READER_ID = 'novelexpanded-reader';

/** The Story Seed a story started from, if it started from one. */
export function storySourceSeedId(state: HarnessWorkspaceState, story: HarnessWorkspaceState['stories'][number]): string | undefined {
  const source = findFoundationRevision(state, story.activeFoundationRevisionId)?.input.sourceSnapshot;
  return source?.kind === 'story-seed' && source.sourceId ? source.sourceId : undefined;
}

/** The Story Seeds the reader's stories started from, so the Story Bank can mark them. */
export function startedSeedIds(state: HarnessWorkspaceState): string[] {
  return state.stories.flatMap(story => {
    const seedId = storySourceSeedId(state, story);
    return seedId ? [seedId] : [];
  });
}

const sameIds = (left: readonly string[], right: readonly { sourceSeedId?: string }[]) =>
  left.length === right.length && left.every((id, index) => right[index]?.sourceSeedId === id);

function createSnapshotStore(seedIds: readonly string[]) {
  let snapshot: StoryCreationSnapshot = {
    currentUser: null,
    activeAgentId: AGENTS.VERSA.id,
    stories: seedIds.map(sourceSeedId => ({ sourceSeedId })),
    isGenerating: false,
  };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setStartedSeeds(ids: readonly string[]) {
      if (sameIds(ids, snapshot.stories)) return;
      snapshot = { ...snapshot, stories: ids.map(sourceSeedId => ({ sourceSeedId })) };
      listeners.forEach(listener => listener());
    },
  };
}

/**
 * Story creation for the app: a guest workspace with no sign-in, over the
 * app's own Story Seeds. The Story Bank marks the seeds that already became
 * stories.
 */
export function useNovelExpandedStoryCreation(repository: StorySeedRepository, seedIds: readonly string[]): StoryCreationRuntime {
  const [store] = useState(() => createSnapshotStore(seedIds));
  useEffect(() => store.setStartedSeeds(seedIds), [store, seedIds]);
  return useMemo<StoryCreationRuntime>(() => ({
    store,
    repository,
    guestOwnerId: NOVEL_EXPANDED_READER_ID,
    authorMarkUrl: AGENTS.VERSA.logoUrl,
    // A guest workspace never shows the sign-in gate.
    authenticate: async () => { throw new Error('NovelExpanded has no sign-in yet.'); },
  }), [store, repository]);
}
