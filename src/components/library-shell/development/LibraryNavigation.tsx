import { createContext, useContext, type ReactNode } from 'react';
import { BookOpen, Compass, House, UserRound } from 'lucide-react';
import { LibraryBottomNavigation, LibraryNavigationDrawerPanel, type LibraryNavigationDrawerSection } from '@seihouse/library-ui';
import { activeLibraryDestination, LIBRARY_DESTINATIONS, libraryLocationKey, libraryNavigationMode, type LibraryLocation, type LibraryNavigationMode } from './libraryRoutes';
import './library-navigation.css';

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
const icons = { home: House, library: BookOpen, discover: Compass, profile: UserRound };

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
        const Icon = icons[id];
        return { id, label, icon: <Icon size={20} />, active: selected === id,
          onSelect: () => { if (libraryLocationKey(location) !== libraryLocationKey(target)) onNavigate(target); } };
      })} />
  </div>;
}
