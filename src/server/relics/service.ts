import { describeRewardGrants } from '@seihouse/library/rewards';
import {
  isFateSurvivalOutcome,
  type FateSurvivalOutcomeInput,
  type FateSurvivalOutcomeResponse,
  type FateSurvivalRelicView,
  type RelicsSnapshot,
} from '@seihouse/library/relics';
import type { LibraryPrincipal } from '../identity/types';
import type { RewardDeliverer } from '../rewards/deliverer';
import { FATE_SURVIVAL_OUTCOME_RARITY, FATE_SURVIVAL_RELICS, relicForChallenge, validateRelicCatalog, type RelicDefinition } from './catalog';
import { RelicValidationError, type FateSurvivalRelicRecord, type RelicRepository } from './repository';

const projectRelic = (grant: FateSurvivalRelicRecord): FateSurvivalRelicView => ({
  id: grant.id,
  relicKey: grant.relic.key,
  name: grant.relic.name,
  description: grant.relic.description,
  rarity: grant.relic.rarity,
  challengeId: grant.challengeId,
  storyId: grant.storyId,
  outcome: grant.outcome,
  rewards: grant.relic.rewards.map(entry => ({ ...entry })),
  delivered: (grant.delivered ?? []).map(entry => ({ ...entry })),
  earnedAt: grant.earnedAt,
});

/**
 * Fate Survival Relics. The only write is `recordFateSurvivalOutcome`, which
 * the Fate Survival judging system calls with a trusted outcome (the
 * Workshop's development simulator stands in for it today). It decides the
 * rarity and Relic on the server, grants at most one Relic per challenge, and
 * delivers its DAO XP and Energy through the reward deliverer.
 */
export class RelicService {
  private readonly relics: readonly RelicDefinition[];

  constructor(
    private readonly repository: RelicRepository,
    private readonly deliverer: RewardDeliverer,
    private readonly options: { now?: () => Date; relics?: readonly RelicDefinition[]; outcomeRarity?: typeof FATE_SURVIVAL_OUTCOME_RARITY } = {},
  ) {
    this.relics = validateRelicCatalog(options.relics ?? FATE_SURVIVAL_RELICS, options.outcomeRarity ?? FATE_SURVIVAL_OUTCOME_RARITY);
  }

  private get outcomeRarity() {
    return this.options.outcomeRarity ?? FATE_SURVIVAL_OUTCOME_RARITY;
  }

  private now() {
    return (this.options.now ?? (() => new Date()))();
  }

  async getSnapshot(principal: Pick<LibraryPrincipal, 'uid'>): Promise<RelicsSnapshot> {
    return {
      uid: principal.uid,
      relics: (await this.repository.listGrants(principal.uid)).map(projectRelic),
      outcomeRarity: { ...this.outcomeRarity },
      updatedAt: this.now().toISOString(),
    };
  }

  async recordFateSurvivalOutcome(uid: string, input: FateSurvivalOutcomeInput): Promise<FateSurvivalOutcomeResponse> {
    const issues: string[] = [];
    if (!uid?.trim()) issues.push('A user id is required.');
    if (typeof input.challengeId !== 'string' || !input.challengeId.trim() || input.challengeId.length > 200) issues.push('A challenge id of 1–200 characters is required.');
    if (!isFateSurvivalOutcome(input.outcome)) issues.push('The Fate Survival outcome is unknown.');
    if (input.storyId !== undefined && (typeof input.storyId !== 'string' || !input.storyId.trim() || input.storyId.length > 200)) issues.push('storyId must be 1–200 characters.');
    if (issues.length) throw new RelicValidationError(issues);

    const rarity = this.outcomeRarity[input.outcome];
    const relic = rarity ? relicForChallenge(this.relics, rarity, input.challengeId) : null;
    if (!relic) {
      return {
        outcome: 'no-relic',
        message: `${input.outcome}: this outcome earns no Relic.`,
        relic: null,
        snapshot: await this.getSnapshot({ uid }),
      };
    }
    const { grant, created } = await this.repository.createGrant({
      uid,
      challengeId: input.challengeId.trim(),
      storyId: input.storyId?.trim() ?? null,
      outcome: input.outcome,
      relic: { key: relic.key, name: relic.name, description: relic.description, rarity: relic.rarity, rewards: relic.rewards.map(entry => ({ ...entry })) },
      earnedAt: this.now().toISOString(),
    });
    // A created grant delivers now; an earlier grant whose delivery was
    // interrupted completes here, replaying whatever already landed.
    const stored = grant.delivered ? grant : await this.repository.recordDelivery(uid, grant.id, await this.deliverer.deliver({
      uid,
      source: 'fate-survival-relic',
      grants: grant.relic.rewards,
      keyPrefix: `fate-survival-relic:${grant.id}`,
      description: `${grant.relic.name} · Fate Survival Relic`,
      metadata: { relicGrantId: grant.id, challengeId: grant.challengeId, outcome: grant.outcome },
    }));
    return {
      outcome: created ? 'granted' : 'already-granted',
      message: created
        ? `${stored.relic.name} (${stored.relic.rarity}): ${describeRewardGrants(stored.relic.rewards)}.`
        : `Challenge ${stored.challengeId} already earned ${stored.relic.name}.`,
      relic: projectRelic(stored),
      snapshot: await this.getSnapshot({ uid }),
    };
  }
}
