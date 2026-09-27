import type { ReactNode } from 'react';
import type { PassageSelection } from './selection';

/** Branches only present navigation; leaves consume a stable SEN selection. */
export type PassageAction =
  | { id: string; label: string; children: readonly PassageAction[]; onActivate?: never }
  | { id: string; label: string; onActivate: (selection: PassageSelection, close: () => void) => ReactNode; children?: never };
