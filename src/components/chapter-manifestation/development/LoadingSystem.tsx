import React from 'react';
import { AnimatePresence } from 'motion/react';
import type { LoadingTaskCard } from '../../../library/manifestations/taskCard';
import LoadingVeilCard from './LoadingVeilCard';
import CompactIndicator from './CompactIndicator';

export type LoadingSystemMode = 'auto' | 'primary' | 'compact';

export interface LoadingSystemProps {
  /** Whether the operation is currently running. */
  active: boolean;
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
 * Workshop-only: do not wire this into production flows.
 */
export default function LoadingSystem({
  active,
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
  const resolvedMode: Exclude<LoadingSystemMode, 'auto'> =
    mode === 'auto' ? (task?.preferredMode ?? 'primary') : mode;

  // Compact mode waits out a grace window so very short tasks stay hidden.
  const [compactReady, setCompactReady] = React.useState(false);
  React.useEffect(() => {
    setCompactReady(false);
    if (!active) return;
    const id = setTimeout(() => setCompactReady(true), compactGraceMs);
    return () => clearTimeout(id);
  }, [active, compactGraceMs]);

  if (!task) return null;

  const showPrimary = active && resolvedMode === 'primary' && !minimized;
  const showCompact =
    active &&
    !showPrimary &&
    compactReady &&
    (resolvedMode === 'compact' || minimized);

  return (
    <AnimatePresence>
      {showPrimary && (
        <LoadingVeilCard
          key="primary-veil"
          task={task}
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
          task={task}
          onExpand={resolvedMode === 'primary' ? () => onMinimizedChange(false) : undefined}
        />
      )}
    </AnimatePresence>
  );
}
