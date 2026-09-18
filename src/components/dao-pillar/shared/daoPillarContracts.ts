/**
 * Daily Dao Pillar contracts shared by the server-owned calendar and every
 * client surface.
 *
 * The Dao Pillar is a Library reward calendar: one active theme at a time,
 * thirty scheduled days, one claim per user per scheduled day. This file
 * carries only what both sides must agree on — the generic reward entry
 * shape, the read-only calendar snapshot the server hands to a browser, and
 * the claim response. It imports nothing from the server.
 *
 * Eligibility, dates, reward amounts and Qi deposits are decided by the
 * server (`src/server/dao-pillar`). A browser only renders what it was given
 * and asks to claim "today"; it never names a day, a date or an amount.
 */

export const DAO_PILLAR_API_PATH = '/api/dao-pillar';

/**
 * One thing a scheduled day awards. `qi` is the only kind delivered today;
 * the other kinds exist so a future theme can be configured with Relics,
 * Titles, Energy or Media Packs without changing the calendar or the claim
 * record, and the server refuses to activate a theme whose entries it cannot
 * deliver yet.
 */
export type RewardEntry =
  | { type: 'qi'; amount: number }
  | { type: 'energy'; amount: number }
  | { type: 'relic'; relicId: string; quantity?: number }
  | { type: 'title'; titleId: string }
  | { type: 'media-pack'; packId: string };

export type RewardType = RewardEntry['type'];

/** What actually landed for one reward entry when a claim was delivered. */
export type DeliveredReward =
  | { type: 'qi'; amount: number; transactionId: string; balanceAfter: number };

export type DaoPillarTileState = 'collected' | 'available' | 'locked' | 'missed';

export interface DaoPillarTile {
  /** 1-based day of the cycle. */
  day: number;
  /** The calendar date (YYYY-MM-DD, in the cycle's time zone) this day is claimable on. */
  scheduledDate: string;
  rewards: RewardEntry[];
  /** Stronger visual emphasis on the calendar (days 7, 14, 21, 28 in Beta Test). */
  milestone: boolean;
  state: DaoPillarTileState;
  /** When this user collected the day; null unless `state` is `collected`. */
  claimedAt: string | null;
  delivered: DeliveredReward[] | null;
}

export interface DaoPillarThemePresentation {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Closing line under the banner. */
  motto: string;
  /** Short pillars printed beside the seal (Study, Reflect, …). */
  pillars: string[];
  visual: {
    /** Banner art, served from the host's public folder. */
    bannerSrc: string;
    /** The glyph inside the seal. */
    seal: string;
    accent: string;
    gold: string;
  };
}

export interface DaoPillarCycle {
  /** `<themeId>:<startsOn>` — the same theme run again later is a new cycle. */
  id: string;
  themeId: string;
  startsOn: string;
  endsOn: string;
  days: number;
  timeZone: string;
}

export type DaoPillarPhase = 'before' | 'active' | 'after';

export interface DaoPillarToday {
  /** The server's calendar date for this request. */
  date: string;
  phase: DaoPillarPhase;
  /** The scheduled day that is claimable today, or null outside the cycle. */
  day: number | null;
  /** How today stands for this user. */
  status: 'available' | 'collected' | 'unavailable';
  /** Present when `status` is `collected`. */
  collected: { rewards: RewardEntry[]; delivered: DeliveredReward[]; claimedAt: string } | null;
}

export interface DaoPillarStreak {
  /** Consecutive scheduled days collected, ending today or yesterday. */
  current: number;
  /** Every scheduled day this user has ever collected, across themes. */
  totalCollected: number;
}

export interface DaoPillarCalendarSnapshot {
  uid: string;
  theme: DaoPillarThemePresentation;
  cycle: DaoPillarCycle;
  today: DaoPillarToday;
  tiles: DaoPillarTile[];
  streak: DaoPillarStreak;
  updatedAt: string;
}

export type DaoPillarClaimOutcome = 'claimed' | 'already-collected';

export interface DaoPillarClaimResponse {
  outcome: DaoPillarClaimOutcome;
  message: string;
  claim: {
    id: string;
    day: number;
    scheduledDate: string;
    rewards: RewardEntry[];
    delivered: DeliveredReward[];
    claimedAt: string;
  };
  /** The calendar after the claim, so no second request is needed. */
  snapshot: DaoPillarCalendarSnapshot;
}

export type DaoPillarHttpOperation = { operation: 'claim' };

export interface DaoPillarHttpError {
  error: string;
  code: 'unauthenticated' | 'method_not_allowed' | 'invalid_request' | 'not_available' | 'unavailable';
}

const formatWhole = (value: number) => value.toLocaleString('en-US');

/** "100 Qi", "500 Qi", or "100 Qi + Relic" for a mixed day. */
export function describeRewards(entries: readonly RewardEntry[]): string {
  return entries.map(entry => {
    switch (entry.type) {
      case 'qi': return `${formatWhole(entry.amount)} Qi`;
      case 'energy': return `${formatWhole(entry.amount)} Energy`;
      case 'relic': return entry.quantity && entry.quantity > 1 ? `${entry.quantity} Relics` : 'Relic';
      case 'title': return 'Title';
      case 'media-pack': return 'Media Pack';
    }
  }).join(' + ');
}

/** The Qi a set of reward entries deposits; zero when none is Qi. */
export const qiAmountOf = (entries: readonly (RewardEntry | DeliveredReward)[]): number =>
  entries.reduce((total, entry) => (entry.type === 'qi' ? total + entry.amount : total), 0);
