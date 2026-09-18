import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, describe, expect, it } from 'vitest';
import { describeEnergyLedgerContract } from './energyLedgerContract';
import { PostgresEnergyRepository } from './postgresEnergyRepository';

const MIGRATION = path.resolve(__dirname, '../../../database/migrations/20260918_001_energy_ledger.sql');

let database: Promise<PGlite> | undefined;

/**
 * A real Postgres engine (PGlite) runs the migration verbatim, so the ledger
 * functions and constraints are proven here, not just the TypeScript adapter.
 * The `user_account` prerequisite is stubbed because this repository has no
 * Data Connect schema of its own. One engine is shared and every test starts
 * from empty ledger tables.
 */
const createDatabase = async () => {
  database ??= (async () => {
    const db = new PGlite();
    await db.exec('CREATE TABLE user_account (uid TEXT PRIMARY KEY);');
    await db.exec(await readFile(MIGRATION, 'utf8'));
    for (const uid of ['dev-user', 'prod-user', 'someone-else']) {
      await db.query('INSERT INTO user_account (uid) VALUES ($1)', [uid]);
    }
    return db;
  })();
  const db = await database;
  await db.exec('TRUNCATE energy_account CASCADE;');
  return db;
};

afterAll(async () => {
  await (await database)?.close();
});

describeEnergyLedgerContract('postgres migration', async () => new PostgresEnergyRepository(await createDatabase()));

describe('Energy Postgres migration guards', () => {
  it('rejects direct balance writes that would break the ledger invariants', async () => {
    const db = await createDatabase();
    await db.query('SELECT energy_ensure_account($1)', ['dev-user']);
    await expect(db.query('UPDATE energy_account SET balance = -1 WHERE uid = $1', ['dev-user'])).rejects.toThrow();
    await expect(db.query('UPDATE energy_account SET held = 5 WHERE uid = $1', ['dev-user'])).rejects.toThrow();
  });

  it('enforces one ledger line per idempotency key at the database level', async () => {
    const db = await createDatabase();
    await db.query('SELECT energy_apply_grant($1, $2, $3, $4, $5::jsonb)', ['dev-user', 5, 'k', 'Test', '{}']);
    await expect(db.query(
      `INSERT INTO energy_transaction (uid, kind, amount, idempotency_key, description, balance_after, held_after)
       VALUES ($1, 'grant', 5, 'k', 'Duplicate', 10, 0)`,
      ['dev-user'],
    )).rejects.toThrow(/energy_transaction_one_per_key/);
  });
});
