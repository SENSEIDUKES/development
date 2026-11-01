import { useMemo } from 'react';
import { CreatorPlugins, CreatorSpace, type CreatorToolkitFilter, type CreatorWorld } from '@seihouse/library/creator-space';
import { SparksButton, type SparkHost } from '@seihouse/sen/story-seed';
import { useEnergyAccount } from '@seihouse/library/energy';
import type { HomeWorld } from '@seihouse/library/home';
import type { UserProfile } from '@seihouse/library/profile';
import type { LibraryStories } from '@seihouse/library/stories';
import type { HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { AppShell } from './AppShell';
import { CREATOR_TOOLKIT, buildCreatorPluginCatalog } from './creatorToolkit';
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
 * worlds, the live Energy balance and the Toolkit plugins, and the way into
 * each thing a creator does next: Create plants a new Story Seed, Sparks
 * offers a story idea and begins it as a new Story Seed, Browse plugins (and
 * each plugin card) opens Creator Plugins over parent `.spp` packs, Continue
 * opens a world's Reader (where its next chapter is written), the card itself
 * opens the world as its author sees it (its Blueprint, Chapters, Codex and
 * Assets), Studio opens its World Info, and Energy opens the Cave's Energy page.
 */
export function CreateHubPage({ worlds, stories, navigate, readerProfile, sparks, plugins, pluginPack, pluginStories }: {
  worlds: readonly CreatorWorld[];
  /** The same stories, as Search in the shell lists them. */
  stories: readonly { id: string; title: string }[];
  navigate: Navigate;
  readerProfile: UserProfile;
  /** Sparks: a chosen spark is planted as a new Story Seed and opened. */
  sparks: SparkHost;
  /** When set, shows Creator Plugins filtered to all or one plugin kind. */
  plugins?: CreatorToolkitFilter;
  /** Optional opened parent `.spp` pack ID inside Creator Plugins. */
  pluginPack?: string;
  /** Optional story inventory for Creator Plugins' installed `.spp` packs and importers. */
  pluginStories?: Pick<LibraryStories, 'skills' | 'mediaPacks' | 'importMediaPack' | 'skillIntake' | 'installSkill'>;
}) {
  const energy = useEnergyAccount();
  const catalog = useMemo(
    () => buildCreatorPluginCatalog({ skills: pluginStories?.skills, mediaPacks: pluginStories?.mediaPacks }),
    [pluginStories?.skills, pluginStories?.mediaPacks],
  );
  return <AppShell route={{ page: 'create' }} navigate={navigate} stories={stories} readerProfile={readerProfile} mainLabel="Create">
    <div className="mx-auto w-full max-w-7xl px-4 py-6" data-testid="novel-expanded-create-hub">
      {plugins
        ? <CreatorPlugins
            catalog={catalog}
            initialFilter={plugins}
            selectedPackId={pluginPack ?? null}
            onSelectPack={nextPackId => navigate(
              nextPackId ? { page: 'create', plugins, pluginPack: nextPackId } : { page: 'create', plugins },
            )}
            onFilterChange={next => navigate({ page: 'create', plugins: next }, { replace: true, scroll: false })}
            onBack={() => navigate({ page: 'create' })}
            onImportMediaPack={pluginStories?.importMediaPack}
            skillIntake={pluginStories?.skillIntake}
            onInstallSkill={pluginStories?.installSkill}
          />
        : <CreatorSpace worlds={{ status: 'ready', items: worlds }} energy={energy} toolkit={CREATOR_TOOLKIT}
            sparks={<SparksButton host={sparks} />}
            onCreate={() => navigate({ page: 'create', newSeed: true })}
            onOpenEnergy={() => navigate({ page: 'profile', cave: '/home/energy' })}
            onBrowseToolkit={kind => navigate({ page: 'create', plugins: kind ?? 'all' })}
            onContinueWorld={storyId => navigate({ page: 'read', storyId })}
            onOpenWorld={world => navigate({ page: 'world', storyId: world.id })}
            onOpenStudio={storyId => navigate({ page: 'story', storyId })} />}
    </div>
  </AppShell>;
}
