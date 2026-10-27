import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FateDecides } from '../FateDecides';

export interface StatRow {
  id: string;
  label: string;
  /** Text, or a node for a value that needs its own markup. Blank reads Fate Will Decide. */
  value?: ReactNode;
  icon?: LucideIcon;
}

/**
 * A Star Rail-style stat table: icon, label and value on alternating rows,
 * two columns once there is room. A blank value reads Fate Will Decide.
 */
export const StatTable = ({ rows, label, testId }: { rows: readonly StatRow[]; label: string; testId?: string }) => (
  <dl className="bp-stats" aria-label={label} data-testid={testId}>
    {rows.map(({ id, label: rowLabel, value, icon: Icon }) => {
      const blank = value === undefined || value === null || (typeof value === 'string' && !value.trim());
      return (
        <div key={id} className="bp-stat" data-stat={id} data-empty={blank}>
          <dt>{Icon && <Icon size={14} aria-hidden="true" />}<span>{rowLabel}</span></dt>
          <dd>{blank ? <FateDecides /> : value}</dd>
        </div>
      );
    })}
  </dl>
);
