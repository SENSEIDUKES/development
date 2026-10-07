import { type ReactNode, type Ref } from 'react';
import { SEIAppShell } from '@seihouse/ui';
import { useLibraryPathwaysRail } from './LibraryNavigation';
import './workspace-shell.css';

/** The one narrow rail width every Development workspace shares. */
export const WORKSPACE_SIDEBAR_WIDTH = '14rem';
/** The Pathways icon rail's width while it rests. */
export const WORKSPACE_SIDEBAR_COMPACT_WIDTH = '4.5rem';

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
 * — open (the default) or minimized to the icon rail. The UI package owns
 * double tap or double click anywhere on the rail to toggle both widths,
 * with a keyboard-focus-only width control. Hover and focus never change it.
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
  // The canonical package owns the gesture; the Library owns its preference.
  const pathways = rail && sidebar ? {
    sidebarBehavior: 'double-tap' as const, sidebarMode: rail.mode, onSidebarModeChange: rail.setMode,
    sidebarCollapsedWidth: WORKSPACE_SIDEBAR_COMPACT_WIDTH,
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
