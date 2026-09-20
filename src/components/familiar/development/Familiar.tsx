import { SEIPopover, SEIPopoverTrigger, SEIPopoverContent, SEIPopoverTitle, SEIPopoverDescription, SEIPopoverClose } from '@seihouse/ui';
import { useEnergyAccount } from '../../energy/shared/useEnergyAccount';
import { FamiliarSprite, type FamiliarSpriteProps } from './FamiliarSprite';

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
export function Familiar(props: FamiliarSpriteProps) {
  return <SEIPopover>
    <SEIPopoverTrigger className="familiar-trigger" aria-label={`${props.familiar.displayName}: show Energy`}>
      <FamiliarSprite {...props} />
    </SEIPopoverTrigger>
    <SEIPopoverContent className="familiar-energy-panel" side="top" collisionPadding={12}>
      <div className="familiar-panel-heading">
        <SEIPopoverTitle>Energy</SEIPopoverTitle>
        <SEIPopoverClose className="familiar-panel-button" aria-label="Close Energy panel">×</SEIPopoverClose>
      </div>
      <SEIPopoverDescription>Your current account balance.</SEIPopoverDescription>
      <FamiliarEnergy />
    </SEIPopoverContent>
  </SEIPopover>;
}
