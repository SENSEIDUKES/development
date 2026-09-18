import {
  ENERGY_ACTIVITY_LIMIT,
  ENERGY_PRICE_CATALOG,
  isEnergyActionId,
  resolveEnergyPrice,
  type EnergyAccountSnapshot,
  type EnergyActionId,
  type EnergyActivityEntry,
  type EnergyBalance,
  type EnergyPriceQuote,
} from '../../components/energy/shared/energyContracts';
import type { ResolvedEnergyConfig } from './config';
import {
  assertEnergyAmount,
  assertIdempotencyKey,
  EnergyValidationError,
  type EnergyLedgerResult,
  type EnergyRepository,
  type EnergyReservationResult,
} from './repository';
import type {
  EnergyPrincipal,
  EnergyProviderCost,
  EnergyReservation,
  EnergyTransaction,
  JsonObject,
} from './types';

export class EnergyAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnergyAuthorizationError';
  }
}

export interface EnergyGrantInput {
  amount: number;
  /** Unique per grant intent: replaying the same key never grants twice. */
  idempotencyKey: string;
  description: string;
  metadata?: JsonObject;
}

export interface EnergyReserveInput {
  actionId: EnergyActionId;
  /**
   * Identifies one user intent. A system-caused retry reuses the key and gets
   * the original reservation back; a user-requested regeneration must mint a
   * new key and pays again.
   */
  idempotencyKey: string;
  /** Units of the action, defaults to 1. The reservation holds `price × quantity`. */
  quantity?: number;
  metadata?: JsonObject;
}

export interface EnergySettleInput {
  reservationId: string;
  /** Optional internal record; never influences the user-facing price. */
  providerCost?: EnergyProviderCost;
  metadata?: JsonObject;
}

export interface EnergyReleaseInput {
  reservationId: string;
  reason?: string;
  metadata?: JsonObject;
}

export interface EnergyServiceOptions {
  now?: () => string;
}

const activityEntry = (transaction: EnergyTransaction): EnergyActivityEntry => ({
  id: transaction.id,
  kind: transaction.kind,
  amount: transaction.amount,
  actionId: transaction.actionId,
  description: transaction.description,
  balanceAfter: transaction.balanceAfter,
  heldAfter: transaction.heldAfter,
  createdAt: transaction.createdAt,
});

export const INITIAL_GRANT_KEY_PREFIX = 'initial-grant:';
export const initialGrantIdempotencyKey = (uid: string) => `${INITIAL_GRANT_KEY_PREFIX}${uid}`;

/**
 * The one Energy service every SEN generation feature will eventually share.
 *
 * It owns pricing, authorization and idempotency on top of an atomic ledger.
 * Reads and the development controls are reachable over HTTP; `reserve`,
 * `settle` and `release` are server-only and exist for the generation
 * integration described in `README.md`. No generation flow calls them yet.
 */
export class EnergyService {
  private readonly now: () => string;

  constructor(
    private readonly repository: EnergyRepository,
    private readonly config: ResolvedEnergyConfig,
    options: EnergyServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /** Price lookup straight from the shared catalog. Throws for unpriced actions. */
  getPrice(actionId: EnergyActionId): EnergyPriceQuote {
    if (!isEnergyActionId(actionId)) throw new EnergyValidationError([`Unknown Energy action ${String(actionId)}.`]);
    return resolveEnergyPrice(actionId);
  }

  /**
   * Makes sure the principal's account exists. Development users receive the
   * configured initial grant exactly once; the idempotency key is the guard.
   */
  private async prepareAccount(principal: EnergyPrincipal): Promise<void> {
    await this.repository.ensureAccount(principal.uid);
    if (!principal.developmentAccess || this.config.developmentInitialGrant <= 0) return;
    await this.repository.applyGrant({
      uid: principal.uid,
      amount: this.config.developmentInitialGrant,
      idempotencyKey: initialGrantIdempotencyKey(principal.uid),
      description: 'Development starting Energy',
      metadata: { source: 'development-initial-grant' },
    });
  }

  async getBalance(principal: EnergyPrincipal): Promise<EnergyBalance> {
    await this.prepareAccount(principal);
    const account = (await this.repository.getAccount(principal.uid))!;
    return { balance: account.balance, held: account.held, available: account.balance - account.held };
  }

  async listTransactions(principal: EnergyPrincipal, limit = ENERGY_ACTIVITY_LIMIT): Promise<EnergyTransaction[]> {
    return this.repository.listTransactions(principal.uid, limit);
  }

  async getSnapshot(principal: EnergyPrincipal): Promise<EnergyAccountSnapshot> {
    const balance = await this.getBalance(principal);
    const transactions = await this.listTransactions(principal);
    return {
      uid: principal.uid,
      ...balance,
      prices: ENERGY_PRICE_CATALOG.map(entry => ({ ...entry })),
      activity: transactions.map(activityEntry),
      developmentControls: principal.developmentAccess
        ? {
            initialGrant: this.config.developmentInitialGrant,
            defaultGrant: this.config.developmentDefaultGrant,
            maxGrant: this.config.developmentMaxGrant,
          }
        : null,
      updatedAt: this.now(),
    };
  }

  /** Server-internal grant (purchases, rewards, corrections). Not reachable from a browser. */
  async grant(principal: EnergyPrincipal, input: EnergyGrantInput): Promise<EnergyLedgerResult> {
    assertEnergyAmount(input.amount);
    assertIdempotencyKey(input.idempotencyKey);
    await this.prepareAccount(principal);
    return this.repository.applyGrant({
      uid: principal.uid,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      metadata: input.metadata,
    });
  }

  private assertDevelopmentAccess(principal: EnergyPrincipal): void {
    if (!principal.developmentAccess) {
      throw new EnergyAuthorizationError('Development Energy controls are not available for this account.');
    }
  }

  /** Development-only test grant. Refused for every principal without development access. */
  async grantDevelopment(
    principal: EnergyPrincipal,
    input: { amount?: number; idempotencyKey: string },
  ): Promise<EnergyLedgerResult> {
    this.assertDevelopmentAccess(principal);
    const amount = input.amount ?? this.config.developmentDefaultGrant;
    assertEnergyAmount(amount);
    if (amount > this.config.developmentMaxGrant) {
      throw new EnergyValidationError([`A development grant cannot exceed ${this.config.developmentMaxGrant} Energy.`]);
    }
    return this.grant(principal, {
      amount,
      idempotencyKey: `development-grant:${input.idempotencyKey}`,
      description: 'Development test grant',
      metadata: { source: 'development-grant' },
    });
  }

  /** Development-only reset: wipes the ledger and re-applies the initial grant. */
  async resetDevelopment(principal: EnergyPrincipal): Promise<EnergyBalance> {
    this.assertDevelopmentAccess(principal);
    await this.repository.resetAccount(principal.uid);
    return this.getBalance(principal);
  }

  /**
   * Step 1 + 2 of the generation boundary: resolve the configured price and
   * hold it. Throws `InsufficientEnergyError` before any provider work starts.
   */
  async reserve(principal: EnergyPrincipal, input: EnergyReserveInput): Promise<EnergyReservationResult> {
    const quote = this.getPrice(input.actionId);
    const quantity = input.quantity ?? 1;
    assertEnergyAmount(quantity, 'quantity');
    assertIdempotencyKey(input.idempotencyKey);
    await this.prepareAccount(principal);
    return this.repository.createReservation({
      uid: principal.uid,
      actionId: input.actionId,
      amount: quote.price * quantity,
      idempotencyKey: input.idempotencyKey,
      description: `${quote.label} reserved`,
      metadata: input.metadata,
    });
  }

  /** Step 4: charge the held Energy once the generated result is stored. Idempotent per reservation. */
  async settle(principal: EnergyPrincipal, input: EnergySettleInput): Promise<EnergyReservationResult> {
    const reservation = await this.ownedReservation(principal, input.reservationId);
    return this.repository.settleReservation({
      uid: principal.uid,
      reservationId: reservation.id,
      description: `${this.getPrice(reservation.actionId).label} generated`,
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.providerCost ? { providerCost: { ...input.providerCost } } : {}),
      },
    });
  }

  /** Step 5: give the hold back after any failure. Idempotent per reservation. */
  async release(principal: EnergyPrincipal, input: EnergyReleaseInput): Promise<EnergyReservationResult> {
    const reservation = await this.ownedReservation(principal, input.reservationId);
    return this.repository.releaseReservation({
      uid: principal.uid,
      reservationId: reservation.id,
      description: `${this.getPrice(reservation.actionId).label} not generated — Energy returned`,
      metadata: { ...(input.metadata ?? {}), ...(input.reason ? { reason: input.reason } : {}) },
    });
  }

  /** Finds the reservation an earlier attempt created for the same intent, if any. */
  async findReservation(principal: EnergyPrincipal, idempotencyKey: string): Promise<EnergyReservation | null> {
    return this.repository.findReservationByIdempotencyKey(principal.uid, idempotencyKey);
  }

  private async ownedReservation(principal: EnergyPrincipal, reservationId: string): Promise<EnergyReservation> {
    const reservation = await this.repository.getReservation(principal.uid, reservationId);
    if (!reservation) throw new EnergyValidationError([`Energy reservation ${reservationId} was not found for this account.`]);
    return reservation;
  }
}
