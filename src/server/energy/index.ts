/**
 * The shared Energy system. See `README.md` for the generation integration
 * boundary; nothing in `src/server/chapter-generation` or
 * `src/server/harness-generation` imports this yet, by design.
 */
export * from './authentication';
export * from './config';
export * from './http';
export * from './inMemoryEnergyRepository';
export * from './postgresEnergyRepository';
export * from './repository';
export * from './service';
export * from './types';
export {
  ENERGY_ACTION_IDS,
  ENERGY_PRICE_CATALOG,
  EnergyPriceUnavailableError,
  getEnergyPriceEntry,
  isEnergyActionId,
  pricedEnergyActions,
  resolveEnergyPrice,
} from '../../components/energy/shared/energyContracts';
export type {
  EnergyAccountSnapshot,
  EnergyActionId,
  EnergyActivityEntry,
  EnergyBalance,
  EnergyPriceEntry,
  EnergyPriceQuote,
  EnergyTransactionKind,
} from '../../components/energy/shared/energyContracts';
