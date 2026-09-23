/**
 * Current Library economy price schedule shared by Library surfaces.
 *
 * These values define the current Energy and QI prices, not a checkout implementation.
 * Account ledgers remain the sole authority for balances and deductions. Keeping
 * the packs and rarity prices here lets the Economy page and the Store describe
 * the same standards without each carrying a private table.
 */

export type EconomyItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CurrencyPack {
  amount: number;
  priceUsd: number;
}

/** One Energy is valued at two US cents in the current price schedule. */
export const ENERGY_USD_PER_UNIT = 0.02;

/** Current Energy pack schedule. A host connects checkout separately. */
export const ENERGY_PACKS: readonly CurrencyPack[] = [
  { amount: 250, priceUsd: 5 },
  { amount: 500, priceUsd: 10 },
  { amount: 1_000, priceUsd: 20 },
  { amount: 2_500, priceUsd: 50 },
];

/** Current Energy item prices. Common items have no Energy price in this catalog. */
export const ENERGY_ITEM_PRICES: Readonly<Partial<Record<EconomyItemRarity, number>>> = {
  rare: 300,
  epic: 600,
  legendary: 1_000,
};

/** One QI is valued at two tenths of one US cent in the current price schedule. */
export const QI_USD_PER_UNIT = 0.002;

/** Current QI pack schedule. A host connects checkout separately. */
export const QI_PACKS: readonly CurrencyPack[] = [
  { amount: 2_500, priceUsd: 5 },
  { amount: 5_000, priceUsd: 10 },
  { amount: 10_000, priceUsd: 20 },
  { amount: 25_000, priceUsd: 50 },
];

/** Current QI item prices. QI is spendable and is never rank progression. */
export const QI_ITEM_PRICES: Readonly<Record<EconomyItemRarity, number>> = {
  common: 500,
  rare: 2_000,
  epic: 8_000,
  legendary: 25_000,
};
