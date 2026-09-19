import { type EnergyActionId } from '@seihouse/library/energy';
import type {
  EnergyAccountRecord,
  EnergyReservation,
  EnergyTransaction,
  JsonObject,
} from './types';

export class EnergyValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'EnergyValidationError';
    this.issues = issues;
  }
}

export class EnergyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnergyNotFoundError';
  }
}

export class EnergyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnergyConflictError';
  }
}

export class InsufficientEnergyError extends Error {
  readonly required: number;
  readonly available: number;
  constructor(required: number, available: number) {
    super(`This needs ${required} Energy and ${available} is available.`);
    this.name = 'InsufficientEnergyError';
    this.required = required;
    this.available = available;
  }
}

export interface ApplyEnergyGrantCommand {
  uid: string;
  amount: number;
  idempotencyKey: string;
  description: string;
  metadata?: JsonObject;
}

export interface CreateEnergyReservationCommand {
  uid: string;
  actionId: EnergyActionId;
  amount: number;
  idempotencyKey: string;
  description: string;
  metadata?: JsonObject;
}

export interface SettleEnergyReservationCommand {
  uid: string;
  reservationId: string;
  description: string;
  metadata?: JsonObject;
}

export interface ReleaseEnergyReservationCommand {
  uid: string;
  reservationId: string;
  description: string;
  metadata?: JsonObject;
}

export interface EnergyLedgerResult {
  account: EnergyAccountRecord;
  /** The transaction created by this call, or the earlier one when replayed. */
  transaction: EnergyTransaction;
  /** True when the idempotency key had already been applied and nothing moved. */
  replayed: boolean;
}

export interface EnergyReservationResult extends EnergyLedgerResult {
  reservation: EnergyReservation;
}

/**
 * Durable Energy ledger boundary. Every method is one atomic unit of work:
 * an adapter must apply the balance change and record its transaction together
 * or not at all, and must honour idempotency keys under concurrent calls. The
 * Postgres migration carries those guards as unique constraints and row locks;
 * the in-memory adapter mirrors them for tests and the Workshop.
 */
export interface EnergyRepository {
  getAccount(uid: string): Promise<EnergyAccountRecord | null>;
  ensureAccount(uid: string): Promise<EnergyAccountRecord>;
  applyGrant(command: ApplyEnergyGrantCommand): Promise<EnergyLedgerResult>;
  /** Throws `InsufficientEnergyError` when `amount` exceeds `balance - held`. */
  createReservation(command: CreateEnergyReservationCommand): Promise<EnergyReservationResult>;
  settleReservation(command: SettleEnergyReservationCommand): Promise<EnergyReservationResult>;
  releaseReservation(command: ReleaseEnergyReservationCommand): Promise<EnergyReservationResult>;
  getReservation(uid: string, reservationId: string): Promise<EnergyReservation | null>;
  findReservationByIdempotencyKey(uid: string, idempotencyKey: string): Promise<EnergyReservation | null>;
  listTransactions(uid: string, limit: number): Promise<EnergyTransaction[]>;
  /** Development only: drops the account, its reservations and its history. */
  resetAccount(uid: string): Promise<void>;
}

export const assertEnergyAmount = (amount: number, label = 'amount'): void => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new EnergyValidationError([`Energy ${label} must be a positive whole number.`]);
  }
};

export const assertIdempotencyKey = (key: string): void => {
  if (typeof key !== 'string' || !key.trim() || key.length > 200) {
    throw new EnergyValidationError(['An idempotency key of 1–200 characters is required.']);
  }
};

export const assertUid = (uid: string): void => {
  if (typeof uid !== 'string' || !uid.trim() || uid.length > 128) {
    throw new EnergyValidationError(['A user id is required.']);
  }
};
