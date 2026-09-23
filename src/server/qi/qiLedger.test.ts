import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryQiLedger } from './inMemoryQiLedger';
import { PostgresQiLedger } from './postgresQiLedger';
import { describeQiLedgerContract } from './qiLedgerContract';

const MIGRATIONS = [
  '20260918_002_qi_ledger.sql',
  '20260923_001_qi_spend.sql',
].map(file => path.resolve(__dirname, '../../../database/migrations', file));

let database: Promise<PGlite> | undefined;

/** A real Postgres engine runs both migrations verbatim; `user_account` is stubbed. */
const createDatabase = async () => {
  database ??= (async () => {
    const db = new PGlite();
    await db.exec('CREATE TABLE user_account (uid TEXT PRIMARY KEY);');
    for (const migration of MIGRATIONS) await db.exec(await readFile(migration, 'utf8'));
    await db.query('INSERT INTO user_account (uid) VALUES ($1)', ['dev-user']);
    return db;
  })();
  const db = await database;
  await db.exec('TRUNCATE qi_account CASCADE;');
  return db;
};

// Starting a Postgres engine is slow under a parallel run; do it once, outside any test's timeout.
beforeAll(async () => { await createDatabase(); }, 60_000);

afterAll(async () => {
  await (await database)?.close();
});

describeQiLedgerContract('in-memory', () => new InMemoryQiLedger());
describeQiLedgerContract('postgres migration', async () => new PostgresQiLedger(await createDatabase()));

describe('Qi spend migration guards', () => {
  it('never lets a stored balance go negative or a spend line exist without its kind', async () => {
    const db = await createDatabase();
    await db.query('SELECT qi_apply_deposit($1, $2, $3, $4, $5, $6::jsonb)', ['dev-user', 10, 'k', 'test', 'Test', '{}']);
    await expect(db.query('SELECT qi_apply_spend($1, $2, $3, $4, $5, $6::jsonb)', ['dev-user', 11, 's', 'test', 'Test', '{}'])).rejects.toThrow(/qi_insufficient/);
    await expect(db.query(
      `INSERT INTO qi_transaction (uid, kind, amount, source, idempotency_key, description, balance_after)
       VALUES ('dev-user', 'refund', 5, 'test', 'r', 'Refund', 15)`,
    )).rejects.toThrow(/qi_transaction_kind_check/);
    expect((await db.query<{ balance: number }>('SELECT balance FROM qi_account WHERE uid = $1', ['dev-user'])).rows[0].balance).toBe(10);
  });
});
