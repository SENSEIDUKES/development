/**
 * Energy contracts shared by the server-owned ledger and every client surface.
 *
 * Energy is the one meter that will eventually gate every SEN generation
 * feature. This file carries only what both sides must agree on: the permanent
 * action identifiers, the editable price catalog, and the read-only shapes the
 * server hands to a browser. It imports nothing from the server, so UI code can
 * read a price without pulling ledger logic into the bundle.
 *
 * Balances live in the server ledger (`src/server/energy`). A browser never
 * computes or changes one; it only renders the snapshot it was given.
 */

/** Permanent action identifiers. Never rename: they are stored in the ledger. */
export const ENERGY_ACTION_IDS = [
  'chapter.generate',
  'image.generate',
  'soundscape.generate',
  'narration.generate',
  'translation.generate',
] as const;

export type EnergyActionId = (typeof ENERGY_ACTION_IDS)[number];

export const isEnergyActionId = (value: unknown): value is EnergyActionId =>
  typeof value === 'string' && (ENERGY_ACTION_IDS as readonly string[]).includes(value);

export interface EnergyPriceEntry {
  actionId: EnergyActionId;
  /** Short user-facing name of the thing the action produces. */
  label: string;
  /**
   * Whole Energy units charged per action. `null` means the action exists but
   * has not been priced yet: it can be looked up and displayed as "not priced",
   * but it cannot be reserved.
   */
  price: number | null;
}

/**
 * The single editable price catalog. Change a price here and every consumer
 * — the ledger, the profile panel, the action-cost indicator — follows.
 *
 * These are development test prices, not the final Energy economy.
 */
export const ENERGY_PRICE_CATALOG: readonly EnergyPriceEntry[] = [
  { actionId: 'chapter.generate', label: 'Chapter', price: 1 },
  { actionId: 'image.generate', label: 'Image', price: 3 },
  { actionId: 'soundscape.generate', label: 'Soundscape', price: null },
  { actionId: 'narration.generate', label: 'Narration', price: null },
  { actionId: 'translation.generate', label: 'Translation', price: null },
];

export class EnergyPriceUnavailableError extends Error {
  readonly actionId: string;
  constructor(actionId: string) {
    super(`Energy action ${actionId} has no price yet.`);
    this.name = 'EnergyPriceUnavailableError';
    this.actionId = actionId;
  }
}

export const getEnergyPriceEntry = (actionId: EnergyActionId): EnergyPriceEntry => {
  const entry = ENERGY_PRICE_CATALOG.find(candidate => candidate.actionId === actionId);
  if (!entry) throw new Error(`Energy action ${actionId} is not in the price catalog.`);
  return entry;
};

export interface EnergyPriceQuote {
  actionId: EnergyActionId;
  label: string;
  price: number;
}

/** Resolve the configured price of an action, or throw when it is unpriced. */
export const resolveEnergyPrice = (actionId: EnergyActionId): EnergyPriceQuote => {
  const entry = getEnergyPriceEntry(actionId);
  if (entry.price === null) throw new EnergyPriceUnavailableError(actionId);
  return { actionId, label: entry.label, price: entry.price };
};

/**
 * The permanent user-facing name of an action, resolved independently of its
 * current price.
 *
 * Prices are deliberately experimental: an action can be repriced or unpriced
 * at any time, and a reservation taken while it was priced must still be able
 * to settle or release afterwards. Anything that only needs to *name* an
 * action — a ledger description, a receipt — uses this instead of
 * `resolveEnergyPrice`, so a catalog edit can never strand held Energy. Falls
 * back to the action id if the catalog no longer carries a row for it.
 */
export const energyActionLabel = (actionId: EnergyActionId): string =>
  ENERGY_PRICE_CATALOG.find(candidate => candidate.actionId === actionId)?.label ?? actionId;

/** Catalog rows that carry a price, in catalog order — what a UI lists as examples. */
export const pricedEnergyActions = (): EnergyPriceQuote[] => ENERGY_PRICE_CATALOG
  .filter((entry): entry is EnergyPriceEntry & { price: number } => entry.price !== null)
  .map(entry => ({ actionId: entry.actionId, label: entry.label, price: entry.price }));

export type EnergyTransactionKind = 'grant' | 'reserve' | 'charge' | 'release';

/** One ledger line as a browser may see it: no provider cost, no internal metadata. */
export interface EnergyActivityEntry {
  id: string;
  kind: EnergyTransactionKind;
  /** Whole Energy units this entry moved. Always positive; `kind` gives direction. */
  amount: number;
  actionId: EnergyActionId | null;
  /** Human-readable line written by the server, e.g. "Development grant". */
  description: string;
  /** Settled balance after this entry was applied. */
  balanceAfter: number;
  /** Reserved-but-unsettled Energy after this entry. */
  heldAfter: number;
  createdAt: string;
}

export interface EnergyBalance {
  /** Settled Energy the account owns. */
  balance: number;
  /** Energy reserved for in-flight operations, not yet charged or released. */
  held: number;
  /** What a new reservation may use: `balance - held`. */
  available: number;
}

/** Development-only controls the server chose to expose for this principal. */
export interface EnergyDevelopmentControls {
  initialGrant: number;
  defaultGrant: number;
  maxGrant: number;
}

/** The full read model behind the profile's Energy panel. Server-authored. */
export interface EnergyAccountSnapshot extends EnergyBalance {
  uid: string;
  prices: EnergyPriceEntry[];
  activity: EnergyActivityEntry[];
  /** `null` for every production user: the browser cannot request these. */
  developmentControls: EnergyDevelopmentControls | null;
  updatedAt: string;
}

/** POST bodies the Energy HTTP boundary accepts from a browser. */
export type EnergyHttpOperation =
  | { operation: 'development.grant'; amount?: number; idempotencyKey: string }
  | { operation: 'development.reset' };

export interface EnergyHttpError {
  error: string;
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'invalid_request'
    | 'method_not_allowed'
    | 'unavailable';
}

export const ENERGY_API_PATH = '/api/energy';

/** How many recent ledger lines a snapshot carries. */
export const ENERGY_ACTIVITY_LIMIT = 25;
