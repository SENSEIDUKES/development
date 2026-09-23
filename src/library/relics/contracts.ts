/**
 * Relic contracts shared by the server-owned Relic ledger and every Library
 * surface.
 *
 * Relics are lightweight rewards with exactly one source: Fate Survival, the
 * Library's dedicated challenge system. A Relic may grant DAO XP and Energy
 * (more at higher rarities) and nothing else — no QI, titles, attunement,
 * offerings, or status effects. Mystery Scrolls, not Relics, are the reward for
 * achievements.
 *
 * The outcome vocabulary is SEN's own Fate Survival vocabulary. The judging
 * that turns a run into a trusted outcome belongs to the future Fate Survival
 * system; until it exists, only the Workshop's development simulator records
 * outcomes.
 */
import type { FateResultData } from '@seihouse/sen/generation';
import type { DeliveredRewardGrant, RewardGrant, RewardRarity } from '../rewards/contracts';

export type FateSurvivalOutcome = FateResultData['outcome'];

export const FATE_SURVIVAL_OUTCOMES: readonly FateSurvivalOutcome[] = ['FATE AVERTED', 'FATE SCARRED', 'DOOM MANIFESTED'];

export const isFateSurvivalOutcome = (value: unknown): value is FateSurvivalOutcome =>
  typeof value === 'string' && (FATE_SURVIVAL_OUTCOMES as readonly string[]).includes(value);

/** One Relic a cultivator earned from one Fate Survival challenge. */
export interface FateSurvivalRelicView {
  id: string;
  relicKey: string;
  name: string;
  description: string;
  rarity: RewardRarity;
  /** The Fate Survival challenge this Relic was earned in. One Relic per challenge. */
  challengeId: string;
  storyId: string | null;
  outcome: FateSurvivalOutcome;
  rewards: RewardGrant[];
  /** What landed on the ledgers. */
  delivered: DeliveredRewardGrant[];
  earnedAt: string;
}

export interface RelicsSnapshot {
  uid: string;
  /** Newest first. */
  relics: FateSurvivalRelicView[];
  /** Which rarity each judged outcome earns; `null` earns no Relic. A development default. */
  outcomeRarity: Record<FateSurvivalOutcome, RewardRarity | null>;
  updatedAt: string;
}

/** Development-only: stands in for the future Fate Survival judging system. */
export interface FateSurvivalOutcomeInput {
  challengeId: string;
  outcome: FateSurvivalOutcome;
  storyId?: string;
}

export interface FateSurvivalOutcomeResponse {
  outcome: 'granted' | 'already-granted' | 'no-relic';
  message: string;
  relic: FateSurvivalRelicView | null;
  snapshot: RelicsSnapshot;
}

export type RelicsHttpOperation = { operation: 'development.fate-survival-outcome' } & FateSurvivalOutcomeInput;

export interface RelicsHttpError {
  error: string;
  code: 'unauthenticated' | 'forbidden' | 'invalid_request' | 'method_not_allowed' | 'unavailable';
}

export const RELICS_API_PATH = '/api/library-economy?capability=relics';
