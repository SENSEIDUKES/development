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
import { InMemoryDaoXpLedger } from '../dao-xp/inMemoryDaoXpLedger';
import { handleDaoXpHttp } from '../dao-xp/http';
import { RewardDeliverer } from '../rewards/deliverer';
import { AchievementService } from '../achievements/service';
import { InMemoryAchievementRepository } from '../achievements/inMemoryAchievementRepository';
import { resolveAchievementsConfig } from '../achievements/config';
import { handleAchievementsHttp } from '../achievements/http';
import { RelicService } from '../relics/service';
import { InMemoryRelicRepository } from '../relics/inMemoryRelicRepository';
import { handleRelicsHttp } from '../relics/http';
import { FamiliarService } from '../familiars/service';
import { InMemoryFamiliarRepository } from '../familiars/inMemoryFamiliarRepository';
import { handleFamiliarsHttp } from '../familiars/http';

/** The capabilities `/api/library-economy?capability=` serves. */
export const DEVELOPMENT_ECONOMY_CAPABILITIES = ['energy', 'dao-pillar', 'cultivation', 'dao-xp', 'achievements', 'relics', 'familiars'] as const;

/**
 * DEV-only process lifetime. This is not a durable storage or production deployment choice.
 *
 * One set of ledgers backs every capability, so a Mystery Scroll's QI, a
 * Dao Pillar claim and a Familiar offering all move the same QI balance, and
 * DAO XP from achievements, creation and Fate Survival Relics lands on the one
 * rank ledger.
 */
export function createDevelopmentEconomy(environment: Record<string, string | undefined>, options: { resolvePrincipal?: PrincipalResolver; now?: () => Date } = {}) {
  const mode = developmentRepositoryIdentityMode(environment);
  const resolvePrincipal = options.resolvePrincipal ?? (mode === 'development' ? createPrincipalResolver({ mode }) : null);
  const qi = new InMemoryQiLedger();
  const daoXp = new InMemoryDaoXpLedger();
  const energyRepository = new InMemoryEnergyRepository();
  const energy = new EnergyService(energyRepository, resolveEnergyConfig(environment, mode));
  const daoRepository = new InMemoryDaoPillarRepository(qi);
  const dao = new DaoPillarService(daoRepository, resolveDaoPillarConfig(environment, mode), { now: options.now });
  const deliverer = new RewardDeliverer({ daoXp, qi, energy: energyRepository });
  const achievements = new AchievementService({
    repository: new InMemoryAchievementRepository(), deliverer, daoXp,
    config: resolveAchievementsConfig(environment), now: options.now,
  });
  const relics = new RelicService(new InMemoryRelicRepository(), deliverer, { now: options.now });
  const familiars = new FamiliarService({ repository: new InMemoryFamiliarRepository(), qi, energy, now: options.now });
  return {
    qi, daoXp, dao, energy, achievements, relics, familiars,
    /** Workshop seeding only: the calendar's claim history, for scenarios that start mid-cycle. */
    daoPillarRepository: daoRepository,
    async handle(capability: string | null, request: IdentityRequest & { method?: string; body?: unknown }) {
      const headers = { 'Cache-Control': 'no-store' };
      if (!resolvePrincipal) return { status: 503, body: { error: 'A verified host identity service is required; none is wired in DEV.', code: 'unavailable' }, headers };
      try {
        if (capability === 'energy') return await handleEnergyHttp(request, { service: energy, resolvePrincipal });
        if (capability === 'dao-pillar') return await handleDaoPillarHttp(request, { service: dao, resolvePrincipal });
        if (capability === 'cultivation') return await handleQiHttp(request, { ledger: qi, resolvePrincipal });
        if (capability === 'dao-xp') return await handleDaoXpHttp(request, { ledger: daoXp, resolvePrincipal });
        if (capability === 'achievements') return await handleAchievementsHttp(request, { service: achievements, resolvePrincipal });
        if (capability === 'relics') return await handleRelicsHttp(request, { service: relics, resolvePrincipal });
        if (capability === 'familiars') return await handleFamiliarsHttp(request, { service: familiars, resolvePrincipal });
        return { status: 404, body: { error: 'Unknown economy capability.' }, headers };
      } catch {
        return { status: 503, body: { error: 'The Development economy is unavailable.', code: 'unavailable' }, headers };
      }
    },
  };
}

export type DevelopmentEconomy = ReturnType<typeof createDevelopmentEconomy>;
