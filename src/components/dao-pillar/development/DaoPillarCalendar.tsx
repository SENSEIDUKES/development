import React, { useRef, useState } from 'react';
import { SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle } from '@seihouse/ui';
import { describeRewards, type DaoPillarCalendarSnapshot, type DaoPillarTile as DaoPillarTileData } from '../shared/daoPillarContracts';
import { DaoPillarTile } from './DaoPillarTile';
import { formatClaimedAt, formatScheduledDate } from './daoPillarFormat';

interface DaoPillarCalendarProps {
  snapshot: DaoPillarCalendarSnapshot;
  onCollect: () => void;
  claiming: boolean;
}

/**
 * The five-by-six grid of scheduled days plus the detail a collected tile
 * opens. States come straight from the snapshot; nothing is computed here.
 */
export function DaoPillarCalendar({ snapshot, onCollect, claiming }: DaoPillarCalendarProps) {
  const [inspected, setInspected] = useState<DaoPillarTileData | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  return (
    <>
      <div className="dao-calendar" role="list" aria-label={`${snapshot.theme.name} daily rewards`}>
        {snapshot.tiles.map(tile => (
          <div role="listitem" key={tile.day} className="dao-calendar-cell">
            <DaoPillarTile
              tile={tile}
              claiming={claiming}
              onCollect={onCollect}
              onInspect={() => {
                opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                setInspected(tile);
              }}
            />
          </div>
        ))}
      </div>
      <SEIDialog open={inspected !== null} onOpenChange={open => { if (!open) setInspected(null); }}>
        <SEIDialogContent variant="dark" className="z-[310] sm:max-w-sm" backdropClassName="z-[300]" finalFocus={opener}>
          <SEIDialogTitle>{inspected ? `Day ${inspected.day} collected` : 'Collected'}</SEIDialogTitle>
          <SEIDialogDescription className="sr-only">The reward this day delivered and the exact time it was collected.</SEIDialogDescription>
          {inspected ? (
            <dl className="dao-tile-detail" data-dao-tile-detail={inspected.day}>
              <div>
                <dt>Reward</dt>
                <dd>{describeRewards(inspected.delivered ?? inspected.rewards)}{inspected.milestone ? ' · Milestone' : ''}</dd>
              </div>
              <div>
                <dt>Scheduled for</dt>
                <dd>{formatScheduledDate(inspected.scheduledDate)}</dd>
              </div>
              <div>
                <dt>Collected on</dt>
                <dd>{inspected.claimedAt ? <time dateTime={inspected.claimedAt}>{formatClaimedAt(inspected.claimedAt)}</time> : '—'}</dd>
              </div>
            </dl>
          ) : null}
        </SEIDialogContent>
      </SEIDialog>
    </>
  );
}
