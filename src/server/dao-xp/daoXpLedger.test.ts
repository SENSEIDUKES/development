import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDaoRankData } from '@seihouse/library/cultivation';
import { createPrincipalResolver, developmentIdentityToken } from '../identity/authentication';
import { DaoXpConflictError, DaoXpValidationError, type DaoXpLedger, type DaoXpSource } from './daoXpLedger';
import { handleDaoXpHttp } from './http';
import { InMemoryDaoXpLedger } from './inMemoryDaoXpLedger';
import { PostgresDaoXpLedger } from './postgresDaoXpLedger';

const MIGRATION = path.resolve(__dirname, '../../../database/migrations/20260923_003_dao_xp_ledger.sql');
let database: Promise<PGlite> | undefined;

const createDatabase = async () => {
  database ??= (async () => {
    const db = new PGlite();
    await db.exec('CREATE TABLE user_account (uid TEXT PRIMARY KEY);');
    await db.exec(await readFile(MIGRATION, 'utf8'));
    await db.query('INSERT INTO user_account (uid) VALUES ($1)', ['dev-user']);
    return db;
  })();
  const db = await database;
  await db.exec('TRUNCATE dao_xp_account CASCADE;');
  return db;
};

// Starting a Postgres engine is slow under a parallel run; do it once, outside any test's timeout.
beforeAll(async () => { await createDatabase(); }, 60_000);

afterAll(async () => {
  await (await database)?.close();
});

function describeDaoXpLedgerContract(name: string, createLedger: () => Promise<DaoXpLedger> | DaoXpLedger) {
  describe(`DAO XP ledger (${name})`, () => {
    const uid = 'dev-user';

    it('credits once per key and derives rank from the balance alone', async () => {
      const ledger = await createLedger();
      await ledger.credit({ uid, amount: 90, source: 'achievement', idempotencyKey: 'scroll:1:dao-xp', description: 'First Page Turned' });
      await ledger.credit({ uid, amount: 90, source: 'achievement', idempotencyKey: 'scroll:1:dao-xp', description: 'First Page Turned' });
      const creation = await ledger.credit({ uid, amount: 50, source: 'creation', idempotencyKey: 'creation:story:1', description: 'Story created' });
      expect(creation.transaction).toMatchObject({ kind: 'credit', amount: 50, balanceAfter: 140, source: 'creation' });
      const account = await ledger.getAccount(uid);
      expect(account?.balance).toBe(140);
      expect(getDaoRankData(account!.balance).rank).toBe('Disciple');
      expect((await ledger.listTransactions(uid, 10)).map(line => line.source)).toEqual(['creation', 'achievement']);
    });

    it('accepts only achievements, creation, Fate Survival Relics and the opening balance', async () => {
      const ledger = await createLedger();
      for (const source of ['dao-pillar', 'qi', 'celestial-store', 'familiar-training', 'development-grant'] as const) {
        await expect(ledger.credit({ uid, amount: 10, source: source as unknown as DaoXpSource, idempotencyKey: `bad:${source}`, description: 'Not allowed' }))
          .rejects.toBeInstanceOf(DaoXpValidationError);
      }
      await ledger.credit({ uid, amount: 200, source: 'fate-survival-relic', idempotencyKey: 'relic:1:dao-xp', description: 'Relic' });
      await ledger.credit({ uid, amount: 13_480, source: 'opening-balance', idempotencyKey: 'opening-balance:dev-user', description: 'Carried over' });
      expect((await ledger.getAccount(uid))?.balance).toBe(13_680);
    });

    it('refuses a replayed key that describes a different credit, and non-positive amounts', async () => {
      const ledger = await createLedger();
      await ledger.credit({ uid, amount: 25, source: 'creation', idempotencyKey: 'creation:chapter:1', description: 'Chapter' });
      await expect(ledger.credit({ uid, amount: 26, source: 'creation', idempotencyKey: 'creation:chapter:1', description: 'Chapter' })).rejects.toBeInstanceOf(DaoXpConflictError);
      await expect(ledger.credit({ uid, amount: 25, source: 'achievement', idempotencyKey: 'creation:chapter:1', description: 'Chapter' })).rejects.toBeInstanceOf(DaoXpConflictError);
      await expect(ledger.credit({ uid, amount: 0, source: 'creation', idempotencyKey: 'zero', description: 'Nothing' })).rejects.toBeInstanceOf(DaoXpValidationError);
      expect((await ledger.getAccount(uid))?.balance).toBe(25);
    });
  });
}

describeDaoXpLedgerContract('in-memory', () => new InMemoryDaoXpLedger());
describeDaoXpLedgerContract('postgres migration', async () => new PostgresDaoXpLedger(await createDatabase()));

describe('DAO XP migration guards', () => {
  it('keeps the source list and credit-only rule in the database itself', async () => {
    const db = await createDatabase();
    await db.query("SELECT dao_xp_apply_credit('dev-user', 10, 'k', 'creation', 'Chapter', '{}'::jsonb)");
    await expect(db.query("SELECT dao_xp_apply_credit('dev-user', 10, 'q', 'dao-pillar', 'Pillar', '{}'::jsonb)")).rejects.toThrow(/dao_xp_validation/);
    await expect(db.query(
      `INSERT INTO dao_xp_transaction (uid, kind, amount, source, idempotency_key, description, balance_after)
       VALUES ('dev-user', 'debit', 5, 'creation', 'd', 'Debit', 5)`,
    )).rejects.toThrow(/dao_xp_transaction_kind_check/);
    await expect(db.query("UPDATE dao_xp_account SET balance = -1 WHERE uid = 'dev-user'")).rejects.toThrow();
  });
});

describe('DAO XP HTTP boundary', () => {
  const resolvePrincipal = createPrincipalResolver({ mode: 'development' });
  const headers = { authorization: `Bearer ${developmentIdentityToken('cave-user')}` };

  it('reads the caller\'s DAO XP and carries a legacy opening balance over exactly once', async () => {
    const ledger = new InMemoryDaoXpLedger();
    const empty = await handleDaoXpHttp({ method: 'GET', headers }, { ledger, resolvePrincipal });
    expect(empty).toMatchObject({ status: 200, body: { uid: 'cave-user', balance: 0, transactions: [] } });
    const seeded = await handleDaoXpHttp({ method: 'POST', headers, body: { operation: 'development.opening-balance', amount: 13_480 } }, { ledger, resolvePrincipal });
    const again = await handleDaoXpHttp({ method: 'POST', headers, body: { operation: 'development.opening-balance', amount: 13_480 } }, { ledger, resolvePrincipal });
    expect(seeded.body).toMatchObject({ balance: 13_480 });
    expect(again.body).toMatchObject({ balance: 13_480, transactions: [{ source: 'opening-balance' }] });
  });

  it('refuses the opening balance to production principals and anonymous callers', async () => {
    const ledger = new InMemoryDaoXpLedger();
    const production = createPrincipalResolver({ mode: 'production', verifyIdToken: async () => ({ uid: 'real-user' }) });
    const refused = await handleDaoXpHttp({ method: 'POST', headers: { authorization: 'Bearer real-token' }, body: { operation: 'development.opening-balance', amount: 10 } }, { ledger, resolvePrincipal: production });
    expect(refused.status).toBe(403);
    expect((await handleDaoXpHttp({ method: 'GET', headers: {} }, { ledger, resolvePrincipal })).status).toBe(401);
    expect(await ledger.getAccount('real-user')).toBeNull();
  });
});
