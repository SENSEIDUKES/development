import React from 'react';
import { AnimatePresence } from 'motion/react';
import type { LoadingTaskCard } from '../../../library/manifestations/taskCard';
import LoadingVeilCard from './LoadingVeilCard';
import CompactIndicator from './CompactIndicator';
import { useGenerationJourney } from '../../../library/manifestations/useGenerationJourney';

export type LoadingSystemMode = 'auto' | 'primary' | 'compact';

export interface LoadingSystemProps {
  /** Whether the operation is currently running. */
  active: boolean;
  /** True only once the operation has succeeded. Failure/cancellation never triggers arrival. */
  completed?: boolean;
  /** The normalized task card to present, or null when idle. */
  task: LoadingTaskCard | null;
  /**
   * 'auto' follows task.preferredMode; 'primary' and 'compact' force a mode.
   * Primary falls back to the compact indicator whenever minimized.
   */
  mode?: LoadingSystemMode;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  /**
   * Delay before the compact indicator first paints. Operations that
   * finish inside this window never render anything — they complete too
   * quickly to communicate useful information.
   */
  compactGraceMs?: number;
  /** Optional cinematic backdrop rendered behind the primary veil's content. */
  backdrop?: React.ReactNode;
  /** Optional spacing override for the primary veil's agent emblem container. */
  emblemClassName?: string;
  /**
   * Workshop-only scrubber cosmetics pass-through (traveler / trail /
   * destination ids), forwarded to the primary veil's JourneyScrubber.
   */
  travelerId?: string;
  trailStyle?: string;
  destinationId?: string;
  /**
   * Workshop-only media unseal pass-through, forwarded to the primary
   * veil's media manifestation zone (tap-to-unseal on the sealed scroll).
   */
  onMediaUnseal?: () => void;
}

const DEFAULT_COMPACT_GRACE_MS = 1200;

/**
 * Development copy of LoadingSystem — routes the primary slot to
 * development/LoadingVeilCard (the veil under active iteration) instead of
 * reference/LoadingVeil, so the two stay comparable in the Workshop. Compact
 * mode is unchanged and still shares shared/CompactIndicator.
 *
 * 2026-07-30: the primary veil no longer exposes a manual minimize control.
 * Minimization is navigation-driven — the caller flips `minimized` when the
 * user leaves the generation page — so LoadingVeilCard's `onMinimize` prop
 * is gone. `onMinimizedChange` still drives the compact indicator's expand.
 * First real caller: the Library's HARNESS Reader, while it writes a chapter.
 */
export default function LoadingSystem({
  active,
  completed = false,
  task,
  mode = 'auto',
  minimized,
  onMinimizedChange,
  compactGraceMs = DEFAULT_COMPACT_GRACE_MS,
  backdrop,
  emblemClassName,
  travelerId,
  trailStyle,
  destinationId,
  onMediaUnseal,
}: LoadingSystemProps) {
  const lastTask = React.useRef(task);
  if (task) lastTask.current = task;
  const displayTask = task ?? lastTask.current;
  const journey = useGenerationJourney({
    active: active && Boolean(task),
    completed: completed || displayTask?.progress === 100
      || (displayTask?.manifestation.mode === 'media' && displayTask.manifestation.reveal === 'revealed'),
    operation: displayTask?.activePhaseId ?? '',
    identity: JSON.stringify([displayTask?.activePhaseId, displayTask?.trackerTitle]),
    progress: displayTask?.progress ?? null,
    estimatedSecondsRemaining: displayTask?.estimatedSecondsRemaining ?? null,
  });
  const resolvedMode: Exclude<LoadingSystemMode, 'auto'> =
    mode === 'auto' ? (displayTask?.preferredMode ?? 'primary') : mode;

  // Compact mode waits out a grace window so very short tasks stay hidden.
  const [compactReady, setCompactReady] = React.useState(false);
  React.useEffect(() => {
    setCompactReady(false);
    if (!active) return;
    const id = setTimeout(() => setCompactReady(true), compactGraceMs);
    return () => clearTimeout(id);
  }, [active, compactGraceMs]);

  if (!displayTask) return null;

  const showPrimary = ((active && Boolean(task)) || journey.arriving) && resolvedMode === 'primary' && !minimized;
  const showCompact =
    active && Boolean(task) &&
    !showPrimary &&
    compactReady &&
    (resolvedMode === 'compact' || minimized);

  return (
    <AnimatePresence>
      {showPrimary && (
        <LoadingVeilCard
          key="primary-veil"
          task={journey.arriving && displayTask.progress !== null ? { ...displayTask, progress: 100 } : displayTask}
          journeyProgress={journey.progress}
          backdrop={backdrop}
          emblemClassName={emblemClassName}
          travelerId={travelerId}
          trailStyle={trailStyle}
          destinationId={destinationId}
          onMediaUnseal={onMediaUnseal}
        />
      )}
      {showCompact && (
        <CompactIndicator
          key="compact-indicator"
          task={displayTask}
          onExpand={resolvedMode === 'primary' ? () => onMinimizedChange(false) : undefined}
        />
      )}
    </AnimatePresence>
  );
}
