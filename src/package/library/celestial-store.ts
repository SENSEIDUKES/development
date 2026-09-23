/**
 * `@seihouse/library/celestial-store` — the official Celestial Store page.
 *
 * The Store is Library merchandising over three authorities it never owns:
 * the host Familiar catalogue (identity, rank, artwork), the QI and Energy
 * read projections (balances), and host account state (ownership and the
 * equipped Familiar, through the profile services port). Offer pools, slot
 * counts, and the shared Energy/QI rarity prices are Store configuration here;
 * the daily rotation is a deterministic seeded selection with no
 * personalization or offer engine.
 */
export {
  CelestialStorePanel,
  type CelestialStorePanelProps,
} from '../../components/celestial-store/development/CelestialStorePanel';
export {
  ShopCard,
  type ShopCardProps,
} from '../../components/celestial-store/development/ShopCard';
export {
  CELESTIAL_STORE_CONFIG,
  ENERGY_ELIGIBLE_FAMILIAR_IDS,
  ENERGY_FAMILIAR_PRICES,
  QI_FAMILIAR_PRICES,
  QI_ELIGIBLE_FAMILIAR_IDS,
  type CelestialStoreConfig,
  type CelestialStoreOfferConfig,
  type StoreCurrency,
} from '../../components/celestial-store/shared/storeConfig';
export {
  dailyStoreRotation,
  offerPrice,
  rotationDayKey,
  type CelestialStoreOffer,
  type CelestialStoreRotation,
} from '../../components/celestial-store/shared/rotation';
export {
  ownsFamiliar,
  useUnavailableCelestialStoreAccount,
  type CelestialStoreAccountServices,
  type CelestialStoreAccountState,
  type CelestialStorePurchase,
  type CelestialStorePurchaseOutcome,
  type CelestialStorePurchaseResult,
} from '../../components/celestial-store/shared/storeAccount';
