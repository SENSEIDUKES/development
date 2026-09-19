import { type DeliveredReward } from '@seihouse/library/dao-pillar';
import { InMemoryQiLedger } from '../qi/inMemoryQiLedger';
import {
  assertClaimDayCommand,
  DaoPillarUnsupportedRewardError,
  type ClaimDayCommand,
  type ClaimDayResult,
  type DaoPillarRepository,
} from './repository';
import type { DaoPillarClaimRecord } from './types';

const newId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * The claim rules without a database. `claimDay` runs synchronously from the
 * duplicate check through the Qi deposit, so no other call can interleave:
 * that is the in-memory equivalent of the migration's row lock.
 */
export class InMemoryDaoPillarRepository implements DaoPillarRepository {
  private readonly claims = new Map<string, DaoPillarClaimRecord[]>();
  private readonly now: () => string;

  constructor(
    readonly qi: InMemoryQiLedger = new InMemoryQiLedger(),
    options: { now?: () => string } = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async listClaims(uid: string): Promise<DaoPillarClaimRecord[]> {
    return [...(this.claims.get(uid) ?? [])]
      .sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : a.scheduledDate > b.scheduledDate ? -1 : 0))
      .map(claim => ({ ...claim, rewards: claim.rewards.map(entry => ({ ...entry })), delivered: claim.delivered.map(entry => ({ ...entry })) }));
  }

  async claimDay(command: ClaimDayCommand): Promise<ClaimDayResult> {
    assertClaimDayCommand(command);
    const history = this.claims.get(command.uid) ?? [];
    this.claims.set(command.uid, history);
    const existing = history.find(claim => claim.cycleId === command.cycleId && claim.dayNumber === command.dayNumber);
    if (existing) return { claim: { ...existing }, replayed: true };
    const unsupported = command.rewards.find(entry => entry.type !== 'qi');
    if (unsupported) throw new DaoPillarUnsupportedRewardError(`Reward type ${unsupported.type} cannot be delivered yet.`);
    const id = newId();
    const delivered: DeliveredReward[] = [];
    command.rewards.forEach((entry, index) => {
      if (entry.type !== 'qi') return;
      const deposit = this.qi.depositSync({
        uid: command.uid,
        amount: entry.amount,
        idempotencyKey: `dao-pillar:${id}:${index}`,
        source: 'dao-pillar',
        description: command.description,
        metadata: { claimId: id, cycleId: command.cycleId, day: command.dayNumber },
      });
      delivered.push({ type: 'qi', amount: entry.amount, transactionId: deposit.transaction.id, balanceAfter: deposit.account.balance });
    });
    const claim: DaoPillarClaimRecord = {
      id,
      uid: command.uid,
      themeId: command.themeId,
      cycleId: command.cycleId,
      dayNumber: command.dayNumber,
      scheduledDate: command.scheduledDate,
      rewards: command.rewards.map(entry => ({ ...entry })),
      status: 'delivered',
      delivered,
      claimedAt: this.now(),
      metadata: { ...(command.metadata ?? {}) },
    };
    history.push(claim);
    return { claim: { ...claim }, replayed: false };
  }

  async getQiBalance(uid: string): Promise<number> {
    return (await this.qi.getAccount(uid))?.balance ?? 0;
  }

  /** Test and development helper: forgets a cultivator's claims and Qi. */
  reset(uid: string): void {
    this.claims.delete(uid);
    this.qi.reset(uid);
  }
}
