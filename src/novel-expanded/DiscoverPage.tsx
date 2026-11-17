import {
  Discover,
  DiscoverEncyclopedia,
  type DiscoverLoreLocation,
  type DiscoverSection,
  type DiscoverProps,
} from '@seihouse/library/discover';
import type { UserProfile } from '@seihouse/library/profile';
import type { HomeWorld } from '@seihouse/library/home';
import { DISCOVER_EVENTS } from './discoverEvents';
import { AppShell } from './AppShell';
import { routeHref, type Navigate, type NovelExpandedRoute } from './routes';

/** Host-supplied catalogue data; Workshop supplies its isolated samples here. */
export type DiscoverCatalogue = Pick<DiscoverProps,
  'worlds' | 'releases' | 'trackedWorldIds' | 'fateSurvivalWorldIds' | 'creators' |
  'codexEntries' | 'followedCreatorIds' | 'trackedCodexIds' | 'rankingBoards' | 'onOpenWorld' | 'notice'
>;

/** The shared Discover composition, using only published worlds in the app. */
export function DiscoverPage({
  navigate,
  stories,
  readerProfile,
  route,
  catalogue,
  hrefFor = routeHref,
}: {
  navigate: Navigate;
  route: Extract<NovelExpandedRoute, { page: 'discover' }>;
  /** Published stories, also available through the header's Search. */
  stories: readonly HomeWorld[];
  catalogue?: DiscoverCatalogue;
  hrefFor?: (route: NovelExpandedRoute) => string;
  readerProfile: UserProfile;
}) {
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
      <div className="mx-auto w-full max-w-7xl px-4 py-4" data-testid="novel-expanded-discover">
        <Discover
          section={route.lore ? 'lore' : (route.section ?? 'stories')}
          sectionHref={(section) => hrefFor(sectionRoute(section))}
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
              hrefFor={(location) => hrefFor(loreRoute(location))}
              onNavigate={(location, replace) => navigate(loreRoute(location), { replace, scroll: !replace })}
              readingLanguage={readerProfile.defaultReadingLanguage}
              interfaceLanguage={readerProfile.interfaceLanguage}
              readingMode={readerProfile.defaultChapterWritingStyle}
            />
          )}
          worlds={stories}
          releases={[]}
          events={DISCOVER_EVENTS}
          onOpenWorld={(storyId) => navigate({ page: 'story', storyId })}
          {...catalogue}
        />
      </div>
    </AppShell>
  );
}
