import { describe, expect, it } from 'vitest';
import { QiConflictError, QiInsufficientError, QiValidationError, type QiLedger, type QiTransaction } from './qiLedger';

/** Replays history oldest → newest and checks every recorded `balanceAfter`. */
export const replayQiLedger = (transactions: readonly QiTransaction[]): number => {
  let balance = 0;
  for (const transaction of [...transactions].reverse()) {
    balance += transaction.kind === 'deposit' ? transaction.amount : -transaction.amount;
    expect(balance).toBe(transaction.balanceAfter);
  }
  return balance;
};

/**
 * The behaviour every Qi ledger adapter must satisfy. Run once against the
 * in-memory adapter and once against the Postgres migrations so both agree.
 */
export function describeQiLedgerContract(name: string, createLedger: () => Promise<QiLedger> | QiLedger) {
  describe(`Qi ledger (${name})`, () => {
    const uid = 'dev-user';

    it('deposits once per idempotency key and refuses a key reused for a different amount', async () => {
      const ledger = await createLedger();
      const first = await ledger.deposit({ uid, amount: 100, idempotencyKey: 'pillar:1', source: 'dao-pillar', description: 'Day 1' });
      const replay = await ledger.deposit({ uid, amount: 100, idempotencyKey: 'pillar:1', source: 'dao-pillar', description: 'Day 1' });
      expect(first.replayed).toBe(false);
      expect(replay.replayed).toBe(true);
      expect(replay.transaction.id).toBe(first.transaction.id);
      await expect(ledger.deposit({ uid, amount: 101, idempotencyKey: 'pillar:1', source: 'dao-pillar', description: 'Day 1' })).rejects.toBeInstanceOf(QiConflictError);
      expect((await ledger.getAccount(uid))?.balance).toBe(100);
    });

    it('spends QI once per key and never overdraws', async () => {
      const ledger = await createLedger();
      await ledger.deposit({ uid, amount: 500, idempotencyKey: 'grant', source: 'development-grant', description: 'Grant' });
      const spend = await ledger.spend({ uid, amount: 300, idempotencyKey: 'train:quill:1', source: 'familiar-training', description: 'Quill training', metadata: { familiarId: 'quill' } });
      expect(spend.transaction).toMatchObject({ kind: 'spend', amount: 300, balanceAfter: 200, source: 'familiar-training', metadata: { familiarId: 'quill' } });
      const replay = await ledger.spend({ uid, amount: 300, idempotencyKey: 'train:quill:1', source: 'familiar-training', description: 'Quill training' });
      expect(replay.replayed).toBe(true);
      expect(replay.account.balance).toBe(200);
      await expect(ledger.spend({ uid, amount: 201, idempotencyKey: 'train:quill:2', source: 'familiar-training', description: 'Quill training' }))
        .rejects.toMatchObject({ name: 'QiInsufficientError', required: 201, available: 200 });
      await expect(ledger.spend({ uid, amount: 201, idempotencyKey: 'train:quill:2', source: 'familiar-training', description: 'Quill training' }))
        .rejects.toBeInstanceOf(QiInsufficientError);
      expect((await ledger.getAccount(uid))?.balance).toBe(200);
    });

    it('refuses a spend replayed under a deposit key and invalid amounts', async () => {
      const ledger = await createLedger();
      await ledger.deposit({ uid, amount: 50, idempotencyKey: 'same', source: 'dao-pillar', description: 'Day' });
      await expect(ledger.spend({ uid, amount: 50, idempotencyKey: 'same', source: 'celestial-store', description: 'Store' })).rejects.toBeInstanceOf(QiConflictError);
      await expect(ledger.spend({ uid, amount: 0, idempotencyKey: 'zero', source: 'celestial-store', description: 'Store' })).rejects.toBeInstanceOf(QiValidationError);
      await expect(ledger.deposit({ uid, amount: 1.5, idempotencyKey: 'half', source: 'dao-pillar', description: 'Day' })).rejects.toBeInstanceOf(QiValidationError);
    });

    it('keeps history consistent with the stored balance', async () => {
      const ledger = await createLedger();
      await ledger.deposit({ uid, amount: 1_000, idempotencyKey: 'a', source: 'mystery-scroll', description: 'Scroll' });
      await ledger.spend({ uid, amount: 400, idempotencyKey: 'b', source: 'celestial-store', description: 'Store' });
      await ledger.deposit({ uid, amount: 100, idempotencyKey: 'c', source: 'dao-pillar', description: 'Day' });
      await ledger.spend({ uid, amount: 700, idempotencyKey: 'd', source: 'familiar-training', description: 'Training' });
      const history = await ledger.listTransactions(uid, 10);
      expect(history.map(entry => entry.kind)).toEqual(['spend', 'deposit', 'spend', 'deposit']);
      expect(replayQiLedger(history)).toBe((await ledger.getAccount(uid))?.balance);
      expect((await ledger.getAccount(uid))?.balance).toBe(0);
    });
  });
}
