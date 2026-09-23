/**
 * The DAO XP ledger boundary.
 *
 * DAO XP is permanent earned progression and the only input to Cultivator
 * Rank, which in turn only chooses the cultivator's Library colours. The
 * ledger is credit-only: there is no spend, decay, or purchase path, and only
 * the systems in `DAO_XP_SOURCES` may credit it —
 *
 * - `achievement` — a Library achievement's Mystery Scroll;
 * - `creation` — creating stories and chapters;
 * - `fate-survival-relic` — a Relic earned in Fate Survival;
 * - `opening-balance` — the one-time carry-over of a legacy profile's DAO XP
 *   when this ledger first becomes authoritative for an account.
 *
 * QI, the Dao Pillar, the Celestial Store and Familiar training have no way to
 * reach this ledger. `InMemoryDaoXpLedger` serves tests and the Workshop;
 * `database/migrations/20260923_003_dao_xp_ledger.sql` is the durable
 * reference implementation, enforcing the same source list in a CHECK.
 */
import { DAO_XP_SOURCES, type DaoXpSource } from '@seihouse/library/cultivation';
import type { JsonObject } from '../qi/qiLedger';

export { DAO_XP_SOURCES, type DaoXpSource };

export class DaoXpValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'DaoXpValidationError';
    this.issues = issues;
  }
}

/** A replayed idempotency key described a different credit. Nothing moved. */
export class DaoXpConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DaoXpConflictError';
  }
}

export interface DaoXpAccountRecord {
  uid: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface DaoXpTransaction {
  id: string;
  uid: string;
  kind: 'credit';
  amount: number;
  source: DaoXpSource;
  idempotencyKey: string;
  description: string;
  balanceAfter: number;
  metadata: JsonObject;
  createdAt: string;
}

export interface DaoXpCreditCommand {
  uid: string;
  amount: number;
  source: DaoXpSource;
  /** One credit per key per account; a replay returns the original line. */
  idempotencyKey: string;
  description: string;
  metadata?: JsonObject;
}

export interface DaoXpCreditResult {
  account: DaoXpAccountRecord;
  transaction: DaoXpTransaction;
  /** True when the key had already been applied and nothing moved. */
  replayed: boolean;
}

export interface DaoXpLedger {
  getAccount(uid: string): Promise<DaoXpAccountRecord | null>;
  credit(command: DaoXpCreditCommand): Promise<DaoXpCreditResult>;
  listTransactions(uid: string, limit: number): Promise<DaoXpTransaction[]>;
}

export const assertDaoXpCredit = (command: DaoXpCreditCommand): void => {
  const issues: string[] = [];
  if (typeof command.uid !== 'string' || !command.uid.trim()) issues.push('A user id is required.');
  if (!Number.isInteger(command.amount) || command.amount <= 0) issues.push('DAO XP amount must be a positive whole number.');
  if (!(DAO_XP_SOURCES as readonly string[]).includes(command.source)) {
    issues.push(`DAO XP cannot be credited by "${String(command.source)}". Only ${DAO_XP_SOURCES.join(', ')} may credit it.`);
  }
  if (typeof command.idempotencyKey !== 'string' || !command.idempotencyKey.trim() || command.idempotencyKey.length > 220) {
    issues.push('An idempotency key of 1–220 characters is required.');
  }
  if (typeof command.description !== 'string' || !command.description.trim()) issues.push('A description is required.');
  if (issues.length) throw new DaoXpValidationError(issues);
};

export const assertDaoXpReplayMatches = (existing: DaoXpTransaction, command: DaoXpCreditCommand): void => {
  if (existing.amount !== command.amount || existing.source !== command.source) {
    throw new DaoXpConflictError(
      `Idempotency key ${existing.idempotencyKey} already credited ${existing.amount} DAO XP from ${existing.source}.`,
    );
  }
};
