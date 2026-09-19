import { describeRewards, type DaoPillarCalendarSnapshot, type DaoPillarClaimResponse, type DaoPillarPhase, type DaoPillarStreak, type DaoPillarThemePresentation, type DaoPillarTile, type DaoPillarToday } from '@seihouse/library/dao-pillar';
import { addCalendarDays, calendarDateIn } from './calendar';
import type { ResolvedDaoPillarConfig } from './config';
import { DaoPillarNotAvailableError, type DaoPillarRepository } from './repository';
import { buildRewardSchedule, cycleEndsOn, cycleIdFor, scheduledDayOn, validateDaoPillarTheme } from './themes';
import type { DaoPillarClaimRecord, DaoPillarDaySchedule, DaoPillarTheme } from './types';
import type { LibraryPrincipal } from '../identity/types';

export interface DaoPillarServiceOptions {
  /** The server clock. Tests inject a fixed instant. */
  now?: () => Date;
}

const presentTheme = (theme: DaoPillarTheme): DaoPillarThemePresentation => ({
  id: theme.id,
  name: theme.name,
  tagline: theme.tagline,
  description: theme.description,
  motto: theme.motto,
  pillars: [...theme.pillars],
  visual: { ...theme.visual },
});

/**
 * Consecutive claimed calendar dates ending today (or yesterday when today is
 * still open), counted across every theme and cycle so a theme change never
 * resets what a cultivator built.
 */
export function computeStreak(claims: readonly DaoPillarClaimRecord[], today: string): DaoPillarStreak {
  const dates = new Set(claims.filter(claim => claim.status === 'delivered').map(claim => claim.scheduledDate));
  let cursor = dates.has(today) ? today : addCalendarDays(today, -1);
  let current = 0;
  while (dates.has(cursor)) {
    current += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return { current, totalCollected: dates.size };
}

/**
 * The Dao Pillar calendar: the one active theme, its schedule, and the
 * cultivator's claims. Reads produce the snapshot; `claimToday` is the only
 * write, and it decides the day, the date and the reward itself.
 */
export class DaoPillarService {
  private readonly theme: DaoPillarTheme;
  private readonly schedule: DaoPillarDaySchedule[];
  private readonly cycleId: string;
  private readonly now: () => Date;

  constructor(
    private readonly repository: DaoPillarRepository,
    config: ResolvedDaoPillarConfig,
    options: DaoPillarServiceOptions = {},
  ) {
    this.theme = validateDaoPillarTheme(config.activeTheme);
    this.schedule = buildRewardSchedule(this.theme);
    this.cycleId = cycleIdFor(this.theme);
    this.now = options.now ?? (() => new Date());
  }

  get activeTheme(): DaoPillarTheme {
    return this.theme;
  }

  /** The server's calendar date right now, in the cycle's time zone. */
  today(): string {
    return calendarDateIn(this.theme.calendar.timeZone, this.now());
  }

  private phaseOn(date: string): DaoPillarPhase {
    if (date < this.theme.calendar.startsOn) return 'before';
    if (date > cycleEndsOn(this.theme)) return 'after';
    return 'active';
  }

  async getSnapshot(principal: LibraryPrincipal): Promise<DaoPillarCalendarSnapshot> {
    const claims = await this.repository.listClaims(principal.uid);
    return this.snapshotFrom(principal, claims);
  }

  private snapshotFrom(principal: LibraryPrincipal, claims: readonly DaoPillarClaimRecord[]): DaoPillarCalendarSnapshot {
    const today = this.today();
    const phase = this.phaseOn(today);
    const todayDay = phase === 'active' ? scheduledDayOn(this.theme, today) : null;
    const cycleClaims = new Map(
      claims.filter(claim => claim.cycleId === this.cycleId && claim.status === 'delivered').map(claim => [claim.dayNumber, claim]),
    );
    const tiles: DaoPillarTile[] = this.schedule.map(entry => {
      const claim = cycleClaims.get(entry.day);
      const state: DaoPillarTile['state'] = claim ? 'collected'
        : entry.scheduledDate === today ? 'available'
        : entry.scheduledDate < today ? 'missed'
        : 'locked';
      return {
        day: entry.day,
        scheduledDate: entry.scheduledDate,
        rewards: entry.rewards.map(reward => ({ ...reward })),
        milestone: entry.milestone,
        state,
        claimedAt: claim?.claimedAt ?? null,
        delivered: claim ? claim.delivered.map(reward => ({ ...reward })) : null,
      };
    });
    const todayClaim = todayDay ? cycleClaims.get(todayDay) : undefined;
    const todayState: DaoPillarToday = {
      date: today,
      phase,
      day: todayDay,
      status: todayClaim ? 'collected' : todayDay ? 'available' : 'unavailable',
      collected: todayClaim
        ? { rewards: todayClaim.rewards.map(reward => ({ ...reward })), delivered: todayClaim.delivered.map(reward => ({ ...reward })), claimedAt: todayClaim.claimedAt }
        : null,
    };
    return {
      uid: principal.uid,
      theme: presentTheme(this.theme),
      cycle: {
        id: this.cycleId,
        themeId: this.theme.id,
        startsOn: this.theme.calendar.startsOn,
        endsOn: cycleEndsOn(this.theme),
        days: this.theme.calendar.days,
        timeZone: this.theme.calendar.timeZone,
      },
      today: todayState,
      tiles,
      streak: computeStreak(claims, today),
      updatedAt: this.now().toISOString(),
    };
  }

  /**
   * Claims today's scheduled day for the principal. The day, its date and its
   * reward come from the server schedule; the caller supplies nothing but
   * their identity. Repeating the call replays the original claim.
   */
  async claimToday(principal: LibraryPrincipal): Promise<DaoPillarClaimResponse> {
    const today = this.today();
    const phase = this.phaseOn(today);
    if (phase === 'before') throw new DaoPillarNotAvailableError(`${this.theme.name} begins on ${this.theme.calendar.startsOn}.`);
    if (phase === 'after') throw new DaoPillarNotAvailableError(`${this.theme.name} ended on ${cycleEndsOn(this.theme)}.`);
    const day = scheduledDayOn(this.theme, today);
    const entry = day ? this.schedule[day - 1] : undefined;
    if (!day || !entry) throw new DaoPillarNotAvailableError('No scheduled day is open today.');
    const { claim, replayed } = await this.repository.claimDay({
      uid: principal.uid,
      themeId: this.theme.id,
      cycleId: this.cycleId,
      dayNumber: day,
      scheduledDate: entry.scheduledDate,
      rewards: entry.rewards,
      description: `${this.theme.name} · Day ${day}`,
      metadata: { milestone: entry.milestone },
    });
    const claims = await this.repository.listClaims(principal.uid);
    const snapshot = this.snapshotFrom(principal, claims);
    return {
      outcome: replayed ? 'already-collected' : 'claimed',
      message: replayed
        ? `Day ${day} was already collected.`
        : `Day ${day} collected: +${describeRewards(claim.rewards)}.`,
      claim: {
        id: claim.id,
        day: claim.dayNumber,
        scheduledDate: claim.scheduledDate,
        rewards: claim.rewards,
        delivered: claim.delivered,
        claimedAt: claim.claimedAt,
      },
      snapshot,
    };
  }
}
