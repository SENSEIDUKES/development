import { useEffect, useState } from 'react';
import { CreatorSpace, type CreatorWorld, type CreatorWorldsState } from '@seihouse/library/creator-space';
import { useEnergyAccount } from '@seihouse/library/energy';
import type { LibraryLocation } from '@seihouse/library/shell';
import type { HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { IndexedDbHarnessGenerationRepository } from '../../../host/generation/indexedDbRepository';
import { CREATOR_TOOLKIT, SAMPLE_CREATOR_WORLDS } from './previewData';

export type CreatorWorldsSource = 'local' | 'sample';

/** `worlds=sample` shows the Workshop sample worlds; anything else reads this browser's stories. */
export const readCreatorWorldsSource = (): CreatorWorldsSource =>
  new URLSearchParams(window.location.search).get('worlds') === 'sample' ? 'sample' : 'local';

/** Project the chapter workspace's stories into Create's display data. */
export function creatorWorldsFromHarness(state: Pick<HarnessWorkspaceState, 'stories' | 'chapters'>): CreatorWorld[] {
  const written = new Map<string, Set<number>>();
  for (const chapter of state.chapters) {
    const numbers = written.get(chapter.storyId) ?? new Set<number>();
    numbers.add(chapter.chapterNumber);
    written.set(chapter.storyId, numbers);
  }
  return state.stories.map(story => ({
    id: story.id,
    title: story.title,
    chapterCount: written.get(story.id)?.size ?? 0,
    status: story.conclusion ? 'complete' : story.visibility === 'public' ? 'public' : story.visibility === 'shared' ? 'shared' : 'draft',
    updatedAt: story.updatedAt,
  }));
}

/** Read-only: Create never saves, upgrades or resets the chapter workspace's store. */
async function readLocalCreatorWorlds(): Promise<CreatorWorld[]> {
  if (typeof indexedDB === 'undefined') throw new Error('This browser has no local story storage, so written worlds cannot be read here.');
  return creatorWorldsFromHarness(await new IndexedDbHarnessGenerationRepository().peek());
}

/** The chapter workspace is its own Workshop page, so leave any preview frame for it. */
function openChapterWorkspace(storyId: string, focusNextChapter: boolean) {
  const url = new URL('/', window.location.href);
  url.searchParams.set('preview', 'harness-generation');
  url.searchParams.set('story', storyId);
  if (focusNextChapter) url.searchParams.set('focus', 'next-chapter');
  let target: Window = window;
  try { target = window.top ?? window; } catch { /* a cross-origin parent keeps the navigation in this frame */ }
  target.location.assign(url.href);
}

/**
 * Workshop host for the Create page: this browser's written worlds (or the
 * sample set), the live Energy account the shell already mounts, the Toolkit
 * previews, and the existing destinations. Production supplies its own.
 */
export function CreatorSpaceHost({ onNavigate, source = readCreatorWorldsSource() }: {
  onNavigate: (location: LibraryLocation) => void;
  source?: CreatorWorldsSource;
}) {
  const [worlds, setWorlds] = useState<CreatorWorldsState>(() => source === 'sample'
    ? { status: 'ready', items: SAMPLE_CREATOR_WORLDS } : { status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [sampleNotice, setSampleNotice] = useState('');
  const energy = useEnergyAccount();

  useEffect(() => {
    if (source === 'sample') { setWorlds({ status: 'ready', items: SAMPLE_CREATOR_WORLDS }); return; }
    let current = true;
    setWorlds({ status: 'loading' });
    readLocalCreatorWorlds().then(
      items => { if (current) setWorlds({ status: 'ready', items }); },
      (error: unknown) => {
        if (current) setWorlds({ status: 'error', error: error instanceof Error ? error.message : 'This browser’s story storage could not be read.' });
      },
    );
    return () => { current = false; };
  }, [source, attempt]);

  // Sample worlds are not in the chapter workspace, so say where the action would go.
  const act = (worldId: string, focusNextChapter: boolean) => {
    if (source !== 'sample') { openChapterWorkspace(worldId, focusNextChapter); return; }
    const world = SAMPLE_CREATOR_WORLDS.find(item => item.id === worldId);
    setSampleNotice(`Sample world: with a real story, ${focusNextChapter ? 'Continue' : 'Studio'} opens “${world?.title}” in its chapter workspace${focusNextChapter ? `, ready for Chapter ${(world?.chapterCount ?? 0) + 1}` : ''}.`);
  };

  return <>
    <CreatorSpace worlds={worlds} energy={energy} toolkit={CREATOR_TOOLKIT}
      onCreate={() => onNavigate({ screen: 'creator' })}
      onOpenEnergy={() => onNavigate({ screen: 'profile', cave: '/home/energy' })}
      onContinueWorld={id => act(id, true)}
      onOpenStudio={id => act(id, false)}
      onRetryWorlds={() => setAttempt(value => value + 1)} />
    {source === 'sample' && <p role="status" className="mt-3 font-sans text-xs text-neutral-400 empty:hidden">{sampleNotice}</p>}
  </>;
}
