import { LibraryButton, LibraryHeaderBadge } from '@seihouse/library-ui';
import { ArrowLeft } from 'lucide-react';
import { HeaderActionButton, HeaderFoundation, HeaderOverflow, useCompactHeader, type HeaderAction } from './HeaderFoundation';

export interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  emblem?: { src: string; alt: string };
  home?: { href: string; label: string; onNavigate?: () => void };
  back?: { label: string; onNavigate: () => void };
  primaryAction?: HeaderAction;
  secondaryActions?: readonly HeaderAction[];
  overflowActions?: readonly HeaderAction[];
  status?: { label: string; tone?: 'neutral' | 'success' | 'busy' | 'error' };
}

/** Library-branded workspace composition. No seed, cultivation, routing or storage logic. */
export function WorkspaceHeader({ title, subtitle, emblem, home, back, primaryAction,
  secondaryActions = [], overflowActions = [], status }: WorkspaceHeaderProps) {
  const compact = useCompactHeader();
  return <HeaderFoundation label={`${title} workspace header`} className="workspace-header">
    <div className="workspace-header-identity">
      {back && <LibraryButton variant="ghost" size="icon" icon={ArrowLeft} aria-label={back.label} onClick={back.onNavigate} />}
      <div className="workspace-header-badge" onClick={event => {
        // Canonical badge owns the link markup; the host may intercept ordinary navigation.
        if (home?.onNavigate && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
          && (event.target as Element).closest('a')) {
          event.preventDefault();
          home.onNavigate();
        }
      }}>
        <LibraryHeaderBadge title={title} subtitle={subtitle} emblemSrc={emblem?.src} emblemAlt={emblem?.alt}
          emblemHref={home?.href} emblemLinkLabel={home?.label} />
      </div>
    </div>
    <div className="workspace-header-command-area">
      {status && <p role="status" className="workspace-header-status" data-tone={status.tone ?? 'neutral'}>
        <span aria-hidden="true" />{status.label}
      </p>}
      <div className="workspace-header-actions" role="group" aria-label={`${title} actions`}>
        <div className="workspace-secondary-actions">{secondaryActions.map(action => <HeaderActionButton key={action.id} action={action} />)}</div>
        {primaryAction && <div className="workspace-primary-action"><HeaderActionButton action={primaryAction} primary /></div>}
        <HeaderOverflow actions={compact ? [...secondaryActions, ...overflowActions] : overflowActions} />
      </div>
    </div>
  </HeaderFoundation>;
}
