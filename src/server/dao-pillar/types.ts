import { type DeliveredReward, type RewardEntry } from '@seihouse/library/dao-pillar';
import type { JsonObject } from '../qi/qiLedger';

/**
 * Who a Dao Pillar operation runs for. Resolved on the server by the same
 * bearer-token resolver Energy uses (`createPrincipalResolver`); request
 * bodies never name the user.
 */

/** How the calendar decides which scheduled day "today" is. */
export interface DaoPillarCalendarConfig {
  /** Day 1 of the cycle, YYYY-MM-DD. */
  startsOn: string;
  /** Number of scheduled days (30 for Beta Test). */
  days: number;
  /** IANA time zone the day boundary is computed in. */
  timeZone: string;
}

export interface DaoPillarRewardConfig {
  /** What every scheduled day awards unless overridden. */
  everyDay: RewardEntry[];
  /** Days that receive `milestone` instead of `everyDay` and stronger emphasis. */
  milestoneDays: number[];
  milestone: RewardEntry[];
  /** Exact per-day overrides for future mixed themes; wins over both above. */
  overrides?: Record<number, RewardEntry[]>;
}

/**
 * One Library-controlled theme. Only one is active at a time, chosen by
 * configuration (`DAO_PILLAR_ACTIVE_THEME`), never by a user. A theme is the
 * banner, its copy, its dates, its visual accents and its reward schedule;
 * the calendar mechanics never change between themes.
 */
export interface DaoPillarTheme {
  id: string;
  name: string;
  tagline: string;
  description: string;
  motto: string;
  pillars: string[];
  calendar: DaoPillarCalendarConfig;
  rewards: DaoPillarRewardConfig;
  visual: {
    bannerSrc: string;
    seal: string;
    accent: string;
    gold: string;
  };
}

/** The resolved schedule for one day of a theme. */
export interface DaoPillarDaySchedule {
  day: number;
  scheduledDate: string;
  rewards: RewardEntry[];
  milestone: boolean;
}

export type DaoPillarClaimStatus = 'delivered' | 'reversed';

export interface DaoPillarClaimRecord {
  id: string;
  uid: string;
  themeId: string;
  cycleId: string;
  dayNumber: number;
  scheduledDate: string;
  rewards: RewardEntry[];
  status: DaoPillarClaimStatus;
  delivered: DeliveredReward[];
  claimedAt: string;
  metadata: JsonObject;
}
