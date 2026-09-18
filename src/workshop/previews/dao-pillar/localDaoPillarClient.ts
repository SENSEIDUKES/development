/**
 * Workshop-only Dao Pillar client that talks to an in-process calendar service
 * instead of the HTTP route. Tests and the previews use it so every calendar
 * state (fresh cycle, mid-cycle with missed days, collected today, before the
 * start, after the end, failures) is reachable without a server. It is never
 * transferred: a host mounts `createHttpDaoPillarClient` against its real API.
 */
import type { DaoPillarClient } from '../../../components/dao-pillar/shared/daoPillarClient';
import { DaoPillarClientError } from '../../../components/dao-pillar/shared/daoPillarClient';
import { addCalendarDays, calendarDateIn } from '../../../server/dao-pillar/calendar';
import { InMemoryDaoPillarRepository } from '../../../server/dao-pillar/inMemoryDaoPillarRepository';
import { DaoPillarService } from '../../../server/dao-pillar/service';
import { BETA_TEST_THEME, buildRewardSchedule, cycleIdFor, withCalendar } from '../../../server/dao-pillar/themes';
import type { DaoPillarPrincipal, DaoPillarTheme } from '../../../server/dao-pillar/types';

export type LocalDaoPillarMode = 'success' | 'claim-failed' | 'claim-unresolved' | 'offline';

export interface LocalDaoPillarClientOptions {
  uid: string;
  /** Which scheduled day today is (1–30); the theme's start date is derived. Default 13. */
  todayIsDay?: number;
  /** Days before today already collected, as day numbers. */
  collectedDays?: number[];
  /** Also collect today's day before the first read. */
  collectedToday?: boolean;
  /** Shift the cycle so today falls before its start or after its end. */
  phase?: 'before' | 'active' | 'after';
  mode?: LocalDaoPillarMode;
  theme?: DaoPillarTheme;
  /** Simulated latency so loading states are visible in the Workshop. */
  delayMs?: number;
  now?: () => Date;
}

export function createLocalDaoPillarClient({
  uid,
  todayIsDay = 13,
  collectedDays = [],
  collectedToday = false,
  phase = 'active',
  mode = 'success',
  theme = BETA_TEST_THEME,
  delayMs = 0,
  now = () => new Date(),
}: LocalDaoPillarClientOptions): DaoPillarClient & { service: DaoPillarService; repository: InMemoryDaoPillarRepository } {
  const today = calendarDateIn(theme.calendar.timeZone, now());
  const startsOn = phase === 'before' ? addCalendarDays(today, 3)
    : phase === 'after' ? addCalendarDays(today, -(theme.calendar.days + 2))
    : addCalendarDays(today, -(todayIsDay - 1));
  const activeTheme = withCalendar(theme, { startsOn });
  const repository = new InMemoryDaoPillarRepository();
  const service = new DaoPillarService(repository, { identityMode: 'development', activeTheme }, { now });
  const principal: DaoPillarPrincipal = { uid, role: 'user', identity: 'development', developmentAccess: true };

  const schedule = buildRewardSchedule(activeTheme);
  const seeded = (async () => {
    const days = [...collectedDays, ...(collectedToday && phase === 'active' ? [todayIsDay] : [])];
    for (const day of days) {
      const entry = schedule[day - 1];
      if (!entry) continue;
      await repository.claimDay({
        uid, themeId: activeTheme.id, cycleId: cycleIdFor(activeTheme), dayNumber: day,
        scheduledDate: entry.scheduledDate, rewards: entry.rewards, description: `${activeTheme.name} · Day ${day}`,
      });
    }
  })();

  const settle = async <T,>(work: () => Promise<T>): Promise<T> => {
    await seeded;
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    return work();
  };
  const offline = async () => { throw new DaoPillarClientError(0, 'network', 'The Dao Pillar could not be reached. Check your connection and try again.'); };

  return {
    service,
    repository,
    getCalendar: () => (mode === 'offline' ? offline() : settle(() => service.getSnapshot(principal))),
    claimToday: () => settle(async () => {
      if (mode === 'offline') return offline();
      if (mode === 'claim-failed') throw new DaoPillarClientError(503, 'unavailable', 'The Dao Pillar is unavailable right now. Please try again shortly.');
      const response = await service.claimToday(principal);
      // The claim landed on the server but the answer was lost on the way back.
      if (mode === 'claim-unresolved') throw new DaoPillarClientError(0, 'network', 'The Dao Pillar could not be reached. Check your connection and try again.');
      return response;
    }),
  };
}
