import { useRef, type PointerEvent, type ReactNode, type Ref } from 'react';
import { SEIAppShell } from '@seihouse/ui';
import { useLibraryPathwaysRail } from './LibraryNavigation';
import './workspace-shell.css';

/** The one narrow rail width every Development workspace shares. */
export const WORKSPACE_SIDEBAR_WIDTH = '14rem';
/** The Pathways icon rail's width while it rests. */
export const WORKSPACE_SIDEBAR_COMPACT_WIDTH = '4.5rem';
/** Two taps or clicks on the minimized rail within this window, and this close, expand it. */
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_SLOP_PX = 24;

export interface WorkspaceShellProps {
  /** The workspace header — pass `landmark="none"`; the shell owns the banner. */
  header: ReactNode;
  /** Desktop navigation rail. The canonical shell reveals it from `lg`. */
  sidebar?: ReactNode;
  sidebarLabel?: string;
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  mainId?: string;
  mainAriaLabel?: string;
  /**
   * The scrolling content region. Browsing screens scroll inside the shell's
   * fixed frame, so a host that restores or resets scroll position — a route
   * change, a focus return — uses this rather than `window`.
   */
  mainRef?: Ref<HTMLElement>;
}

/**
 * Library-branded workspace scaffold. A thin adapter over the canonical
 * `SEIAppShell`: the fixed frame, the header row, the independently
 * scrolling sidebar and `<main>`, and the breakpoint the rail appears at are
 * all the canonical component's. This adapter supplies only the Library rail
 * width and its `lg` hand-off — below `lg` the drawer and the bottom controls
 * own navigation, so the rail is never offered twice. When the rail is the
 * main-mode Pathways sidebar it also applies the reader's remembered choice
 * — open (the default) or minimized to the icon rail. The star beside the
 * profile minimizes it; a double tap or double click anywhere on the
 * minimized rail expands it. Hover and focus never change its width.
 *
 * The Reader Chamber is deliberately not a consumer: it is immersive and
 * scrolls the document itself, which its cinematic scrolling depends on.
 * See the Library Shell README.
 */
export function WorkspaceShell({
  header, sidebar, sidebarLabel, children, className = '',
  mainClassName = '', mainId, mainAriaLabel, mainRef,
}: WorkspaceShellProps) {
  const rail = useLibraryPathwaysRail();
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  // Double tap (touch) or double click (mouse) on the minimized rail expands it.
  // Pointer events cover both; single taps on its icons still navigate.
  const expandOnDoubleTap = (event: PointerEvent<HTMLDivElement>) => {
    if (!rail || rail.mode !== 'compact' || event.button !== 0
      || !(event.target as Element).closest('[data-slot="app-shell-sidebar"]')) { lastTap.current = null; return; }
    const previous = lastTap.current;
    if (previous && event.timeStamp - previous.time <= DOUBLE_TAP_MS
      && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= DOUBLE_TAP_SLOP_PX) {
      lastTap.current = null;
      rail.setMode('pinned');
      return;
    }
    lastTap.current = { time: event.timeStamp, x: event.clientX, y: event.clientY };
  };
  // Click-only: hover and focus never change the rail's width.
  const pathways = rail && sidebar ? {
    sidebarBehavior: 'click' as const, sidebarMode: rail.mode, onSidebarModeChange: rail.setMode,
    sidebarCollapsedWidth: WORKSPACE_SIDEBAR_COMPACT_WIDTH, onPointerUp: expandOnDoubleTap,
  } : {};
  return <SEIAppShell
    {...pathways}
    header={header}
    sidebar={sidebar}
    sidebarWidth={WORKSPACE_SIDEBAR_WIDTH}
    sidebarBreakpoint="lg"
    sidebarLabel={sidebarLabel}
    mainId={mainId}
    mainRef={mainRef}
    mainAriaLabel={mainAriaLabel}
    mainClassName={`workspace-shell-main ${mainClassName}`.trim()}
    // `library-scrollbars` opts the page, rail and anything inside into the
    // Library's gold overlay scrollbar (Library UI skin).
    className={`workspace-shell library-scrollbars ${className}`.trim()}
  >{children}</SEIAppShell>;
}
