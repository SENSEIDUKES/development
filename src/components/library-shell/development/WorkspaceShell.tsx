import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { SEIAppShell } from '@seihouse/ui';
import { useDesktopNavigation } from './workspaceMedia';
import './workspace-shell.css';

/** The one narrow rail width every Development workspace shares. */
export const WORKSPACE_SIDEBAR_WIDTH = '14rem';

export interface WorkspaceShellProps {
  /** The workspace header — pass `landmark="none"`; the shell owns the banner. */
  header: ReactNode;
  /** Desktop navigation rail. Rendered only once the desktop breakpoint fits. */
  sidebar?: ReactNode;
  sidebarLabel?: string;
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  mainId?: string;
  mainAriaLabel?: string;
}

/**
 * Library-branded workspace scaffold. A thin adapter over the canonical
 * `SEIAppShell`: the grid, the sticky header row, the sidebar column and the
 * `<main>` landmark are all the canonical component's.
 *
 * The one thing this adapter decides is *when* the rail exists. `SEIAppShell`
 * reveals its sidebar column from `md`, while the drawer and the bottom
 * controls hand over at `lg`. Passing the sidebar only from `lg` reconciles
 * the two: phones and tablets keep the drawer and the bottom controls, no
 * empty column is ever painted at tablet width, and navigation is never
 * offered twice at once.
 */
export function WorkspaceShell({
  header, sidebar, sidebarLabel, children, className = '',
  mainClassName = '', mainId, mainAriaLabel,
}: WorkspaceShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const shell = shellRef.current;
    const headerElement = shell?.querySelector<HTMLElement>('[data-slot="app-shell-header"]');
    if (!shell || !headerElement) return;
    const measure = () => shell.style.setProperty('--workspace-header-height', `${headerElement.getBoundingClientRect().height}px`);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(headerElement);
    return () => observer.disconnect();
  }, []);
  const desktop = useDesktopNavigation();
  const rail = desktop && sidebar
    ? <div className="workspace-shell-rail">{sidebar}</div>
    : undefined;
  return <SEIAppShell
    ref={shellRef}
    header={header}
    sidebar={rail}
    sidebarWidth={WORKSPACE_SIDEBAR_WIDTH}
    sidebarLabel={sidebarLabel}
    mainId={mainId}
    mainAriaLabel={mainAriaLabel}
    mainClassName={`workspace-shell-main ${mainClassName}`}
    className={`workspace-shell ${className}`}
  >{children}</SEIAppShell>;
}
