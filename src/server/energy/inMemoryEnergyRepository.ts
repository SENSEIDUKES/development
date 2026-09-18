import {
  assertEnergyAmount,
  assertIdempotencyKey,
  assertUid,
  EnergyConflictError,
  EnergyNotFoundError,
  InsufficientEnergyError,
  type ApplyEnergyGrantCommand,
  type CreateEnergyReservationCommand,
  type EnergyLedgerResult,
  type EnergyRepository,
  type EnergyReservationResult,
  type ReleaseEnergyReservationCommand,
  type SettleEnergyReservationCommand,
} from './repository';
import type {
  EnergyAccountRecord,
  EnergyReservation,
  EnergyTransaction,
  JsonObject,
} from './types';

export interface InMemoryEnergyRepositoryOptions {
  now?: () => string;
  idFactory?: (recordKind: 'reservation' | 'transaction') => string;
}

const defaultIdFactory = (recordKind: 'reservation' | 'transaction'): string => {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${recordKind}-${uuid}`;
};

const cloneJson = <T>(value: T): T => structuredClone(value);
const keyOf = (uid: string, idempotencyKey: string) => `${uid}\u0000${idempotencyKey}`;

/**
 * Deterministic implementation used for previewing and tests. It is the ledger
 * behind DEV's own server, so balances reset when the process changes; it is
 * not durable storage. The Postgres migration is the current durable reference
 * implementation of the same rules.
 */
export class InMemoryEnergyRepository implements EnergyRepository {
  private readonly accounts = new Map<string, EnergyAccountRecord>();
  private readonly reservations = new Map<string, EnergyReservation>();
  private readonly reservationIdByKey = new Map<string, string>();
  private readonly transactions: EnergyTransaction[] = [];
  private readonly transactionIdByKey = new Map<string, string>();
  private readonly now: () => string;
  private readonly idFactory: (recordKind: 'reservation' | 'transaction') => string;

  constructor(options: InMemoryEnergyRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? defaultIdFactory;
  }

  async getAccount(uid: string): Promise<EnergyAccountRecord | null> {
    assertUid(uid);
    const account = this.accounts.get(uid);
    return account ? cloneJson(account) : null;
  }

  async ensureAccount(uid: string): Promise<EnergyAccountRecord> {
    return cloneJson(this.ensure(uid));
  }

  private ensure(uid: string): EnergyAccountRecord {
    assertUid(uid);
    const existing = this.accounts.get(uid);
    if (existing) return existing;
    const timestamp = this.now();
    const account: EnergyAccountRecord = { uid, balance: 0, held: 0, createdAt: timestamp, updatedAt: timestamp };
    this.accounts.set(uid, account);
    return account;
  }

  private record(input: Omit<EnergyTransaction, 'id' | 'createdAt' | 'balanceAfter' | 'heldAfter'>, account: EnergyAccountRecord): EnergyTransaction {
    const transaction: EnergyTransaction = {
      ...input,
      id: this.idFactory('transaction'),
      balanceAfter: account.balance,
      heldAfter: account.held,
      createdAt: this.now(),
    };
    this.transactions.push(transaction);
    this.transactionIdByKey.set(keyOf(input.uid, input.idempotencyKey), transaction.id);
    return transaction;
  }

  private transactionByKey(uid: string, idempotencyKey: string): EnergyTransaction | undefined {
    const id = this.transactionIdByKey.get(keyOf(uid, idempotencyKey));
    return id ? this.transactions.find(transaction => transaction.id === id) : undefined;
  }

  async applyGrant(command: ApplyEnergyGrantCommand): Promise<EnergyLedgerResult> {
    assertUid(command.uid);
    assertEnergyAmount(command.amount);
    assertIdempotencyKey(command.idempotencyKey);
    const account = this.ensure(command.uid);
    const existing = this.transactionByKey(command.uid, command.idempotencyKey);
    if (existing) return { account: cloneJson(account), transaction: cloneJson(existing), replayed: true };
    account.balance += command.amount;
    account.updatedAt = this.now();
    const transaction = this.record({
      uid: command.uid,
      kind: 'grant',
      amount: command.amount,
      actionId: null,
      reservationId: null,
      idempotencyKey: command.idempotencyKey,
      description: command.description,
      metadata: cloneJson(command.metadata ?? {}),
    }, account);
    return { account: cloneJson(account), transaction: cloneJson(transaction), replayed: false };
  }

  async createReservation(command: CreateEnergyReservationCommand): Promise<EnergyReservationResult> {
    assertUid(command.uid);
    assertEnergyAmount(command.amount);
    assertIdempotencyKey(command.idempotencyKey);
    const account = this.ensure(command.uid);
    const existingId = this.reservationIdByKey.get(keyOf(command.uid, command.idempotencyKey));
    if (existingId) {
      const reservation = this.reservations.get(existingId)!;
      const transaction = this.transactionByKey(command.uid, `reserve:${command.idempotencyKey}`)!;
      return { account: cloneJson(account), reservation: cloneJson(reservation), transaction: cloneJson(transaction), replayed: true };
    }
    const available = account.balance - account.held;
    if (command.amount > available) throw new InsufficientEnergyError(command.amount, available);
    const timestamp = this.now();
    const reservation: EnergyReservation = {
      id: this.idFactory('reservation'),
      uid: command.uid,
      actionId: command.actionId,
      amount: command.amount,
      status: 'held',
      idempotencyKey: command.idempotencyKey,
      metadata: cloneJson(command.metadata ?? {}),
      createdAt: timestamp,
      updatedAt: timestamp,
      settledAt: null,
      releasedAt: null,
    };
    this.reservations.set(reservation.id, reservation);
    this.reservationIdByKey.set(keyOf(command.uid, command.idempotencyKey), reservation.id);
    account.held += command.amount;
    account.updatedAt = timestamp;
    const transaction = this.record({
      uid: command.uid,
      kind: 'reserve',
      amount: command.amount,
      actionId: command.actionId,
      reservationId: reservation.id,
      idempotencyKey: `reserve:${command.idempotencyKey}`,
      description: command.description,
      metadata: cloneJson(command.metadata ?? {}),
    }, account);
    return { account: cloneJson(account), reservation: cloneJson(reservation), transaction: cloneJson(transaction), replayed: false };
  }

  private ownedReservation(uid: string, reservationId: string): EnergyReservation {
    assertUid(uid);
    const reservation = this.reservations.get(reservationId);
    if (!reservation || reservation.uid !== uid) {
      throw new EnergyNotFoundError(`Energy reservation ${reservationId} was not found.`);
    }
    return reservation;
  }

  async settleReservation(command: SettleEnergyReservationCommand): Promise<EnergyReservationResult> {
    const reservation = this.ownedReservation(command.uid, command.reservationId);
    const account = this.ensure(command.uid);
    if (reservation.status === 'settled') {
      const transaction = this.transactionByKey(command.uid, `charge:${reservation.id}`)!;
      return { account: cloneJson(account), reservation: cloneJson(reservation), transaction: cloneJson(transaction), replayed: true };
    }
    if (reservation.status === 'released') {
      throw new EnergyConflictError(`Energy reservation ${reservation.id} was already released and cannot be charged.`);
    }
    const timestamp = this.now();
    account.balance -= reservation.amount;
    account.held -= reservation.amount;
    account.updatedAt = timestamp;
    reservation.status = 'settled';
    reservation.settledAt = timestamp;
    reservation.updatedAt = timestamp;
    const transaction = this.record({
      uid: command.uid,
      kind: 'charge',
      amount: reservation.amount,
      actionId: reservation.actionId,
      reservationId: reservation.id,
      idempotencyKey: `charge:${reservation.id}`,
      description: command.description,
      metadata: cloneJson(command.metadata ?? {}),
    }, account);
    return { account: cloneJson(account), reservation: cloneJson(reservation), transaction: cloneJson(transaction), replayed: false };
  }

  async releaseReservation(command: ReleaseEnergyReservationCommand): Promise<EnergyReservationResult> {
    const reservation = this.ownedReservation(command.uid, command.reservationId);
    const account = this.ensure(command.uid);
    if (reservation.status === 'released') {
      const transaction = this.transactionByKey(command.uid, `release:${reservation.id}`)!;
      return { account: cloneJson(account), reservation: cloneJson(reservation), transaction: cloneJson(transaction), replayed: true };
    }
    if (reservation.status === 'settled') {
      throw new EnergyConflictError(`Energy reservation ${reservation.id} was already charged and cannot be released.`);
    }
    const timestamp = this.now();
    account.held -= reservation.amount;
    account.updatedAt = timestamp;
    reservation.status = 'released';
    reservation.releasedAt = timestamp;
    reservation.updatedAt = timestamp;
    const transaction = this.record({
      uid: command.uid,
      kind: 'release',
      amount: reservation.amount,
      actionId: reservation.actionId,
      reservationId: reservation.id,
      idempotencyKey: `release:${reservation.id}`,
      description: command.description,
      metadata: cloneJson(command.metadata ?? {}),
    }, account);
    return { account: cloneJson(account), reservation: cloneJson(reservation), transaction: cloneJson(transaction), replayed: false };
  }

  async getReservation(uid: string, reservationId: string): Promise<EnergyReservation | null> {
    assertUid(uid);
    const reservation = this.reservations.get(reservationId);
    return reservation && reservation.uid === uid ? cloneJson(reservation) : null;
  }

  async findReservationByIdempotencyKey(uid: string, idempotencyKey: string): Promise<EnergyReservation | null> {
    assertUid(uid);
    const id = this.reservationIdByKey.get(keyOf(uid, idempotencyKey));
    return id ? cloneJson(this.reservations.get(id)!) : null;
  }

  async listTransactions(uid: string, limit: number): Promise<EnergyTransaction[]> {
    assertUid(uid);
    return this.transactions
      .filter(transaction => transaction.uid === uid)
      .slice(-Math.max(0, limit))
      .reverse()
      .map(cloneJson);
  }

  async resetAccount(uid: string): Promise<void> {
    assertUid(uid);
    this.accounts.delete(uid);
    for (const [id, reservation] of this.reservations) {
      if (reservation.uid !== uid) continue;
      this.reservations.delete(id);
      this.reservationIdByKey.delete(keyOf(uid, reservation.idempotencyKey));
    }
    for (let index = this.transactions.length - 1; index >= 0; index -= 1) {
      const transaction = this.transactions[index];
      if (transaction.uid !== uid) continue;
      this.transactions.splice(index, 1);
      this.transactionIdByKey.delete(keyOf(uid, transaction.idempotencyKey));
    }
  }
}
