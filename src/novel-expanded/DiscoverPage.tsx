import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Discover,
  DiscoverEncyclopedia,
  type DiscoverLoreLocation,
  type DiscoverSection,
} from '@seihouse/library/discover';
import type { UserProfile } from '@seihouse/library/profile';
import { useLibraryBottomClearance } from '@seihouse/library/shell';
import { AppShell } from './AppShell';
import {
  DISCOVER_RANKING_BOARDS,
  DISCOVER_SAMPLE_EVENTS,
  DISCOVER_SAMPLE_FATE_SURVIVAL,
  DISCOVER_SAMPLE_FEATURED,
  DISCOVER_SAMPLE_RELEASES,
  DISCOVER_SAMPLE_TRACKED,
  DISCOVER_SAMPLE_WORLDS,
  DISCOVER_SAMPLE_CREATORS,
  DISCOVER_SAMPLE_CODEX,
  DISCOVER_SAMPLE_FOLLOWED_CREATORS,
  DISCOVER_SAMPLE_TRACKED_CODEX,
} from './discoverSamples';
import { routeHref, type Navigate, type NovelExpandedRoute } from './routes';

/** How long the sample-world note stays after a world is opened. */
const SAMPLE_NOTE_MS = 4000;

/**
 * Discover, inside the Library Shell. Until public worlds exist it shows
 * sample worlds, and says so: opening one shows a short note just above the
 * bottom bar, where the reader is looking, instead of opening a Story View
 * that does not exist.
 */
export function DiscoverPage({
  navigate,
  stories,
  readerProfile,
  route,
}: {
  navigate: Navigate;
  route: Extract<NovelExpandedRoute, { page: 'discover' }>;
  /** The reader's own stories, which header Search can open. */
  stories: readonly { id: string; title: string }[];
  readerProfile: UserProfile;
}) {
  // `at` restarts the note's timer when the same world is opened twice.
  const [opened, setOpened] = useState<{ title: string; at: number }>();
  const clearance = useLibraryBottomClearance();
  useEffect(() => {
    if (!opened) return;
    const timer = setTimeout(() => setOpened(undefined), SAMPLE_NOTE_MS);
    return () => clearTimeout(timer);
  }, [opened]);
  const open = (worldId: string) => {
    const title = DISCOVER_SAMPLE_WORLDS.find((world) => world.id === worldId)?.title;
    if (title) setOpened({ title, at: Date.now() });
  };
  const loreRoute = (location?: DiscoverLoreLocation): Extract<NovelExpandedRoute, { page: 'discover' }> =>
    location
      ? { page: 'discover', lore: location.term ?? 'index', query: location.query, category: location.category }
      : { page: 'discover' };
  const sectionRoute = (section: DiscoverSection): Extract<NovelExpandedRoute, { page: 'discover' }> =>
    section === 'lore' ? loreRoute({}) : section === 'stories' ? { page: 'discover' } : { page: 'discover', section };
  return (
    <AppShell
      route={{ page: 'discover' }}
      navigate={navigate}
      stories={stories}
      readerProfile={readerProfile}
      mainLabel="Discover"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-8" data-testid="novel-expanded-discover">
        <Discover
          section={route.lore ? 'lore' : (route.section ?? 'stories')}
          sectionHref={(section) => routeHref(sectionRoute(section))}
          onSectionChange={(section) => navigate(sectionRoute(section))}
          loreArticle={Boolean(route.lore && route.lore !== 'index')}
          renderLore={(updatesOnly) => (
            <DiscoverEncyclopedia
              embedded
              updatesOnly={updatesOnly}
              location={{
                term: route.lore === 'index' ? undefined : route.lore,
                query: route.query,
                category: route.category as DiscoverLoreLocation['category'],
              }}
              hrefFor={(location) => routeHref(loreRoute(location))}
              onNavigate={(location, replace) => navigate(loreRoute(location), { replace, scroll: !replace })}
              readingLanguage={readerProfile.defaultReadingLanguage}
              interfaceLanguage={readerProfile.interfaceLanguage}
              readingMode={readerProfile.defaultChapterWritingStyle}
            />
          )}
          worlds={DISCOVER_SAMPLE_WORLDS}
          featuredWorldIds={DISCOVER_SAMPLE_FEATURED}
          releases={DISCOVER_SAMPLE_RELEASES}
          trackedWorldIds={DISCOVER_SAMPLE_TRACKED}
          fateSurvivalWorldIds={DISCOVER_SAMPLE_FATE_SURVIVAL}
          creators={DISCOVER_SAMPLE_CREATORS}
          codexEntries={DISCOVER_SAMPLE_CODEX}
          followedCreatorIds={DISCOVER_SAMPLE_FOLLOWED_CREATORS}
          trackedCodexIds={DISCOVER_SAMPLE_TRACKED_CODEX}
          rankingBoards={DISCOVER_RANKING_BOARDS}
          events={DISCOVER_SAMPLE_EVENTS}
          onOpenWorld={open}
          notice={
            route.lore ? undefined : (
              <p>Explore sample stories, creators and Codex entries. Rankings and follows are examples.</p>
            )
          }
        />
      </div>
      {createPortal(
        <p
          role="status"
          data-testid="discover-sample-note"
          className={`pointer-events-none fixed left-1/2 z-50 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-[#14161c]/95 px-4 py-3 text-center font-serif text-sm text-[#f3eee7] shadow-lg shadow-black/50 ring-1 ring-white/10 transition-opacity duration-200 motion-reduce:transition-none ${opened ? 'opacity-100' : 'opacity-0'}`}
          style={{ bottom: clearance + 16 }}
        >
          {opened && (
            <>“{opened.title}” is a sample world. Real worlds will open straight into their World Info and Reader.</>
          )}
        </p>,
        document.body,
      )}
    </AppShell>
  );
}
