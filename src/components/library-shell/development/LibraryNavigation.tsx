import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, Compass, House, List, UserRound } from 'lucide-react';
import { LibraryBottomNavigation, LibraryNavigationDrawerPanel, type LibraryNavigationDrawerSection } from '@seihouse/library-ui';
import { WorkspaceSheet } from './WorkspaceSheet';
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
  sectionMenu?: LibrarySectionMenu;
  /** Other specialized workspaces may explicitly retain their own navigation. */
  mode?: LibraryNavigationMode;
  children: ReactNode;
}
const Context = createContext<LibrarySectionMenu | null>(null);
const icons = { home: House, library: BookOpen, discover: Compass, profile: UserRound };

/** Optional existing desktop rail; reads the exact same page definition as Section. */
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
    {resolvedMode === 'standard' ? <StandardNavigation location={location} onNavigate={onNavigate} sectionMenu={sectionMenu}>{children}</StandardNavigation> : children}
  </Context.Provider>;
}

function StandardNavigation({ location, onNavigate, sectionMenu, children }: LibraryNavigationProps) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLButtonElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const dispatchTimer = useRef<number | undefined>(undefined);
  const menuId = useId();
  const selected = activeLibraryDestination(location);
  const menu = sectionMenu ?? { label: 'Page sections', sections: [] };
  const hasItems = menu.sections.some(section => section.items.length > 0);
  const routeKey = libraryLocationKey(location);
  const menuRoute = useRef(routeKey);
  useEffect(() => { pending.current = null; window.clearTimeout(dispatchTimer.current); setOpen(false); }, [routeKey]);

  useLayoutEffect(() => {
    // The published bottom-nav item contract describes destinations only. Bridge
    // disclosure semantics here without changing that shared primitive or Story Seed.
    const trigger = navRef.current?.querySelector<HTMLButtonElement>('button');
    if (!trigger) return;
    sectionRef.current = trigger;
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-controls', menuId);
  }, [open, menuId]);

  // Dispatch after the modal releases focus, so page navigation can focus its heading.
  const selectSection = (action: () => void) => {
    pending.current = action;
    setOpen(false);
  };
  useEffect(() => () => { pending.current = null; window.clearTimeout(dispatchTimer.current); }, []);
  return <div className="library-navigation-layout" data-library-destination={selected}>
    {children}
    <div ref={navRef}>
      <LibraryBottomNavigation aria-label="Library global navigation" className="library-global-navigation" showLabels items={[
        { id: 'section', label: 'Section', icon: <List size={20} />, onSelect: () => { menuRoute.current = routeKey; setOpen(true); } },
        ...LIBRARY_DESTINATIONS.map(({ id, label, location: target }) => {
          const Icon = icons[id];
          return { id, label, icon: <Icon size={20} />, active: selected === id,
            onSelect: () => { if (libraryLocationKey(location) !== libraryLocationKey(target)) onNavigate(target); } };
        }),
      ]} />
    </div>
    <WorkspaceSheet open={open} onOpenChange={setOpen} title={menu.label} closeLabel="Close Section menu" returnFocusRef={sectionRef}
      onOpenChangeComplete={isOpen => {
        if (isOpen) return;
        const action = pending.current;
        pending.current = null;
        // The completion callback runs before the dialog's final unmount commit.
        // Let it release the focus trap before the destination takes focus.
        if (action || menuRoute.current !== routeKey) dispatchTimer.current = window.setTimeout(() => {
          if (action) action();
          else navRef.current?.parentElement?.querySelector<HTMLElement>('main h2[tabindex], main[tabindex]')?.focus();
        }, 0);
      }}>
      <div id={menuId} className="library-section-menu">
        {hasItems ? <LibraryNavigationDrawerPanel aria-label={menu.label} sections={menu.sections.map(section => ({ ...section,
          items: section.items.map(item => ({ ...item, onSelect: () => selectSection(() => item.onSelect(item.id)) })),
        }))} /> : <p className="p-4 text-sm text-neutral-400">There are no sections on this page.</p>}
      </div>
    </WorkspaceSheet>
  </div>;
}
