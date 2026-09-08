import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  NarrativeNavigationDrawer, NarrativeNavigationDrawerPanel, NarrativeBottomNavigation,
  type NarrativeNavigationDrawerProfile, type NarrativeNavigationDrawerSection,
  type NarrativeBottomNavigationItem,
} from '../../../presentation';

export interface WorkspaceNavigationDefinition {
  label: string;
  closeLabel: string;
  profile?: NarrativeNavigationDrawerProfile;
  sections: NarrativeNavigationDrawerSection[];
}
interface NavigationState {
  definition: WorkspaceNavigationDefinition;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}
const Context = createContext<NavigationState | null>(null);
export function useWorkspaceNavigation() {
  const context = useContext(Context);
  if (!context) throw new Error('Workspace navigation requires a feature definition');
  return context;
}

/** One feature definition drives the sidebar and drawer. No destination or eligibility logic. */
export function WorkspaceNavigation({ definition, children }: { definition: WorkspaceNavigationDefinition; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const dismissOnDesktop = () => { if (desktop.matches) setDrawerOpen(false); };
    desktop.addEventListener('change', dismissOnDesktop);
    return () => desktop.removeEventListener('change', dismissOnDesktop);
  }, []);
  const sections = useMemo(() => definition.sections.map(section => ({ ...section,
    items: section.items.map(item => ({ ...item, onSelect: (id: string) => { setDrawerOpen(false); item.onSelect?.(id); } })),
  })), [definition.sections]);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const contextValue = useMemo(() => ({
    definition: { ...definition, sections }, drawerOpen, openDrawer, closeDrawer,
  }), [definition, sections, drawerOpen, openDrawer, closeDrawer]);
  return <Context.Provider value={contextValue}>
    {children}
    <NarrativeNavigationDrawer open={drawerOpen} onClose={closeDrawer}
      aria-label={definition.label} closeLabel={definition.closeLabel} profile={definition.profile} sections={sections} />
  </Context.Provider>;
}

export function WorkspaceSidebar() {
  const { definition } = useWorkspaceNavigation();
  return <aside className="hidden border-r border-neutral-900/70 lg:block">
    <NarrativeNavigationDrawerPanel aria-label={definition.label} profile={definition.profile} sections={definition.sections} />
  </aside>;
}

export function WorkspaceBottomControls({ label, items }: { label: string; items: NarrativeBottomNavigationItem[] }) {
  return <NarrativeBottomNavigation aria-label={label} items={items} showLabels
    className="lg:hidden [&_button]:px-1 [&_button]:text-[9px] [&_button]:tracking-normal [&_button>span:last-child]:max-w-none [&_button>span:last-child]:overflow-visible" />;
}
