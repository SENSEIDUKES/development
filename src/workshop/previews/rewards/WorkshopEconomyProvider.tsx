/**
 * Workshop-only React wiring for the in-process development economy: every
 * Library economy client provider for one account, plus the Workshop's
 * simulators. Each mount is a fresh economy; remount (change the `key`) to
 * reset a scenario.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DaoXpClientProvider, QiClientProvider, useDaoXpAccount, useQiAccount } from '@seihouse/library/cultivation';
import { EnergyClientProvider, useEnergyAccount, type EnergyAccountState } from '@seihouse/library/energy';
import { DaoPillarClientProvider } from '@seihouse/library/dao-pillar';
import { AchievementsClientProvider, useAchievements, useAchievementsStore, useRefreshWhenReplaced } from '@seihouse/library/rewards';
import { RelicsClientProvider, useRelics, useRelicsStore } from '@seihouse/library/relics';
import { FamiliarsClientProvider, useFamiliars } from '@seihouse/library/familiar';
import type { DevelopmentEconomy } from '../../../server/economy/developmentRuntime';
import { seedWorkshopAccount, type WorkshopAccountSeed } from './rewardScenarios';
import {
  createInProcessEconomyFetch,
  createWorkshopEconomy,
  createWorkshopEconomyClients,
  createWorkshopSimulators,
  type WorkshopEconomyClients,
  type WorkshopEconomyFaults,
  type WorkshopEconomyOptions,
} from './workshopEconomy';

/** Every economy client provider for one account; `null` clients mean not connected. */
export function EconomyClientProviders({ clients, children }: { clients: WorkshopEconomyClients | null; children: ReactNode }) {
  return (
    <EnergyClientProvider client={clients?.energy ?? null}>
      <DaoPillarClientProvider client={clients?.daoPillar ?? null}>
        <QiClientProvider client={clients?.qi ?? null}>
          <DaoXpClientProvider client={clients?.daoXp ?? null}>
            <AchievementsClientProvider client={clients?.achievements ?? null}>
              <RelicsClientProvider client={clients?.relics ?? null}>
                <FamiliarsClientProvider client={clients?.familiars ?? null}>
                  {children}
                </FamiliarsClientProvider>
              </RelicsClientProvider>
            </AchievementsClientProvider>
          </DaoXpClientProvider>
        </QiClientProvider>
      </DaoPillarClientProvider>
    </EnergyClientProvider>
  );
}

/**
 * Energy's hook keeps its state per component, so one shared read lets every
 * Workshop panel see the same balance after a Relic or a purchase moves it.
 */
const SharedEnergyContext = createContext<EnergyAccountState | null>(null);

function SharedEnergyAccount({ children }: { children: ReactNode }) {
  const energy = useEnergyAccount();
  return <SharedEnergyContext.Provider value={energy}>{children}</SharedEnergyContext.Provider>;
}

/**
 * Re-reads the balances a reward can move whenever its projection changes,
 * once for the whole preview — the Cave does the same. A scroll moves DAO XP
 * and QI, a Relic DAO XP and Energy, a Familiar offer or purchase QI and Energy.
 */
function RewardBalanceSync({ children }: { children: ReactNode }) {
  const qi = useQiAccount();
  const daoXp = useDaoXpAccount();
  const energy = useContext(SharedEnergyContext);
  const achievements = useAchievements();
  const relics = useRelics();
  const familiars = useFamiliars();
  const energyRefresh = energy?.refresh;
  const scrollBalances = useCallback(() => Promise.all([qi.refresh(), daoXp.refresh()]), [qi.refresh, daoXp.refresh]);
  const relicBalances = useCallback(() => Promise.all([daoXp.refresh(), energyRefresh?.()]), [daoXp.refresh, energyRefresh]);
  const spendBalances = useCallback(() => Promise.all([qi.refresh(), energyRefresh?.()]), [qi.refresh, energyRefresh]);
  useRefreshWhenReplaced(achievements.snapshot, scrollBalances);
  useRefreshWhenReplaced(relics.snapshot, relicBalances);
  useRefreshWhenReplaced(familiars.snapshot, spendBalances);
  return <>{children}</>;
}

interface WorkshopEconomyValue {
  uid: string;
  economy: DevelopmentEconomy;
  simulators: ReturnType<typeof createWorkshopSimulators>;
}

const WorkshopEconomyContext = createContext<WorkshopEconomyValue | null>(null);

export const WORKSHOP_CULTIVATOR_UID = 'workshop-cultivator';

export function WorkshopEconomyProvider({ uid = WORKSHOP_CULTIVATOR_UID, options, seed, faults, delayMs, children }: {
  uid?: string;
  options?: WorkshopEconomyOptions;
  /** What the account already did before the preview opens. */
  seed?: WorkshopAccountSeed;
  faults?: WorkshopEconomyFaults;
  /** Simulated network latency for every request, to inspect loading states. */
  delayMs?: number;
  children: ReactNode;
}) {
  const [runtime] = useState(() => {
    const economy = createWorkshopEconomy(options);
    const fetchImpl = createInProcessEconomyFetch(economy, { faults, delayMs: delayMs ? () => delayMs : undefined });
    return {
      economy,
      clients: createWorkshopEconomyClients(uid, fetchImpl),
      simulators: createWorkshopSimulators(uid, fetchImpl),
    };
  });
  const [status, setStatus] = useState<'seeding' | 'ready' | 'failed'>(seed ? 'seeding' : 'ready');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!seed) return;
    let active = true;
    void seedWorkshopAccount(runtime.economy, uid, seed).then(
      () => { if (active) setStatus('ready'); },
      reason => { if (active) { setError(reason instanceof Error ? reason.message : String(reason)); setStatus('failed'); } },
    );
    return () => { active = false; };
    // The seed applies once per economy; remount the provider to reseed.
  }, [runtime, seed, uid]);

  if (status === 'seeding') return <p role="status" className="px-4 py-10 text-center text-sm text-neutral-400">Preparing the development economy…</p>;
  return (
    <WorkshopEconomyContext.Provider value={{ uid, economy: runtime.economy, simulators: runtime.simulators }}>
      {error ? <p role="alert" className="px-4 pt-4 text-sm text-red-300">The scenario could not be prepared: {error}</p> : null}
      <EconomyClientProviders clients={runtime.clients}>
        <SharedEnergyAccount><RewardBalanceSync>{children}</RewardBalanceSync></SharedEnergyAccount>
      </EconomyClientProviders>
    </WorkshopEconomyContext.Provider>
  );
}

export function useWorkshopEconomy(): WorkshopEconomyValue {
  const value = useContext(WorkshopEconomyContext);
  if (!value) throw new Error('useWorkshopEconomy requires <WorkshopEconomyProvider>.');
  return value;
}

/** Every balance and reward projection for the Workshop account, and one refresh for all of them. */
export function useRewardAccount() {
  const qi = useQiAccount();
  const daoXp = useDaoXpAccount();
  const sharedEnergy = useContext(SharedEnergyContext);
  const ownEnergy = useEnergyAccount({ enabled: !sharedEnergy });
  const energy = sharedEnergy ?? ownEnergy;
  const achievements = useAchievements();
  const achievementsStore = useAchievementsStore();
  const relics = useRelics();
  const relicsStore = useRelicsStore();
  const familiars = useFamiliars();
  const refreshBalances = useCallback(async () => {
    await Promise.all([qi.refresh(), daoXp.refresh(), energy.refresh()]);
  }, [qi.refresh, daoXp.refresh, energy.refresh]);
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshBalances(), achievements.refresh(), relics.refresh(), familiars.refresh()]);
  }, [refreshBalances, achievements.refresh, relics.refresh, familiars.refresh]);
  return { qi, daoXp, energy, achievements, achievementsStore, relics, relicsStore, familiars, refreshBalances, refreshAll };
}
