import { describe, expect, it } from 'vitest';
import type { DaoPillarCalendarSnapshot, DaoPillarClaimResponse } from '../../components/dao-pillar/shared/daoPillarContracts';
import { createEnergyPrincipalResolver, developmentEnergyToken } from '../energy/authentication';
import { contractTheme, DAY_13 } from './daoPillarContract';
import { handleDaoPillarHttp } from './http';
import { InMemoryDaoPillarRepository } from './inMemoryDaoPillarRepository';
import { DaoPillarService } from './service';

const setup = (instant = DAY_13) => {
  const repository = new InMemoryDaoPillarRepository();
  const service = new DaoPillarService(repository, { identityMode: 'development', activeTheme: contractTheme }, { now: () => new Date(instant) });
  const resolvePrincipal = createEnergyPrincipalResolver({ mode: 'development' });
  const call = (method: string, body?: unknown, token: string | null = developmentEnergyToken('workshop-cultivator')) =>
    handleDaoPillarHttp(
      { method, body, headers: token ? { authorization: `Bearer ${token}` } : {} },
      { service, resolvePrincipal, onError: () => {} },
    );
  return { repository, service, call };
};

describe('Dao Pillar HTTP boundary', () => {
  it('rejects unsupported methods and unauthenticated calls', async () => {
    const { call } = setup();
    expect((await call('DELETE')).status).toBe(405);
    expect(await call('GET', undefined, null)).toMatchObject({ status: 401, body: { code: 'unauthenticated' } });
    expect((await call('POST', { operation: 'claim' }, null)).status).toBe(401);
  });

  it('serves the calendar for the caller the token names, never a body-named user', async () => {
    const { call } = setup();
    const response = await call('GET');
    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject({ 'Cache-Control': 'no-store' });
    const snapshot = response.body as DaoPillarCalendarSnapshot;
    expect(snapshot.uid).toBe('workshop-cultivator');
    expect(snapshot.tiles).toHaveLength(30);
    expect(snapshot.today).toMatchObject({ day: 13, status: 'available' });
  });

  it('claims today once and replays afterwards, ignoring any day or amount in the body', async () => {
    const { call, repository } = setup();
    const first = await call('POST', JSON.stringify({ operation: 'claim', day: 30, amount: 99_999 }));
    expect(first.status).toBe(200);
    const claimed = first.body as DaoPillarClaimResponse;
    expect(claimed.outcome).toBe('claimed');
    expect(claimed.claim).toMatchObject({ day: 13, delivered: [{ type: 'qi', amount: 100 }] });
    const second = await call('POST', { operation: 'claim' });
    expect((second.body as DaoPillarClaimResponse).outcome).toBe('already-collected');
    expect(await repository.getQiBalance('workshop-cultivator')).toBe(100);
  });

  it('answers bad bodies with 400 and a closed cycle with 409', async () => {
    const { call } = setup();
    expect(await call('POST', '{not json')).toMatchObject({ status: 400, body: { code: 'invalid_request' } });
    expect(await call('POST', { operation: 'reset' })).toMatchObject({ status: 400, body: { code: 'invalid_request' } });
    expect(await call('POST', [])).toMatchObject({ status: 400 });
    const early = setup('2026-09-01T12:00:00Z');
    expect(await early.call('POST', { operation: 'claim' })).toMatchObject({ status: 409, body: { code: 'not_available' } });
    expect(await early.repository.getQiBalance('workshop-cultivator')).toBe(0);
  });

  it('hides internal failures behind a retryable 503', async () => {
    const { call, repository } = setup();
    repository.listClaims = async () => { throw new Error('database gone'); };
    expect(await call('GET')).toMatchObject({ status: 503, body: { code: 'unavailable' } });
  });
});
