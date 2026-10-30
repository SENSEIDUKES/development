import { CreatorSpace, type CreatorWorld } from '@seihouse/library/creator-space';
import { DaoSparksButton, type DaoSparkHost } from '@seihouse/library/shell';
import { useEnergyAccount } from '@seihouse/library/energy';
import type { HomeWorld } from '@seihouse/library/home';
import type { UserProfile } from '@seihouse/library/profile';
import type { HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { AppShell } from './AppShell';
import { CREATOR_TOOLKIT } from './creatorToolkit';
import type { Navigate } from './routes';

/**
 * The reader's stories as the Creator Space shows them: Home's cards (title,
 * chapters, cover, genre) with where each story stands. A story that reached
 * its ending is complete; otherwise its visibility says draft, shared or public.
 */
export function creatorWorldsOf(state: HarnessWorkspaceState, worlds: readonly HomeWorld[]): CreatorWorld[] {
  return worlds.flatMap(world => {
    const story = state.stories.find(candidate => candidate.id === world.id);
    if (!story) return [];
    return [{
      id: world.id,
      title: world.title,
      chapterCount: world.chapterCount,
      status: story.conclusion ? 'complete' : story.visibility === 'public' ? 'public' : story.visibility === 'shared' ? 'shared' : 'draft',
      updatedAt: story.updatedAt,
      ...(world.imageUrl.trim() ? { imageUrl: world.imageUrl } : {}),
      ...(world.genre ? { genre: world.genre } : {}),
      ...(world.synopsis ? { synopsis: world.synopsis } : {}),
      ...(world.tags?.length ? { tags: world.tags } : {}),
      ...(world.creatorName ? { creatorName: world.creatorName } : {}),
      ...(world.creatorTitle ? { creatorTitle: world.creatorTitle } : {}),
      ...(world.format ? { format: world.format } : {}),
      ...(typeof world.branchingEnabled === 'boolean' ? { branchingEnabled: world.branchingEnabled } : {}),
    }];
  });
}

/**
 * Create: the Library's Creator Space inside the Library Shell. The reader's
 * worlds, the live Energy balance and the Toolkit previews, and the way into
 * each thing a creator does next: Create plants a new Story Seed, Sparks
 * offers a story idea and begins it as a new Story Seed, Continue
 * opens a world's Reader (where its next chapter is written), the card itself
 * opens the world as its author sees it (its Blueprint, Chapters, Codex and
 * Assets), Studio opens its World Info, and Energy opens the Cave's Energy page.
 */
export function CreateHubPage({ worlds, stories, navigate, readerProfile, sparks }: {
  worlds: readonly CreatorWorld[];
  /** The same stories, as Search in the shell lists them. */
  stories: readonly { id: string; title: string }[];
  navigate: Navigate;
  readerProfile: UserProfile;
  /** Sparks: a chosen spark is planted as a new Story Seed and opened. */
  sparks: DaoSparkHost;
}) {
  const energy = useEnergyAccount();
  return <AppShell route={{ page: 'create' }} navigate={navigate} stories={stories} readerProfile={readerProfile} mainLabel="Create">
    <div className="mx-auto w-full max-w-7xl px-4 py-6" data-testid="novel-expanded-create-hub">
      <CreatorSpace worlds={{ status: 'ready', items: worlds }} energy={energy} toolkit={CREATOR_TOOLKIT}
        sparks={<DaoSparksButton host={sparks} copyText={text => navigator.clipboard.writeText(text)} />}
        onCreate={() => navigate({ page: 'create', newSeed: true })}
        onOpenEnergy={() => navigate({ page: 'profile', cave: '/home/energy' })}
        onContinueWorld={storyId => navigate({ page: 'read', storyId })}
        onOpenWorld={world => navigate({ page: 'world', storyId: world.id })}
        onOpenStudio={storyId => navigate({ page: 'story', storyId })} />
    </div>
  </AppShell>;
}
