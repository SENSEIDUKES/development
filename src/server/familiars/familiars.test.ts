import { describe, expect, it } from 'vitest';
import { dailyStoreRotation } from '@seihouse/library/celestial-store';
import { activeFamiliarEffect, activeFamiliarForm, familiarFormFilter } from '@seihouse/library/familiar';
import { allFamiliarOptions, defaultFamiliar } from '../../host/familiar/catalogue';
import { resolveEnergyConfig } from '../energy/config';
import { InMemoryEnergyRepository } from '../energy/inMemoryEnergyRepository';
import { EnergyService } from '../energy/service';
import { createPrincipalResolver, developmentIdentityToken } from '../identity/authentication';
import type { LibraryPrincipal } from '../identity/types';
import { InMemoryQiLedger } from '../qi/inMemoryQiLedger';
import { QiInsufficientError } from '../qi/qiLedger';
import { handleFamiliarsHttp } from './http';
import { InMemoryFamiliarRepository } from './inMemoryFamiliarRepository';
import { FamiliarConflictError } from './repository';
import { FamiliarService } from './service';
import { FAMILIAR_TRAINING_LADDER, FamiliarTrainingLadderError, validateTrainingLadder, type FamiliarTrainingTier } from './training';

const principal: LibraryPrincipal = { uid: 'tamer-1', role: 'user', identity: 'development', developmentAccess: true };
const quill = defaultFamiliar.definition.id;
const NOW = new Date(2026, 8, 23, 12, 0, 0);

function setup() {
  const qi = new InMemoryQiLedger();
  const energy = new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig({}, 'development'));
  const service = new FamiliarService({ repository: new InMemoryFamiliarRepository(), qi, energy, now: () => NOW });
  const fund = (amount: number, key = `grant-${amount}`) => qi.deposit({ uid: principal.uid, amount, idempotencyKey: key, source: 'development-grant', description: 'Grant' });
  return { service, qi, energy, fund };
}

describe('Familiar training', () => {
  it('trains an owned Familiar with QI, unlocking its elemental title and form tier by tier', async () => {
    const { service, qi, fund } = setup();
    await fund(5_000);
    const first = await service.offerQi(principal, { familiarId: quill, amount: 1_000, idempotencyKey: 'offer-1' });
    expect(first).toMatchObject({ outcome: 'trained', spent: 1_000, tierBefore: 1, tierAfter: 2 });
    expect(first.newUnlocks).toEqual([{ kind: 'effect', effect: expect.objectContaining({ kind: 'elemental-title', element: 'lightning', intensity: 'subtle' }) }]);
    const second = await service.offerQi(principal, { familiarId: quill, amount: 3_000, idempotencyKey: 'offer-2' });
    expect(second.tierAfter).toBe(3);
    expect(second.newUnlocks.map(unlock => unlock.kind)).toEqual(['form', 'effect']);
    expect((await qi.getAccount(principal.uid))?.balance).toBe(1_000);
    expect((await qi.listTransactions(principal.uid, 5)).filter(line => line.kind === 'spend').map(line => line.source)).toEqual(['familiar-training', 'familiar-training']);

    const replay = await service.offerQi(principal, { familiarId: quill, amount: 3_000, idempotencyKey: 'offer-2' });
    expect(replay).toMatchObject({ outcome: 'replayed', spent: 3_000, tierBefore: 2, tierAfter: 3 });
    expect((await qi.getAccount(principal.uid))?.balance).toBe(1_000);
    await expect(service.offerQi(principal, { familiarId: quill, amount: 999, idempotencyKey: 'offer-2' })).rejects.toBeInstanceOf(FamiliarConflictError);
  });

  it('spends only what the remaining tiers need and stops at the top tier', async () => {
    const { service, qi, fund } = setup();
    await fund(20_000);
    const offer = await service.offerQi(principal, { familiarId: quill, amount: 15_000, idempotencyKey: 'big' });
    expect(offer).toMatchObject({ spent: 10_000, tierAfter: 4 });
    const done = await service.offerQi(principal, { familiarId: quill, amount: 500, idempotencyKey: 'more' });
    expect(done).toMatchObject({ outcome: 'fully-trained', spent: 0 });
    expect((await qi.getAccount(principal.uid))?.balance).toBe(10_000);
  });

  it('refuses to train a Familiar the cultivator does not own, or without enough QI', async () => {
    const { service, fund } = setup();
    await expect(service.offerQi(principal, { familiarId: 'phoenix', amount: 100, idempotencyKey: 'x' })).rejects.toBeInstanceOf(FamiliarConflictError);
    await fund(50);
    await expect(service.offerQi(principal, { familiarId: quill, amount: 100, idempotencyKey: 'y' })).rejects.toBeInstanceOf(QiInsufficientError);
    expect((await service.getSnapshot(principal)).familiars.find(view => view.familiarId === quill)?.qiOffered).toBe(0);
  });

  it('makes the equipped Familiar’s selected, unlocked effect the one active cosmetic effect', async () => {
    const { service, fund } = setup();
    await fund(4_000);
    await service.offerQi(principal, { familiarId: quill, amount: 4_000, idempotencyKey: 'train' });
    await expect(service.selectCosmetics(principal, { familiarId: quill, formId: null, effectId: 'elemental-title:lightning:legendary' })).rejects.toBeInstanceOf(FamiliarConflictError);
    const snapshot = await service.selectCosmetics(principal, { familiarId: quill, formId: 'radiant', effectId: 'elemental-title:lightning:active' });
    expect(activeFamiliarEffect(snapshot, quill)).toMatchObject({ element: 'lightning', intensity: 'active' });
    expect(activeFamiliarEffect(snapshot, 'phoenix')).toBeNull();
    expect(familiarFormFilter(activeFamiliarForm(snapshot, quill))).toContain('drop-shadow');
  });

  it('refuses a ladder that would unlock anything beyond a cosmetic effect or form', () => {
    const boosted: FamiliarTrainingTier[] = [
      ...FAMILIAR_TRAINING_LADDER.slice(0, 1),
      { tier: 2, name: 'Greedy', qiRequired: 100, unlocks: element => [{ kind: 'effect', effect: { id: 'x', kind: 'elemental-title', label: 'x', element, intensity: 'subtle', qiMultiplier: 1.2 } as never }] },
    ];
    expect(() => validateTrainingLadder(boosted)).toThrow(FamiliarTrainingLadderError);
    for (const tier of FAMILIAR_TRAINING_LADDER) {
      for (const unlock of tier.unlocks('fire')) {
        const payload = JSON.stringify(unlock).toLowerCase();
        for (const word of ['multiplier', 'discount', 'boost', 'bonus', 'odds', 'chance']) expect(payload).not.toContain(word);
      }
    }
  });
});

describe('Celestial Store purchases through the Familiar account', () => {
  const today = dailyStoreRotation(allFamiliarOptions, NOW);

  it('buys today’s QI offer at the server price and grants ownership once', async () => {
    const { service, qi, fund } = setup();
    const offer = today.qi[0];
    const price = offer.salePrice ?? offer.price;
    await fund(price);
    const bought = await service.purchase(principal, { familiarId: offer.familiarId, currency: 'qi', price, idempotencyKey: 'buy-1' });
    expect(bought.outcome).toBe('purchased');
    expect(bought.snapshot.ownedFamiliarIds).toContain(offer.familiarId);
    expect((await qi.getAccount(principal.uid))?.balance).toBe(0);
    const replay = await service.purchase(principal, { familiarId: offer.familiarId, currency: 'qi', price, idempotencyKey: 'buy-1' });
    expect(replay.outcome).toBe('purchased');
    const again = await service.purchase(principal, { familiarId: offer.familiarId, currency: 'qi', price, idempotencyKey: 'buy-2' });
    expect(again.outcome).toBe('already-owned');
    expect((await qi.listTransactions(principal.uid, 5)).filter(line => line.kind === 'spend')).toHaveLength(1);
  });

  it('buys today’s Energy offer from settled Energy', async () => {
    const { service, energy } = setup();
    const offer = today.energy[0];
    const price = offer.salePrice ?? offer.price;
    const before = (await energy.getBalance(principal)).balance;
    const bought = await service.purchase(principal, { familiarId: offer.familiarId, currency: 'energy', price, idempotencyKey: 'buy-e' });
    expect(bought.outcome).toBe('purchased');
    expect((await energy.getBalance(principal)).balance).toBe(before - price);
  });

  it('refuses a stale price, an off-rotation offer, and charges nothing', async () => {
    const { service, qi, fund } = setup();
    await fund(50_000);
    const offer = today.qi[0];
    await expect(service.purchase(principal, { familiarId: offer.familiarId, currency: 'qi', price: (offer.salePrice ?? offer.price) + 1, idempotencyKey: 'stale' })).rejects.toBeInstanceOf(FamiliarConflictError);
    const offRotation = allFamiliarOptions.find(option => !option.isDefault && !today.qi.some(entry => entry.familiarId === option.id))!;
    await expect(service.purchase(principal, { familiarId: offRotation.id, currency: 'qi', price: 500, idempotencyKey: 'off' })).rejects.toBeInstanceOf(FamiliarConflictError);
    expect((await qi.getAccount(principal.uid))?.balance).toBe(50_000);
  });

  it('refuses a purchase key already used for a different Familiar and charges nothing more', async () => {
    const { service, qi, fund } = setup();
    const [first, second] = today.qi;
    const firstPrice = first.salePrice ?? first.price;
    const secondPrice = second.salePrice ?? second.price;
    await fund(firstPrice + secondPrice);
    await service.purchase(principal, { familiarId: first.familiarId, currency: 'qi', price: firstPrice, idempotencyKey: 'reused' });
    await expect(service.purchase(principal, { familiarId: second.familiarId, currency: 'qi', price: secondPrice, idempotencyKey: 'reused' }))
      .rejects.toThrow('That purchase key was already used for a different Familiar.');
    const snapshot = await service.getSnapshot(principal);
    expect(snapshot.ownedFamiliarIds).toContain(first.familiarId);
    expect(snapshot.ownedFamiliarIds).not.toContain(second.familiarId);
    expect((await qi.getAccount(principal.uid))?.balance).toBe(secondPrice);
    // Each Familiar has its own ledger key, so one purchase's payment can never be replayed for another.
    expect((await qi.listTransactions(principal.uid, 5)).find(line => line.kind === 'spend')?.idempotencyKey).toBe(`celestial-store:reused:${first.familiarId}`);
  });

  it('serializes concurrent purchases so one Familiar is paid for once', async () => {
    const { service, qi, fund } = setup();
    const offer = today.qi[0];
    const price = offer.salePrice ?? offer.price;
    await fund(price * 2);
    const results = await Promise.all([
      service.purchase(principal, { familiarId: offer.familiarId, currency: 'qi', price, idempotencyKey: 'tap-1' }),
      service.purchase(principal, { familiarId: offer.familiarId, currency: 'qi', price, idempotencyKey: 'tap-2' }),
    ]);
    expect(results.map(result => result.outcome).sort()).toEqual(['already-owned', 'purchased']);
    expect((await qi.getAccount(principal.uid))?.balance).toBe(price);
  });
});

describe('Familiar HTTP boundary', () => {
  it('reports insufficient QI as a conflict the Store can show, and keeps development grants development-only', async () => {
    const { service } = setup();
    const development = createPrincipalResolver({ mode: 'development' });
    const headers = { authorization: `Bearer ${developmentIdentityToken(principal.uid)}` };
    const poor = await handleFamiliarsHttp({ method: 'POST', headers, body: { operation: 'offer-qi', familiarId: quill, amount: 10, idempotencyKey: 'k' } }, { service, resolvePrincipal: development });
    expect(poor).toMatchObject({ status: 409, body: { code: 'insufficient' } });
    const production = createPrincipalResolver({ mode: 'production', verifyIdToken: async () => ({ uid: principal.uid }) });
    const refused = await handleFamiliarsHttp({ method: 'POST', headers: { authorization: 'Bearer real' }, body: { operation: 'development.grant-familiar', familiarId: 'phoenix' } }, { service, resolvePrincipal: production });
    expect(refused.status).toBe(403);
    const granted = await handleFamiliarsHttp({ method: 'POST', headers, body: { operation: 'development.grant-familiar', familiarId: 'phoenix' } }, { service, resolvePrincipal: development });
    expect(granted).toMatchObject({ status: 200, body: { ownedFamiliarIds: expect.arrayContaining(['phoenix', quill]) } });
  });
});
