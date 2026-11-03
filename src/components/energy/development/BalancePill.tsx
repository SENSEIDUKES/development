import { LibraryGlobalIcon } from '@seihouse/library-ui';
import { EnergySunIcon } from './EnergySunIcon';
import './balancePill.css';

/** The two balances a cultivator spends. */
export type BalanceKind = 'qi' | 'energy';

const formatter = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
/** Up to 9,999,999 the pill shows every digit; past that it shortens (12.4M), so every pill keeps one width. */
const pillNumber = (amount: number) => (Math.abs(amount) > 9_999_999 ? compact.format(amount) : formatter.format(amount));
const NAMES: Readonly<Record<BalanceKind, string>> = { qi: 'QI', energy: 'Energy' };

export interface BalancePillProps {
  kind: BalanceKind;
  /** The spendable balance; null while it is not known. */
  amount: number | null;
  state?: 'ready' | 'loading' | 'unavailable';
  className?: string;
}

/**
 * The official balance pill: a balance's own mark and its number in one
 * rounded pill, the one look every page uses to show what a cultivator can
 * spend. Every pill is the same width whatever its number. QI wears the yin-yang mark in violet; Energy wears the Energy sun
 * in gold. It never invents a number: unknown or unconnected balances show a
 * dash.
 */
export function BalancePill({ kind, amount, state = 'ready', className = '' }: BalancePillProps) {
  const known = state === 'ready' && amount !== null;
  const label = known ? `${formatter.format(amount)} ${NAMES[kind]} available` : `${NAMES[kind]} balance ${state === 'loading' ? 'loading' : 'unavailable'}`;
  return (
    <span className={`balance-pill ${className}`.trim()} data-balance={kind} data-balance-state={known ? 'ready' : state} role="img" aria-label={label}>
      {kind === 'qi'
        ? <LibraryGlobalIcon name="qi-yin-yang" size="1.2em" className="balance-pill-mark" aria-hidden="true" />
        : <EnergySunIcon size="1.2em" className="balance-pill-mark" />}
      <span className="balance-pill-number" aria-hidden="true">{known ? pillNumber(amount) : '—'}</span>
    </span>
  );
}

export interface BalancePillsProps {
  /** Each balance to show; leave one out (or pass undefined) where that balance is not connected. */
  qi?: Omit<BalancePillProps, 'kind' | 'className'>;
  energy?: Omit<BalancePillProps, 'kind' | 'className'>;
  className?: string;
}

/** QI and Energy side by side, always in that order: the standard balance strip for page headers. */
export function BalancePills({ qi, energy, className = '' }: BalancePillsProps) {
  if (!qi && !energy) return null;
  return (
    <span className={`balance-pills ${className}`.trim()} role="group" aria-label="Your balances">
      {qi ? <BalancePill kind="qi" {...qi} /> : null}
      {energy ? <BalancePill kind="energy" {...energy} /> : null}
    </span>
  );
}
