import type { DeliveredRewardGrant } from '@seihouse/library/rewards';
import type { CreateRelicGrantCommand, FateSurvivalRelicRecord, RelicRepository } from './repository';

const newId = (): string => `relic-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
const clone = <T,>(value: T): T => structuredClone(value);

/** The Relic rules without a database; synchronous inside each call. */
export class InMemoryRelicRepository implements RelicRepository {
  private readonly grants = new Map<string, FateSurvivalRelicRecord[]>();

  async createGrant(command: CreateRelicGrantCommand): Promise<{ grant: FateSurvivalRelicRecord; created: boolean }> {
    const owned = this.grants.get(command.uid) ?? [];
    this.grants.set(command.uid, owned);
    const existing = owned.find(grant => grant.challengeId === command.challengeId);
    if (existing) return { grant: clone(existing), created: false };
    const grant: FateSurvivalRelicRecord = { id: newId(), ...clone(command), delivered: null };
    owned.push(grant);
    return { grant: clone(grant), created: true };
  }

  async recordDelivery(uid: string, grantId: string, delivered: DeliveredRewardGrant[]): Promise<FateSurvivalRelicRecord> {
    const grant = (this.grants.get(uid) ?? []).find(candidate => candidate.id === grantId);
    if (!grant) throw new Error(`Relic grant ${grantId} was not found.`);
    grant.delivered ??= clone(delivered);
    return clone(grant);
  }

  async listGrants(uid: string): Promise<FateSurvivalRelicRecord[]> {
    return [...(this.grants.get(uid) ?? [])].sort((left, right) => right.earnedAt.localeCompare(left.earnedAt)).map(clone);
  }

  /** Test and development helper. */
  reset(uid: string): void {
    this.grants.delete(uid);
  }
}
