import React from 'react';
import { getEnergyPriceEntry, type EnergyActionId } from '../shared/energyContracts';
import { formatEnergy } from './EnergyAmount';
import './energy.css';

export type EnergyActionCostProps = {
  className?: string;
} & ({ actionId: EnergyActionId; price?: never } | { price: number; actionId?: never });

/**
 * The configured cost of one action, e.g. ⚡ 1, for placing beside a
 * generation control. Reads the shared catalog when given an action id and
 * renders nothing for an action that has no price yet. No generation surface
 * mounts this in the current phase.
 */
export function EnergyActionCost({ actionId, price, className = '' }: EnergyActionCostProps) {
  const entry = actionId ? getEnergyPriceEntry(actionId) : null;
  const resolved = entry ? entry.price : price ?? null;
  if (resolved === null) return null;
  const label = `Costs ${formatEnergy(resolved)} Energy`;
  return (
    <span className={`energy-action-cost ${className}`.trim()} data-energy-action={actionId ?? undefined} title={label} aria-label={label} role="img">
      <span aria-hidden="true">⚡</span>
      <span aria-hidden="true">{formatEnergy(resolved)}</span>
    </span>
  );
}
