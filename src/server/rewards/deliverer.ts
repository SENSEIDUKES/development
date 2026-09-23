import { orderRewardGrants, REWARD_CURRENCIES, type DeliveredRewardGrant, type RewardGrant } from '@seihouse/library/rewards';
import type { DaoXpLedger } from '../dao-xp/daoXpLedger';
import type { EnergyRepository } from '../energy/repository';
import type { JsonObject, QiLedger } from '../qi/qiLedger';
import { REWARD_SOURCE_POLICY, type RewardSource } from './policy';

/** A reward names a balance its source may not credit, or is malformed. Nothing moved. */
export class RewardPolicyError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'RewardPolicyError';
    this.issues = issues;
  }
}

export interface RewardLedgers {
  daoXp: DaoXpLedger;
  qi: QiLedger;
  energy: EnergyRepository;
}

export interface DeliverRewardsCommand {
  uid: string;
  source: RewardSource;
  grants: readonly RewardGrant[];
  /**
   * The record this delivery belongs to, e.g. `mystery-scroll:<id>`. Each
   * grant is keyed `<keyPrefix>:<currency>`, so a retry after a partial
   * failure completes the remaining grants and replays the finished ones.
   */
  keyPrefix: string;
  description: string;
  metadata?: JsonObject;
}

/** Throws `RewardPolicyError` unless every grant is allowed for `source` and the bundle is well-formed. */
export function assertRewardGrants(source: RewardSource, grants: readonly RewardGrant[]): void {
  const policy = REWARD_SOURCE_POLICY[source];
  const issues: string[] = [];
  if (!policy) issues.push(`Unknown reward source ${String(source)}.`);
  const seen = new Set<string>();
  for (const grant of grants) {
    if (!(REWARD_CURRENCIES as readonly string[]).includes(grant.type)) issues.push(`Unknown reward currency ${String(grant.type)}.`);
    else if (policy && !policy.currencies.includes(grant.type)) issues.push(`${source} cannot grant ${grant.type}.`);
    if (!Number.isSafeInteger(grant.amount) || grant.amount <= 0) issues.push(`A ${grant.type} reward needs a positive whole amount.`);
    if (seen.has(grant.type)) issues.push(`A reward lists ${grant.type} twice.`);
    seen.add(grant.type);
  }
  if (issues.length) throw new RewardPolicyError(issues);
}

/**
 * The one server path from a reward record to the ledgers. It validates the
 * whole bundle against the source's policy before moving anything, then
 * credits each balance through its own idempotent ledger in a fixed order
 * (DAO XP, QI, Energy). It never decides an amount; callers pass the grants
 * their server-side record already holds.
 */
export class RewardDeliverer {
  constructor(private readonly ledgers: RewardLedgers) {}

  async deliver(command: DeliverRewardsCommand): Promise<DeliveredRewardGrant[]> {
    assertRewardGrants(command.source, command.grants);
    const policy = REWARD_SOURCE_POLICY[command.source];
    const delivered: DeliveredRewardGrant[] = [];
    for (const grant of orderRewardGrants(command.grants)) {
      const idempotencyKey = `${command.keyPrefix}:${grant.type}`;
      const metadata = { ...(command.metadata ?? {}), rewardSource: command.source };
      if (grant.type === 'dao-xp') {
        const result = await this.ledgers.daoXp.credit({
          uid: command.uid, amount: grant.amount, source: policy.daoXpSource!,
          idempotencyKey, description: command.description, metadata,
        });
        delivered.push({ ...grant, transactionId: result.transaction.id, balanceAfter: result.account.balance });
      } else if (grant.type === 'qi') {
        const result = await this.ledgers.qi.deposit({
          uid: command.uid, amount: grant.amount, source: policy.qiSource!,
          idempotencyKey, description: command.description, metadata,
        });
        delivered.push({ ...grant, transactionId: result.transaction.id, balanceAfter: result.account.balance });
      } else {
        const result = await this.ledgers.energy.applyGrant({
          uid: command.uid, amount: grant.amount, idempotencyKey, description: command.description,
          metadata: { ...metadata, source: policy.energySource! },
        });
        delivered.push({ ...grant, transactionId: result.transaction.id, balanceAfter: result.account.balance });
      }
    }
    return delivered;
  }
}
