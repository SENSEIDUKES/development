import type { FamiliarRarity } from '../../familiar/shared/familiar';
import { ENERGY_ITEM_PRICES, QI_ITEM_PRICES } from '../../../library/cultivation/economyStandards';

/**
 * Celestial Store offer configuration.
 *
 * This is Store merchandising policy only. The Familiar catalogue
 * (`src/host/familiar/catalogue.ts`) stays the sole source of identity, rank,
 * artwork, and default status; account state stays the sole source of
 * balances, ownership, and the equipped Familiar. Nothing here may declare a
 * Familiar Energy-only or QI-only forever — eligibility lists are rotation
 * configuration and can be re-pooled at any time.
 */

export type StoreCurrency = 'energy' | 'qi';

/** One configured offer. `familiarId` must exist in the host catalogue. */
export interface CelestialStoreOfferConfig {
  familiarId: string;
  currency: StoreCurrency;
  /**
   * Normal price in the offer's currency. Either currency may omit it to take
   * the shared rarity-based working price for that currency.
   */
  price?: number;
  /** Optional genuine discount: the price charged while lower than `price`. */
  salePrice?: number;
  /** Optional availability window; an offer outside it never enters a rotation. */
  availableFrom?: string;
  availableUntil?: string;
}

export interface CelestialStoreConfig {
  /** Energy offers each daily rotation shows. */
  energySlots: number;
  /** QI offers each daily rotation shows. */
  qiSlots: number;
  /** Every offer eligible for rotation, across both currencies. */
  offers: readonly CelestialStoreOfferConfig[];
}

/** Shared item standards, kept here as Store-facing aliases for compatibility. */
export const ENERGY_FAMILIAR_PRICES: Readonly<Partial<Record<FamiliarRarity, number>>> = ENERGY_ITEM_PRICES;
export const QI_FAMILIAR_PRICES: Readonly<Record<FamiliarRarity, number>> = QI_ITEM_PRICES;

/** The first rotation pools. Quill stays the included default and is never listed. */
export const ENERGY_ELIGIBLE_FAMILIAR_IDS = [
  'celestial-guardian',
  'little-monkey-king',
  'phoenix',
  'nine-tailed-fox',
] as const;

export const QI_ELIGIBLE_FAMILIAR_IDS = [
  'celestial-moon-moth',
  'galaxy-octopus',
  'judgmental-jiangshi',
  'lucky-bake-danuki',
  'lady-bug',
  'living-grimoire',
] as const;

/** The live Store configuration: two Energy slots and four QI slots per day. */
export const CELESTIAL_STORE_CONFIG: CelestialStoreConfig = {
  energySlots: 2,
  qiSlots: 4,
  offers: [
    ...ENERGY_ELIGIBLE_FAMILIAR_IDS.map((familiarId): CelestialStoreOfferConfig => ({
      familiarId,
      currency: 'energy',
    })),
    ...QI_ELIGIBLE_FAMILIAR_IDS.map((familiarId): CelestialStoreOfferConfig => ({
      familiarId,
      currency: 'qi',
    })),
  ],
};
