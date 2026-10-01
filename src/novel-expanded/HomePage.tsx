import { LightNovelsHome, type HomeWorld } from '@seihouse/library/home';
import { WorkspaceHeader, WorkspaceShell } from '@seihouse/library/shell';
import { LIBRARY_ASSETS } from '../host/media/libraryAssets';

const EMPTY_LIST = {
  title: 'Your stories appear here',
  description: 'Carve New Destiny to plant a Story Seed and shape its World Blueprint. Every story you start waits here, ready to read and continue.',
};

/** Home: the reader's stories, newest first, and the way to start a new one. */
export function HomePage({ worlds, onCreate, onOpenStory }: {
  worlds: readonly HomeWorld[];
  onCreate: () => void;
  onOpenStory: (storyId: string) => void;
}) {
  return <div className="bg-[#050505] text-[#dfd8cf] font-serif selection:bg-human/30" data-testid="novel-expanded-home">
    <WorkspaceShell mainAriaLabel="Your stories" header={<WorkspaceHeader landmark="none" title="NovelExpanded"
      subtitle="Read and direct your stories" emblem={{ src: LIBRARY_ASSETS.emblem ?? '/favicon.jpg', alt: 'NovelExpanded' }} />}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <LightNovelsHome worlds={worlds} onCreateStory={onCreate} onOpenWorld={onOpenStory} emptyState={EMPTY_LIST} />
      </div>
    </WorkspaceShell>
  </div>;
}
