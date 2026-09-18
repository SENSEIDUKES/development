import React from 'react';
import { Check, Lock, Minus } from 'lucide-react';
import { describeRewards, type DaoPillarTile as DaoPillarTileData } from '../shared/daoPillarContracts';
import { DaoPillarFlameIcon } from './DaoPillarFlameIcon';
import { formatClaimedAt, formatScheduledDate } from './daoPillarFormat';

interface DaoPillarTileProps {
  tile: DaoPillarTileData;
  /** Today's tile: tapping collects. */
  onCollect?: () => void;
  /** A collected tile: tapping shows the reward and when it was collected. */
  onInspect?: () => void;
  claiming?: boolean;
}

const stateLabel = (tile: DaoPillarTileData): string => {
  switch (tile.state) {
    case 'collected': return `collected ${tile.claimedAt ? formatClaimedAt(tile.claimedAt) : ''}`.trim();
    case 'available': return 'available today';
    case 'missed': return 'missed';
    case 'locked': return 'locked';
  }
};

/**
 * One scheduled day. Every tile shows its day, the flame and the reward; the
 * state decides the mark in the corner, the glow, and what a tap does.
 */
export function DaoPillarTile({ tile, onCollect, onInspect, claiming = false }: DaoPillarTileProps) {
  const reward = describeRewards(tile.rewards);
  const interactive = tile.state === 'available' ? onCollect : tile.state === 'collected' ? onInspect : undefined;
  const busy = tile.state === 'available' && claiming;
  return (
    <button
      type="button"
      className="dao-tile"
      data-day={tile.day}
      data-state={tile.state}
      data-milestone={tile.milestone ? 'true' : undefined}
      disabled={!interactive || busy}
      aria-busy={busy || undefined}
      aria-label={`Day ${tile.day}, ${reward}, ${stateLabel(tile)}, ${formatScheduledDate(tile.scheduledDate)}`}
      onClick={interactive}
    >
      <span className="dao-tile-day">Day {tile.day}</span>
      {tile.state !== 'available' ? (
        <span className="dao-tile-mark" aria-hidden="true">
          {tile.state === 'collected' ? <Check size={11} strokeWidth={3} />
            : tile.state === 'locked' ? <Lock size={10} strokeWidth={2.5} />
            : <Minus size={10} strokeWidth={3} />}
        </span>
      ) : null}
      <span className="dao-tile-art" aria-hidden="true">
        <DaoPillarFlameIcon size={tile.milestone ? 30 : 26} />
      </span>
      <span className="dao-tile-amount">{reward}</span>
      {tile.state === 'available' ? (
        <span className="dao-tile-collect">{busy ? 'Collecting' : 'Collect'}</span>
      ) : null}
    </button>
  );
}
