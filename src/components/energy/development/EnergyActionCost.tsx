import React from 'react';
import { formatEnergyPriceRange, getEnergyPriceEntry, type EnergyActionId } from '../shared/energyContracts';
import { useActionEnergyPrice } from '../shared/energyModels';
import { formatEnergy } from './EnergyAmount';
import './energy.css';
import { EnergySunIcon } from './EnergySunIcon';

export type EnergyActionCostProps = {
  className?: string;
} & ({ actionId: EnergyActionId; price?: never } | { price: number; actionId?: never });

/**
 * The configured cost of one action, the Energy mark beside its number, for placing next to a
 * generation control. Reads the shared catalog when given an action id and
 * renders nothing for an action that has no price yet. A chapter or image
 * shows its grade's price for the host's model (`EnergyModelsProvider`).
 */
export function EnergyActionCost({ actionId, price, className = '' }: EnergyActionCostProps) {
  const entry = actionId ? getEnergyPriceEntry(actionId) : null;
  const graded = useActionEnergyPrice(actionId ?? 'chapter.generate');
  const resolved = entry ? (entry.price === null ? null : graded) : price ?? null;
  if (resolved === null) return null;
  const display = entry && entry.price !== null ? formatEnergyPriceRange({ ...entry, price: resolved }) : formatEnergy(resolved);
  const label = `Costs ${display} Energy${entry?.projected ? ' (projected)' : ''}`;
  return (
    <span className={`energy-action-cost energy-badge ${className}`.trim()} data-energy-action={actionId ?? undefined} title={label} aria-label={label} role="img">
      <EnergySunIcon className="energy-glyph" />
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
