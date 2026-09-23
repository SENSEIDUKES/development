/**
 * Which balances each reward source may credit, enforced by the deliverer
 * before any ledger moves.
 *
 * The direction this encodes:
 * - DAO XP (rank) comes only from achievements, creation, and Fate Survival
 *   Relics. The Dao Pillar, the Celestial Store and Familiar training have no
 *   path to it, and the DAO XP ledger refuses them a second time.
 * - Fate Survival Relics are lightweight: DAO XP and Energy only.
 * - Creation credits DAO XP directly.
 *
 * `mystery-scroll` allowing QI beside DAO XP, and excluding Energy, is the
 * current development default rather than a settled product decision — edit
 * the list here and every achievement definition is revalidated at load.
 */
import type { RewardCurrency } from '@seihouse/library/rewards';
import type { DaoXpSource } from '../dao-xp/daoXpLedger';

export type RewardSource = 'mystery-scroll' | 'fate-survival-relic' | 'creation';

export interface RewardSourcePolicy {
  /** The balances this source may credit. */
  currencies: readonly RewardCurrency[];
  /** How a DAO XP credit from this source is recorded on the DAO XP ledger. */
  daoXpSource: DaoXpSource | null;
  /** The `source` a QI deposit from this source carries. */
  qiSource: string | null;
  /** The `metadata.source` an Energy grant from this source carries. */
  energySource: string | null;
}

export const REWARD_SOURCE_POLICY: Readonly<Record<RewardSource, RewardSourcePolicy>> = {
  'mystery-scroll': { currencies: ['dao-xp', 'qi'], daoXpSource: 'achievement', qiSource: 'mystery-scroll', energySource: null },
  'fate-survival-relic': { currencies: ['dao-xp', 'energy'], daoXpSource: 'fate-survival-relic', qiSource: null, energySource: 'fate-survival-relic' },
  creation: { currencies: ['dao-xp'], daoXpSource: 'creation', qiSource: null, energySource: null },
};
