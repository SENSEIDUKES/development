/**
 * Workshop-only Energy client that talks to an in-process ledger instead of
 * the HTTP route. Tests and the Energy preview use it so the reusable UI can be
 * exercised without a server. It is never transferred: a host mounts
 * `createHttpEnergyClient` against its real Energy API.
 */
import { type EnergyClient } from '@seihouse/library/energy';
import { resolveEnergyConfig, type EnergyEnvironment } from '../../../server/energy/config';
import { InMemoryEnergyRepository } from '../../../server/energy/inMemoryEnergyRepository';
import { EnergyService } from '../../../server/energy/service';
import type { LibraryPrincipal } from '../../../server/identity/types';

export interface LocalEnergyClientOptions {
  uid: string;
  developmentAccess?: boolean;
  environment?: EnergyEnvironment;
  service?: EnergyService;
  /** Simulated latency so loading states are visible in the Workshop. */
  delayMs?: number;
}

export function createLocalEnergyClient({ uid, developmentAccess = true, environment = {}, service, delayMs = 0 }: LocalEnergyClientOptions): EnergyClient {
  const ledger = service ?? new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig(environment, 'development'));
  const principal: LibraryPrincipal = {
    uid,
    role: 'user',
    identity: developmentAccess ? 'development' : 'verified',
    developmentAccess,
  };
  const settle = async <T,>(work: () => Promise<T>): Promise<T> => {
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    return work();
  };
  return {
    getSnapshot: () => settle(() => ledger.getSnapshot(principal)),
    grantDevelopment: input => settle(async () => {
      await ledger.grantDevelopment(principal, input);
      return ledger.getSnapshot(principal);
    }),
    resetDevelopment: () => settle(async () => {
      await ledger.resetDevelopment(principal);
      return ledger.getSnapshot(principal);
    }),
  };
}

export { EnergyService, InMemoryEnergyRepository, resolveEnergyConfig };
