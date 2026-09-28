import type { ReactNode } from 'react';
import type { PassageSelection } from './selection';

interface PassageActionBase {
  id: string;
  label: string;
  /**
   * A reason the action cannot run on this selection, or nothing when it can.
   * An unavailable action stays in the bar, dimmed, with its reason under the
   * label ("Sound Cues fit 1–5 words"), so a rule explains itself.
   */
  unavailable?: (selection: PassageSelection) => string | undefined;
}

/** Branches only present navigation; leaves consume a stable SEN selection. */
export type PassageAction =
  | PassageActionBase & { children: readonly PassageAction[]; onActivate?: never }
  | PassageActionBase & { onActivate: (selection: PassageSelection, close: () => void) => ReactNode; children?: never };
