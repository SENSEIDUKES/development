import { LibraryGlobalIcon } from '@seihouse/library-ui';

const formatter = new Intl.NumberFormat('en-US');

export const formatQi = (amount: number): string => formatter.format(amount);

export interface QiAmountProps {
  amount: number | null;
  state?: 'ready' | 'loading' | 'unavailable';
  className?: string;
  /** Accessible reading of the amount, for example "QI balance 2,500". */
  label: string;
}

/** The common QI mark and number used by Library economy surfaces. */
export function QiAmount({ amount, state = 'ready', className = '', label }: QiAmountProps) {
  return (
    <span className={`qi-amount ${className}`.trim()} data-qi-state={state} aria-label={label} role="img">
      <LibraryGlobalIcon name="qi-yin-yang" size="1em" className="qi-glyph" aria-hidden="true" />
      <span aria-hidden="true">{state === 'ready' && amount !== null ? formatQi(amount) : '—'}</span>
    </span>
  );
}
