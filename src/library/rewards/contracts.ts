/**
 * Reward vocabulary shared by the server and every Library reward surface.
 *
 * The reward system enhances the Library; it is not the main experience. A
 * reward is only ever one of three server-owned balances:
 *
 * - `dao-xp` — permanent progression, the only input to Cultivator Rank
 *   (which only chooses the cultivator's Library colours);
 * - `qi` — spendable currency (Familiar training, Celestial Store);
 * - `energy` — spendable generation meter (generation, Celestial Store).
 *
 * Every grant is decided and delivered by the server. A browser renders what
 * it was given and never names an amount.
 */

export const REWARD_CURRENCIES = ['dao-xp', 'qi', 'energy'] as const;
export type RewardCurrency = (typeof REWARD_CURRENCIES)[number];

export const REWARD_CURRENCY_LABELS: Readonly<Record<RewardCurrency, string>> = {
  'dao-xp': 'DAO XP',
  qi: 'QI',
  energy: 'Energy',
};

/** One balance a reward credits. Amounts are positive whole numbers. */
export interface RewardGrant {
  type: RewardCurrency;
  amount: number;
}

/** What actually landed for one grant: the ledger line and the balance after it. */
export interface DeliveredRewardGrant extends RewardGrant {
  transactionId: string;
  balanceAfter: number;
}

/**
 * The reveal rarity ladder shared by Mystery Scrolls and Fate Survival
 * Relics — the same six themes the Relic reveal already draws. Whether rewards
 * should share the Familiar and Store four-tier scale instead is an open
 * product decision; nothing below depends on the answer.
 */
export const REWARD_RARITIES = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Transcendent'] as const;
export type RewardRarity = (typeof REWARD_RARITIES)[number];

const formatWhole = (value: number) => value.toLocaleString('en-US');

/** "+120 DAO XP · +300 QI" — the one way a reward line is written. */
export function describeRewardGrants(grants: readonly RewardGrant[]): string {
  return grants.map(grant => `+${formatWhole(grant.amount)} ${REWARD_CURRENCY_LABELS[grant.type]}`).join(' · ');
}

/** Stable order so every surface lists a bundle the same way. */
export function orderRewardGrants<T extends RewardGrant>(grants: readonly T[]): T[] {
  return [...grants].sort((left, right) => REWARD_CURRENCIES.indexOf(left.type) - REWARD_CURRENCIES.indexOf(right.type));
}

export const isRewardRarity = (value: unknown): value is RewardRarity =>
  typeof value === 'string' && (REWARD_RARITIES as readonly string[]).includes(value);

export const isRewardCurrency = (value: unknown): value is RewardCurrency =>
  typeof value === 'string' && (REWARD_CURRENCIES as readonly string[]).includes(value);

/** Shape check for a grant list received over the network. */
export const isRewardGrantList = (value: unknown): value is RewardGrant[] =>
  Array.isArray(value) && value.every(entry => Boolean(entry) && typeof entry === 'object'
    && isRewardCurrency((entry as RewardGrant).type) && Number.isSafeInteger((entry as RewardGrant).amount) && (entry as RewardGrant).amount > 0);
