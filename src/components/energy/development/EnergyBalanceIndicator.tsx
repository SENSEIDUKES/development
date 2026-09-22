import React from 'react';
import { EnergyAmount, formatEnergy, type EnergyAmountSize } from './EnergyAmount';
import type { EnergyAccountState } from '../shared/useEnergyAccount';

export interface EnergyBalanceIndicatorProps {
  /** The account state from `useEnergyAccount`, or a plain available balance. */
  account: Pick<EnergyAccountState, 'status' | 'snapshot'> | { available: number };
  size?: EnergyAmountSize;
  className?: string;
}

/**
 * The compact live balance: the Energy mark and 500. Shows the *available* Energy (settled
 * minus held), because that is what the next generation can use. Renders a
 * quiet dash while loading and nothing at all when Energy is not connected,
 * so a host surface never invents a number.
 */
export function EnergyBalanceIndicator({ account, size = 'sm', className }: EnergyBalanceIndicatorProps) {
  if ('available' in account) {
    return <EnergyAmount amount={account.available} size={size} className={className} label={`Energy balance ${formatEnergy(account.available)}`} />;
  }
  if (account.status === 'unavailable') return null;
  if (account.status === 'ready' && account.snapshot) {
    return (
      <EnergyAmount amount={account.snapshot.available} size={size} className={className}
        label={`Energy balance ${formatEnergy(account.snapshot.available)}`} />
    );
  }
  return (
    <EnergyAmount amount={null} size={size} className={className} state={account.status === 'error' ? 'unavailable' : 'loading'}
      label={account.status === 'error' ? 'Energy balance unavailable' : 'Energy balance loading'} />
  );
}
