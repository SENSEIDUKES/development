import type { ReactNode } from 'react';
import { DaoXpClientProvider, QiClientProvider } from '@seihouse/library/cultivation';
import { EnergyClientProvider } from '@seihouse/library/energy';
import { DaoPillarClientProvider } from '@seihouse/library/dao-pillar';
import { AchievementsClientProvider } from '@seihouse/library/rewards';
import { RelicsClientProvider } from '@seihouse/library/relics';
import { FamiliarsClientProvider } from '@seihouse/library/familiar';
import type { LibraryEconomyClients } from './inProcessEconomy';

/**
 * Every Library economy client provider for one account, so the Cave, the
 * Celestial Store, the Familiar and the Dao Pillar all read the same balances.
 * `null` clients mean not connected.
 */
export function EconomyClientProviders({ clients, children }: { clients: LibraryEconomyClients | null; children: ReactNode }) {
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
