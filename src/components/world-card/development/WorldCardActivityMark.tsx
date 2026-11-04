import type { WorldActivityStatus } from '../../light-novels-home/shared/homeContracts';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';

/**
 * How busy a world is with its people, as a still dot in the cover's top corner: green while
 * readers are in it now, yellow this week. A quiet world shows nothing: quiet is an opening to
 * take the world on, never a mark against it. One mark for every card (Full, Compact, the Compact
 * tile, Feature and Menu); the card's own open control speaks the status.
 */
export function WorldCardActivityMark({ status, className = '' }: { status?: WorldActivityStatus; className?: string }) {
  if (!status || status === 'quiet') return null;
  const activity = WORLD_ACTIVITY_DISPLAY[status];
  return <span className={`world-card-activity-mark ${activity.color} ${className}`.trim()} title={activity.label}
    data-activity={status} aria-hidden="true" />;
}
