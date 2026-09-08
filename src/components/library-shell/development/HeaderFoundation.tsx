import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel, CreationButton } from '../../../presentation';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import './header-family.css';

/** Presentation and events only. The host owns eligibility, progress and side effects. */
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

export function HeaderFoundation({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return <header aria-label={label} className={`library-header-foundation ${className}`}>
    <div className="library-header-inner">{children}</div>
  </header>;
}

export function HeaderActionButton({ action, primary = false }: { action: HeaderAction; primary?: boolean }) {
  const Button = action.kind === 'creation' ? CreationButton : LibraryButton;
  return <Button variant={primary ? 'primary' : 'ghost'} icon={action.icon}
    disabled={action.disabled} loading={action.loading} aria-pressed={action.pressed}
    onClick={action.onAction} onPointerEnter={action.onIntent} onFocus={action.onIntent}
    aria-label={action.ariaLabel} title={action.title} aria-expanded={action.expanded}
    aria-haspopup={action.hasPopup} loadingIndicator={action.loadingIndicator}>{action.label}</Button>;
}

const compactQuery = '(max-width: 767px)';
const subscribeCompact = (notify: () => void) => {
  const media = window.matchMedia(compactQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
export function useCompactHeader() {
  return useSyncExternalStore(subscribeCompact, () => window.matchMedia(compactQuery).matches, () => false);
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
