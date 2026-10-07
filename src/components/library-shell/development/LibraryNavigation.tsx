import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { List } from 'lucide-react';
import {
  LibraryBottomNavigation, LibraryNavigationDrawer, LibraryNavigationDrawerPanel,
  type LibraryNavigationDrawerProfile, type LibraryNavigationDrawerSection,
} from '@seihouse/library-ui';
import { activeLibraryDestination, LIBRARY_DESTINATIONS, libraryLocationKey, libraryNavigationMode, type LibraryDestination, type LibraryLocation, type LibraryNavigationMode } from './libraryRoutes';
import { DESKTOP_NAVIGATION_QUERY, useDesktopNavigation } from './workspaceMedia';
import { useLibrarySidebarMode, type LibrarySidebarMode } from './librarySidebarMode';
import { useLibraryAssets } from '../../../library/assets';
import './library-navigation.css';
import { LibraryNavigationIcon as SENNavigationIcon, type LibraryNavigationIconName as SENNavigationIconName } from '@seihouse/library-ui';
import { LibraryExitIcon as SENExitIcon, LibraryProfileIcon as SENProfileIcon, LibrarySettingsIcon as SENSettingsIcon } from '@seihouse/library-ui';

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
   * The reader shown at the top of the laptop Pathways sidebar: picture, name
   * and cultivation rank (`detail`). Selecting it opens their profile.
   */
  profile?: LibraryNavigationDrawerProfile;
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
interface MainState {
  location: LibraryLocation;
  onNavigate: (location: LibraryLocation) => void;
  selected: LibraryDestination | undefined;
  profile?: LibraryNavigationDrawerProfile;
}
interface NavigationContextValue {
  menu: LibrarySectionMenu | null;
  workspace: WorkspaceState | null;
  main: MainState | null;
}
const Context = createContext<NavigationContextValue>({ menu: null, workspace: null, main: null });

/**
 * How main mode navigates on laptops and desktops (from 1024px). `sidebar` is
 * the Pathways sidebar; `strip` keeps the phone's bottom strip at every width.
 * Phones and tablets always use the strip. A host sets it once for the app.
 */
export type LibraryDesktopNavigation = 'sidebar' | 'strip';
interface DesktopNavigationSettings {
  value: LibraryDesktopNavigation;
  sidebarMode?: LibrarySidebarMode;
  onSidebarModeChange?: (mode: LibrarySidebarMode) => void;
}
const DesktopNavigationContext = createContext<DesktopNavigationSettings>({ value: 'sidebar' });
/**
 * A host's laptop navigation settings. `sidebarMode` with `onSidebarModeChange`
 * lets the host remember the reader's Pathways sidebar choice — per device or
 * in account settings; without them the choice lasts for the visit.
 */
export function LibraryDesktopNavigationProvider({ value, sidebarMode, onSidebarModeChange, children }: DesktopNavigationSettings & { children: ReactNode }) {
  const settings = useMemo(() => ({ value, sidebarMode, onSidebarModeChange }), [value, sidebarMode, onSidebarModeChange]);
  return <DesktopNavigationContext.Provider value={settings}>{children}</DesktopNavigationContext.Provider>;
}
export function useLibraryDesktopNavigation() {
  return useContext(DesktopNavigationContext).value;
}
/**
 * True while main mode is showing the Pathways sidebar: a laptop-or-wider
 * viewport with the `sidebar` setting. The header and Home use it to move Dao
 * Insights into the header and to avoid repeating the sidebar's identity.
 */
export function useLibraryPathways() {
  const { main } = useContext(Context);
  const desktopNavigation = useLibraryDesktopNavigation();
  const desktop = useDesktopNavigation();
  return Boolean(main) && desktopNavigation === 'sidebar' && desktop;
}
/**
 * The sidebar preference for a shell whose rail is the Pathways sidebar, or
 * null elsewhere (workspace mode, the strip setting, no Library navigation).
 * `WorkspaceShell` applies it, so every main-mode page shares one choice: the
 * host's when it supplies one, otherwise the visit's.
 */
export function useLibraryPathwaysRail(): { mode: LibrarySidebarMode; setMode: (mode: LibrarySidebarMode) => void } | null {
  const { main } = useContext(Context);
  const settings = useContext(DesktopNavigationContext);
  const [visitMode, setVisitMode] = useLibrarySidebarMode();
  if (!main || settings.value !== 'sidebar') return null;
  return settings.sidebarMode && settings.onSidebarModeChange
    ? { mode: settings.sidebarMode, setMode: settings.onSidebarModeChange }
    : { mode: visitMode, setMode: setVisitMode };
}
const icons = { home: 'home', create: 'book', discover: 'discovery' } as const satisfies Record<string, SENNavigationIconName>;

/**
 * The desktop rail's contents, in either mode. `WorkspaceShell` owns the column.
 * - Main mode shows the Pathways sidebar: the reader's picture, name and rank,
 *   the four destinations with a page's own sub-pages nested under the active
 *   one, Settings in the footer, and the host's artwork. It is open by default;
 *   double tap/click anywhere toggles the icon rail and expanded width.
 * - Workspace mode shows the task's sections in the same Pathways styling.
 * - With the `strip` setting, main mode keeps the page's own section panel.
 */
export function LibrarySectionSidebar() {
  const { menu, workspace, main } = useContext(Context);
  const desktopNavigation = useLibraryDesktopNavigation();
  if (workspace) return <LibraryNavigationDrawerPanel variant="pathways" aria-label={workspace.label} profile={workspace.profile} sections={workspace.sections} />;
  if (main && desktopNavigation === 'sidebar') return <PathwaysSidebar main={main} menu={menu} />;
  return menu ? <LibraryNavigationDrawerPanel aria-label={menu.label} sections={menu.sections} /> : null;
}

function PathwaysSidebar({ main, menu }: { main: MainState; menu: LibrarySectionMenu | null }) {
  const { navigationArtwork } = useLibraryAssets();
  const { location, onNavigate, selected, profile } = main;
  const go = (target: LibraryLocation) => { if (libraryLocationKey(location) !== libraryLocationKey(target)) onNavigate(target); };
  // The page's own sections nest under the pathway you are on (e.g. Profile → Home, Stories, Rewards).
  const nested = menu?.sections.flatMap(section => section.items) ?? [];
  const settings: LibraryLocation = { screen: 'profile', cave: '/settings' };
  // The Celestial Library logo stays in the header; the top of the sidebar is the reader's.
  return <LibraryNavigationDrawerPanel variant="pathways"
    aria-label="Library pathways" profile={profile}
    sections={[{ id: 'pathways', label: 'Pathways', items: LIBRARY_DESTINATIONS.map(({ id, label, location: target }) => ({
      id, label, active: selected === id,
      icon: id === 'profile' ? <SENProfileIcon size={20} /> : <SENNavigationIcon name={icons[id]} size={20} />,
      onSelect: () => go(target),
      children: selected === id && nested.length ? nested.map(({ id: childId, label: childLabel, icon, active, onSelect }) => ({
        id: childId, label: childLabel, icon, active, onSelect,
      })) : undefined,
    })) }]}
    footer={{ divider: true, items: [
      { id: 'settings', label: 'Settings', icon: <SENSettingsIcon size={18} />,
        active: location.screen === 'profile' && Boolean(location.cave?.startsWith('/settings')), onSelect: () => go(settings) },
    ] }}
    artwork={navigationArtwork ? { type: 'image', src: navigationArtwork } : undefined} />;
}

/** Workspace mode's drawer state, for pages that open or close it themselves. */
export function useLibraryWorkspace() {
  const { workspace } = useContext(Context);
  if (!workspace) throw new Error('useLibraryWorkspace requires LibraryNavigation in workspace mode');
  return workspace;
}

/**
 * The Library's one navigation system. Main mode is Home, Create, Discover,
 * Profile: the bottom strip on phones and tablets and, from 1024px, the
 * Pathways sidebar (`LibrarySectionSidebar`) with a page's own sub-pages (the
 * Cave's) nested under the active pathway. Workspace mode is a
 * focused task's own bar, Sections drawer and rail, drawn by the same shell
 * from the task's definition. Pages supply destinations, never a strip.
 */
export function LibraryNavigation(props: LibraryNavigationProps) {
  if ('workspace' in props) return <WorkspaceNavigation workspace={props.workspace}>{props.children}</WorkspaceNavigation>;
  const { location, onNavigate, sectionMenu, profile, mode, children } = props;
  // Immersive and workspace routes cannot be overridden by the standard default.
  const routeMode = libraryNavigationMode(location.screen);
  const resolvedMode = routeMode !== 'standard' ? routeMode : mode ?? 'standard';
  const main = resolvedMode === 'standard' ? { location, onNavigate, selected: activeLibraryDestination(location), profile } : null;
  return <Context.Provider value={{ menu: sectionMenu ?? null, workspace: null, main }}>
    {main ? <MainNavigation location={location} onNavigate={onNavigate}>{children}</MainNavigation> : children}
  </Context.Provider>;
}

function MainNavigation({ location, onNavigate, children }: Pick<LibraryMainNavigationProps, 'location' | 'onNavigate' | 'children'>) {
  const selected = activeLibraryDestination(location);
  const desktopNavigation = useLibraryDesktopNavigation();
  // From 1024px the Pathways sidebar replaces the strip unless the host keeps the strip.
  return <div className="library-navigation-layout" data-library-mode="main" data-library-destination={selected}
    data-library-desktop-navigation={desktopNavigation}>
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
  return <Context.Provider value={{ menu: null, workspace: state, main: null }}>
    <div className="library-navigation-layout" data-library-mode="workspace">
      {children}
      {/* The same bar and placement as the global strip; only the items differ.
          From the desktop breakpoint the rail and the header take over. */}
      <LibraryBottomNavigation aria-label={workspace.barLabel} className="library-global-navigation library-workspace-navigation"
        showLabels items={items} />
    </div>
    <LibraryNavigationDrawer variant="pathways" open={drawerOpen} onClose={closeDrawer} aria-label={workspace.label}
      closeLabel={workspace.closeLabel} profile={workspace.profile} sections={sections} />
  </Context.Provider>;
}
