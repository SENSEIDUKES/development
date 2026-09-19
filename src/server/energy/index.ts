/**
 * The shared Energy system. See `README.md` for the generation integration
 * boundary; nothing in `src/server/chapter-generation` or
 * `src/server/harness-generation` imports this yet, by design.
 */
export * from './config';
export * from './http';
export * from './narrativeOperation';
export * from './narrativeUsage';
export * from './inMemoryEnergyRepository';
export * from './postgresEnergyRepository';
export * from './repository';
export * from './service';
export * from './types';
export {
  ENERGY_ACTION_IDS,
  ENERGY_PRICE_CATALOG,
  energyActionLabel,
  EnergyPriceUnavailableError,
  getEnergyPriceEntry,
  isEnergyActionId,
  pricedEnergyActions,
  resolveEnergyPrice,
} from '@seihouse/library/energy';
export type {
  EnergyAccountSnapshot,
  EnergyActionId,
  EnergyActivityEntry,
  EnergyBalance,
  EnergyPriceEntry,
  EnergyPriceQuote,
  EnergyTransactionKind,
} from '@seihouse/library/energy';
