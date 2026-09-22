import type { FamiliarOption } from '../../familiar/shared/familiar';
import {
  CELESTIAL_STORE_CONFIG,
  ENERGY_FAMILIAR_PRICES,
  type CelestialStoreConfig,
  type CelestialStoreOfferConfig,
  type StoreCurrency,
} from './storeConfig';

/**
 * The shared daily rotation: one deterministic selection per calendar day,
 * the same for every render of that day. Selection is a seeded shuffle of the
 * eligible pool — no personalization, probabilities, or active-effect
 * modifiers — so it stays trivially testable and replaceable.
 */

/** A configured offer resolved against the live catalogue projection. */
export interface CelestialStoreOffer {
  familiarId: string;
  currency: StoreCurrency;
  /** Normal price in the offer's currency. */
  price: number;
  /** Present only while a configured genuine discount is active. */
  salePrice?: number;
  /** Display order inside the offer's shelf, starting at 0. */
  slot: number;
  /** Catalogue projection: name, rank, description, hero/still artwork. */
  option: FamiliarOption;
}

export interface CelestialStoreRotation {
  dayKey: string;
  energy: readonly CelestialStoreOffer[];
  qi: readonly CelestialStoreOffer[];
}

/** The rotation's calendar day in the viewer's local time, e.g. "2026-09-22". */
export function rotationDayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Small deterministic PRNG (xmur3 seed + mulberry32) — stable across sessions and platforms. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const random = seededRandom(seed);
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** The normal price for one configured offer, or undefined when unresolvable. */
export function offerPrice(config: CelestialStoreOfferConfig, option: FamiliarOption): number | undefined {
  const price = config.price ?? (config.currency === 'energy' ? ENERGY_FAMILIAR_PRICES[option.rarity] : undefined);
  return typeof price === 'number' && Number.isSafeInteger(price) && price > 0 ? price : undefined;
}

function withinWindow(config: CelestialStoreOfferConfig, dayKey: string): boolean {
  if (config.availableFrom && dayKey < config.availableFrom.slice(0, 10)) return false;
  if (config.availableUntil && dayKey > config.availableUntil.slice(0, 10)) return false;
  return true;
}

/**
 * Resolve a configured offer against the catalogue projection. Default
 * Familiars are included companions, never merchandise; an offer whose
 * Familiar or price cannot be resolved silently leaves the pool rather than
 * rendering a broken card.
 */
function resolveOffer(config: CelestialStoreOfferConfig, options: readonly FamiliarOption[], dayKey: string): Omit<CelestialStoreOffer, 'slot'> | undefined {
  if (!withinWindow(config, dayKey)) return undefined;
  const option = options.find(candidate => candidate.id === config.familiarId);
  if (!option || option.isDefault) return undefined;
  const price = offerPrice(config, option);
  if (price === undefined) return undefined;
  // A sale price is charged like any other price, so it meets the same bar:
  // a positive safe integer strictly below the normal price. Anything else is
  // not a discount and never renders as one.
  const salePrice = config.salePrice !== undefined && Number.isSafeInteger(config.salePrice)
    && config.salePrice > 0 && config.salePrice < price
    ? config.salePrice
    : undefined;
  return { familiarId: config.familiarId, currency: config.currency, price, salePrice, option };
}

/**
 * The day's shared rotation: `energySlots` Energy offers and `qiSlots` QI
 * offers, drawn from the eligible pools by a shuffle seeded on the calendar
 * day. Same day, same offers; a new day reshuffles.
 */
export function dailyStoreRotation(
  options: readonly FamiliarOption[],
  date: Date = new Date(),
  config: CelestialStoreConfig = CELESTIAL_STORE_CONFIG,
): CelestialStoreRotation {
  const dayKey = rotationDayKey(date);
  const select = (currency: StoreCurrency, slots: number): CelestialStoreOffer[] => {
    const pool = config.offers.filter(offer => offer.currency === currency);
    return seededShuffle(pool, `celestial-store:${dayKey}:${currency}`)
      .flatMap(offer => resolveOffer(offer, options, dayKey) ?? [])
      .slice(0, slots)
      .map((offer, slot) => ({ ...offer, slot }));
  };
  return { dayKey, energy: select('energy', config.energySlots), qi: select('qi', config.qiSlots) };
}
