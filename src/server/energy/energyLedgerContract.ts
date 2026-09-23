import { describe, expect, it } from 'vitest';
import { ENERGY_PRICE_CATALOG, EnergyPriceQuoteRequiredError, resolveEnergyPrice, type EnergyActionId } from '@seihouse/library/energy';
import type { ResolvedEnergyConfig } from './config';
import { EnergyConflictError, EnergyValidationError, InsufficientEnergyError, type EnergyRepository } from './repository';
import { EnergyAuthorizationError, EnergyService } from './service';
import type { LibraryPrincipal } from '../identity/types';
import type { EnergyTransaction } from './types';

export const testConfig: ResolvedEnergyConfig = {
  identityMode: 'development',
  developmentInitialGrant: 500,
  developmentDefaultGrant: 100,
  developmentMaxGrant: 10_000,
};

export const developer = (uid = 'dev-user'): LibraryPrincipal => ({
  uid, role: 'user', identity: 'development', developmentAccess: true,
});

export const productionUser = (uid = 'prod-user'): LibraryPrincipal => ({
  uid, role: 'user', identity: 'verified', developmentAccess: false,
});

/** Replays the ledger from oldest to newest and returns the balance it implies. */
export const replayLedger = (transactions: EnergyTransaction[]) => {
  let balance = 0;
  let held = 0;
  for (const transaction of [...transactions].reverse()) {
    if (transaction.kind === 'grant') balance += transaction.amount;
    if (transaction.kind === 'reserve') held += transaction.amount;
    if (transaction.kind === 'charge') { balance -= transaction.amount; held -= transaction.amount; }
    if (transaction.kind === 'release') held -= transaction.amount;
    if (transaction.kind === 'spend') balance -= transaction.amount;
    expect({ balance, held }).toEqual({ balance: transaction.balanceAfter, held: transaction.heldAfter });
  }
  return { balance, held };
};

/**
 * Rewrites one catalog price for the duration of `body`, the way an
 * scheduled reprice or an action being taken off the price list would, then
 * restores it. The current price schedule can change over time, so the ledger has to
 * survive this happening between a reservation and its settlement.
 */
export const withCatalogPrice = async <T>(
  actionId: EnergyActionId,
  price: number | null,
  body: () => Promise<T>,
): Promise<T> => {
  const entry = ENERGY_PRICE_CATALOG.find(candidate => candidate.actionId === actionId) as { price: number | null };
  const original = entry.price;
  entry.price = price;
  try {
    return await body();
  } finally {
    entry.price = original;
  }
};

/**
 * The behaviour every ledger adapter must satisfy. Run once against the
 * in-memory adapter and once against the Postgres migration so both agree.
 */
export function describeEnergyLedgerContract(
  name: string,
  createRepository: () => Promise<EnergyRepository> | EnergyRepository,
) {
  describe(`Energy ledger (${name})`, () => {
    const setup = async (principal = developer()) => {
      const repository = await createRepository();
      const service = new EnergyService(repository, testConfig);
      return { repository, service, principal };
    };

    it('grants a development user the configured initial Energy exactly once', async () => {
      const { service, principal } = await setup();
      await service.getSnapshot(principal);
      await service.getSnapshot(principal);
      const snapshot = await service.getSnapshot(principal);
      expect(snapshot.balance).toBe(500);
      expect(snapshot.available).toBe(500);
      expect(snapshot.activity.filter(entry => entry.kind === 'grant')).toHaveLength(1);
      expect(snapshot.activity[0].description).toBe('Development starting Energy');
    });

    it('starts a production user at zero with no development controls', async () => {
      const { service } = await setup();
      const snapshot = await service.getSnapshot(productionUser());
      expect(snapshot).toMatchObject({ balance: 0, held: 0, available: 0, developmentControls: null, activity: [] });
    });

    it('refuses development grant and reset for principals without development access', async () => {
      const { service } = await setup();
      await expect(service.grantDevelopment(productionUser(), { idempotencyKey: 'click-1' })).rejects.toBeInstanceOf(EnergyAuthorizationError);
      await expect(service.resetDevelopment(productionUser())).rejects.toBeInstanceOf(EnergyAuthorizationError);
      expect((await service.getBalance(productionUser())).balance).toBe(0);
    });

    it('applies authorized development grants once per idempotency key and reads back database state', async () => {
      const { repository, service, principal } = await setup();
      await service.grantDevelopment(principal, { amount: 40, idempotencyKey: 'click-1' });
      const replay = await service.grantDevelopment(principal, { amount: 40, idempotencyKey: 'click-1' });
      expect(replay.replayed).toBe(true);
      const stored = await repository.getAccount(principal.uid);
      expect(stored?.balance).toBe(540);
      expect((await service.getBalance(principal)).balance).toBe(540);
      expect(snapshotControls(await service.getSnapshot(principal))).toEqual({ initialGrant: 500, defaultGrant: 100, maxGrant: 10_000 });
    });

    it('caps a development grant and rejects non-positive amounts', async () => {
      const { service, principal } = await setup();
      await expect(service.grantDevelopment(principal, { amount: 10_001, idempotencyKey: 'big' })).rejects.toBeInstanceOf(EnergyValidationError);
      await expect(service.grantDevelopment(principal, { amount: 0, idempotencyKey: 'zero' })).rejects.toBeInstanceOf(EnergyValidationError);
      await expect(service.grantDevelopment(principal, { amount: 1.5, idempotencyKey: 'frac' })).rejects.toBeInstanceOf(EnergyValidationError);
    });

    it('prices reservations from the shared catalog', async () => {
      const { service, principal } = await setup();
      expect(service.getPrice('chapter.generate')).toEqual(resolveEnergyPrice('chapter.generate'));
      expect(ENERGY_PRICE_CATALOG.find(entry => entry.actionId === 'image.generate')?.price).toBe(3);
      const image = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      expect(image.reservation.amount).toBe(3);
      const chapters = await service.reserve(principal, { actionId: 'chapter.generate', idempotencyKey: 'ch-1', quantity: 5 });
      expect(chapters.reservation.amount).toBe(5);
      expect(await service.getBalance(principal)).toEqual({ balance: 500, held: 8, available: 492 });
      await expect(service.reserve(principal, { actionId: 'narration.generate', idempotencyKey: 'nar-1' })).rejects.toThrow(/no price yet/);
    });

    it('requires a trusted whole-number quote for the projected video price range', async () => {
      const { service, principal } = await setup();
      expect(() => service.getPrice('video.generate')).toThrow(EnergyPriceQuoteRequiredError);
      expect(() => service.getPrice('video.generate', 29)).toThrow(EnergyPriceQuoteRequiredError);
      expect(() => service.getPrice('video.generate', 51)).toThrow(EnergyPriceQuoteRequiredError);
      expect(service.getPrice('video.generate', 42)).toMatchObject({
        actionId: 'video.generate', price: 42, maximumPrice: 50, projected: true,
      });

      const { reservation } = await service.reserve(principal, {
        actionId: 'video.generate',
        quotedPrice: 47,
        idempotencyKey: 'video-47',
      });
      expect(reservation.amount).toBe(47);
      expect(reservation.metadata).toMatchObject({ pricing: { unitPrice: 47, quantity: 1 } });
      expect(await service.getBalance(principal)).toEqual({ balance: 500, held: 47, available: 453 });
    });

    it('never lets reservations exceed the available balance', async () => {
      const { service, principal } = await setup();
      await service.reserve(principal, { actionId: 'chapter.generate', idempotencyKey: 'a', quantity: 498 });
      await expect(service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'b' })).rejects.toBeInstanceOf(InsufficientEnergyError);
      await expect(service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'b' })).rejects.toMatchObject({ required: 3, available: 2 });
      expect(await service.getBalance(principal)).toEqual({ balance: 500, held: 498, available: 2 });
      expect((await service.listTransactions(principal)).filter(entry => entry.kind === 'reserve')).toHaveLength(1);
    });

    it('returns held Energy when a reservation is released, idempotently', async () => {
      const { service, principal } = await setup();
      const { reservation } = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      expect((await service.getBalance(principal)).available).toBe(497);
      const released = await service.release(principal, { reservationId: reservation.id, reason: 'provider timeout' });
      expect(released.replayed).toBe(false);
      expect(released.reservation.status).toBe('released');
      expect(released.transaction.metadata).toEqual({ reason: 'provider timeout' });
      expect(await service.getBalance(principal)).toEqual({ balance: 500, held: 0, available: 500 });
      const again = await service.release(principal, { reservationId: reservation.id });
      expect(again.replayed).toBe(true);
      expect((await service.listTransactions(principal)).filter(entry => entry.kind === 'release')).toHaveLength(1);
      await expect(service.settle(principal, { reservationId: reservation.id })).rejects.toThrow(/already released/);
    });

    it('settles a reservation as exactly one charge and records provider cost privately', async () => {
      const { service, principal } = await setup();
      const { reservation } = await service.reserve(principal, { actionId: 'chapter.generate', idempotencyKey: 'ch-1' });
      const settled = await service.settle(principal, {
        reservationId: reservation.id,
        providerCost: { amount: 0.0042, currency: 'USD', provider: 'gemini' },
      });
      expect(settled.replayed).toBe(false);
      expect(settled.transaction.kind).toBe('charge');
      expect(settled.transaction.metadata).toEqual({ providerCost: { amount: 0.0042, currency: 'USD', provider: 'gemini' } });
      expect(await service.getBalance(principal)).toEqual({ balance: 499, held: 0, available: 499 });
      const snapshot = await service.getSnapshot(principal);
      expect(snapshot.activity[0]).toMatchObject({ kind: 'charge', amount: 1, description: 'Chapter generated' });
      expect(JSON.stringify(snapshot)).not.toContain('providerCost');
      await expect(service.release(principal, { reservationId: reservation.id })).rejects.toThrow(/already charged/);
    });

    it('does not double-charge when settlement repeats for the same reservation', async () => {
      const { service, principal } = await setup();
      const { reservation } = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      await service.settle(principal, { reservationId: reservation.id });
      const replay = await service.settle(principal, { reservationId: reservation.id });
      expect(replay.replayed).toBe(true);
      expect((await service.getBalance(principal)).balance).toBe(497);
      expect((await service.listTransactions(principal)).filter(entry => entry.kind === 'charge')).toHaveLength(1);
    });

    it('does not double-reserve when the same idempotency key is retried', async () => {
      const { service, principal } = await setup();
      const first = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      const retry = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      expect(retry.replayed).toBe(true);
      expect(retry.reservation.id).toBe(first.reservation.id);
      expect(await service.getBalance(principal)).toEqual({ balance: 500, held: 3, available: 497 });
      expect(await service.findReservation(principal, 'img-1')).toMatchObject({ id: first.reservation.id, status: 'held' });
      const regeneration = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-2' });
      expect(regeneration.reservation.id).not.toBe(first.reservation.id);
      expect((await service.getBalance(principal)).held).toBe(6);
    });

    it('spends settled Energy directly for a Store purchase, once per key', async () => {
      const { service, principal } = await setup();
      const first = await service.spend(principal, { amount: 300, idempotencyKey: 'store:phoenix', description: 'Phoenix · Celestial Store', metadata: { source: 'celestial-store' } });
      expect(first.replayed).toBe(false);
      expect(first.transaction).toMatchObject({ kind: 'spend', amount: 300, actionId: null, reservationId: null });
      const replay = await service.spend(principal, { amount: 300, idempotencyKey: 'store:phoenix', description: 'Phoenix · Celestial Store' });
      expect(replay.replayed).toBe(true);
      expect(replay.transaction.id).toBe(first.transaction.id);
      expect(await service.getBalance(principal)).toEqual({ balance: 200, held: 0, available: 200 });
      expect((await service.getSnapshot(principal)).activity[0]).toMatchObject({ kind: 'spend', amount: 300 });
    });

    it('never spends held Energy or reuses a key for a different spend', async () => {
      const { service, principal } = await setup();
      await service.reserve(principal, { actionId: 'chapter.generate', idempotencyKey: 'hold', quantity: 400 });
      await expect(service.spend(principal, { amount: 101, idempotencyKey: 'store:fox', description: 'Fox' })).rejects.toMatchObject({ required: 101, available: 100 });
      await expect(service.spend(principal, { amount: 101, idempotencyKey: 'store:fox', description: 'Fox' })).rejects.toBeInstanceOf(InsufficientEnergyError);
      await service.spend(principal, { amount: 100, idempotencyKey: 'store:fox', description: 'Fox' });
      await expect(service.spend(principal, { amount: 90, idempotencyKey: 'store:fox', description: 'Fox' })).rejects.toBeInstanceOf(EnergyConflictError);
      await expect(service.spend(principal, { amount: 0, idempotencyKey: 'zero', description: 'Nothing' })).rejects.toBeInstanceOf(EnergyValidationError);
      expect(await service.getBalance(principal)).toEqual({ balance: 400, held: 400, available: 0 });
    });

    it('keeps the transaction history consistent with the stored balance', async () => {
      const { repository, service, principal } = await setup();
      const a = await service.reserve(principal, { actionId: 'chapter.generate', idempotencyKey: 'a' });
      const b = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'b' });
      await service.settle(principal, { reservationId: a.reservation.id });
      await service.release(principal, { reservationId: b.reservation.id });
      await service.grantDevelopment(principal, { amount: 25, idempotencyKey: 'bonus' });
      await service.spend(principal, { amount: 24, idempotencyKey: 'store', description: 'Store offer' });
      const c = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'c' });
      const history = await service.listTransactions(principal);
      expect(history.map(entry => entry.kind)).toEqual(['reserve', 'spend', 'grant', 'release', 'charge', 'reserve', 'reserve', 'grant']);
      const account = (await repository.getAccount(principal.uid))!;
      expect(replayLedger(history)).toEqual({ balance: account.balance, held: account.held });
      expect(account).toMatchObject({ balance: 500, held: c.reservation.amount });
    });

    it('resets a development account to a fresh initial grant', async () => {
      const { service, principal } = await setup();
      await service.grantDevelopment(principal, { amount: 10, idempotencyKey: 'x' });
      const { reservation } = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img' });
      expect(await service.resetDevelopment(principal)).toEqual({ balance: 500, held: 0, available: 500 });
      const snapshot = await service.getSnapshot(principal);
      expect(snapshot.activity).toHaveLength(1);
      expect(await service.findReservation(principal, 'img')).toBeNull();
      await expect(service.settle(principal, { reservationId: reservation.id })).rejects.toThrow(/not found/);
    });

    it('settles a reservation whose action was unpriced after it was taken', async () => {
      const { service, principal } = await setup();
      const { reservation } = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      const settled = await withCatalogPrice('image.generate', null, async () => {
        // The action can no longer be reserved at all, yet the hold must clear.
        await expect(service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-2' })).rejects.toThrow(/no price yet/);
        return service.settle(principal, { reservationId: reservation.id });
      });
      expect(settled.transaction).toMatchObject({ kind: 'charge', amount: 3, description: 'Image generated' });
      expect(await service.getBalance(principal)).toEqual({ balance: 497, held: 0, available: 497 });
    });

    it('releases a reservation whose action was unpriced after it was taken', async () => {
      const { service, principal } = await setup();
      const { reservation } = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      const released = await withCatalogPrice('image.generate', null, () =>
        service.release(principal, { reservationId: reservation.id, reason: 'provider failure' }));
      expect(released.transaction).toMatchObject({ kind: 'release', amount: 3, description: 'Image not generated — Energy returned' });
      expect(await service.getBalance(principal)).toEqual({ balance: 500, held: 0, available: 500 });
    });

    it('charges the amount reserved at the time, not the catalog price at settlement', async () => {
      const { service, principal } = await setup();
      const cheap = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'before' });
      expect(cheap.reservation.amount).toBe(3);
      expect(cheap.reservation.metadata).toMatchObject({ pricing: { unitPrice: 3, quantity: 1 } });
      await withCatalogPrice('image.generate', 50, async () => {
        // A reservation taken after the change pays the new price...
        const dear = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'after' });
        expect(dear.reservation.amount).toBe(50);
        // ...while the earlier one still settles at the price it was taken at.
        const settled = await service.settle(principal, { reservationId: cheap.reservation.id });
        expect(settled.transaction.amount).toBe(3);
        const returned = await service.release(principal, { reservationId: dear.reservation.id });
        expect(returned.transaction.amount).toBe(50);
      });
      expect(await service.getBalance(principal)).toEqual({ balance: 497, held: 0, available: 497 });
    });

    it('still refuses to charge or release twice once the price has changed', async () => {
      const { service, principal } = await setup();
      const charged = await service.reserve(principal, { actionId: 'chapter.generate', idempotencyKey: 'ch-1' });
      const returned = await service.reserve(principal, { actionId: 'image.generate', idempotencyKey: 'img-1' });
      await withCatalogPrice('chapter.generate', null, () => withCatalogPrice('image.generate', 99, async () => {
        await service.settle(principal, { reservationId: charged.reservation.id });
        expect((await service.settle(principal, { reservationId: charged.reservation.id })).replayed).toBe(true);
        await service.release(principal, { reservationId: returned.reservation.id });
        expect((await service.release(principal, { reservationId: returned.reservation.id })).replayed).toBe(true);
        await expect(service.release(principal, { reservationId: charged.reservation.id })).rejects.toThrow(/already charged/);
        await expect(service.settle(principal, { reservationId: returned.reservation.id })).rejects.toThrow(/already released/);
      }));
      const history = await service.listTransactions(principal);
      expect(history.filter(entry => entry.kind === 'charge')).toHaveLength(1);
      expect(history.filter(entry => entry.kind === 'release')).toHaveLength(1);
      expect(await service.getBalance(principal)).toEqual({ balance: 499, held: 0, available: 499 });
      expect(replayLedger(history)).toEqual({ balance: 499, held: 0 });
    });

    it('scopes reservations to their owner', async () => {
      const { service, principal } = await setup();
      const { reservation } = await service.reserve(principal, { actionId: 'chapter.generate', idempotencyKey: 'mine' });
      await expect(service.settle(developer('someone-else'), { reservationId: reservation.id })).rejects.toThrow(/not found/);
      expect((await service.getBalance(principal)).held).toBe(1);
    });
  });
}

const snapshotControls = (snapshot: { developmentControls: unknown }) => snapshot.developmentControls;
