import { type EnergyActionId } from '@seihouse/library/energy';
import {
  assertEnergyAmount,
  assertIdempotencyKey,
  assertUid,
  EnergyConflictError,
  EnergyNotFoundError,
  EnergyValidationError,
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

/**
 * The slice of a Postgres client the adapter needs. `pg.Pool`, `pg.Client`
 * and `@electric-sql/pglite` all satisfy it as-is.
 */
export interface EnergySqlClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

type Row = Record<string, unknown>;

const isoTimestamp = (value: unknown): string => new Date(String(value)).toISOString();
const optionalTimestamp = (value: unknown): string | null => (value === null || value === undefined ? null : isoTimestamp(value));
const wholeNumber = (value: unknown): number => Number(value);

const accountFromRow = (row: Row): EnergyAccountRecord => ({
  uid: String(row.uid),
  balance: wholeNumber(row.balance),
  held: wholeNumber(row.held),
  createdAt: isoTimestamp(row.created_at),
  updatedAt: isoTimestamp(row.updated_at),
});

const reservationFromRow = (row: Row): EnergyReservation => ({
  id: String(row.id),
  uid: String(row.uid),
  actionId: String(row.action_id) as EnergyActionId,
  amount: wholeNumber(row.amount),
  status: row.status as EnergyReservation['status'],
  idempotencyKey: String(row.idempotency_key),
  metadata: (row.metadata ?? {}) as JsonObject,
  createdAt: isoTimestamp(row.created_at),
  updatedAt: isoTimestamp(row.updated_at),
  settledAt: optionalTimestamp(row.settled_at),
  releasedAt: optionalTimestamp(row.released_at),
});

const transactionFromRow = (row: Row): EnergyTransaction => ({
  id: String(row.id),
  uid: String(row.uid),
  kind: row.kind as EnergyTransaction['kind'],
  amount: wholeNumber(row.amount),
  actionId: (row.action_id ?? null) as EnergyActionId | null,
  reservationId: row.reservation_id === null || row.reservation_id === undefined ? null : String(row.reservation_id),
  idempotencyKey: String(row.idempotency_key),
  description: String(row.description),
  balanceAfter: wholeNumber(row.balance_after),
  heldAfter: wholeNumber(row.held_after),
  metadata: (row.metadata ?? {}) as JsonObject,
  createdAt: isoTimestamp(row.created_at),
});

interface LedgerDocument {
  replayed: boolean;
  account: Row;
  transaction: Row;
  reservation?: Row;
}

/** Errors raised by the ledger functions carry a stable prefix in their message. */
const translateSqlError = (error: unknown): never => {
  const message = error instanceof Error ? error.message : String(error);
  const insufficient = /energy_insufficient:.*?(\d+) Energy and (\d+) is available/.exec(message);
  if (insufficient) throw new InsufficientEnergyError(Number(insufficient[1]), Number(insufficient[2]));
  if (message.includes('energy_conflict:')) throw new EnergyConflictError(message.replace(/^.*energy_conflict:\s*/, ''));
  if (message.includes('energy_not_found:')) throw new EnergyNotFoundError(message.replace(/^.*energy_not_found:\s*/, ''));
  if (message.includes('energy_validation:')) throw new EnergyValidationError([message.replace(/^.*energy_validation:\s*/, '')]);
  throw error;
};

/**
 * Durable ledger adapter over the functions defined in
 * `database/migrations/20260918_001_energy_ledger.sql`. Every method is one
 * SQL statement, so each ledger movement commits atomically with its
 * transaction line and the database's row lock serialises concurrent calls.
 */
export class PostgresEnergyRepository implements EnergyRepository {
  constructor(private readonly sql: EnergySqlClient) {}

  private async document(text: string, params: unknown[]): Promise<LedgerDocument> {
    try {
      const { rows } = await this.sql.query<{ result: LedgerDocument | string }>(text, params);
      const result = rows[0]?.result;
      if (!result) throw new Error('The Energy ledger function returned no result.');
      return typeof result === 'string' ? (JSON.parse(result) as LedgerDocument) : result;
    } catch (error) {
      return translateSqlError(error);
    }
  }

  async getAccount(uid: string): Promise<EnergyAccountRecord | null> {
    assertUid(uid);
    const { rows } = await this.sql.query<{ row: Row }>(
      'SELECT to_jsonb(a) AS row FROM energy_account a WHERE a.uid = $1',
      [uid],
    );
    return rows[0] ? accountFromRow(rows[0].row) : null;
  }

  async ensureAccount(uid: string): Promise<EnergyAccountRecord> {
    assertUid(uid);
    const { rows } = await this.sql.query<{ row: Row }>('SELECT energy_ensure_account($1) AS row', [uid]);
    return accountFromRow(rows[0].row);
  }

  async applyGrant(command: ApplyEnergyGrantCommand): Promise<EnergyLedgerResult> {
    assertUid(command.uid);
    assertEnergyAmount(command.amount);
    assertIdempotencyKey(command.idempotencyKey);
    const result = await this.document(
      'SELECT energy_apply_grant($1, $2, $3, $4, $5::jsonb) AS result',
      [command.uid, command.amount, command.idempotencyKey, command.description, JSON.stringify(command.metadata ?? {})],
    );
    return { account: accountFromRow(result.account), transaction: transactionFromRow(result.transaction), replayed: result.replayed };
  }

  async createReservation(command: CreateEnergyReservationCommand): Promise<EnergyReservationResult> {
    assertUid(command.uid);
    assertEnergyAmount(command.amount);
    assertIdempotencyKey(command.idempotencyKey);
    const result = await this.document(
      'SELECT energy_create_reservation($1, $2, $3, $4, $5, $6::jsonb) AS result',
      [command.uid, command.actionId, command.amount, command.idempotencyKey, command.description, JSON.stringify(command.metadata ?? {})],
    );
    return {
      account: accountFromRow(result.account),
      reservation: reservationFromRow(result.reservation!),
      transaction: transactionFromRow(result.transaction),
      replayed: result.replayed,
    };
  }

  async settleReservation(command: SettleEnergyReservationCommand): Promise<EnergyReservationResult> {
    assertUid(command.uid);
    const result = await this.document(
      'SELECT energy_settle_reservation($1, $2::uuid, $3, $4::jsonb) AS result',
      [command.uid, command.reservationId, command.description, JSON.stringify(command.metadata ?? {})],
    );
    return {
      account: accountFromRow(result.account),
      reservation: reservationFromRow(result.reservation!),
      transaction: transactionFromRow(result.transaction),
      replayed: result.replayed,
    };
  }

  async releaseReservation(command: ReleaseEnergyReservationCommand): Promise<EnergyReservationResult> {
    assertUid(command.uid);
    const result = await this.document(
      'SELECT energy_release_reservation($1, $2::uuid, $3, $4::jsonb) AS result',
      [command.uid, command.reservationId, command.description, JSON.stringify(command.metadata ?? {})],
    );
    return {
      account: accountFromRow(result.account),
      reservation: reservationFromRow(result.reservation!),
      transaction: transactionFromRow(result.transaction),
      replayed: result.replayed,
    };
  }

  async getReservation(uid: string, reservationId: string): Promise<EnergyReservation | null> {
    assertUid(uid);
    const { rows } = await this.sql.query<{ row: Row }>(
      'SELECT to_jsonb(r) AS row FROM energy_reservation r WHERE r.uid = $1 AND r.id::text = $2',
      [uid, reservationId],
    );
    return rows[0] ? reservationFromRow(rows[0].row) : null;
  }

  async findReservationByIdempotencyKey(uid: string, idempotencyKey: string): Promise<EnergyReservation | null> {
    assertUid(uid);
    const { rows } = await this.sql.query<{ row: Row }>(
      'SELECT to_jsonb(r) AS row FROM energy_reservation r WHERE r.uid = $1 AND r.idempotency_key = $2',
      [uid, idempotencyKey],
    );
    return rows[0] ? reservationFromRow(rows[0].row) : null;
  }

  async listTransactions(uid: string, limit: number): Promise<EnergyTransaction[]> {
    assertUid(uid);
    const { rows } = await this.sql.query<{ row: Row }>(
      'SELECT to_jsonb(t) AS row FROM energy_transaction t WHERE t.uid = $1 ORDER BY t.sequence DESC LIMIT $2',
      [uid, Math.max(0, Math.floor(limit))],
    );
    return rows.map(row => transactionFromRow(row.row));
  }

  async resetAccount(uid: string): Promise<void> {
    assertUid(uid);
    await this.sql.query('SELECT energy_reset_account($1)', [uid]);
  }
}
