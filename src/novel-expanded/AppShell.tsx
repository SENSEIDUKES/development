import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, ScrollText, Settings, UserRound } from 'lucide-react';
import {
  LIBRARY_EMBLEM, LibraryFooter, LibraryNavigation, LibrarySectionSidebar, WorkspaceHeader, WorkspaceShell,
  useLibraryDesktopNavigation, useLibraryLegalDocuments,
  type HeaderSearchItem, type LibraryFooterGroup,
} from '@seihouse/library/shell';
import { LibraryHelpMenu } from '@seihouse/library/story-seed';
import { APP_DESTINATIONS, appLibraryLocation, appRouteFor } from './appPlaces';
import { HOME_ROUTE, routeHref, type Navigate, type NovelExpandedRoute } from './routes';

export interface AppShellProps {
  /** The page inside the shell: Home or a story's World Info. */
  route: Extract<NovelExpandedRoute, { page: 'home' | 'story' }>;
  navigate: Navigate;
  /** The reader's stories, which Search can open. */
  stories: readonly { id: string; title: string }[];
  /** Names the page's main region for assistive technology. */
  mainLabel: string;
  children: ReactNode;
}

/**
 * The Library Shell around the app's browsing pages, Home and a story's World
 * Info: the Library header (the app's identity, the Familiar's recall, the
 * music note while Menu music is on, Help and Search), the Library's
 * navigation (the bottom strip on phones and tablets, the Pathways sidebar on
 * laptops) with the app's places, and the platform footer. Create runs in the
 * shell's workspace mode through Story Seed itself, and Profile is the Cave,
 * which draws the same shell itself; the Reader stays outside, immersive.
 */
export function AppShell({ route, navigate, stories, mainLabel, children }: AppShellProps) {
  const pathwaysSidebar = useLibraryDesktopNavigation() === 'sidebar';
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
  const profile = () => navigate({ page: 'profile' });
  const settings = () => navigate({ page: 'profile', cave: '/settings' });
  const searchItems: HeaderSearchItem[] = [
    { id: 'home', label: 'Your stories', description: 'Home: every story you have started', icon: BookOpen, onAction: home },
    { id: 'create', label: 'Create a story', description: 'Plant a Story Seed and shape its World Blueprint', icon: Plus, onAction: create },
    { id: 'profile', label: 'Profile', description: 'Your Cultivator Cave: rank, QI, Familiars and rewards', icon: UserRound, onAction: profile },
    { id: 'settings', label: 'Settings', description: 'Your name, languages, sound, Familiar and Reading Mode', icon: Settings, onAction: settings },
    ...stories.map(story => ({ id: `story-${story.id}`, label: story.title, description: 'Open its World Info', icon: ScrollText,
      onAction: () => navigate({ page: 'story', storyId: story.id }) })),
  ];
  // Only destinations the app has; social channels wait for published addresses.
  const footerGroups: LibraryFooterGroup[] = [
    { id: 'explore', label: 'Explore', items: [
      { id: 'home', label: 'Your stories', onSelect: home },
      { id: 'create', label: 'Create a story', onSelect: create },
      { id: 'profile', label: 'Your profile', onSelect: profile },
    ] },
    { id: 'support', label: 'Support', items: [
      { id: 'help', label: 'Help', onSelect: () => setHelpOpen(true) },
      { id: 'settings', label: 'Settings', onSelect: settings },
    ] },
  ];
  return <div className="bg-[#050505] text-[#dfd8cf] font-serif selection:bg-human/30" data-testid="novel-expanded-shell">
    <LibraryNavigation location={appLibraryLocation(route)} destinations={APP_DESTINATIONS}
      onNavigate={location => { const next = appRouteFor(location); if (next) navigate(next); }}>
      <WorkspaceShell mainRef={mainRef} mainId="novel-expanded-main" mainAriaLabel={mainLabel} mainClassName="relative z-10 outline-none"
        sidebar={pathwaysSidebar ? <LibrarySectionSidebar /> : undefined} sidebarLabel="Library pathways"
        header={<WorkspaceHeader landmark="none" title="NovelExpanded" subtitle="Read and direct your stories"
          emblem={{ src: LIBRARY_EMBLEM.src, alt: 'NovelExpanded' }}
          home={{ href: routeHref(HOME_ROUTE), label: 'Return to your stories', onNavigate: home }}
          searchItems={searchItems} />}>
        {children}
        <LibraryFooter groups={footerGroups} social={[]} legal={legal} />
      </WorkspaceShell>
    </LibraryNavigation>
    {legalSheet}
    {helpOpen && createPortal(<LibraryHelpMenu open onClose={() => setHelpOpen(false)} />, document.body)}
  </div>;
}
