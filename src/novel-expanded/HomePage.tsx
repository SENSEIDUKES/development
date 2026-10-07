import { LightNovelsHome, type HomeWorld } from '@seihouse/library/home';
import { AppShell } from './AppShell';
import type { Navigate } from './routes';

const EMPTY_LIST = {
  title: 'Your stories appear here',
  description: 'Carve New Destiny to plant a Story Seed and shape its World Blueprint. Every story you start waits here, ready to read and continue.',
};

/** Home: the reader's stories, newest first, and the way to start a new one, inside the Library Shell. */
export function HomePage({ worlds, navigate }: {
  worlds: readonly HomeWorld[];
  navigate: Navigate;
}) {
  return <AppShell route={{ page: 'home' }} navigate={navigate} stories={worlds} mainLabel="Your stories">
    <div className="mx-auto w-full max-w-7xl px-4 py-8" data-testid="novel-expanded-home">
      <LightNovelsHome worlds={worlds} emptyState={EMPTY_LIST}
        onCreateStory={() => navigate({ page: 'create' })}
        onOpenWorld={storyId => navigate({ page: 'story', storyId })} />
    </div>
  </AppShell>;
}
