import type { StoreCurrency } from './storeConfig';

/**
 * The Store's account port. Ownership and purchases are account state owned
 * by the host — never inferred from Store configuration, and never stored in
 * the Familiar catalogue. The default Familiar is implicitly owned and is not
 * expected to appear in `ownedFamiliarIds`.
 */

export interface CelestialStorePurchase {
  familiarId: string;
  currency: StoreCurrency;
  /** The price shown at the moment of purchase (the sale price when one is active). */
  price: number;
}

export type CelestialStorePurchaseOutcome = 'purchased' | 'already-owned' | 'insufficient' | 'failed';

export interface CelestialStorePurchaseResult {
  outcome: CelestialStorePurchaseOutcome;
  message: string;
}

export interface CelestialStoreAccountState {
  /** Familiar IDs the account owns outright, beyond implicit defaults. */
  ownedFamiliarIds: readonly string[];
  /** True while a purchase is in flight. */
  pending: boolean;
  purchase: (purchase: CelestialStorePurchase) => Promise<CelestialStorePurchaseResult>;
}

/** Host-supplied Store account access; the Workshop supplies an in-memory grant. */
export interface CelestialStoreAccountServices {
  useStoreAccount: () => CelestialStoreAccountState;
}

const NO_PURCHASES = async (): Promise<CelestialStorePurchaseResult> => ({
  outcome: 'failed',
  message: 'Purchases are not connected here.',
});

const UNAVAILABLE: CelestialStoreAccountState = { ownedFamiliarIds: [], pending: false, purchase: NO_PURCHASES };

/** Stable fallback for hosts that mount no Store account service. */
export function useUnavailableCelestialStoreAccount(): CelestialStoreAccountState {
  return UNAVAILABLE;
}

/** Whether the account owns a Familiar, counting implicit default ownership. */
export function ownsFamiliar(ownedFamiliarIds: readonly string[], familiarId: string, isDefault?: boolean): boolean {
  return Boolean(isDefault) || ownedFamiliarIds.includes(familiarId);
}
