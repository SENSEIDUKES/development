import { describe, expect, it } from 'vitest';
import { allFamiliarOptions } from '../familiar/catalogue';
import { createPracticeEconomy, PRACTICE_QI } from './practiceEconomy';

describe('The practice account', () => {
  it('opens with the most QI a tester could want and every Familiar in the catalogue', async () => {
    const { clients } = createPracticeEconomy({ uid: 'reader' });
    // Asked before the account has opened: the answer waits for it.
    const [qi, familiars] = await Promise.all([clients.qi.getSnapshot(), clients.familiars.getSnapshot()]);
    expect(qi.balance).toBe(PRACTICE_QI);
    expect(familiars.familiars.map(view => view.familiarId).sort()).toEqual(allFamiliarOptions.map(option => option.id).sort());
    expect(familiars.familiars.every(view => view.owned)).toBe(true);
  });

  it('keeps what the reader does for the visit, and a new visit opens the account again', async () => {
    const visit = createPracticeEconomy({ uid: 'reader' });
    const familiarId = allFamiliarOptions[0].id;
    await visit.clients.familiars.offerQi({ familiarId, amount: 1_000, idempotencyKey: 'offer-1' });
    expect((await visit.clients.qi.getSnapshot()).balance).toBe(PRACTICE_QI - 1_000);
    expect((await visit.clients.familiars.getSnapshot()).familiars.find(view => view.familiarId === familiarId)?.qiOffered).toBe(1_000);

    const nextVisit = createPracticeEconomy({ uid: 'reader' });
    expect((await nextVisit.clients.qi.getSnapshot()).balance).toBe(PRACTICE_QI);
  });

  it('starts the Dao Pillar on the visit\'s own day, ready to claim', async () => {
    const { clients } = createPracticeEconomy({ uid: 'reader' });
    const calendar = await clients.daoPillar.getCalendar();
    expect(calendar.today).toMatchObject({ day: 1, status: 'available' });
    const claim = await clients.daoPillar.claimToday();
    expect(claim.outcome).toBe('claimed');
    expect((await clients.qi.getSnapshot()).balance).toBeGreaterThan(PRACTICE_QI);
  });

  it('gives each account its own balance', async () => {
    const { economy, clients } = createPracticeEconomy({ uid: 'reader' });
    await clients.qi.getSnapshot();
    expect(await economy.qi.getAccount('someone-else')).toBeNull();
  });
});
