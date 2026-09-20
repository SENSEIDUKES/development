import { SEIDialog, SEIDialogTrigger, SEIDialogContent, SEIDialogTitle, SEIDialogDescription, SEIDialogClose } from '@seihouse/ui';
import { ChevronDown, Zap, X } from 'lucide-react';
import { useEnergyAccount } from '../../energy/shared/useEnergyAccount';
import { FamiliarSprite, type FamiliarSpriteProps } from './FamiliarSprite';
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

/** Read the active host account whenever the Energy panel mounts. */
function FamiliarEnergy() {
  // Mount on each open: re-read the same server ledger used by the profile.
  const account = useEnergyAccount();
  return <div aria-live="polite">
    {account.status === 'ready' && account.snapshot ? <dl className="familiar-energy-values">
      <div><dt>Current Energy</dt><dd>{account.snapshot.balance.toLocaleString()}</dd></div>
      <div><dt>Maximum</dt><dd>Not configured</dd></div>
      {account.snapshot.held > 0 && <div><dt>Available</dt><dd>{account.snapshot.available.toLocaleString()}</dd></div>}
    </dl> : account.status === 'loading' ? <p>Loading Energy…</p>
      : account.status === 'unavailable' ? <p>Sign in to see your Energy.</p>
        : <><p role="alert">{account.error}</p><button className="familiar-panel-button" onClick={() => void account.refresh()}>Retry Energy</button></>}
  </div>;
}

/** Uses the host's EnergyClientProvider. No account identity or ledger is created here. */
export interface FamiliarProps extends FamiliarSpriteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  onMinimize?: () => void;
  dragging?: boolean;
  /** Host-owned actions can extend the panel without changing sprite playback. */
  children?: ReactNode;
}

/** Reveal compact pet actions, then present Energy in a viewport-centered dialog. */
export function Familiar({ open: controlledOpen, onOpenChange, triggerProps, onMinimize, dragging = false, children, ...props }: FamiliarProps) {
  const generatedStatusId = useId();
  const statusId = props.statusId ?? generatedStatusId;
  const actionsId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [localOpen, setLocalOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = controlledOpen ?? localOpen;
  const expanded = !dragging && (pinned || hovered || focused || open);
  const setOpen = (next: boolean) => { setLocalOpen(next); onOpenChange?.(next); };
  useEffect(() => {
    if (dragging) { setPinned(false); setHovered(false); setFocused(false); }
  }, [dragging]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!open && !root.current?.contains(event.target as Node)) { setPinned(false); setFocused(false); setHovered(false); }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <div ref={root} className="familiar-interaction" data-expanded={expanded || undefined}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={event => { if (event.key === 'Escape' && !open) { setPinned(false); setHovered(false); setFocused(false); } }}>
    <button type="button" className="familiar-trigger" aria-label={`${props.familiar.displayName}: show actions`} {...triggerProps}
      aria-expanded={expanded} aria-controls={actionsId}
      onClick={event => { triggerProps?.onClick?.(event); if (!event.defaultPrevented) setPinned(value => !value); }}
      aria-describedby={[triggerProps?.['aria-describedby'], statusId].filter(Boolean).join(' ')}>
      <FamiliarSprite {...props} statusId={statusId} />
    </button>
    <SEIDialog open={open} onOpenChange={setOpen}>
      <div className="familiar-dock">
        <button type="button" className="familiar-shadow" hidden={expanded} aria-label="Show Familiar actions" aria-expanded={expanded} aria-controls={actionsId} onClick={() => setPinned(true)}><span /></button>
        <div id={actionsId} className="familiar-actions" role="group" aria-label="Familiar actions" hidden={!expanded}>
          <SEIDialogTrigger className="familiar-action" aria-label="Show Energy" title="Energy"><Zap aria-hidden="true" size={21} /></SEIDialogTrigger>
          {onMinimize && <button type="button" className="familiar-action" aria-label="Minimize Familiar" title="Minimize Familiar" onClick={onMinimize}><ChevronDown aria-hidden="true" size={21} /></button>}
        </div>
      </div>
      <SEIDialogContent variant="dark" hideClose className="familiar-energy-panel" backdropClassName="familiar-energy-backdrop" bodyClassName="familiar-energy-body">
        <div className="familiar-panel-heading">
          <SEIDialogTitle>Energy</SEIDialogTitle>
          <SEIDialogClose className="familiar-panel-button" aria-label="Close Energy panel"><X aria-hidden="true" size={20} /></SEIDialogClose>
        </div>
        <SEIDialogDescription>Your current account balance.</SEIDialogDescription>
        <FamiliarEnergy />
        {children}
      </SEIDialogContent>
    </SEIDialog>
  </div>;
}
