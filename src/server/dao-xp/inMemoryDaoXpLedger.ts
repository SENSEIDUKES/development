import type { JsonObject } from '../qi/qiLedger';
import {
  assertDaoXpCredit,
  assertDaoXpReplayMatches,
  type DaoXpAccountRecord,
  type DaoXpCreditCommand,
  type DaoXpCreditResult,
  type DaoXpLedger,
  type DaoXpTransaction,
} from './daoXpLedger';

const newId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * The DAO XP rules without a database. Every credit is applied synchronously
 * inside one call so composed units of work (opening a Mystery Scroll,
 * granting a Relic) stay atomic when they do not yield between steps.
 */
export class InMemoryDaoXpLedger implements DaoXpLedger {
  private readonly accounts = new Map<string, DaoXpAccountRecord>();
  private readonly transactions = new Map<string, DaoXpTransaction[]>();
  private readonly now: () => string;

  constructor(options: { now?: () => string } = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /** Synchronous core so composed units of work stay atomic. */
  creditSync(command: DaoXpCreditCommand): DaoXpCreditResult {
    assertDaoXpCredit(command);
    let account = this.accounts.get(command.uid);
    if (!account) {
      const at = this.now();
      account = { uid: command.uid, balance: 0, createdAt: at, updatedAt: at };
      this.accounts.set(command.uid, account);
      this.transactions.set(command.uid, []);
    }
    const history = this.transactions.get(command.uid)!;
    const existing = history.find(entry => entry.idempotencyKey === command.idempotencyKey);
    if (existing) {
      assertDaoXpReplayMatches(existing, command);
      return { account: { ...account }, transaction: { ...existing }, replayed: true };
    }
    account.balance += command.amount;
    account.updatedAt = this.now();
    const transaction: DaoXpTransaction = {
      id: newId(),
      uid: command.uid,
      kind: 'credit',
      amount: command.amount,
      source: command.source,
      idempotencyKey: command.idempotencyKey,
      description: command.description,
      balanceAfter: account.balance,
      metadata: { ...(command.metadata ?? {}) } as JsonObject,
      createdAt: account.updatedAt,
    };
    history.unshift(transaction);
    return { account: { ...account }, transaction: { ...transaction }, replayed: false };
  }

  async getAccount(uid: string): Promise<DaoXpAccountRecord | null> {
    const account = this.accounts.get(uid);
    return account ? { ...account } : null;
  }

  async credit(command: DaoXpCreditCommand): Promise<DaoXpCreditResult> {
    return this.creditSync(command);
  }

  async listTransactions(uid: string, limit: number): Promise<DaoXpTransaction[]> {
    return (this.transactions.get(uid) ?? []).slice(0, limit).map(entry => ({ ...entry }));
  }

  /** Test and development helper. */
  reset(uid: string): void {
    this.accounts.delete(uid);
    this.transactions.delete(uid);
  }
}
