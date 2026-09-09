import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, CreationButton } from '../../../presentation';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import './workspace-header.css';

/**
 * Header action presentation and events only. The host owns eligibility,
 * progress and side effects.
 *
 * This module carries no layout of its own: `SEIAppHeader` is the only
 * workspace header chrome, and these are the controls it renders in its
 * `actions` slot.
 */
export interface HeaderAction {
  id: string;
  label: string;
  onAction: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  pressed?: boolean;
  onIntent?: () => void;
  ariaLabel?: string;
  title?: string;
  expanded?: boolean;
  hasPopup?: 'dialog';
  kind?: 'creation';
  loadingIndicator?: ReactNode;
}

export function HeaderActionButton({ action, primary = false }: { action: HeaderAction; primary?: boolean }) {
  const Button = action.kind === 'creation' ? CreationButton : LibraryButton;
  return <Button variant={primary ? 'primary' : 'ghost'} icon={action.icon}
    disabled={action.disabled} loading={action.loading} aria-pressed={action.pressed}
    onClick={action.onAction} onPointerEnter={action.onIntent} onFocus={action.onIntent}
    // The label is always the accessible name too, so it survives the narrow
    // widths where the header shows the primary action as its icon alone.
    aria-label={action.ariaLabel ?? action.label} title={action.title} aria-expanded={action.expanded}
    aria-haspopup={action.hasPopup} loadingIndicator={action.loadingIndicator}>
    {/* Wrapped so a long label ellipsizes inside the single header row instead
        of pushing the control past the edge. The accessible name is unaffected. */}
    <span className="workspace-action-label">{action.label}</span>
  </Button>;
}

/** Non-modal disclosure: normal Tab order; Escape returns focus, outside focus dismisses. */
export function useHeaderDisclosure() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('button:not(:disabled), a[href]')?.focus();
    const dismiss = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const resize = () => { setOpen(false); triggerRef.current?.focus(); };
    window.addEventListener('resize', resize);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return { open, setOpen, rootRef, triggerRef, panelRef, id };
}

export function HeaderOverflow({ actions, label = 'More actions' }: { actions: readonly HeaderAction[]; label?: string }) {
  const disclosure = useHeaderDisclosure();
  if (!actions.length) return null;
  return <div className="header-overflow" ref={disclosure.rootRef}>
    <LibraryButton ref={disclosure.triggerRef} variant="secondary" size="icon" icon={MoreHorizontal}
      aria-label={label} aria-expanded={disclosure.open} aria-controls={disclosure.id}
      onClick={() => disclosure.setOpen(!disclosure.open)} />
    {disclosure.open && <div id={disclosure.id} ref={disclosure.panelRef} className="header-overflow-panel">
      <LibraryPanel padding="sm" aria-label={label}>
        {actions.map(action => <HeaderActionButton key={action.id} action={{ ...action, onAction: () => {
          disclosure.setOpen(false);
          disclosure.triggerRef.current?.focus();
          action.onAction();
        } }} />)}
      </LibraryPanel>
    </div>}
  </div>;
}
