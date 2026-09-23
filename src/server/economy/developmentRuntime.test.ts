import { describe, expect, it } from 'vitest';
import { createDevelopmentEconomy, DEVELOPMENT_ECONOMY_CAPABILITIES } from './developmentRuntime';
import type { DaoXpAccountSnapshot, QiAccountSnapshot } from '@seihouse/library/cultivation';
import type { OfferQiResponse } from '@seihouse/library/familiar';
import type { FateSurvivalOutcomeResponse } from '@seihouse/library/relics';
import type { OpenMysteryScrollResponse, RecordLibraryActivityResponse } from '@seihouse/library/rewards';
import type { EnergyAccountSnapshot } from '@seihouse/library/energy';
import { defaultFamiliar } from '../../host/familiar/catalogue';
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
    expect((await runtime.handle('cultivation', { method: 'POST', headers: account, body: { uid: 'victim', amount: 100 } })).status).toBe(400);
    expect((await runtime.handle('cultivation', { method: 'PUT', headers: account, body: {} })).status).toBe(405);
    expect((await runtime.handle('cultivation', {})).status).toBe(401);
    expect((await runtime.handle('cultivation', { headers: account })).body).toMatchObject({ uid: 'reader-a', balance: 0 });
    // The Workshop's development grant credits only the signed-in development account.
    const granted = await runtime.handle('cultivation', { method: 'POST', headers: account, body: { operation: 'development.grant', amount: 100, idempotencyKey: 'g', uid: 'victim' } });
    expect(granted.body).toMatchObject({ uid: 'reader-a', balance: 100 });
    expect(await runtime.qi.getAccount('victim')).toBeNull();
  });
  it('fails closed in production identity mode without installing infrastructure', async () => {
    const runtime = createDevelopmentEconomy({ LIBRARY_IDENTITY_MODE: 'production' });
    for (const capability of DEVELOPMENT_ECONOMY_CAPABILITIES) {
      expect((await runtime.handle(capability, { headers: account })).status).toBe(503);
    }
  });
});

describe('the reward loop on one DEV economy', () => {
  const account = { Authorization: 'Bearer dev:cultivator-a' };
  const post = (runtime: ReturnType<typeof createDevelopmentEconomy>, capability: string, body: Record<string, unknown>) =>
    runtime.handle(capability, { method: 'POST', headers: account, body });
  const get = async <T,>(runtime: ReturnType<typeof createDevelopmentEconomy>, capability: string) =>
    (await runtime.handle(capability, { headers: account })).body as T;

  it('turns reading into a Mystery Scroll whose DAO XP sets rank and whose QI trains a Familiar', async () => {
    const runtime = createDevelopmentEconomy({});
    const read = await post(runtime, 'achievements', { operation: 'development.record-activity', kind: 'chapter.read', subjectId: 'story-1:1', storyId: 'story-1' });
    expect(read.status).toBe(200);
    const [scroll] = (read.body as RecordLibraryActivityResponse).earned;
    expect(scroll).toMatchObject({ achievementKey: 'reading.first-chapter', status: 'sealed', rewards: null, rarity: null });

    const opened = await post(runtime, 'achievements', { operation: 'open-scroll', scrollId: scroll.id });
    const { delivered } = (opened.body as OpenMysteryScrollResponse).scroll;
    const daoXp = delivered!.find(grant => grant.type === 'dao-xp')!.amount;
    const qi = delivered!.find(grant => grant.type === 'qi')!.amount;
    expect((await get<DaoXpAccountSnapshot>(runtime, 'dao-xp')).balance).toBe(daoXp);
    expect((await get<QiAccountSnapshot>(runtime, 'cultivation')).balance).toBe(qi);

    const offer = await post(runtime, 'familiars', { operation: 'offer-qi', familiarId: defaultFamiliar.definition.id, amount: qi, idempotencyKey: 'first-offering' });
    expect(offer.status).toBe(200);
    expect((offer.body as OfferQiResponse).spent).toBe(qi);
    expect((await get<QiAccountSnapshot>(runtime, 'cultivation')).balance).toBe(0);
    // Offering QI never touches DAO XP: rank comes from DAO XP alone.
    expect((await get<DaoXpAccountSnapshot>(runtime, 'dao-xp')).balance).toBe(daoXp);
  });

  it('pays a Fate Survival Relic in DAO XP and Energy, and never from a browser claim', async () => {
    const runtime = createDevelopmentEconomy({});
    const before = (await get<EnergyAccountSnapshot>(runtime, 'energy')).balance;
    const outcome = await post(runtime, 'relics', { operation: 'development.fate-survival-outcome', challengeId: 'trial-1', outcome: 'FATE AVERTED' });
    const relic = (outcome.body as FateSurvivalOutcomeResponse).relic!;
    expect(relic.rewards.map(grant => grant.type).sort()).toEqual(['dao-xp', 'energy']);
    expect((await get<DaoXpAccountSnapshot>(runtime, 'dao-xp')).balance).toBe(relic.rewards.find(grant => grant.type === 'dao-xp')!.amount);
    expect((await get<EnergyAccountSnapshot>(runtime, 'energy')).balance).toBe(before + relic.rewards.find(grant => grant.type === 'energy')!.amount);
    expect((await get<QiAccountSnapshot>(runtime, 'cultivation')).balance).toBe(0);
  });

  it('refuses every development-only reward control for a production principal', async () => {
    const runtime = createDevelopmentEconomy({}, {
      resolvePrincipal: async () => ({ uid: 'real-reader', role: 'user', identity: 'verified', developmentAccess: false }),
    });
    const attempts: Array<[string, Record<string, unknown>]> = [
      ['achievements', { operation: 'development.record-activity', kind: 'chapter.read', subjectId: 'x' }],
      ['relics', { operation: 'development.fate-survival-outcome', challengeId: 'x', outcome: 'FATE AVERTED' }],
      ['familiars', { operation: 'development.grant-familiar', familiarId: 'phoenix' }],
      ['dao-xp', { operation: 'development.opening-balance', amount: 5000 }],
      ['cultivation', { operation: 'development.grant', amount: 5000, idempotencyKey: 'x' }],
    ];
    for (const [capability, body] of attempts) expect((await post(runtime, capability, body)).status).toBe(403);
  });
});
