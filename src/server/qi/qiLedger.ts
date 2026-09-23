/**
 * The Qi ledger boundary.
 *
 * Qi is Library's spendable cultivation currency. In production
 * (`Light-Novels`) its balance lives on the cultivator's profile record
 * (`daoXp`, `heavenlyQi`) and is moved by `src/lib/qi.ts` (`awardDirectQi` and
 * friends); there is no ledger table there. Every server-side system that
 * awards or spends Qi in this repository goes through this port so each
 * movement is recorded once, idempotently, by the server, and never computed
 * by a browser:
 *
 * - deposits: the Dao Pillar calendar, opened Mystery Scrolls, and the
 *   development grant a Workshop account may request;
 * - spends: training a Familiar and buying a QI offer in the Celestial Store.
 *
 * Qi is never rank progression. Permanent DAO XP has its own credit-only
 * ledger (`src/server/dao-xp`); nothing here reads or writes it.
 *
 * `InMemoryQiLedger` serves tests and DEV's own dev server; the Postgres
 * functions in `database/migrations/20260918_002_qi_ledger.sql` and
 * `20260923_001_qi_spend.sql` are the durable reference implementation.
 * A host whose Qi balance lives elsewhere implements this interface against
 * that store.
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

/** A spend asked for more Qi than the account holds. Nothing moved. */
export class QiInsufficientError extends Error {
  readonly required: number;
  readonly available: number;
  constructor(required: number, available: number) {
    super(`This needs ${required} QI and ${available} is available.`);
    this.name = 'QiInsufficientError';
    this.required = required;
    this.available = available;
  }
}

/**
 * An idempotency key was replayed with a different movement. The original
 * line stands and nothing moved; the caller has a key-generation bug.
 */
export class QiConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QiConflictError';
  }
}

export interface QiAccountRecord {
  uid: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export type QiTransactionKind = 'deposit' | 'spend';

/** Which system moved Qi. Free text in storage; these are the current writers. */
export type QiSource =
  | 'dao-pillar'
  | 'mystery-scroll'
  | 'familiar-training'
  | 'celestial-store'
  | 'development-grant'
  | (string & {});

export interface QiTransaction {
  id: string;
  uid: string;
  kind: QiTransactionKind;
  /** Always positive; `kind` gives the direction. */
  amount: number;
  source: QiSource;
  idempotencyKey: string;
  description: string;
  balanceAfter: number;
  metadata: JsonObject;
  createdAt: string;
}

export interface QiDepositCommand {
  uid: string;
  amount: number;
  /** One movement per key per account; a replay returns the original line. */
  idempotencyKey: string;
  source: QiSource;
  description: string;
  metadata?: JsonObject;
}

/** The same shape as a deposit; the ledger refuses it when the balance is short. */
export type QiSpendCommand = QiDepositCommand;

export interface QiLedgerResult {
  account: QiAccountRecord;
  transaction: QiTransaction;
  /** True when the key had already been applied and nothing moved. */
  replayed: boolean;
}

export type QiDepositResult = QiLedgerResult;
export type QiSpendResult = QiLedgerResult;

export interface QiLedger {
  getAccount(uid: string): Promise<QiAccountRecord | null>;
  deposit(command: QiDepositCommand): Promise<QiDepositResult>;
  /** Throws `QiInsufficientError` when `amount` exceeds the balance. */
  spend(command: QiSpendCommand): Promise<QiSpendResult>;
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

/** A replayed key must describe the same movement it first recorded. */
export const assertQiReplayMatches = (existing: QiTransaction, kind: QiTransactionKind, amount: number): void => {
  if (existing.kind !== kind || existing.amount !== amount) {
    throw new QiConflictError(
      `Idempotency key ${existing.idempotencyKey} already recorded a ${existing.amount} QI ${existing.kind}.`,
    );
  }
};
