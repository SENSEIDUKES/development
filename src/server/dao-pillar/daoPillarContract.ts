import { describe, expect, it } from 'vitest';
import { qiAmountOf } from '../../components/dao-pillar/shared/daoPillarContracts';
import type { QiLedger } from '../qi/qiLedger';
import { DaoPillarNotAvailableError, type DaoPillarRepository } from './repository';
import { DaoPillarService } from './service';
import { BETA_TEST_THEME, withCalendar } from './themes';
import type { DaoPillarPrincipal, DaoPillarTheme } from './types';

/** Day 1 on 2026-09-06 in New York makes 2026-09-18 the thirteenth day. */
export const contractTheme: DaoPillarTheme = withCalendar(BETA_TEST_THEME, { startsOn: '2026-09-06', timeZone: 'America/New_York' });
export const DAY_13 = '2026-09-18T15:00:00Z';

export const cultivator = (uid = 'dev-user'): DaoPillarPrincipal => ({
  uid, role: 'user', identity: 'development', developmentAccess: true,
});

export interface ContractFixture {
  repository: DaoPillarRepository;
  qi: QiLedger;
}

const serviceAt = (repository: DaoPillarRepository, instant: string, theme = contractTheme) =>
  new DaoPillarService(repository, { identityMode: 'development', activeTheme: theme }, { now: () => new Date(instant) });

/**
 * The behaviour every claim-history adapter must satisfy. Run once against
 * the in-memory adapter and once against the Postgres migration so both agree.
 */
export function describeDaoPillarContract(name: string, createFixture: () => Promise<ContractFixture> | ContractFixture) {
  describe(`Dao Pillar calendar (${name})`, () => {
    it('lays out thirty scheduled tiles from the server calendar with today open and the past missed', async () => {
      const { repository } = await createFixture();
      const snapshot = await serviceAt(repository, DAY_13).getSnapshot(cultivator());
      expect(snapshot.tiles).toHaveLength(30);
      expect(snapshot.cycle).toMatchObject({ id: 'beta-test:2026-09-06', startsOn: '2026-09-06', endsOn: '2026-10-05', days: 30, timeZone: 'America/New_York' });
      expect(snapshot.today).toMatchObject({ date: '2026-09-18', phase: 'active', day: 13, status: 'available', collected: null });
      expect(snapshot.tiles.map(tile => tile.state)).toEqual([
        ...Array(12).fill('missed'), 'available', ...Array(17).fill('locked'),
      ]);
      expect(snapshot.tiles[12]).toMatchObject({ day: 13, scheduledDate: '2026-09-18', rewards: [{ type: 'qi', amount: 100 }], milestone: false, claimedAt: null });
      expect(snapshot.tiles.filter(tile => tile.milestone).map(tile => tile.day)).toEqual([7, 14, 21, 28]);
      expect(snapshot.tiles[6].rewards).toEqual([{ type: 'qi', amount: 1_000 }]);
      expect(snapshot.tiles[0].scheduledDate).toBe('2026-09-06');
      expect(snapshot.tiles[29].scheduledDate).toBe('2026-10-05');
      expect(snapshot.streak).toEqual({ current: 0, totalCollected: 0 });
      expect(snapshot.theme).toMatchObject({ id: 'beta-test', name: 'Beta Test', visual: { seal: '道' } });
    });

    it('claims today once, deposits the scheduled Qi through the ledger, and reflects it everywhere', async () => {
      const { repository, qi } = await createFixture();
      const service = serviceAt(repository, DAY_13);
      const result = await service.claimToday(cultivator());
      expect(result.outcome).toBe('claimed');
      expect(result.message).toBe('Day 13 collected: +100 Qi.');
      expect(result.claim).toMatchObject({ day: 13, scheduledDate: '2026-09-18', rewards: [{ type: 'qi', amount: 100 }] });
      expect(result.claim.delivered).toEqual([{ type: 'qi', amount: 100, transactionId: expect.any(String), balanceAfter: 100 }]);
      expect(Date.parse(result.claim.claimedAt)).not.toBeNaN();
      const tile = result.snapshot.tiles[12];
      expect(tile).toMatchObject({ state: 'collected', claimedAt: result.claim.claimedAt });
      expect(qiAmountOf(tile.delivered!)).toBe(100);
      expect(result.snapshot.today).toMatchObject({ status: 'collected', collected: { claimedAt: result.claim.claimedAt } });
      expect(result.snapshot.streak).toEqual({ current: 1, totalCollected: 1 });
      expect((await qi.getAccount('dev-user'))?.balance).toBe(100);
      const [transaction] = await qi.listTransactions('dev-user', 10);
      expect(transaction).toMatchObject({ kind: 'deposit', amount: 100, source: 'dao-pillar', balanceAfter: 100, description: 'Beta Test · Day 13' });
      expect(transaction.idempotencyKey).toBe(`dao-pillar:${result.claim.id}:0`);
      expect(transaction.metadata).toMatchObject({ claimId: result.claim.id, cycleId: 'beta-test:2026-09-06', day: 13 });
      expect(await repository.getQiBalance('dev-user')).toBe(100);
    });

    it('never awards one scheduled day twice: refreshes, retries and rapid taps replay the first claim', async () => {
      const { repository, qi } = await createFixture();
      const service = serviceAt(repository, DAY_13);
      const results = await Promise.all(Array.from({ length: 5 }, () => service.claimToday(cultivator())));
      expect(results.filter(result => result.outcome === 'claimed')).toHaveLength(1);
      expect(results.filter(result => result.outcome === 'already-collected')).toHaveLength(4);
      expect(new Set(results.map(result => result.claim.id)).size).toBe(1);
      const again = await service.claimToday(cultivator());
      expect(again).toMatchObject({ outcome: 'already-collected', message: 'Day 13 was already collected.' });
      // A reloaded service (new process, redeploy) sees the same history.
      const reloaded = await serviceAt(repository, DAY_13).claimToday(cultivator());
      expect(reloaded.outcome).toBe('already-collected');
      expect((await qi.getAccount('dev-user'))?.balance).toBe(100);
      expect(await qi.listTransactions('dev-user', 10)).toHaveLength(1);
      expect(await repository.listClaims('dev-user')).toHaveLength(1);
    });

    it('refuses claims before the cycle starts, after it ends, and never for a future day', async () => {
      const { repository, qi } = await createFixture();
      await expect(serviceAt(repository, '2026-09-05T12:00:00Z').claimToday(cultivator())).rejects.toBeInstanceOf(DaoPillarNotAvailableError);
      await expect(serviceAt(repository, '2026-10-06T12:00:00Z').claimToday(cultivator())).rejects.toThrow(/ended on 2026-10-05/);
      expect((await serviceAt(repository, '2026-09-05T12:00:00Z').getSnapshot(cultivator())).today).toMatchObject({ phase: 'before', day: null, status: 'unavailable' });
      expect((await serviceAt(repository, '2026-10-06T12:00:00Z').getSnapshot(cultivator())).today).toMatchObject({ phase: 'after', day: null, status: 'unavailable' });
      // Claiming on day 13 can only ever produce day 13: the caller names no day.
      const claimed = await serviceAt(repository, DAY_13).claimToday(cultivator());
      expect(claimed.claim.day).toBe(13);
      expect(claimed.snapshot.tiles[13].state).toBe('locked');
      expect(claimed.snapshot.tiles[11].state).toBe('missed');
      expect((await qi.getAccount('dev-user'))?.balance).toBe(100);
      // A direct repository call for a day the schedule never reached is the
      // only way to name a day, and it lives behind the service on the server.
      expect(await repository.listClaims('dev-user')).toHaveLength(1);
    });

    it('awards the milestone reward on days 7, 14, 21 and 28', async () => {
      const { repository, qi } = await createFixture();
      const day14 = await serviceAt(repository, '2026-09-19T15:00:00Z').claimToday(cultivator());
      expect(day14.claim).toMatchObject({ day: 14, rewards: [{ type: 'qi', amount: 1_000 }] });
      expect(day14.claim.delivered[0]).toMatchObject({ type: 'qi', amount: 1_000, balanceAfter: 1_000 });
      expect(day14.snapshot.tiles[13]).toMatchObject({ milestone: true, state: 'collected' });
      const day28 = await serviceAt(repository, '2026-10-03T15:00:00Z').claimToday(cultivator());
      expect(day28.claim.delivered[0]).toMatchObject({ amount: 1_000, balanceAfter: 2_000 });
      const day15 = await serviceAt(repository, '2026-09-20T15:00:00Z').claimToday(cultivator());
      expect(day15.claim.delivered[0]).toMatchObject({ amount: 100, balanceAfter: 2_100 });
      expect((await qi.getAccount('dev-user'))?.balance).toBe(2_100);
      const history = await qi.listTransactions('dev-user', 10);
      expect(history.map(entry => entry.amount)).toEqual([100, 1_000, 1_000]);
      expect(history.map(entry => entry.balanceAfter)).toEqual([2_100, 2_000, 1_000]);
    });

    it('builds the streak from consecutive scheduled dates and lets an open day count from yesterday', async () => {
      const { repository } = await createFixture();
      await serviceAt(repository, DAY_13).claimToday(cultivator());
      await serviceAt(repository, '2026-09-19T15:00:00Z').claimToday(cultivator());
      const open = await serviceAt(repository, '2026-09-20T15:00:00Z').getSnapshot(cultivator());
      expect(open.streak).toEqual({ current: 2, totalCollected: 2 });
      expect(open.today.status).toBe('available');
      // Day 15 skipped: day 16 restarts the streak.
      const restarted = await serviceAt(repository, '2026-09-21T15:00:00Z').claimToday(cultivator());
      expect(restarted.snapshot.streak).toEqual({ current: 1, totalCollected: 3 });
      expect(restarted.snapshot.tiles[14].state).toBe('missed');
    });

    it('preserves claim history when the active theme changes and never duplicates across reloads', async () => {
      const { repository, qi } = await createFixture();
      await serviceAt(repository, DAY_13).claimToday(cultivator());
      // A new theme takes over on 2026-09-19 as its own cycle.
      const winter = withCalendar({ ...contractTheme, name: 'Winter Solstice' }, { startsOn: '2026-09-19' }, 'winter');
      const winterService = serviceAt(repository, '2026-09-19T15:00:00Z', winter);
      const fresh = await winterService.getSnapshot(cultivator());
      expect(fresh.cycle.id).toBe('winter:2026-09-19');
      expect(fresh.tiles.every(tile => tile.state !== 'collected')).toBe(true);
      // The streak follows the cultivator, not the theme.
      expect(fresh.streak).toEqual({ current: 1, totalCollected: 1 });
      const winterDay1 = await winterService.claimToday(cultivator());
      expect(winterDay1.claim).toMatchObject({ day: 1, scheduledDate: '2026-09-19' });
      expect(winterDay1.snapshot.streak).toEqual({ current: 2, totalCollected: 2 });
      // Switching back to Beta Test still shows its own claim, and cannot re-award it.
      const back = serviceAt(repository, DAY_13);
      expect((await back.getSnapshot(cultivator())).tiles[12].state).toBe('collected');
      expect((await back.claimToday(cultivator())).outcome).toBe('already-collected');
      expect((await qi.getAccount('dev-user'))?.balance).toBe(200);
      const claims = await repository.listClaims('dev-user');
      expect(claims.map(claim => claim.cycleId)).toEqual(['winter:2026-09-19', 'beta-test:2026-09-06']);
      expect(claims.every(claim => claim.status === 'delivered')).toBe(true);
      // Re-running Beta Test later is a new cycle: history kept, calendar fresh.
      const rerun = serviceAt(repository, '2026-11-01T15:00:00Z', withCalendar(contractTheme, { startsOn: '2026-11-01' }));
      const rerunSnapshot = await rerun.getSnapshot(cultivator());
      expect(rerunSnapshot.cycle.id).toBe('beta-test:2026-11-01');
      expect(rerunSnapshot.tiles[0].state).toBe('available');
      expect(rerunSnapshot.streak.totalCollected).toBe(2);
    });

    it('keeps each cultivator’s claims and Qi apart', async () => {
      const { repository, qi } = await createFixture();
      const service = serviceAt(repository, DAY_13);
      await service.claimToday(cultivator('dev-user'));
      const other = await service.getSnapshot(cultivator('someone-else'));
      expect(other.today.status).toBe('available');
      expect((await qi.getAccount('someone-else'))).toBeNull();
      await service.claimToday(cultivator('someone-else'));
      expect((await qi.getAccount('someone-else'))?.balance).toBe(100);
      expect((await qi.getAccount('dev-user'))?.balance).toBe(100);
    });
  });
}
