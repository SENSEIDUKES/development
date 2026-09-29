import type { WorldActivityStatus } from '../../light-novels-home/shared/homeContracts';

export const WORLD_ACTIVITY_DISPLAY: Record<WorldActivityStatus, { label: string; color: string }> = {
  'active-now': { label: 'Active now', color: 'bg-emerald-400' },
  'active-this-week': { label: 'Active this week', color: 'bg-amber-400' },
  quiet: { label: 'Quiet', color: 'bg-rose-400' },
};
