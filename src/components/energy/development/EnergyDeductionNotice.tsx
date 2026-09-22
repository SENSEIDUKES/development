import React from 'react';
import { SEIInlineAlert, type SEIToastInput } from '@seihouse/ui';
import { formatEnergy } from './EnergyAmount';

export interface EnergyDeductionDetails {
  /** Energy charged by the settled reservation. */
  amount: number;
  /** What was produced, e.g. "Chapter" — the catalog label. */
  actionLabel: string;
  /** Available Energy after the charge, from the server's response. */
  available: number;
}

export const describeEnergyDeduction = ({ amount, actionLabel, available }: EnergyDeductionDetails) => ({
  // A toast title is plain text, so the Energy mark cannot be drawn here.
  title: `${formatEnergy(amount)} Energy used for ${actionLabel.toLowerCase()}`,
  description: `${formatEnergy(available)} Energy remaining.`,
});

/** The transient form for hosts that mount `SEIToastProvider`; pass it to `toast(...)`. */
export const energyDeductionToast = (details: EnergyDeductionDetails, duration = 4_000): SEIToastInput => ({
  ...describeEnergyDeduction(details),
  tone: 'success',
  duration,
});

/**
 * The in-place confirmation that a charge happened, for surfaces that keep
 * feedback next to the result. Nothing triggers it in this phase; a future
 * generation flow shows it after `settle` succeeds.
 */
export function EnergyDeductionNotice({ details, onDismiss, className }: { details: EnergyDeductionDetails; onDismiss?: () => void; className?: string }) {
  const { title, description } = describeEnergyDeduction(details);
  return (
    <SEIInlineAlert tone="success" title={title} onDismiss={onDismiss} className={className} data-energy-deduction>
      {description}
    </SEIInlineAlert>
  );
}
