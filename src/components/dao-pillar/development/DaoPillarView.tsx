import React from 'react';
import { SEIErrorState, SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import { LibraryButton } from '@seihouse/library-ui';
import { describeRewards, type DaoPillarCalendarSnapshot } from '../shared/daoPillarContracts';
import type { DaoPillarCalendarState } from '../shared/useDaoPillarCalendar';
import { DaoPillarCalendar } from './DaoPillarCalendar';
import { DaoPillarThemeBanner } from './DaoPillarThemeBanner';
import { formatScheduledDate } from './daoPillarFormat';
import './daoPillar.css';

/** The one-line summary under the calendar: which day today is and how it stands. */
export function describeToday(snapshot: DaoPillarCalendarSnapshot): string {
  const { today } = snapshot;
  if (today.phase === 'before') return `${snapshot.theme.name} begins ${formatScheduledDate(snapshot.cycle.startsOn)}`;
  if (today.phase === 'after') return `${snapshot.theme.name} ended ${formatScheduledDate(snapshot.cycle.endsOn)}`;
  if (today.status === 'collected' && today.collected) return `Day ${today.day} • Collected today · +${describeRewards(today.collected.delivered)}`;
  return `Day ${today.day} • Available today`;
}

/**
 * The Dao Pillar destination: the active theme banner over the daily rewards
 * calendar. Everything shown is the server's snapshot; the only action is
 * collecting today's tile.
 */
export function DaoPillarView({ calendar }: { calendar: DaoPillarCalendarState }) {
  const { status, snapshot, error, claiming, claimError, lastClaim, claim, refresh } = calendar;

  if (status === 'unavailable') {
    return (
      <SEIInlineAlert tone="info" title="The Dao Pillar is not connected here">
        Sign in to see the active theme and collect your daily rewards.
      </SEIInlineAlert>
    );
  }
  if (status === 'loading' && !snapshot) {
    return <SEILoadingState size="md" title="Opening the Dao Pillar" description="Reading the active theme and your collected days." />;
  }
  if (status === 'error' && !snapshot) {
    return (
      <SEIErrorState
        tone="warning"
        title="The Dao Pillar could not be opened"
        description={error ?? undefined}
        action={<LibraryButton variant="secondary" onClick={() => void refresh()}>Try again</LibraryButton>}
      />
    );
  }
  if (!snapshot) return null;

  const liveMessage = claimError
    ?? (lastClaim ? lastClaim.message : null);

  return (
    <div className="dao-pillar" data-dao-pillar data-dao-today={snapshot.today.status}>
      <DaoPillarThemeBanner theme={snapshot.theme} cycle={snapshot.cycle} />

      <section className="dao-rewards" aria-labelledby="dao-rewards-title">
        <header className="dao-rewards-header">
          <h3 id="dao-rewards-title" className="dao-rewards-title">Daily Rewards</h3>
          <p className="dao-rewards-subtitle">Small steps. A brighter you.</p>
        </header>
        {error && snapshot ? (
          <SEIInlineAlert tone="warning" title="The calendar may be out of date" action={<LibraryButton size="sm" variant="ghost" onClick={() => void refresh()}>Refresh</LibraryButton>}>
            {error}
          </SEIInlineAlert>
        ) : null}
        <DaoPillarCalendar snapshot={snapshot} onCollect={() => void claim()} claiming={claiming} />
        <p className="dao-today" data-dao-today-line>{describeToday(snapshot)}</p>
        <p className="dao-streak">
          {snapshot.streak.current} day streak · {snapshot.streak.totalCollected} collected
        </p>
        <p role="status" aria-live="polite" className="dao-live" data-dao-live>{liveMessage}</p>
        <p className="dao-motto">{snapshot.theme.motto}</p>
      </section>
    </div>
  );
}
