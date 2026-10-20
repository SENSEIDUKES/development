import { useState } from 'react';
import { Discover } from '@seihouse/library/discover';
import type { UserProfile } from '@seihouse/library/profile';
import { AppShell } from './AppShell';
import {
  DISCOVER_RANKING_BOARDS, DISCOVER_SAMPLE_EVENTS, DISCOVER_SAMPLE_FATE_SURVIVAL, DISCOVER_SAMPLE_RELEASES,
  DISCOVER_SAMPLE_TRACKED, DISCOVER_SAMPLE_WORLDS,
} from './discoverSamples';
import type { Navigate } from './routes';

/**
 * Discover, inside the Library Shell. Until public worlds exist it shows
 * sample worlds, and says so: opening one explains instead of opening a
 * Story View that does not exist.
 */
export function DiscoverPage({ navigate, stories, readerProfile }: {
  navigate: Navigate;
  /** The reader's own stories, which header Search can open. */
  stories: readonly { id: string; title: string }[];
  readerProfile: UserProfile;
}) {
  const [opened, setOpened] = useState<string>();
  const openedTitle = DISCOVER_SAMPLE_WORLDS.find(world => world.id === opened)?.title;
  return <AppShell route={{ page: 'discover' }} navigate={navigate} stories={stories} readerProfile={readerProfile} mainLabel="Discover">
    <div className="mx-auto w-full max-w-7xl px-4 py-8" data-testid="novel-expanded-discover">
      <Discover worlds={DISCOVER_SAMPLE_WORLDS} releases={DISCOVER_SAMPLE_RELEASES} trackedWorldIds={DISCOVER_SAMPLE_TRACKED}
        fateSurvivalWorldIds={DISCOVER_SAMPLE_FATE_SURVIVAL} rankingBoards={DISCOVER_RANKING_BOARDS} events={DISCOVER_SAMPLE_EVENTS}
        onOpenWorld={setOpened}
        notice={<p className="rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/[0.08] px-4 py-3 font-serif text-sm text-[#e9d38b]" role="status">
          {openedTitle
            ? <>“{openedTitle}” is a sample world. Real worlds will open straight into their World Info and Reader.</>
            : <>Sample worlds: Discover is shown with placeholder worlds while its look and feel is refined.</>}
        </p>} />
    </div>
  </AppShell>;
}
