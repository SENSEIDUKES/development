import { describe, expect, it } from 'vitest';
import { InMemoryQiLedger } from '../qi/inMemoryQiLedger';
import { describeDaoPillarContract, contractTheme, cultivator, DAY_13 } from './daoPillarContract';
import { InMemoryDaoPillarRepository } from './inMemoryDaoPillarRepository';
import { DaoPillarUnsupportedRewardError } from './repository';
import { DaoPillarService } from './service';

describeDaoPillarContract('in-memory', () => {
  const qi = new InMemoryQiLedger();
  return { repository: new InMemoryDaoPillarRepository(qi), qi };
});

describe('Dao Pillar in-memory guards', () => {
  it('records nothing when a reward entry cannot be delivered', async () => {
    const repository = new InMemoryDaoPillarRepository();
    await expect(repository.claimDay({
      uid: 'dev-user', themeId: 'x', cycleId: 'x:2026-09-06', dayNumber: 1, scheduledDate: '2026-09-06',
      rewards: [{ type: 'media-pack', packId: 'p1' }], description: 'x',
    })).rejects.toBeInstanceOf(DaoPillarUnsupportedRewardError);
    expect(await repository.listClaims('dev-user')).toHaveLength(0);
    expect(await repository.getQiBalance('dev-user')).toBe(0);
  });

  it('refuses to construct a service around a theme it cannot deliver', () => {
    expect(() => new DaoPillarService(new InMemoryDaoPillarRepository(), {
      identityMode: 'development',
      activeTheme: { ...contractTheme, rewards: { ...contractTheme.rewards, everyDay: [{ type: 'energy', amount: 5 }] } },
    })).toThrow(/cannot be delivered yet/);
  });

  it('exposes the same claim on a reset-free reload of the repository state', async () => {
    const repository = new InMemoryDaoPillarRepository();
    const service = new DaoPillarService(repository, { identityMode: 'development', activeTheme: contractTheme }, { now: () => new Date(DAY_13) });
    const first = await service.claimToday(cultivator());
    repository.reset('dev-user');
    const second = await service.claimToday(cultivator());
    expect(second.outcome).toBe('claimed');
    expect(second.claim.id).not.toBe(first.claim.id);
  });
});
