import { createContext, useContext, type ReactNode } from 'react';
import { UserRound } from 'lucide-react';
import { LibraryBottomNavigation, LibraryNavigationDrawerPanel, type LibraryNavigationDrawerSection } from '@seihouse/library-ui';
import { activeLibraryDestination, LIBRARY_DESTINATIONS, libraryLocationKey, libraryNavigationMode, type LibraryLocation, type LibraryNavigationMode } from './libraryRoutes';
import './library-navigation.css';
import { SENNavigationIcon, type SENNavigationIconName } from './SENNavigationIcon';

type SectionItem = LibraryNavigationDrawerSection['items'][number] & { onSelect: (id: string) => void };
export interface LibrarySectionMenu {
  label: string;
  sections: Array<Omit<LibraryNavigationDrawerSection, 'items'> & { items: SectionItem[] }>;
}
export interface LibraryNavigationProps {
  location: LibraryLocation;
  onNavigate: (location: LibraryLocation) => void;
  /** Retained page configuration for the optional desktop rail; no global Section drawer. */
  sectionMenu?: LibrarySectionMenu;
  /** Other specialized workspaces may explicitly retain their own navigation. */
  mode?: LibraryNavigationMode;
  children: ReactNode;
}
const Context = createContext<LibrarySectionMenu | null>(null);
const icons = { home: 'home', library: 'book', discover: 'discovery' } as const satisfies Record<string, SENNavigationIconName>;

/** Optional existing desktop rail; retains the page's own destinations. */
export function LibrarySectionSidebar() {
  const menu = useContext(Context);
  return menu ? <LibraryNavigationDrawerPanel aria-label={menu.label} sections={menu.sections} /> : null;
}

/** Library owns the global strip. Pages supply their local destinations, never another strip. */
export function LibraryNavigation({ location, onNavigate, sectionMenu, mode, children }: LibraryNavigationProps) {
  // Immersive and Story Seed exclusions cannot be overridden by the standard default.
  const routeMode = libraryNavigationMode(location.screen);
  const resolvedMode = routeMode !== 'standard' ? routeMode : mode ?? 'standard';
  return <Context.Provider value={sectionMenu ?? null}>
    {resolvedMode === 'standard' ? <StandardNavigation location={location} onNavigate={onNavigate}>{children}</StandardNavigation> : children}
  </Context.Provider>;
}

function StandardNavigation({ location, onNavigate, children }: LibraryNavigationProps) {
  const selected = activeLibraryDestination(location);
  return <div className="library-navigation-layout" data-library-destination={selected}>
    {children}
    <LibraryBottomNavigation aria-label="Library global navigation" className="library-global-navigation" showLabels
      items={LIBRARY_DESTINATIONS.map(({ id, label, location: target }) => {
        const icon = id === 'profile' ? <UserRound size={20} /> : <SENNavigationIcon name={icons[id]} size={20} />;
        return { id, label, icon, active: selected === id,
          onSelect: () => { if (libraryLocationKey(location) !== libraryLocationKey(target)) onNavigate(target); } };
      })} />
  </div>;
}
