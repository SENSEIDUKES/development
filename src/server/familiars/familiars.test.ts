import { describe, expect, it } from 'vitest';
import { dailyStoreRotation } from '@seihouse/library/celestial-store';
import {
  activeFamiliarForm,
  activeNameEffect,
  bondRankLabel,
  FAMILIAR_ELEMENT_LABELS,
  FAMILIAR_ELEMENTS,
  familiarFormFilter,
  familiarRarityLabel,
  familiarTraining,
} from '@seihouse/library/familiar';
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
import { FAMILIAR_SIGNATURES, validateSignatures, type FamiliarSignatureDefinition } from './signatures';
import { bondTitleEffect, FAMILIAR_BOND_LADDER, FamiliarBondLadderError, masteryEffect, validateBondLadder, type FamiliarBondRankDefinition } from './training';

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

describe('Familiar bonds', () => {
  it('supports the complete twelve-element Familiar contract', () => {
    expect(FAMILIAR_ELEMENTS).toEqual([
      'fire', 'lightning', 'frost', 'water', 'wind', 'earth',
      'nature', 'poison', 'metal', 'space', 'celestial', 'void',
    ]);
    expect(FAMILIAR_ELEMENTS.map(element => FAMILIAR_ELEMENT_LABELS[element])).toEqual([
      'Fire', 'Lightning', 'Frost', 'Water', 'Wind', 'Earth',
      'Nature', 'Poison', 'Metal', 'Space', 'Celestial', 'Void',
    ]);
    expect(validateBondLadder()).toBe(FAMILIAR_BOND_LADDER);
  });

  it('cultivates an owned Familiar through Common, Rare and Epic bond, each lending a stronger elemental title', async () => {
    const { service, qi, fund } = setup();
    const start = (await service.getSnapshot(principal)).familiars.find(view => view.familiarId === quill)!;
    expect(start).toMatchObject({ bondRank: 'common', bondEffect: { element: 'lightning', intensity: 'subtle', mastered: false } });
    await fund(5_000);
    const rare = await service.offerQi(principal, { familiarId: quill, amount: 1_000, idempotencyKey: 'offer-1' });
    expect(rare).toMatchObject({ outcome: 'trained', spent: 1_000, bondRankBefore: 'common', bondRankAfter: 'rare', mastered: null });
    expect(rare.message).toBe('Quill reached Rare bond: Lightning Title · Blaze.');
    const epic = await service.offerQi(principal, { familiarId: quill, amount: 3_000, idempotencyKey: 'offer-2' });
    expect(epic.bondRankAfter).toBe('epic');
    expect(epic.newUnlocks.map(unlock => unlock.kind)).toEqual(['bond-effect', 'form']);
    expect(familiarTraining(epic.snapshot, quill)?.bondEffect).toMatchObject({ intensity: 'legendary', mastered: false });
    expect((await qi.getAccount(principal.uid))?.balance).toBe(1_000);
    expect((await qi.listTransactions(principal.uid, 5)).filter(line => line.kind === 'spend').map(line => line.source)).toEqual(['familiar-training', 'familiar-training']);

    const replay = await service.offerQi(principal, { familiarId: quill, amount: 3_000, idempotencyKey: 'offer-2' });
    expect(replay).toMatchObject({ outcome: 'replayed', spent: 3_000, bondRankBefore: 'rare', bondRankAfter: 'epic' });
    expect((await qi.getAccount(principal.uid))?.balance).toBe(1_000);
    await expect(service.offerQi(principal, { familiarId: quill, amount: 999, idempotencyKey: 'offer-2' })).rejects.toBeInstanceOf(FamiliarConflictError);
  });

  it('masters the element at Legendary bond, once and permanently, spending only what the bond needs', async () => {
    const { service, qi, fund } = setup();
    await fund(40_000);
    const legendary = await service.offerQi(principal, { familiarId: quill, amount: 15_000, idempotencyKey: 'big' });
    expect(legendary).toMatchObject({ spent: 10_000, bondRankAfter: 'legendary', mastered: { element: 'lightning', masteredWith: quill, effect: { id: 'elemental-title:lightning:mastered', mastered: true } } });
    expect(legendary.message).toContain('You mastered Lightning');
    expect(legendary.snapshot.masteredElements.map(mastery => mastery.element)).toEqual(['lightning']);
    const done = await service.offerQi(principal, { familiarId: quill, amount: 500, idempotencyKey: 'more' });
    expect(done).toMatchObject({ outcome: 'fully-bonded', spent: 0 });

    // A second lightning Familiar reaching Legendary bond does not master Lightning again.
    await service.grantFamiliarDevelopment(principal, 'little-monkey-king');
    const second = await service.offerQi(principal, { familiarId: 'little-monkey-king', amount: 10_000, idempotencyKey: 'monkey' });
    expect(second).toMatchObject({ bondRankAfter: 'legendary', mastered: null });
    expect(second.message).toContain('You had already mastered Lightning');
    expect(second.snapshot.masteredElements).toEqual([expect.objectContaining({ element: 'lightning', masteredWith: quill })]);
    expect((await qi.getAccount(principal.uid))?.balance).toBe(20_000);
  });

  it('keeps Familiar rarity and Bond Rank separate: an Epic familiar reaches Legendary bond', async () => {
    const { service, fund } = setup();
    const phoenix = allFamiliarOptions.find(option => option.id === 'phoenix')!;
    expect(phoenix.rarity).toBe('epic');
    await service.grantFamiliarDevelopment(principal, phoenix.id);
    await fund(10_000);
    const offer = await service.offerQi(principal, { familiarId: phoenix.id, amount: 10_000, idempotencyKey: 'phoenix' });
    expect(familiarTraining(offer.snapshot, phoenix.id)?.bondRank).toBe('legendary');
    expect(allFamiliarOptions.find(option => option.id === 'phoenix')?.rarity).toBe('epic');
    expect(`${familiarRarityLabel(phoenix.rarity)} · ${bondRankLabel('legendary')}`).toBe('Epic familiar · Legendary bond');
  });

  it('refuses to cultivate a Familiar the cultivator does not own, or without enough QI', async () => {
    const { service, fund } = setup();
    await expect(service.offerQi(principal, { familiarId: 'phoenix', amount: 100, idempotencyKey: 'x' })).rejects.toBeInstanceOf(FamiliarConflictError);
    await fund(50);
    await expect(service.offerQi(principal, { familiarId: quill, amount: 100, idempotencyKey: 'y' })).rejects.toBeInstanceOf(QiInsufficientError);
    expect((await service.getSnapshot(principal)).familiars.find(view => view.familiarId === quill)?.qiOffered).toBe(0);
  });

  it('couples the name effect to the Active Familiar until an element is mastered, then lets them separate', async () => {
    const { service, fund } = setup();
    await service.grantFamiliarDevelopment(principal, 'phoenix');
    let snapshot = await service.getSnapshot(principal);
    expect(snapshot.activeEffect).toEqual({ source: 'bond' });
    expect(activeNameEffect(snapshot, quill)).toMatchObject({ source: 'bond', coupled: true, effect: { element: 'lightning', intensity: 'subtle' } });
    expect(activeNameEffect(snapshot, 'phoenix')).toMatchObject({ coupled: true, effect: { element: 'fire' } });
    expect(activeNameEffect(snapshot, 'galaxy-octopus')).toBeNull();
    await expect(service.selectElementalEffect(principal, { source: 'mastered', element: 'lightning' })).rejects.toBeInstanceOf(FamiliarConflictError);
    snapshot = await service.selectElementalEffect(principal, { source: 'none' });
    expect(activeNameEffect(snapshot, quill)).toBeNull();

    await fund(10_000);
    await service.offerQi(principal, { familiarId: quill, amount: 10_000, idempotencyKey: 'master' });
    snapshot = await service.selectElementalEffect(principal, { source: 'mastered', element: 'lightning' });
    for (const active of [quill, 'phoenix', null]) {
      expect(activeNameEffect(snapshot, active)).toMatchObject({ source: 'mastered', coupled: false, effect: { id: 'elemental-title:lightning:mastered' } });
    }
    await expect(service.selectElementalEffect(principal, { source: 'mastered', element: 'fire' })).rejects.toBeInstanceOf(FamiliarConflictError);
    await expect(service.selectElementalEffect(principal, { source: 'boosted' } as never)).rejects.toThrow('Choose the Active Familiar');
  });

  it('lets a companion wear only the forms its bond has unlocked', async () => {
    const { service, fund } = setup();
    await expect(service.selectForm(principal, { familiarId: quill, formId: 'radiant' })).rejects.toBeInstanceOf(FamiliarConflictError);
    await fund(4_000);
    await service.offerQi(principal, { familiarId: quill, amount: 4_000, idempotencyKey: 'epic' });
    const snapshot = await service.selectForm(principal, { familiarId: quill, formId: 'radiant' });
    expect(familiarFormFilter(activeFamiliarForm(snapshot, quill))).toContain('drop-shadow');
    expect(activeFamiliarForm(snapshot, 'phoenix')).toBeNull();
  });

  it('refuses a ladder that would unlock anything beyond cosmetics, or master an element before Legendary bond', () => {
    const boosted: FamiliarBondRankDefinition[] = FAMILIAR_BOND_LADDER.map(rank => rank.rank !== 'rare' ? rank : {
      ...rank, unlocks: element => [{ kind: 'bond-effect', effect: { ...bondTitleEffect(element, 'active'), qiMultiplier: 1.2 } as never }],
    });
    expect(() => validateBondLadder(boosted)).toThrow(FamiliarBondLadderError);
    const early: FamiliarBondRankDefinition[] = FAMILIAR_BOND_LADDER.map(rank => rank.rank !== 'epic' ? rank : {
      ...rank, unlocks: element => [...rank.unlocks(element), { kind: 'mastery', element, effect: masteryEffect(element) }],
    });
    expect(() => validateBondLadder(early)).toThrow('Only Legendary bond masters the element');
    const reordered = [FAMILIAR_BOND_LADDER[1], FAMILIAR_BOND_LADDER[0], ...FAMILIAR_BOND_LADDER.slice(2)];
    expect(() => validateBondLadder(reordered)).toThrow('Common, Rare, Epic and Legendary');
    for (const rank of FAMILIAR_BOND_LADDER) {
      for (const unlock of rank.unlocks('fire')) {
        const payload = JSON.stringify(unlock).toLowerCase();
        for (const word of ['multiplier', 'discount', 'boost', 'bonus', 'odds', 'chance']) expect(payload).not.toContain(word);
      }
    }
  });
});

describe('Familiar signatures', () => {
  const signature: FamiliarSignatureDefinition = { id: 'signature:phoenix', familiarId: 'phoenix', label: 'Phoenix Rebirth', requiredBondRank: 'epic' };

  it('ties a signature to its one Familiar: unlocked by that bond, worn only while it is active, never collected', async () => {
    const qi = new InMemoryQiLedger();
    const energy = new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig({}, 'development'));
    const service = new FamiliarService({ repository: new InMemoryFamiliarRepository(), qi, energy, signatures: [signature], now: () => NOW });
    await service.grantFamiliarDevelopment(principal, 'phoenix');
    let snapshot = await service.selectElementalEffect(principal, { source: 'signature' });
    expect(familiarTraining(snapshot, 'phoenix')?.signature).toMatchObject({ requiredBondRank: 'epic', unlocked: false });
    // Locked: the coupled choice falls back to the Familiar's bond effect.
    expect(activeNameEffect(snapshot, 'phoenix')).toMatchObject({ source: 'bond', effect: { element: 'fire' } });

    await qi.deposit({ uid: principal.uid, amount: 10_000, idempotencyKey: 'fund', source: 'development-grant', description: 'Grant' });
    const epic = await service.offerQi(principal, { familiarId: 'phoenix', amount: 4_000, idempotencyKey: 'epic' });
    expect(epic.newUnlocks).toContainEqual({ kind: 'signature', effect: { id: 'signature:phoenix', kind: 'signature', label: 'Phoenix Rebirth', familiarId: 'phoenix' } });
    snapshot = epic.snapshot;
    expect(activeNameEffect(snapshot, 'phoenix')).toMatchObject({ source: 'signature', coupled: true, effect: { kind: 'signature', id: 'signature:phoenix' } });
    // Another Familiar has no signature, so the same choice shows its bond effect instead.
    expect(activeNameEffect(snapshot, quill)).toMatchObject({ source: 'bond', effect: { element: 'lightning' } });

    const legendary = await service.offerQi(principal, { familiarId: 'phoenix', amount: 6_000, idempotencyKey: 'legendary' });
    expect(legendary.snapshot.masteredElements.map(mastery => mastery.effect.kind)).toEqual(['elemental-title']);
  });

  it('refuses a signature that carries settings, names an unknown Familiar, or doubles up', () => {
    expect(() => validateSignatures([{ ...signature, element: 'fire', intensity: 'legendary' } as never], allFamiliarOptions)).toThrow('its look is code');
    expect(() => validateSignatures([{ ...signature, id: 'signature:nobody', familiarId: 'nobody' }], allFamiliarOptions)).toThrow('not in the catalogue');
    expect(() => validateSignatures([signature, { ...signature }], allFamiliarOptions)).toThrow('one signature per Familiar');
    expect(validateSignatures(FAMILIAR_SIGNATURES, allFamiliarOptions)).toEqual([]);
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

  it('chooses the Active Elemental Effect and refuses an element not yet mastered', async () => {
    const { service } = setup();
    const development = createPrincipalResolver({ mode: 'development' });
    const headers = { authorization: `Bearer ${developmentIdentityToken(principal.uid)}` };
    const early = await handleFamiliarsHttp({ method: 'POST', headers, body: { operation: 'select-elemental-effect', selection: { source: 'mastered', element: 'void' } } }, { service, resolvePrincipal: development });
    expect(early).toMatchObject({ status: 409, body: { code: 'conflict' } });
    const none = await handleFamiliarsHttp({ method: 'POST', headers, body: { operation: 'select-elemental-effect', selection: { source: 'none' } } }, { service, resolvePrincipal: development });
    expect(none).toMatchObject({ status: 200, body: { activeEffect: { source: 'none' } } });
    const form = await handleFamiliarsHttp({ method: 'POST', headers, body: { operation: 'select-form', familiarId: quill, formId: null } }, { service, resolvePrincipal: development });
    expect(form.status).toBe(200);
  });
});
