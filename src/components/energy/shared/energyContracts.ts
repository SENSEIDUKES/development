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
  'short-cue.generate',
  'long-cue.generate',
  'soundscape.generate',
  'video.generate',
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
  /**
   * A variable projected action's inclusive upper price. The server refuses to
   * reserve one until a trusted caller selects a whole-number quote inside the
   * range, so a future video flow cannot silently charge the displayed minimum.
   */
  maximumPrice?: number;
  /** The current projected charge, not evidence of a live provider charge. */
  projected?: boolean;
}

/**
 * The single editable price catalog. Change a price here and every consumer
 * — the ledger, the profile panel, the action-cost indicator — follows.
 *
 * This is the current shared Energy price schedule. Generation paths remain deliberately
 * disconnected in this repository, so each entry is visibly projected until a
 * host wires an actual operation through the server-side reservation boundary.
 */
export const ENERGY_PRICE_CATALOG: readonly EnergyPriceEntry[] = [
  { actionId: 'chapter.generate', label: 'Chapter', price: 1, projected: true },
  { actionId: 'image.generate', label: 'Image', price: 3, projected: true },
  { actionId: 'short-cue.generate', label: 'Short cue', price: 3, projected: true },
  { actionId: 'long-cue.generate', label: 'Long cue', price: 15, projected: true },
  { actionId: 'soundscape.generate', label: 'Soundscape', price: 20, projected: true },
  { actionId: 'video.generate', label: 'Video', price: 30, maximumPrice: 50, projected: true },
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

/** A variable projected action must be quoted by the trusted server caller. */
export class EnergyPriceQuoteRequiredError extends Error {
  readonly actionId: EnergyActionId;
  readonly minimum: number;
  readonly maximum: number;
  constructor(actionId: EnergyActionId, minimum: number, maximum: number, quotedPrice?: number) {
    super(quotedPrice === undefined
      ? `Energy action ${actionId} requires a quoted price between ${minimum} and ${maximum} Energy.`
      : `Energy action ${actionId} must be quoted between ${minimum} and ${maximum} Energy.`);
    this.name = 'EnergyPriceQuoteRequiredError';
    this.actionId = actionId;
    this.minimum = minimum;
    this.maximum = maximum;
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
  maximumPrice?: number;
  projected: boolean;
}

/** A user-facing catalog label for a fixed price or an inclusive price range. */
export const formatEnergyPriceRange = (entry: Pick<EnergyPriceEntry, 'price' | 'maximumPrice'>): string => {
  if (entry.price === null) return 'Not priced';
  const format = new Intl.NumberFormat('en-US').format;
  return entry.maximumPrice === undefined ? format(entry.price) : `${format(entry.price)}–${format(entry.maximumPrice)}`;
};

/**
 * Resolve the configured charge for a trusted server operation. Fixed prices
 * need no extra input. Variable projected prices require a whole-number quote
 * inside the shared range, so a generation owner cannot silently treat a
 * displayed "30–50" cost as a fixed 30.
 */
export const resolveEnergyPrice = (actionId: EnergyActionId, quotedPrice?: number): EnergyPriceQuote => {
  const entry = getEnergyPriceEntry(actionId);
  if (entry.price === null) throw new EnergyPriceUnavailableError(actionId);
  if (entry.maximumPrice !== undefined) {
    if (typeof quotedPrice !== 'number' || !Number.isSafeInteger(quotedPrice) || quotedPrice < entry.price || quotedPrice > entry.maximumPrice) {
      throw new EnergyPriceQuoteRequiredError(actionId, entry.price, entry.maximumPrice, quotedPrice);
    }
    return {
      actionId,
      label: entry.label,
      price: quotedPrice,
      maximumPrice: entry.maximumPrice,
      projected: Boolean(entry.projected),
    };
  }
  return { actionId, label: entry.label, price: entry.price, projected: Boolean(entry.projected) };
};

/**
 * The permanent user-facing name of an action, resolved independently of its
 * current price.
 *
 * Prices are deliberately configurable: an action can be repriced or unpriced
 * at any time, and a reservation taken while it was priced must still be able
 * to settle or release afterwards. Anything that only needs to *name* an
 * action — a ledger description, a receipt — uses this instead of
 * `resolveEnergyPrice`, so a catalog edit can never strand held Energy. Falls
 * back to the action id if the catalog no longer carries a row for it.
 */
export const energyActionLabel = (actionId: EnergyActionId): string =>
  ENERGY_PRICE_CATALOG.find(candidate => candidate.actionId === actionId)?.label ?? actionId;

/** Catalog rows that carry a price, in catalog order — what a UI lists as current projected costs. */
export const pricedEnergyActions = (): EnergyPriceQuote[] => ENERGY_PRICE_CATALOG
  .filter((entry): entry is EnergyPriceEntry & { price: number } => entry.price !== null)
  .map(entry => ({
    actionId: entry.actionId,
    label: entry.label,
    price: entry.price,
    maximumPrice: entry.maximumPrice,
    projected: Boolean(entry.projected),
  }));

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

export const ENERGY_API_PATH = '/api/library-economy?capability=energy';

/** How many recent ledger lines a snapshot carries. */
export const ENERGY_ACTIVITY_LIMIT = 25;
