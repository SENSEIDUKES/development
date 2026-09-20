import { SEIPopover, SEIPopoverTrigger, SEIPopoverContent, SEIPopoverTitle, SEIPopoverDescription, SEIPopoverClose } from '@seihouse/ui';
import { useEnergyAccount } from '../../energy/shared/useEnergyAccount';
import { FamiliarSprite, type FamiliarSpriteProps } from './FamiliarSprite';
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

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
  panelSide?: 'top' | 'bottom';
  /** Host-owned actions can extend the panel without changing sprite playback. */
  children?: ReactNode;
}

/** Render a sprite trigger and dismissible Energy panel with optional host actions. */
export function Familiar({ open, onOpenChange, triggerProps, panelSide = 'top', children, ...props }: FamiliarProps) {
  const generatedStatusId = useId();
  const statusId = props.statusId ?? generatedStatusId;
  return <SEIPopover open={open} onOpenChange={onOpenChange}>
    <SEIPopoverTrigger className="familiar-trigger" aria-label={`${props.familiar.displayName}: show Energy`} {...triggerProps}
      aria-describedby={[triggerProps?.['aria-describedby'], statusId].filter(Boolean).join(' ')}>
      <FamiliarSprite {...props} statusId={statusId} />
    </SEIPopoverTrigger>
    <SEIPopoverContent className="familiar-energy-panel" side={panelSide} collisionPadding={12}>
      <div className="familiar-panel-heading">
        <SEIPopoverTitle>Energy</SEIPopoverTitle>
        <SEIPopoverClose className="familiar-panel-button" aria-label="Close Energy panel">×</SEIPopoverClose>
      </div>
      <SEIPopoverDescription>Your current account balance.</SEIPopoverDescription>
      <FamiliarEnergy />
      {children}
    </SEIPopoverContent>
  </SEIPopover>;
}
