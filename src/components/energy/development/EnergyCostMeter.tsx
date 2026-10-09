import React, { useEffect, useRef, useState } from 'react';
import { getEnergyPriceEntry, type EnergyActionId } from '../shared/energyContracts';
import { EnergyActionCost } from './EnergyActionCost';
import { EnergySpendFloater, type EnergySpendBurst } from './EnergySpendFloater';

/**
 * An action's Energy badge that also shows the Energy leaving: place it
 * beside the control, pass how many of the action's results exist so far
 * (chapters written, Blueprints made), and each new one floats its "−price"
 * up from the badge. The first count it sees is the starting point, so
 * nothing floats when a page opens.
 */
export function EnergyCostMeter({ actionId, made, note }: {
  actionId: EnergyActionId;
  /** How many of the action's results exist now. */
  made: number;
  /** Added to the spoken line, such as "practice: nothing is taken yet". */
  note?: string;
}) {
  const price = getEnergyPriceEntry(actionId).price;
  const seen = useRef(made);
  const [spent, setSpent] = useState<EnergySpendBurst>();
  useEffect(() => {
    const added = made - seen.current;
    seen.current = made;
    if (added > 0 && price) setSpent(previous => ({ key: (previous?.key ?? 0) + 1, amount: price, count: added }));
  }, [made, price]);
  if (price === null) return null;
  return (
    <span className="relative inline-flex" data-energy-cost-meter={actionId}>
      <EnergyActionCost actionId={actionId} />
      <EnergySpendFloater burst={spent} note={note} />
    </span>
  );
}
