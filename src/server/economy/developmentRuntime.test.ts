import { describe, expect, it } from 'vitest';
import { createDevelopmentEconomy } from './developmentRuntime';
import type { QiAccountSnapshot } from '@seihouse/library/cultivation';
import { calendarDateIn } from '../dao-pillar/calendar';

describe('one DEV economy authority', () => {
  const economy = () => createDevelopmentEconomy({
    DAO_PILLAR_TIME_ZONE: 'UTC', DAO_PILLAR_STARTS_ON: calendarDateIn('UTC', new Date()),
  });
  const account = { Authorization: 'Bearer dev:reader-a' };
  it('reads the same QI ledger that an idempotent DAO claim credited', async () => {
    const runtime = economy();
    const [first, replay] = await Promise.all([
      runtime.handle('dao-pillar', { method: 'POST', headers: account, body: { operation: 'claim', amount: 999999, uid: 'victim' } }),
      runtime.handle('dao-pillar', { method: 'POST', headers: account, body: { operation: 'claim' } }),
    ]);
    expect(first.status).toBe(200); expect(replay.status).toBe(200);
    const result = await runtime.handle('cultivation', { headers: account });
    const snapshot = result.body as QiAccountSnapshot;
    expect(snapshot.uid).toBe('reader-a');
    expect(snapshot.balance).toBeGreaterThan(0);
    expect(snapshot.balance).not.toBe(999999);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.balance).toBe((await runtime.qi.getAccount('reader-a'))?.balance);
    expect(await runtime.qi.getAccount('victim')).toBeNull();
  });
  it('does not offer a browser credit operation or accept another account in the body', async () => {
    const runtime = economy();
    expect((await runtime.handle('cultivation', { method: 'POST', headers: account, body: { uid: 'victim', amount: 100 } })).status).toBe(405);
    expect((await runtime.handle('cultivation', {})).status).toBe(401);
    expect((await runtime.handle('cultivation', { headers: account })).body).toMatchObject({ uid: 'reader-a', balance: 0 });
  });
  it('fails closed in production identity mode without installing infrastructure', async () => {
    const runtime = createDevelopmentEconomy({ LIBRARY_IDENTITY_MODE: 'production' });
    for (const capability of ['energy', 'dao-pillar', 'cultivation']) {
      expect((await runtime.handle(capability, { headers: account })).status).toBe(503);
    }
  });
});
