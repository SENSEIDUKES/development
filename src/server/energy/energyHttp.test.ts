import { describe, expect, it, vi } from 'vitest';
import { type EnergyAccountSnapshot } from '@seihouse/library/energy';
import { createPrincipalResolver, developmentIdentityToken } from '../identity/authentication';
import { resolveEnergyConfig } from './config';
import { handleEnergyHttp } from './http';
import { InMemoryEnergyRepository } from './inMemoryEnergyRepository';
import { EnergyService } from './service';

const developmentDependencies = () => ({
  service: new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig({}, 'development')),
  resolvePrincipal: createPrincipalResolver({ mode: 'development' }),
});

const productionDependencies = (verified: { uid: string; role?: 'owner' | 'admin' | 'user' } | null = { uid: 'firebase-uid' }) => ({
  service: new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig({}, 'production')),
  resolvePrincipal: createPrincipalResolver({
    mode: 'production',
    verifyIdToken: vi.fn(async (token: string) => {
      if (token !== 'valid-id-token' || !verified) throw new Error('invalid');
      return verified;
    }),
  }),
});

const authorized = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });
const snapshot = (body: unknown) => body as EnergyAccountSnapshot;

describe('Energy HTTP boundary', () => {
  it('requires an identity before reading a balance', async () => {
    const response = await handleEnergyHttp({ method: 'GET' }, developmentDependencies());
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: 'unauthenticated' });
  });

  it('reads the live server balance, catalog prices and controls for a development user', async () => {
    const response = await handleEnergyHttp({ method: 'GET', ...authorized(developmentIdentityToken('workshop-cultivator')) }, developmentDependencies());
    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject({ 'Cache-Control': 'no-store' });
    expect(snapshot(response.body)).toMatchObject({
      uid: 'workshop-cultivator', balance: 500, available: 500,
      developmentControls: { initialGrant: 500 },
    });
    expect(snapshot(response.body).prices.find(entry => entry.actionId === 'chapter.generate')?.price).toBe(1);
  });

  it('never lets a request body choose the account', async () => {
    const dependencies = developmentDependencies();
    const response = await handleEnergyHttp({
      method: 'POST', ...authorized(developmentIdentityToken('me')),
      body: { operation: 'development.grant', amount: 5, idempotencyKey: 'k', uid: 'victim' },
    }, dependencies);
    expect(snapshot(response.body).uid).toBe('me');
    expect(await dependencies.service.getBalance({ uid: 'victim', role: 'user', identity: 'verified', developmentAccess: false })).toMatchObject({ balance: 0 });
  });

  it('applies a development grant once per click key and resets on request', async () => {
    const dependencies = developmentDependencies();
    const request = { method: 'POST', ...authorized(developmentIdentityToken('dev')), body: JSON.stringify({ operation: 'development.grant', idempotencyKey: 'click-1' }) };
    expect(snapshot((await handleEnergyHttp(request, dependencies)).body).balance).toBe(600);
    expect(snapshot((await handleEnergyHttp(request, dependencies)).body).balance).toBe(600);
    const reset = await handleEnergyHttp({ method: 'POST', ...authorized(developmentIdentityToken('dev')), body: { operation: 'development.reset' } }, dependencies);
    expect(snapshot(reset.body)).toMatchObject({ balance: 500, activity: [expect.objectContaining({ kind: 'grant' })] });
  });

  it('rejects malformed development requests', async () => {
    const dependencies = developmentDependencies();
    const missingKey = await handleEnergyHttp({ method: 'POST', ...authorized(developmentIdentityToken('dev')), body: { operation: 'development.grant' } }, dependencies);
    expect(missingKey.status).toBe(400);
    const badJson = await handleEnergyHttp({ method: 'POST', ...authorized(developmentIdentityToken('dev')), body: '{nope' }, dependencies);
    expect(badJson.status).toBe(400);
    const unknown = await handleEnergyHttp({ method: 'POST', ...authorized(developmentIdentityToken('dev')), body: { operation: 'reserve' } }, dependencies);
    expect(unknown.status).toBe(400);
    const method = await handleEnergyHttp({ method: 'DELETE', ...authorized(developmentIdentityToken('dev')) }, dependencies);
    expect(method.status).toBe(405);
  });

  it('keeps development grant and reset away from production users', async () => {
    const dependencies = productionDependencies();
    const read = await handleEnergyHttp({ method: 'GET', ...authorized('valid-id-token') }, dependencies);
    expect(snapshot(read.body)).toMatchObject({ uid: 'firebase-uid', balance: 0, developmentControls: null });
    const grant = await handleEnergyHttp({ method: 'POST', ...authorized('valid-id-token'), body: { operation: 'development.grant', idempotencyKey: 'k' } }, dependencies);
    expect(grant.status).toBe(403);
    expect(grant.body).toMatchObject({ code: 'forbidden' });
    const reset = await handleEnergyHttp({ method: 'POST', ...authorized('valid-id-token'), body: { operation: 'development.reset' } }, dependencies);
    expect(reset.status).toBe(403);
    expect(snapshot((await handleEnergyHttp({ method: 'GET', ...authorized('valid-id-token') }, dependencies)).body).balance).toBe(0);
  });

  it('refuses Workshop identities and invalid tokens in production mode', async () => {
    const dependencies = productionDependencies();
    expect((await handleEnergyHttp({ method: 'GET', ...authorized(developmentIdentityToken('anyone')) }, dependencies)).status).toBe(401);
    expect((await handleEnergyHttp({ method: 'GET', ...authorized('forged') }, dependencies)).status).toBe(401);
    expect(() => createPrincipalResolver({ mode: 'production' })).toThrow(/verifier/);
  });

  it('honours a verifier in development mode and rejects malformed development uids', async () => {
    const resolve = createPrincipalResolver({ mode: 'development', verifyIdToken: async () => ({ uid: 'verified-uid', role: 'admin' }) });
    expect(await resolve(authorized('real-token'))).toEqual({ uid: 'verified-uid', role: 'admin', identity: 'verified', developmentAccess: true });
    expect(await resolve(authorized(developmentIdentityToken('bad uid!')))).toBeNull();
    expect(await resolve({ headers: {} })).toBeNull();
  });
});
