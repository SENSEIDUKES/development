import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, describe, expect, it } from 'vitest';
import { PostgresQiLedger } from '../qi/postgresQiLedger';
import { describeDaoPillarContract } from './daoPillarContract';
import { PostgresDaoPillarRepository } from './postgresDaoPillarRepository';

const MIGRATIONS = [
  '20260918_002_qi_ledger.sql',
  '20260918_003_dao_pillar_calendar.sql',
].map(file => path.resolve(__dirname, '../../../database/migrations', file));

let database: Promise<PGlite> | undefined;

/**
 * A real Postgres engine (PGlite) runs both migrations verbatim so the claim
 * function, the Qi deposit and their constraints are proven here, not just
 * the TypeScript adapters. `user_account` is stubbed because this repository
 * has no Data Connect schema of its own.
 */
const createDatabase = async () => {
  database ??= (async () => {
    const db = new PGlite();
    await db.exec('CREATE TABLE user_account (uid TEXT PRIMARY KEY);');
    for (const migration of MIGRATIONS) await db.exec(await readFile(migration, 'utf8'));
    for (const uid of ['dev-user', 'someone-else']) await db.query('INSERT INTO user_account (uid) VALUES ($1)', [uid]);
    return db;
  })();
  const db = await database;
  await db.exec('TRUNCATE dao_pillar_claim, qi_account CASCADE;');
  return db;
};

afterAll(async () => {
  await (await database)?.close();
});

describeDaoPillarContract('postgres migration', async () => {
  const db = await createDatabase();
  return { repository: new PostgresDaoPillarRepository(db), qi: new PostgresQiLedger(db) };
});

describe('Dao Pillar Postgres migration guards', () => {
  const claim = (db: PGlite, day: number, rewards = '[{"type":"qi","amount":100}]') => db.query(
    'SELECT dao_pillar_claim_day($1, $2, $3, $4::smallint, $5::date, $6::jsonb, $7, $8::jsonb) AS result',
    ['dev-user', 'beta-test', 'beta-test:2026-09-06', day, '2026-09-18', rewards, 'Beta Test · Day 13', '{}'],
  );

  it('enforces one claim per scheduled day at the database level', async () => {
    const db = await createDatabase();
    await claim(db, 13);
    await expect(db.query(
      `INSERT INTO dao_pillar_claim (uid, theme_id, cycle_id, day_number, scheduled_date, rewards)
       VALUES ('dev-user', 'beta-test', 'beta-test:2026-09-06', 13, '2026-09-18', '[{"type":"qi","amount":100}]'::jsonb)`,
    )).rejects.toThrow(/dao_pillar_claim_once_per_day/);
  });

  it('rolls the claim back when a reward entry cannot be delivered, leaving Qi untouched', async () => {
    const db = await createDatabase();
    await expect(claim(db, 13, '[{"type":"qi","amount":100},{"type":"relic","relicId":"r1"}]')).rejects.toThrow(/dao_pillar_unsupported_reward/);
    expect((await db.query('SELECT count(*)::int AS n FROM dao_pillar_claim')).rows[0]).toEqual({ n: 0 });
    expect((await db.query('SELECT count(*)::int AS n FROM qi_transaction')).rows[0]).toEqual({ n: 0 });
    expect((await db.query<{ balance: number }>('SELECT balance FROM qi_account WHERE uid = $1', ['dev-user'])).rows[0]?.balance ?? 0).toBe(0);
  });

  it('keeps the Qi ledger to one line per idempotency key and never negative', async () => {
    const db = await createDatabase();
    await db.query('SELECT qi_apply_deposit($1, $2, $3, $4, $5, $6::jsonb)', ['dev-user', 5, 'k', 'test', 'Test', '{}']);
    await expect(db.query(
      `INSERT INTO qi_transaction (uid, kind, amount, source, idempotency_key, description, balance_after)
       VALUES ('dev-user', 'deposit', 5, 'test', 'k', 'Duplicate', 10)`,
    )).rejects.toThrow(/qi_transaction_one_per_key/);
    await expect(db.query('UPDATE qi_account SET balance = -1 WHERE uid = $1', ['dev-user'])).rejects.toThrow();
    await expect(db.query('SELECT qi_apply_deposit($1, $2, $3, $4, $5, $6::jsonb)', ['dev-user', 0, 'z', 'test', 'Test', '{}'])).rejects.toThrow(/qi_validation/);
  });
});
