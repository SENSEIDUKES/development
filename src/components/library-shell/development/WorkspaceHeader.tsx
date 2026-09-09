import type { ReactNode } from 'react';
import { SEIAppHeader, SEIToolbar } from '@seihouse/ui';
import { NarrativeButton as LibraryButton, NarrativeHeaderBadge as LibraryHeaderBadge } from '../../../presentation';
import { ArrowLeft } from 'lucide-react';
import { HeaderActionButton, HeaderOverflow, type HeaderAction } from './WorkspaceHeaderActions';
import { useCompactHeader } from './workspaceMedia';
import { WorkspaceHeaderUtilities, type HeaderSearchItem } from './WorkspaceHeaderUtilities';
import './workspace-header.css';

export interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  emblem?: { src: string; alt: string };
  home?: { href: string; label: string; onNavigate?: () => void };
  back?: { label: string; onNavigate: () => void };
  primaryAction?: HeaderAction;
  secondaryActions?: readonly HeaderAction[];
  overflowActions?: readonly HeaderAction[];
  /** Optional page-owned content after the badge; provide a compact presentation on phones. */
  contextualItem?: ReactNode;
  help?: HeaderAction;
  searchItems?: readonly HeaderSearchItem[];
  status?: { label: string; tone?: 'neutral' | 'success' | 'busy' | 'error' };
  /** `'none'` when a host — `WorkspaceShell` — already provides the banner landmark. */
  landmark?: 'banner' | 'none';
}

/**
 * Library-branded workspace chrome. A thin adapter over the canonical
 * `SEIAppHeader`: it owns no layout, height, stickiness, safe areas or focus
 * behavior of its own, only the Library identity and the action composition
 * that goes into the canonical slots. No seed, cultivation, routing or storage
 * logic.
 *
 * The visible identity stays the Library badge in its compact
 * App Header-compatible presentation, so the workspace still reads as the
 * Celestial Library inside universal application chrome.
 */
export function WorkspaceHeader({ title, subtitle, emblem, home, back, primaryAction,
  secondaryActions = [], overflowActions = [], contextualItem, help, searchItems = [],
  status, landmark = 'banner' }: WorkspaceHeaderProps) {
  const compact = useCompactHeader();
  const commands = [...secondaryActions, ...(primaryAction ? [primaryAction] : []), ...overflowActions];
  const searchCommands = [...searchItems, ...commands.filter(action => !searchItems.some(item => item.id === action.id))];
  return <>
  <SEIAppHeader
    landmark={landmark}
    aria-label={landmark === 'banner' ? `${title} workspace header` : undefined}
    className="workspace-header"
    innerClassName="workspace-header-inner"
    identityClassName="workspace-header-identity"
    actionsClassName="workspace-header-actions"
    // The badge carries the emblem, title and subtitle, so it takes the
    // truncating identity column rather than the fixed-width branding slot.
    branding={back && <LibraryButton variant="ghost" size="icon" icon={ArrowLeft}
      aria-label={back.label} onClick={back.onNavigate} />}
    appName={<span className="workspace-header-badge" onClick={event => {
      // Canonical badge owns the link markup; the host may intercept ordinary navigation.
      if (home?.onNavigate && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
        && (event.target as Element).closest('a')) {
        event.preventDefault();
        home.onNavigate();
      }
    }}>
      <LibraryHeaderBadge mode="app-header" title={title} subtitle={subtitle}
        emblemSrc={emblem?.src} emblemAlt={emblem?.alt}
        emblemHref={home?.href} emblemLinkLabel={home?.label} />
    </span>}
    actions={<>
      {contextualItem != null && contextualItem !== false && contextualItem !== '' && <div className="workspace-header-context">{contextualItem}</div>}
      <WorkspaceHeaderUtilities items={searchCommands} help={help} />
    </>}
  />
  {(status || commands.length > 0) && <SEIToolbar aria-label={`${title} actions`} rovingFocus={false}
    className="workspace-header-toolbar" start={
      status && <p role="status" className="workspace-header-status" data-tone={status.tone ?? 'neutral'} title={status.label}>
        <span aria-hidden="true" /><span className="workspace-header-status-label">{status.label}</span>
      </p>
    } end={<div className="workspace-header-command-area">
        <div className="workspace-secondary-actions">{secondaryActions.map(action => <HeaderActionButton key={action.id} action={action} />)}</div>
        {primaryAction && <div className="workspace-primary-action"><HeaderActionButton action={primaryAction} primary /></div>}
        <HeaderOverflow actions={compact ? [...secondaryActions, ...overflowActions] : overflowActions} />
      </div>} />}
  </>;
}
