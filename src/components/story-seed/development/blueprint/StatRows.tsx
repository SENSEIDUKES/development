import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface StatRow {
  id: string;
  label: string;
  /** Text, or a node for a value that needs its own markup. A blank stays empty. */
  value?: ReactNode;
  icon?: LucideIcon;
}

/**
 * A Star Rail-style stat table: icon, label and value on alternating rows,
 * two columns once there is room. The Blueprint is shown once its blanks have
 * been filled, so a value still blank stays empty: Fate Will Decide belongs
 * to the Seed, before anything is generated.
 */
export const StatTable = ({ rows, label, testId }: { rows: readonly StatRow[]; label: string; testId?: string }) => (
  <dl className="bp-stats" aria-label={label} data-testid={testId}>
    {rows.map(({ id, label: rowLabel, value, icon: Icon }) => {
      const blank = value === undefined || value === null || (typeof value === 'string' && !value.trim());
      return (
        <div key={id} className="bp-stat" data-stat={id} data-empty={blank}>
          <dt>{Icon && <Icon size={14} aria-hidden="true" />}<span>{rowLabel}</span></dt>
          <dd>{blank ? null : value}</dd>
        </div>
      );
    })}
  </dl>
);
