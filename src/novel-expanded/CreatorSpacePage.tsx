import { CreatorSpace, type CreatorWorld } from '@seihouse/library/creator-space';
import { useEnergyAccount } from '@seihouse/library/energy';
import type { UserProfile } from '@seihouse/library/profile';
import { CREATOR_TOOLKIT } from '../host/media/creatorToolkit';
import { AppShell } from './AppShell';
import type { Navigate } from './routes';

/** The existing Library Create surface, using the app's stories and destinations. */
export function CreatorSpacePage({ worlds, navigate, readerProfile }: {
  worlds: readonly CreatorWorld[];
  navigate: Navigate;
  readerProfile: UserProfile;
}) {
  const energy = useEnergyAccount();
  return <AppShell route={{ page: 'create' }} navigate={navigate} stories={worlds} readerProfile={readerProfile} mainLabel="Create">
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <CreatorSpace worlds={{ status: 'ready', items: worlds }} energy={energy} toolkit={CREATOR_TOOLKIT}
        onCreate={() => navigate({ page: 'story-seed' })}
        onOpenEnergy={() => navigate({ page: 'profile', cave: '/home/energy' })}
        onContinueWorld={storyId => navigate({ page: 'read', storyId })}
        onOpenWorld={world => navigate({ page: 'story', storyId: world.id })}
        onOpenStudio={storyId => navigate({ page: 'story', storyId })} />
    </div>
  </AppShell>;
}
