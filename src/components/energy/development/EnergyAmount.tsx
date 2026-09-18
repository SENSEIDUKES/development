import React from 'react';
import './energy.css';

export type EnergyAmountSize = 'sm' | 'md' | 'lg';

interface EnergyAmountProps {
  amount: number | null;
  size?: EnergyAmountSize;
  state?: 'ready' | 'loading' | 'unavailable';
  className?: string;
  /** Accessible reading of the number, e.g. "Energy balance 500". */
  label: string;
}

const formatter = new Intl.NumberFormat('en-US');
export const formatEnergy = (amount: number) => formatter.format(amount);

/** The single ⚡ + number rendering every Energy surface shares. */
export function EnergyAmount({ amount, size = 'md', state = 'ready', className = '', label }: EnergyAmountProps) {
  return (
    <span className={`energy-amount ${className}`.trim()} data-energy-size={size} data-energy-state={state} aria-label={label} role="img">
      <span className="energy-glyph" aria-hidden="true">⚡</span>
      <span aria-hidden="true">{state === 'ready' && amount !== null ? formatEnergy(amount) : '—'}</span>
    </span>
  );
}
