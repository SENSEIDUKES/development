import { describe, expect, it } from 'vitest';
import { InMemoryDaoXpLedger } from '../dao-xp/inMemoryDaoXpLedger';
import { InMemoryEnergyRepository } from '../energy/inMemoryEnergyRepository';
import { createPrincipalResolver, developmentIdentityToken } from '../identity/authentication';
import { InMemoryQiLedger } from '../qi/inMemoryQiLedger';
import { RewardDeliverer } from '../rewards/deliverer';
import { FATE_SURVIVAL_RELICS, RelicCatalogError, validateRelicCatalog } from './catalog';
import { handleRelicsHttp } from './http';
import { InMemoryRelicRepository } from './inMemoryRelicRepository';
import { RelicService } from './service';

const uid = 'survivor-1';

function setup() {
  const daoXp = new InMemoryDaoXpLedger();
  const qi = new InMemoryQiLedger();
  const energy = new InMemoryEnergyRepository();
  const service = new RelicService(new InMemoryRelicRepository(), new RewardDeliverer({ daoXp, qi, energy }), { now: () => new Date('2026-09-23T12:00:00Z') });
  return { service, daoXp, qi, energy };
}

describe('Fate Survival Relics', () => {
  it('grants one Relic per challenge and delivers its DAO XP and Energy once', async () => {
    const { service, daoXp, qi, energy } = setup();
    const first = await service.recordFateSurvivalOutcome(uid, { challengeId: 'story-4:doom-7', outcome: 'FATE AVERTED', storyId: 'story-4' });
    expect(first.outcome).toBe('granted');
    expect(first.relic).toMatchObject({ rarity: 'Legendary', name: 'Karmic Compass', challengeId: 'story-4:doom-7', outcome: 'FATE AVERTED' });
    expect(first.relic?.delivered.map(({ type, amount }) => ({ type, amount }))).toEqual([{ type: 'dao-xp', amount: 200 }, { type: 'energy', amount: 40 }]);

    const again = await service.recordFateSurvivalOutcome(uid, { challengeId: 'story-4:doom-7', outcome: 'FATE AVERTED', storyId: 'story-4' });
    expect(again.outcome).toBe('already-granted');
    expect((await daoXp.getAccount(uid))?.balance).toBe(200);
    expect((await daoXp.listTransactions(uid, 5)).map(line => line.source)).toEqual(['fate-survival-relic']);
    expect((await energy.getAccount(uid))?.balance).toBe(40);
    expect(await qi.getAccount(uid)).toBeNull();
    expect((await service.getSnapshot({ uid })).relics).toHaveLength(1);
  });

  it('decides rarity from the judged outcome and grants nothing for a manifested doom', async () => {
    const { service, daoXp } = setup();
    const scarred = await service.recordFateSurvivalOutcome(uid, { challengeId: 'c-2', outcome: 'FATE SCARRED' });
    expect(scarred.relic?.rarity).toBe('Rare');
    const doom = await service.recordFateSurvivalOutcome(uid, { challengeId: 'c-3', outcome: 'DOOM MANIFESTED' });
    expect(doom).toMatchObject({ outcome: 'no-relic', relic: null });
    expect((await daoXp.getAccount(uid))?.balance).toBe(50);
    expect((await service.getSnapshot({ uid })).outcomeRarity).toEqual({ 'FATE AVERTED': 'Legendary', 'FATE SCARRED': 'Rare', 'DOOM MANIFESTED': null });
  });

  it('refuses any Relic definition that grants more than DAO XP and Energy', () => {
    expect(() => validateRelicCatalog([{ ...FATE_SURVIVAL_RELICS[0], rewards: [{ type: 'qi', amount: 10 }] }], { 'FATE AVERTED': null, 'FATE SCARRED': null, 'DOOM MANIFESTED': null }))
      .toThrow(RelicCatalogError);
  });

  it('keeps the Fate Survival simulator development-only', async () => {
    const { service } = setup();
    const development = createPrincipalResolver({ mode: 'development' });
    const production = createPrincipalResolver({ mode: 'production', verifyIdToken: async () => ({ uid }) });
    const body = { operation: 'development.fate-survival-outcome', challengeId: 'c-9', outcome: 'FATE AVERTED' };
    const refused = await handleRelicsHttp({ method: 'POST', headers: { authorization: 'Bearer real' }, body }, { service, resolvePrincipal: production });
    expect(refused.status).toBe(403);
    const granted = await handleRelicsHttp({ method: 'POST', headers: { authorization: `Bearer ${developmentIdentityToken(uid)}` }, body }, { service, resolvePrincipal: development });
    expect(granted).toMatchObject({ status: 200, body: { outcome: 'granted' } });
    const invalid = await handleRelicsHttp({ method: 'POST', headers: { authorization: `Bearer ${developmentIdentityToken(uid)}` }, body: { ...body, outcome: 'VICTORY' } }, { service, resolvePrincipal: development });
    expect(invalid.status).toBe(400);
  });
});
