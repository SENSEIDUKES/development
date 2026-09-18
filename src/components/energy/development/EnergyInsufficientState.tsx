import React from 'react';
import { SEIButton, SEIInlineAlert } from '@seihouse/ui';
import { formatEnergy } from './EnergyAmount';

export interface EnergyInsufficientStateProps {
  /** Energy the action needs, from the catalog or the server's refusal. */
  required: number;
  /** Energy available now, from the server. */
  available: number;
  /** Where the host sends people to learn about or top up Energy. */
  onOpenEnergy?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const describeInsufficientEnergy = (required: number, available: number) =>
  `This needs ⚡ ${formatEnergy(required)} and you have ⚡ ${formatEnergy(available)}.`;

/**
 * The blocked state a generation control shows when the server refuses a
 * reservation. It explains the gap without shaming and points at the Energy
 * panel. Not mounted by any generation surface yet.
 */
export function EnergyInsufficientState({ required, available, onOpenEnergy, onDismiss, className }: EnergyInsufficientStateProps) {
  return (
    <SEIInlineAlert
      tone="warning"
      title="Not enough Energy"
      onDismiss={onDismiss}
      className={className}
      data-energy-insufficient
      action={onOpenEnergy ? <SEIButton type="button" variant="soft" onClick={onOpenEnergy}>Open Energy</SEIButton> : undefined}
    >
      {describeInsufficientEnergy(required, available)}
    </SEIInlineAlert>
  );
}
