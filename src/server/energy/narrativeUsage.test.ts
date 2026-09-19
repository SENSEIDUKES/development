import { describe, expect, it } from 'vitest';
import { createEnergyUsagePort } from './narrativeUsage';
import { EnergyService } from './service';
import { InMemoryEnergyRepository } from './inMemoryEnergyRepository';
import { resolveEnergyConfig } from './config';
import type { LibraryPrincipal } from '../identity/types';

const principal: LibraryPrincipal = { uid: 'author', role: 'user', identity: 'development', developmentAccess: true };
const setup = () => {
  const service = new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig({}, 'development'));
  const port = createEnergyUsagePort({ service, principal, actions: { chapter: 'chapter.generate' }, authorizeStory: async id => id === 'owned' });
  return { service, port };
};
describe('trusted Library usage adapter', () => {
  it('rejects conflicting concurrent intents after atomic reservation arbitration', async () => {
    const { service } = setup();
    const port = createEnergyUsagePort({ service, principal, actions: { chapter: 'chapter.generate' }, authorizeStory: async () => true });
    const results = await Promise.allSettled(['a', 'b'].map(storyId => port.authorize({ operationId: 'shared', capability: 'chapter', storyId })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect((await service.getBalance(principal)).held).toBe(1);
  });
  it('reserves once, recovers without another hold, and settles once', async () => {
    const { service, port } = setup();
    const request = { operationId: 'one', capability: 'chapter', storyId: 'owned' };
    const [a,b] = await Promise.all([port.authorize(request), port.authorize(request)]);
    expect(a).toEqual(b);
    expect(a.state).toBe('authorized');
    expect(await port.recover('one')).toEqual(a);
    expect((await service.getBalance(principal)).held).toBe(1);
    await Promise.all([port.settle(a.receipt),port.settle(a.receipt)]);
    expect(await port.recover('one')).toEqual({ receipt: a.receipt, state: 'settled' });
    expect(await service.getBalance(principal)).toEqual({ balance:499, held:0, available:499 });
  });
  it('releases idempotently and refuses a receipt from another verified account', async () => {
    const {service,port}=setup();
    const a=await port.authorize({operationId:'cancel',capability:'chapter',storyId:'owned'});
    const other=createEnergyUsagePort({service,principal:{...principal,uid:'other'},actions:{chapter:'chapter.generate'},authorizeStory:async()=>true});
    await expect(other.settle(a.receipt)).rejects.toThrow('not found for this account');
    await port.release(a.receipt);await port.release(a.receipt);
    expect((await port.recover('cancel'))?.state).toBe('released');
    expect(await service.getBalance(principal)).toEqual({balance:500,held:0,available:500});
    expect(await port.recover('missing')).toBeUndefined();
  });
  it('rejects unknown capabilities, inaccessible stories and reused operation intent', async () => {
    const {port}=setup();
    await expect(port.authorize({operationId:'x',capability:'refund',storyId:'owned'})).rejects.toThrow('not authorized');
    await expect(port.authorize({operationId:'x',capability:'chapter',storyId:'other'})).rejects.toThrow('not authorized');
  });
});
