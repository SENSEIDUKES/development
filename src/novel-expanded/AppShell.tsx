import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { NovelExpandedLogo } from '@library-studios/brand';
import '@library-studios/brand/styles.css';
import { LibraryStoriesIcon, LibraryBookIcon, LibraryDiscoveryIcon, LibraryStoryIcon, LibrarySettingsIcon, LibraryProfileIcon } from '@seihouse/library-ui';
import {
  LibraryFooter, LibraryNavigation, LibrarySectionSidebar, WorkspaceHeader, WorkspaceShell,
  useLibraryDesktopNavigation, useLibraryLegalDocuments,
  type HeaderSearchItem, type LibraryFooterGroup,
} from '@seihouse/library/shell';
import { LibraryHelpMenu } from '@seihouse/library/story-seed';
import type { UserProfile } from '@seihouse/library/profile';
import { useDeviceProfileRank } from '../host/profile/deviceProfile';
import { APP_DESTINATIONS, appLibraryLocation, appRouteFor } from './appPlaces';
import { HOME_ROUTE, routeHref, type Navigate, type NovelExpandedRoute } from './routes';
import { LibraryAppearanceScope, useLibraryAssets } from '@seihouse/library/presentation';
import './app-header.css';

export interface AppShellProps {
  /** The page inside the shell: Home, Create, Discover or a story's World Info. */
  route: Extract<NovelExpandedRoute, { page: 'home' | 'create' | 'discover' | 'story' }>;
  navigate: Navigate;
  /** The reader's stories, which Search can open. */
  stories: readonly { id: string; title: string }[];
  /** The same device reader record edited in the Cave. */
  readerProfile: UserProfile;
  /** Names the page's main region for assistive technology. */
  mainLabel: string;
  children: ReactNode;
  headerCenter?: ReactNode;
}

/**
 * The Library Shell around the app's browsing pages, Home, Create, Discover and a
 * story's World Info: the Library header (the app's identity, the Familiar's recall, the
 * music note while Menu music is on, Help and Search), the Library's
 * navigation (the bottom strip on phones and tablets, the Pathways sidebar on
 * laptops) with the app's places, and the platform footer. Story Seed runs in the
 * shell's workspace mode through Story Seed itself, and Profile is the Cave,
 * which draws the same shell itself; the Reader stays outside, immersive.
 */
export function AppShell({ route, navigate, stories, readerProfile, mainLabel, children, headerCenter }: AppShellProps) {
  const { homeImages } = useLibraryAssets();
  const palette = route.page === 'home';
  const pathwaysSidebar = useLibraryDesktopNavigation() === 'sidebar';
  const rank = useDeviceProfileRank();
  const { legal, sheet: legalSheet } = useLibraryLegalDocuments();
  const [helpOpen, setHelpOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  // A new page replaces the old one's shell; where that leaves focus nowhere,
  // it lands on the new page's content.
  useEffect(() => {
    if (document.activeElement === document.body) mainRef.current?.focus({ preventScroll: true });
  }, []);
  const home = () => navigate(HOME_ROUTE);
  const create = () => navigate({ page: 'create' });
  const discover = () => navigate({ page: 'discover' });
  const profile = () => navigate({ page: 'profile' });
  const settings = () => navigate({ page: 'profile', cave: '/settings' });
  const searchItems: HeaderSearchItem[] = [
    { id: 'home', label: 'Your stories', description: 'Home: every story you have started', icon: LibraryStoriesIcon, onAction: home },
    { id: 'create', label: 'Create a story', description: 'Plant a Story Seed and shape its World Blueprint', icon: LibraryBookIcon, onAction: create },
    { id: 'discover', label: 'Discover', description: 'Latest releases, Fate Survival and worlds to browse', icon: LibraryDiscoveryIcon, onAction: discover },
    { id: 'profile', label: 'Profile', description: 'Your Cultivator Cave: rank, QI, Familiars and rewards', icon: LibraryProfileIcon, onAction: profile },
    { id: 'settings', label: 'Settings', description: 'Your name, languages, sound, Familiar and Reading Mode', icon: LibrarySettingsIcon, onAction: settings },
    ...stories.map(story => ({ id: `story-${story.id}`, label: story.title, description: 'Open its World Info', icon: LibraryStoryIcon,
      onAction: () => navigate({ page: 'story', storyId: story.id }) })),
  ];
  // Only destinations the app has; social channels wait for published addresses.
  const footerGroups: LibraryFooterGroup[] = [
    { id: 'explore', label: 'Explore', items: [
      { id: 'home', label: 'Your stories', onSelect: home },
      { id: 'create', label: 'Create a story', onSelect: create },
      { id: 'discover', label: 'Discover worlds', onSelect: discover },
      { id: 'profile', label: 'Your profile', onSelect: profile },
    ] },
    { id: 'support', label: 'Support', items: [
      { id: 'help', label: 'Help', onSelect: () => setHelpOpen(true) },
      { id: 'settings', label: 'Settings', onSelect: settings },
    ] },
  ];
  return <LibraryAppearanceScope color={palette ? readerProfile.accentColor ?? '#c9a24a' : undefined}>
  <div className={`novel-expanded-shell bg-[#050505] text-[#dfd8cf] font-serif selection:bg-human/30 ${palette ? 'library-home-palette' : ''}`} data-testid="novel-expanded-shell"
    style={palette && homeImages?.[0] ? { '--home-palette-art': `url(${JSON.stringify(homeImages[0])})` } as CSSProperties : undefined}>
    <LibraryNavigation location={appLibraryLocation(route)} destinations={APP_DESTINATIONS}
      profile={{ name: readerProfile.displayName.trim() || 'Cultivator',
        detail: rank,
        emblem: readerProfile.avatarUrl ? <img src={readerProfile.avatarUrl} alt="" /> : undefined,
        onSelect: profile }}
      onNavigate={location => { const next = appRouteFor(location); if (next) navigate(next); }}>
      <WorkspaceShell mainRef={mainRef} mainId="novel-expanded-main" mainAriaLabel={mainLabel} mainClassName="relative z-10 outline-none"
        sidebar={pathwaysSidebar ? <LibrarySectionSidebar /> : undefined} sidebarLabel="Library pathways"
        header={<WorkspaceHeader landmark="none" title="NovelExpanded" center={headerCenter} centerBreakpoint="always"
          identity={<div className="novel-expanded-header-identity">
            <a className="novel-expanded-emblem group/emblem" href={routeHref(HOME_ROUTE)}
              aria-label="Return to your stories" onClick={event => {
                if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                  event.preventDefault();
                  home();
                }
              }}>
              <NovelExpandedLogo className="novel-expanded-emblem-art" alt="" />
            </a>
          </div>}
          home={{ href: routeHref(HOME_ROUTE), label: 'Return to your stories', onNavigate: home }}
          searchItems={searchItems} />}>
        {children}
        <LibraryFooter groups={footerGroups} social={[]} legal={legal}
          language={{ code: readerProfile.interfaceLanguage, onOpenSettings: settings }}
          identity={<img className="novel-expanded-footer-wordmark" src="/novel-expanded/wordmark.png"
            alt="NovelExpanded" width={1586} height={992} />} />
      </WorkspaceShell>
    </LibraryNavigation>
    {legalSheet}
    {helpOpen && createPortal(<LibraryHelpMenu open onClose={() => setHelpOpen(false)} />, document.body)}
  </div></LibraryAppearanceScope>;
}
