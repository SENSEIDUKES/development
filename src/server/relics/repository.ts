import type { DeliveredRewardGrant, RewardGrant, RewardRarity } from '@seihouse/library/rewards';
import type { FateSurvivalOutcome } from '@seihouse/library/relics';

export class RelicValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'RelicValidationError';
    this.issues = issues;
  }
}

/** One Relic earned in one Fate Survival challenge; the relic definition is snapshotted. */
export interface FateSurvivalRelicRecord {
  id: string;
  uid: string;
  challengeId: string;
  storyId: string | null;
  outcome: FateSurvivalOutcome;
  relic: { key: string; name: string; description: string; rarity: RewardRarity; rewards: RewardGrant[] };
  /** Null until the ledgers confirm every grant. */
  delivered: DeliveredRewardGrant[] | null;
  earnedAt: string;
}

export interface CreateRelicGrantCommand {
  uid: string;
  challengeId: string;
  storyId: string | null;
  outcome: FateSurvivalOutcome;
  relic: FateSurvivalRelicRecord['relic'];
  earnedAt: string;
}

/**
 * Durable Relic storage. `createGrant` is idempotent per (uid, challengeId):
 * one Relic per Fate Survival challenge, however often its outcome is
 * reported. The Postgres migration carries that guard as a unique constraint.
 */
export interface RelicRepository {
  createGrant(command: CreateRelicGrantCommand): Promise<{ grant: FateSurvivalRelicRecord; created: boolean }>;
  recordDelivery(uid: string, grantId: string, delivered: DeliveredRewardGrant[]): Promise<FateSurvivalRelicRecord>;
  listGrants(uid: string): Promise<FateSurvivalRelicRecord[]>;
}
