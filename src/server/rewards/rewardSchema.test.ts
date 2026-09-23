import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Applies every development migration in order and checks the rules the
 * reward schema itself enforces: one Mystery Scroll per achievement, scrolls
 * open once, Relics come only from Fate Survival and pay only DAO XP and
 * Energy, Familiar bonds or purchases move currency in the same transaction
 * as what they pay for, and Legendary bond masters an element once.
 */
const MIGRATIONS = path.resolve(__dirname, '../../../database/migrations');
let database: Promise<PGlite> | undefined;

const createDatabase = async () => {
  database ??= (async () => {
    const db = new PGlite();
    await db.exec('CREATE TABLE user_account (uid TEXT PRIMARY KEY);');
    for (const file of (await readdir(MIGRATIONS)).filter(name => name.endsWith('.sql')).sort()) {
      await db.exec(await readFile(path.join(MIGRATIONS, file), 'utf8'));
    }
    return db;
  })();
  const db = await database;
  await db.exec(`
    TRUNCATE user_account CASCADE;
    INSERT INTO user_account (uid) VALUES ('reader');
  `);
  return db;
};

beforeAll(async () => { await createDatabase(); }, 60_000);
afterAll(async () => { await (await database)?.close(); });

const json = <T,>(rows: { rows: Array<Record<string, unknown>> }, column: string) => rows.rows[0][column] as T;
const qiBalance = async (db: PGlite) => Number((await db.query<{ balance: string }>('SELECT balance FROM qi_account WHERE uid = $1', ['reader'])).rows[0]?.balance ?? 0);

describe('Reward schema', () => {
  it('drops the retired Relic v3 tables', async () => {
    const db = await createDatabase();
    const tables = await db.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    const names = tables.rows.map(row => row.table_name);
    expect(names).not.toContain('earned_relic');
    expect(names).toEqual(expect.arrayContaining(['library_activity', 'mystery_scroll', 'fate_survival_relic', 'familiar_training', 'familiar_elemental_mastery', 'dao_xp_account']));
  });

  it('earns one Mystery Scroll per achievement and opens it exactly once', async () => {
    const db = await createDatabase();
    const insert = () => db.query(
      `INSERT INTO mystery_scroll (uid, achievement_key, achievement_version, achievement_snapshot, presentation, rarity, rewards, completion_evidence)
       VALUES ('reader', 'reading.first-chapter', 1, '{}', 'concealed', 'Common', '[{"type":"dao-xp","amount":25}]', '[{"activityId":"a"}]')
       RETURNING id`,
    );
    const id = (await insert()).rows[0] as { id: string };
    await expect(insert()).rejects.toThrow(/mystery_scroll_one_per_achievement/);
    const delivered = '[{"type":"dao-xp","amount":25,"transactionId":"t","balanceAfter":25}]';
    const first = json<{ replayed: boolean }>(await db.query('SELECT mystery_scroll_complete_opening($1, $2, $3) AS result', ['reader', id.id, delivered]), 'result');
    const second = json<{ replayed: boolean }>(await db.query('SELECT mystery_scroll_complete_opening($1, $2, $3) AS result', ['reader', id.id, delivered]), 'result');
    expect([first.replayed, second.replayed]).toEqual([false, true]);
  });

  it('keeps one Relic per Fate Survival challenge, paying only DAO XP and Energy', async () => {
    const db = await createDatabase();
    const insert = (challenge: string, rewards: string) => db.query(
      `INSERT INTO fate_survival_relic (uid, challenge_id, outcome, relic_key, relic_snapshot, rarity, rewards)
       VALUES ('reader', $1, 'FATE AVERTED', 'ember-of-defiance', '{}', 'Legendary', $2)`, [challenge, rewards],
    );
    await insert('challenge-1', '[{"type":"dao-xp","amount":200},{"type":"energy","amount":50}]');
    await expect(insert('challenge-1', '[{"type":"dao-xp","amount":200}]')).rejects.toThrow(/fate_survival_relic_one_per_challenge/);
    await expect(insert('challenge-2', '[{"type":"qi","amount":200}]')).rejects.toThrow(/fate_survival_relic_rewards_allowed/);
  });

  it('cultivates a bond with QI in one transaction, clamped to Legendary bond, replay-safe, and mastering the element once', async () => {
    const db = await createDatabase();
    await db.query(`SELECT qi_apply_deposit('reader', 9000, 'grant', 'development-grant', 'Grant', '{}')`);
    type OfferResult = { outcome: string; offer?: { spent: number; qi_after: number }; mastery?: { element: string; familiar_id: string } | null };
    const offer = async (key: string, amount: number, familiar = 'quill', element = 'lightning', included = true) => json<OfferResult>(
      await db.query('SELECT familiar_apply_offer($1, $2, $3, $4, $5, $6, $7, $8) AS result', ['reader', familiar, element, included, amount, 4000, key, 'Quill · bond']), 'result');

    expect(await offer('one', 1000)).toMatchObject({ outcome: 'trained', offer: { spent: 1000, qi_after: 1000 }, mastery: null });
    expect(await offer('one', 1000)).toMatchObject({ outcome: 'replayed' });
    await expect(offer('one', 999)).rejects.toThrow(/familiar_conflict/);
    expect(await offer('two', 9000)).toMatchObject({ outcome: 'trained', offer: { spent: 3000, qi_after: 4000 }, mastery: { element: 'lightning', familiar_id: 'quill' } });
    expect(await offer('two', 9000)).toMatchObject({ outcome: 'replayed', mastery: { element: 'lightning' } });
    expect(await offer('three', 10)).toMatchObject({ outcome: 'fully-bonded' });
    // A second lightning Familiar reaching Legendary bond does not master Lightning again.
    expect(await offer('monkey', 4000, 'little-monkey-king')).toMatchObject({ outcome: 'trained', mastery: null });
    const masteries = await db.query<{ element: string; familiar_id: string }>('SELECT element, familiar_id FROM familiar_elemental_mastery');
    expect(masteries.rows).toEqual([{ element: 'lightning', familiar_id: 'quill' }]);
    expect(await qiBalance(db)).toBe(1000);

    await expect(offer('stranger', 10, 'phoenix', 'fire', false)).rejects.toThrow(/familiar_conflict/);
  });

  it('lets the Active Elemental Effect wear only an element the account has mastered', async () => {
    const db = await createDatabase();
    await db.query(`SELECT qi_apply_deposit('reader', 4000, 'grant', 'development-grant', 'Grant', '{}')`);
    await db.query(`SELECT familiar_ensure_account('reader')`);
    const choose = (source: string, element: string | null) =>
      db.query('UPDATE familiar_account SET active_effect_source = $1, active_effect_element = $2 WHERE uid = $3', [source, element, 'reader']);
    await expect(choose('mastered', 'lightning')).rejects.toThrow(/familiar_account_active_effect_mastered/);
    await expect(choose('bond', 'lightning')).rejects.toThrow(/familiar_account_active_effect_element/);
    await expect(choose('boosted', null)).rejects.toThrow(/check constraint/);
    await db.query(`SELECT familiar_apply_offer('reader', 'quill', 'lightning', true, 4000, 4000, 'master', 'Quill · bond')`);
    await choose('mastered', 'lightning');
    const account = await db.query<{ active_effect_source: string }>(`SELECT active_effect_source FROM familiar_account WHERE uid = 'reader'`);
    expect(account.rows[0].active_effect_source).toBe('mastered');
  });

  it('records nothing when the QI spend is refused', async () => {
    const db = await createDatabase();
    await db.query(`SELECT qi_apply_deposit('reader', 50, 'grant', 'development-grant', 'Grant', '{}')`);
    await expect(db.query(`SELECT familiar_apply_offer('reader', 'quill', 'lightning', true, 100, 4000, 'poor', 'Quill · bond')`)).rejects.toThrow(/qi_insufficient/);
    const offers = await db.query('SELECT count(*)::int AS count FROM familiar_offer');
    expect((offers.rows[0] as { count: number }).count).toBe(0);
    expect(await qiBalance(db)).toBe(50);
  });

  it('buys a Familiar for QI or Energy once, charging nothing for one already owned', async () => {
    const db = await createDatabase();
    await db.query(`SELECT qi_apply_deposit('reader', 1500, 'grant', 'development-grant', 'Grant', '{}')`);
    await db.query(`SELECT energy_apply_grant('reader', 400, 'grant', 'Grant', '{}')`);
    const buy = async (familiar: string, currency: string, price: number, key: string) => json<{ outcome: string }>(
      await db.query('SELECT familiar_apply_purchase($1, $2, $3, $4, $5, $6) AS result', ['reader', familiar, currency, price, key, 'Celestial Store']), 'result');

    expect(await buy('phoenix', 'qi', 1500, 'celestial-store:a')).toMatchObject({ outcome: 'purchased' });
    expect(await buy('phoenix', 'qi', 1500, 'celestial-store:a')).toMatchObject({ outcome: 'purchased' });
    expect(await buy('phoenix', 'qi', 1500, 'celestial-store:b')).toMatchObject({ outcome: 'already-owned' });
    // A key that bought one Familiar never buys another, and its payment is keyed to the Familiar it bought.
    await expect(buy('galaxy-octopus', 'energy', 300, 'celestial-store:a')).rejects.toThrow(/familiar_conflict/);
    const spend = await db.query<{ idempotency_key: string }>(`SELECT idempotency_key FROM qi_transaction WHERE kind = 'spend'`);
    expect(spend.rows.map(row => row.idempotency_key)).toEqual(['celestial-store:a:phoenix']);
    expect(await buy('galaxy-octopus', 'energy', 300, 'celestial-store:c')).toMatchObject({ outcome: 'purchased' });
    await expect(buy('living-grimoire', 'energy', 300, 'celestial-store:d')).rejects.toThrow(/energy_insufficient/);
    expect(await qiBalance(db)).toBe(0);
    const owned = await db.query<{ familiar_id: string }>('SELECT familiar_id FROM familiar_ownership ORDER BY familiar_id');
    expect(owned.rows.map(row => row.familiar_id)).toEqual(['galaxy-octopus', 'phoenix']);
  });
});
