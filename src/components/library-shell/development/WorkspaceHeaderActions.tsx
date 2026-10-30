import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, CreationButton } from '@seihouse/sen/presentation';
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

/**
 * Non-modal disclosure: normal Tab order; Escape returns focus, outside focus dismisses.
 * A host may hold the open state itself (`open`, `onOpenChange`), so something
 * outside the trigger can open it, and say where focus returns (`returnFocusTo`).
 * A panel drawn elsewhere (a portal) still counts as inside.
 */
export function useHeaderDisclosure(control?: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: () => HTMLElement | null;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = control ? control.open : localOpen;
  const setOpen = control ? control.onOpenChange : setLocalOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const latest = useRef({ setOpen, returnFocusTo: control?.returnFocusTo });
  latest.current = { setOpen, returnFocusTo: control?.returnFocusTo };
  useEffect(() => {
    if (!open) return;
    const close = (restoreFocus: boolean) => {
      const target = latest.current.returnFocusTo?.() ?? triggerRef.current;
      latest.current.setOpen(false);
      if (restoreFocus) target?.focus();
    };
    panelRef.current?.querySelector<HTMLElement>('select:not(:disabled), button:not(:disabled), a[href]')?.focus();
    const inside = (target: Node) => Boolean(rootRef.current?.contains(target) || panelRef.current?.contains(target));
    const dismiss = (event: Event) => {
      if (!inside(event.target as Node)) close(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    // Phones fire resize when the address bar collapses or the keyboard opens;
    // only a real width change (rotation, window resize) can move the layout
    // the panel is anchored to.
    let width = window.innerWidth;
    const resize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      close(true);
    };
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
