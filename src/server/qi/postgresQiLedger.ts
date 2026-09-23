import {
  assertQiAmount,
  assertQiIdempotencyKey,
  QiConflictError,
  QiInsufficientError,
  QiValidationError,
  type JsonObject,
  type QiAccountRecord,
  type QiDepositCommand,
  type QiDepositResult,
  type QiLedger,
  type QiLedgerResult,
  type QiSpendCommand,
  type QiSpendResult,
  type QiTransaction,
  type QiTransactionKind,
} from './qiLedger';

/** The slice of a Postgres client the adapter needs (`pg`, PGlite). */
export interface QiSqlClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

type Row = Record<string, unknown>;

const isoTimestamp = (value: unknown): string => new Date(String(value)).toISOString();

export const qiAccountFromRow = (row: Row): QiAccountRecord => ({
  uid: String(row.uid),
  balance: Number(row.balance),
  createdAt: isoTimestamp(row.created_at),
  updatedAt: isoTimestamp(row.updated_at),
});

export const qiTransactionFromRow = (row: Row): QiTransaction => ({
  id: String(row.id),
  uid: String(row.uid),
  kind: row.kind as QiTransactionKind,
  amount: Number(row.amount),
  source: String(row.source),
  idempotencyKey: String(row.idempotency_key),
  description: String(row.description),
  balanceAfter: Number(row.balance_after),
  metadata: (row.metadata ?? {}) as JsonObject,
  createdAt: isoTimestamp(row.created_at),
});

/** The amounts travel in the message text so any driver (pg, PGlite) can recover them. */
const parseInsufficient = (message: string): QiInsufficientError => {
  const match = /qi_insufficient:.*?(\d+) QI and (\d+) is available/.exec(message);
  return new QiInsufficientError(match ? Number(match[1]) : 0, match ? Number(match[2]) : 0);
};

export const translateQiSqlError = (error: unknown): never => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('qi_validation:')) throw new QiValidationError([message.replace(/^.*qi_validation:\s*/, '')]);
  if (message.includes('qi_insufficient:')) throw parseInsufficient(message);
  if (message.includes('qi_conflict:')) throw new QiConflictError(message.replace(/^.*qi_conflict:\s*/, ''));
  throw error;
};

/** Thin adapter over the `qi_*` functions in the Qi ledger migrations. */
export class PostgresQiLedger implements QiLedger {
  constructor(private readonly sql: QiSqlClient) {}

  async getAccount(uid: string): Promise<QiAccountRecord | null> {
    const { rows } = await this.sql.query<Row>('SELECT * FROM qi_account WHERE uid = $1', [uid]);
    return rows[0] ? qiAccountFromRow(rows[0]) : null;
  }

  private async apply(fn: 'qi_apply_deposit' | 'qi_apply_spend', command: QiDepositCommand): Promise<QiLedgerResult> {
    assertQiAmount(command.amount);
    assertQiIdempotencyKey(command.idempotencyKey);
    try {
      const { rows } = await this.sql.query<{ result: Row }>(
        `SELECT ${fn}($1, $2, $3, $4, $5, $6::jsonb) AS result`,
        [command.uid, command.amount, command.idempotencyKey, command.source, command.description, JSON.stringify(command.metadata ?? {})],
      );
      const result = rows[0]?.result;
      if (!result) throw new Error('The Qi ledger function returned no result.');
      return {
        replayed: Boolean(result.replayed),
        account: qiAccountFromRow(result.account as Row),
        transaction: qiTransactionFromRow(result.transaction as Row),
      };
    } catch (error) {
      return translateQiSqlError(error);
    }
  }

  deposit(command: QiDepositCommand): Promise<QiDepositResult> {
    return this.apply('qi_apply_deposit', command);
  }

  spend(command: QiSpendCommand): Promise<QiSpendResult> {
    return this.apply('qi_apply_spend', command);
  }

  async listTransactions(uid: string, limit: number): Promise<QiTransaction[]> {
    const { rows } = await this.sql.query<Row>(
      'SELECT * FROM qi_transaction WHERE uid = $1 ORDER BY sequence DESC LIMIT $2',
      [uid, limit],
    );
    return rows.map(qiTransactionFromRow);
  }
}
