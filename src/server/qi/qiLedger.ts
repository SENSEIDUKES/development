/**
 * The Qi deposit boundary.
 *
 * Qi is Library's cultivation currency. In production (`Light-Novels`) its
 * balance lives on the cultivator's profile record (`daoXp`, `heavenlyQi`)
 * and is moved by `src/lib/qi.ts` (`awardDirectQi` and friends); there is no
 * ledger table there. Every server-side system that awards Qi in this
 * repository — the Dao Pillar calendar first — goes through this port so the
 * deposit is recorded once, idempotently, by the server, and never computed by
 * a browser.
 *
 * `InMemoryQiLedger` serves tests and DEV's own dev server; the Postgres
 * functions in `database/migrations/20260918_002_qi_ledger.sql` are the
 * durable reference implementation. A host whose Qi balance lives elsewhere
 * (the Light-Novels profile) implements this interface against that store.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export class QiValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'QiValidationError';
    this.issues = issues;
  }
}

export interface QiAccountRecord {
  uid: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface QiTransaction {
  id: string;
  uid: string;
  kind: 'deposit';
  amount: number;
  /** Which system deposited: `dao-pillar`, later `offering`, `relic`, … */
  source: string;
  idempotencyKey: string;
  description: string;
  balanceAfter: number;
  metadata: JsonObject;
  createdAt: string;
}

export interface QiDepositCommand {
  uid: string;
  amount: number;
  /** One deposit per key per account; a replay returns the original line. */
  idempotencyKey: string;
  source: string;
  description: string;
  metadata?: JsonObject;
}

export interface QiDepositResult {
  account: QiAccountRecord;
  transaction: QiTransaction;
  /** True when the key had already been applied and nothing moved. */
  replayed: boolean;
}

export interface QiLedger {
  getAccount(uid: string): Promise<QiAccountRecord | null>;
  deposit(command: QiDepositCommand): Promise<QiDepositResult>;
  listTransactions(uid: string, limit: number): Promise<QiTransaction[]>;
}

export const assertQiAmount = (amount: number): void => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new QiValidationError(['Qi amount must be a positive whole number.']);
  }
};

export const assertQiIdempotencyKey = (key: string): void => {
  if (typeof key !== 'string' || !key.trim() || key.length > 220) {
    throw new QiValidationError(['An idempotency key of 1–220 characters is required.']);
  }
};
