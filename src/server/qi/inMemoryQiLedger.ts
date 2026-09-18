import {
  assertQiAmount,
  assertQiIdempotencyKey,
  type JsonObject,
  type QiAccountRecord,
  type QiDepositCommand,
  type QiDepositResult,
  type QiLedger,
  type QiTransaction,
} from './qiLedger';

const newId = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * The Qi ledger rules without a database. Every deposit is applied
 * synchronously inside one call, so a caller that composes it with other
 * in-memory state (the Dao Pillar claim) gets an atomic unit of work as long
 * as it does not yield between its steps.
 */
export class InMemoryQiLedger implements QiLedger {
  private readonly accounts = new Map<string, QiAccountRecord>();
  private readonly transactions = new Map<string, QiTransaction[]>();
  private readonly now: () => string;

  constructor(options: { now?: () => string } = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  private ensureSync(uid: string): QiAccountRecord {
    let account = this.accounts.get(uid);
    if (!account) {
      const at = this.now();
      account = { uid, balance: 0, createdAt: at, updatedAt: at };
      this.accounts.set(uid, account);
      this.transactions.set(uid, []);
    }
    return account;
  }

  /** Synchronous core so composed units of work stay atomic. */
  depositSync(command: QiDepositCommand): QiDepositResult {
    assertQiAmount(command.amount);
    assertQiIdempotencyKey(command.idempotencyKey);
    const account = this.ensureSync(command.uid);
    const history = this.transactions.get(command.uid)!;
    const existing = history.find(entry => entry.idempotencyKey === command.idempotencyKey);
    if (existing) return { account: { ...account }, transaction: { ...existing }, replayed: true };
    account.balance += command.amount;
    account.updatedAt = this.now();
    const transaction: QiTransaction = {
      id: newId(),
      uid: command.uid,
      kind: 'deposit',
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

  async getAccount(uid: string): Promise<QiAccountRecord | null> {
    const account = this.accounts.get(uid);
    return account ? { ...account } : null;
  }

  async deposit(command: QiDepositCommand): Promise<QiDepositResult> {
    return this.depositSync(command);
  }

  async listTransactions(uid: string, limit: number): Promise<QiTransaction[]> {
    return (this.transactions.get(uid) ?? []).slice(0, limit).map(entry => ({ ...entry }));
  }

  /** Test and development helper. */
  reset(uid: string): void {
    this.accounts.delete(uid);
    this.transactions.delete(uid);
  }
}
