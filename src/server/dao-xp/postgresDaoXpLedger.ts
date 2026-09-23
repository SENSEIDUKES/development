import type { JsonObject } from '../qi/qiLedger';
import type { QiSqlClient } from '../qi/postgresQiLedger';
import {
  assertDaoXpCredit,
  DaoXpConflictError,
  DaoXpValidationError,
  type DaoXpAccountRecord,
  type DaoXpCreditCommand,
  type DaoXpCreditResult,
  type DaoXpLedger,
  type DaoXpSource,
  type DaoXpTransaction,
} from './daoXpLedger';

type Row = Record<string, unknown>;
const isoTimestamp = (value: unknown): string => new Date(String(value)).toISOString();

export const daoXpAccountFromRow = (row: Row): DaoXpAccountRecord => ({
  uid: String(row.uid),
  balance: Number(row.balance),
  createdAt: isoTimestamp(row.created_at),
  updatedAt: isoTimestamp(row.updated_at),
});

export const daoXpTransactionFromRow = (row: Row): DaoXpTransaction => ({
  id: String(row.id),
  uid: String(row.uid),
  kind: 'credit',
  amount: Number(row.amount),
  source: String(row.source) as DaoXpSource,
  idempotencyKey: String(row.idempotency_key),
  description: String(row.description),
  balanceAfter: Number(row.balance_after),
  metadata: (row.metadata ?? {}) as JsonObject,
  createdAt: isoTimestamp(row.created_at),
});

export const translateDaoXpSqlError = (error: unknown): never => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('dao_xp_validation:')) throw new DaoXpValidationError([message.replace(/^.*dao_xp_validation:\s*/, '')]);
  if (message.includes('dao_xp_conflict:')) throw new DaoXpConflictError(message.replace(/^.*dao_xp_conflict:\s*/, ''));
  throw error;
};

/** Thin adapter over `dao_xp_apply_credit` in `20260923_003_dao_xp_ledger.sql`. */
export class PostgresDaoXpLedger implements DaoXpLedger {
  constructor(private readonly sql: QiSqlClient) {}

  async getAccount(uid: string): Promise<DaoXpAccountRecord | null> {
    const { rows } = await this.sql.query<Row>('SELECT * FROM dao_xp_account WHERE uid = $1', [uid]);
    return rows[0] ? daoXpAccountFromRow(rows[0]) : null;
  }

  async credit(command: DaoXpCreditCommand): Promise<DaoXpCreditResult> {
    assertDaoXpCredit(command);
    try {
      const { rows } = await this.sql.query<{ result: Row }>(
        'SELECT dao_xp_apply_credit($1, $2, $3, $4, $5, $6::jsonb) AS result',
        [command.uid, command.amount, command.idempotencyKey, command.source, command.description, JSON.stringify(command.metadata ?? {})],
      );
      const result = rows[0]?.result;
      if (!result) throw new Error('The DAO XP ledger function returned no result.');
      return {
        replayed: Boolean(result.replayed),
        account: daoXpAccountFromRow(result.account as Row),
        transaction: daoXpTransactionFromRow(result.transaction as Row),
      };
    } catch (error) {
      return translateDaoXpSqlError(error);
    }
  }

  async listTransactions(uid: string, limit: number): Promise<DaoXpTransaction[]> {
    const { rows } = await this.sql.query<Row>(
      'SELECT * FROM dao_xp_transaction WHERE uid = $1 ORDER BY sequence DESC LIMIT $2',
      [uid, limit],
    );
    return rows.map(daoXpTransactionFromRow);
  }
}
