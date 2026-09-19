import { createPrincipalResolver, type PrincipalResolver, type IdentityRequest } from '../identity/authentication';
import { developmentRepositoryIdentityMode } from '../identity/types';
import { EnergyService } from '../energy/service';
import { InMemoryEnergyRepository } from '../energy/inMemoryEnergyRepository';
import { resolveEnergyConfig } from '../energy/config';
import { handleEnergyHttp } from '../energy/http';
import { DaoPillarService } from '../dao-pillar/service';
import { InMemoryDaoPillarRepository } from '../dao-pillar/inMemoryDaoPillarRepository';
import { resolveDaoPillarConfig } from '../dao-pillar/config';
import { handleDaoPillarHttp } from '../dao-pillar/http';
import { InMemoryQiLedger } from '../qi/inMemoryQiLedger';
import { handleQiHttp } from '../qi/http';

/** DEV-only process lifetime. This is not a durable storage or production deployment choice. */
export function createDevelopmentEconomy(environment: Record<string, string | undefined>, options: { resolvePrincipal?: PrincipalResolver } = {}) {
  const mode = developmentRepositoryIdentityMode(environment);
  const resolvePrincipal = options.resolvePrincipal ?? (mode === 'development' ? createPrincipalResolver({ mode }) : null);
  const qi = new InMemoryQiLedger();
  const daoRepository = new InMemoryDaoPillarRepository(qi);
  const dao = new DaoPillarService(daoRepository, resolveDaoPillarConfig(environment, mode));
  const energy = new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig(environment, mode));
  return {
    qi, dao, energy,
    async handle(capability: string | null, request: IdentityRequest & { method?: string; body?: unknown }) {
      const headers = { 'Cache-Control': 'no-store' };
      if (!resolvePrincipal) return { status: 503, body: { error: 'A verified host identity service is required; none is wired in DEV.', code: 'unavailable' }, headers };
      try {
        if (capability === 'energy') return await handleEnergyHttp(request, { service: energy, resolvePrincipal });
        if (capability === 'dao-pillar') return await handleDaoPillarHttp(request, { service: dao, resolvePrincipal });
        if (capability === 'cultivation') return await handleQiHttp(request, { ledger: qi, resolvePrincipal });
        return { status: 404, body: { error: 'Unknown economy capability.' }, headers };
      } catch {
        return { status: 503, body: { error: 'The Development economy is unavailable.', code: 'unavailable' }, headers };
      }
    },
  };
}
