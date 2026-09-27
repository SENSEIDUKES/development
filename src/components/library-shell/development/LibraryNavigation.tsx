import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { List } from 'lucide-react';
import {
  LibraryBottomNavigation, LibraryNavigationDrawer, LibraryNavigationDrawerPanel,
  type LibraryNavigationDrawerProfile, type LibraryNavigationDrawerSection,
} from '@seihouse/library-ui';
import { activeLibraryDestination, LIBRARY_DESTINATIONS, libraryLocationKey, libraryNavigationMode, type LibraryLocation, type LibraryNavigationMode } from './libraryRoutes';
import { DESKTOP_NAVIGATION_QUERY } from './workspaceMedia';
import './library-navigation.css';
import { LibraryNavigationIcon as SENNavigationIcon, type LibraryNavigationIconName as SENNavigationIconName } from '@seihouse/library-ui';
import { LibraryExitIcon as SENExitIcon, LibraryProfileIcon as SENProfileIcon } from '@seihouse/library-ui';

type SectionItem = LibraryNavigationDrawerSection['items'][number] & { onSelect?: (id: string) => void };
type Section = Omit<LibraryNavigationDrawerSection, 'items'> & { items: SectionItem[] };

/** A page's own destinations, shown in the desktop rail in main mode. */
export interface LibrarySectionMenu {
  label: string;
  sections: Array<Omit<LibraryNavigationDrawerSection, 'items'> & { items: Array<SectionItem & { onSelect: (id: string) => void }> }>;
}

/** One of a workspace's own tools on its bottom bar, between Sections and Back. */
export interface LibraryWorkspaceTool {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onSelect: () => void;
}

/**
 * Everything a focused task (Story Seed today) tells the Library Shell about
 * its navigation. The shell draws it: the Sections drawer on phones and
 * tablets, the desktop rail, and the bottom task bar that stands in for the
 * global strip — Sections, the task's tools, then Back.
 */
export interface LibraryWorkspaceDefinition {
  /** Names the Sections drawer and the desktop rail. */
  label: string;
  closeLabel: string;
  /** Names the bottom task bar. */
  barLabel: string;
  profile?: LibraryNavigationDrawerProfile;
  /** Grouped destinations for the drawer and the rail. */
  sections: Section[];
  /** The task's own controls on the bar. */
  tools?: readonly LibraryWorkspaceTool[];
  /** Leaves the workspace through the host, never browser history. */
  back: { label?: string; onBack: () => void };
}

export interface LibraryMainNavigationProps {
  location: LibraryLocation;
  onNavigate: (location: LibraryLocation) => void;
  /** The page's own destinations for its optional desktop rail. */
  sectionMenu?: LibrarySectionMenu;
  /**
   * The route decides the mode. A workspace or immersive route renders its
   * children untouched here: a workspace brings its own definition through
   * workspace mode, and the Reader stays outside the shell.
   */
  mode?: LibraryNavigationMode;
  children: ReactNode;
}
export interface LibraryWorkspaceNavigationProps {
  mode: 'workspace';
  workspace: LibraryWorkspaceDefinition;
  children: ReactNode;
}
export type LibraryNavigationProps = LibraryMainNavigationProps | LibraryWorkspaceNavigationProps;

interface WorkspaceState {
  label: string;
  profile?: LibraryNavigationDrawerProfile;
  sections: Section[];
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}
interface NavigationContextValue {
  menu: LibrarySectionMenu | null;
  workspace: WorkspaceState | null;
}
const Context = createContext<NavigationContextValue>({ menu: null, workspace: null });
const icons = { home: 'home', create: 'book', discover: 'discovery' } as const satisfies Record<string, SENNavigationIconName>;

/**
 * The desktop rail's contents, in either mode: a main-mode page's own
 * destinations, or a workspace's sections. `WorkspaceShell` owns the column.
 */
export function LibrarySectionSidebar() {
  const { menu, workspace } = useContext(Context);
  if (workspace) return <LibraryNavigationDrawerPanel aria-label={workspace.label} profile={workspace.profile} sections={workspace.sections} />;
  return menu ? <LibraryNavigationDrawerPanel aria-label={menu.label} sections={menu.sections} /> : null;
}

/** Workspace mode's drawer state, for pages that open or close it themselves. */
export function useLibraryWorkspace() {
  const { workspace } = useContext(Context);
  if (!workspace) throw new Error('useLibraryWorkspace requires LibraryNavigation in workspace mode');
  return workspace;
}

/**
 * The Library's one navigation system. Main mode is the global strip — Home,
 * Create, Discover, Profile — with an optional page rail. Workspace mode is a
 * focused task's own bar, Sections drawer and rail, drawn by the same shell
 * from the task's definition. Pages supply destinations, never a strip.
 */
export function LibraryNavigation(props: LibraryNavigationProps) {
  if ('workspace' in props) return <WorkspaceNavigation workspace={props.workspace}>{props.children}</WorkspaceNavigation>;
  const { location, onNavigate, sectionMenu, mode, children } = props;
  // Immersive and workspace routes cannot be overridden by the standard default.
  const routeMode = libraryNavigationMode(location.screen);
  const resolvedMode = routeMode !== 'standard' ? routeMode : mode ?? 'standard';
  return <Context.Provider value={{ menu: sectionMenu ?? null, workspace: null }}>
    {resolvedMode === 'standard' ? <MainNavigation location={location} onNavigate={onNavigate}>{children}</MainNavigation> : children}
  </Context.Provider>;
}

function MainNavigation({ location, onNavigate, children }: Pick<LibraryMainNavigationProps, 'location' | 'onNavigate' | 'children'>) {
  const selected = activeLibraryDestination(location);
  return <div className="library-navigation-layout" data-library-mode="main" data-library-destination={selected}>
    {children}
    <LibraryBottomNavigation aria-label="Library global navigation" className="library-global-navigation" showLabels
      items={LIBRARY_DESTINATIONS.map(({ id, label, location: target }) => {
        const icon = id === 'profile' ? <SENProfileIcon size={20} /> : <SENNavigationIcon name={icons[id]} size={20} />;
        return { id, label, icon, active: selected === id,
          onSelect: () => { if (libraryLocationKey(location) !== libraryLocationKey(target)) onNavigate(target); } };
      })} />
  </div>;
}

function WorkspaceNavigation({ workspace, children }: { workspace: LibraryWorkspaceDefinition; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The rail replaces the drawer from the desktop breakpoint; never leave one open behind it.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_NAVIGATION_QUERY);
    const dismissOnDesktop = () => { if (desktop.matches) setDrawerOpen(false); };
    desktop.addEventListener('change', dismissOnDesktop);
    return () => desktop.removeEventListener('change', dismissOnDesktop);
  }, []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // Choosing a destination always closes the drawer first.
  const sections = useMemo(() => workspace.sections.map(section => ({ ...section,
    items: section.items.map(item => ({ ...item, onSelect: (id: string) => { setDrawerOpen(false); item.onSelect?.(id); } })),
  })), [workspace.sections]);
  const state = useMemo<WorkspaceState>(() => ({
    label: workspace.label, profile: workspace.profile, sections, drawerOpen, openDrawer, closeDrawer,
  }), [workspace.label, workspace.profile, sections, drawerOpen, openDrawer, closeDrawer]);
  const { back, tools = [] } = workspace;
  const items = [
    ...(sections.length ? [{ id: 'sections', label: 'Sections', icon: <List size={20} />, active: drawerOpen, onSelect: openDrawer }] : []),
    ...tools.map(({ id, label, icon, active, onSelect }) => ({ id, label, icon, active, onSelect })),
    { id: 'back', label: back.label ?? 'Back', icon: <SENExitIcon size={20} aria-hidden="true" />,
      onSelect: () => { setDrawerOpen(false); back.onBack(); } },
  ];
  return <Context.Provider value={{ menu: null, workspace: state }}>
    <div className="library-navigation-layout" data-library-mode="workspace">
      {children}
      {/* The same bar and placement as the global strip; only the items differ.
          From the desktop breakpoint the rail and the header take over. */}
      <LibraryBottomNavigation aria-label={workspace.barLabel} className="library-global-navigation library-workspace-navigation"
        showLabels items={items} />
    </div>
    <LibraryNavigationDrawer open={drawerOpen} onClose={closeDrawer} aria-label={workspace.label}
      closeLabel={workspace.closeLabel} profile={workspace.profile} sections={sections} />
  </Context.Provider>;
}
