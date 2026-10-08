import React, { useEffect, useState } from 'react';
import { LibraryNavigationIcon } from '@seihouse/library-ui';
import { formatEnergy } from './EnergyAmount';
import './energy.css';

export interface EnergySpendBurst {
  /** A new burst each time this changes. */
  key: number;
  /** Energy per item, shown on each floater ("−5"). */
  amount: number;
  /** How many items were made: one floater each. */
  count: number;
}

/** How long a floater rises before it is removed, plus the stagger between floaters. */
const FLOAT_MS = 1_400;
const STAGGER_MS = 160;

/**
 * Energy leaving the reader's balance, shown the way games do it: a "−5" with
 * the Energy mark floats up from the control that spent it and fades, one per
 * item made. Place it inside a `position: relative` wrapper around that
 * control. Screen readers hear one line with the total. Reduced motion fades
 * the floaters in place.
 */
export function EnergySpendFloater({ burst, note }: { burst?: EnergySpendBurst; /** Added to the spoken line, such as "practice: nothing is taken yet". */ note?: string }) {
  const [shown, setShown] = useState<EnergySpendBurst>();
  useEffect(() => {
    if (!burst || burst.count < 1) return;
    setShown(burst);
    const timer = setTimeout(() => setShown(undefined), FLOAT_MS + STAGGER_MS * burst.count);
    return () => clearTimeout(timer);
  }, [burst]);
  if (!shown) return null;
  const total = shown.amount * shown.count;
  return (
    <span className="energy-spend-floater" data-energy-spend={total}>
      <span className="energy-spend-floater__sr" role="status">{`${formatEnergy(total)} Energy used${note ? ` (${note})` : ''}`}</span>
      {Array.from({ length: shown.count }, (_, index) => (
        <span key={`${shown.key}-${index}`} className="energy-spend-floater__item" aria-hidden="true"
          style={{ animationDelay: `${index * STAGGER_MS}ms`, left: `${50 + (index - (shown.count - 1) / 2) * 22}%` }}>
          −{formatEnergy(shown.amount)}
          <LibraryNavigationIcon name="energy" size="1em" className="energy-glyph" aria-hidden="true" />
        </span>
      ))}
    </span>
  );
}
