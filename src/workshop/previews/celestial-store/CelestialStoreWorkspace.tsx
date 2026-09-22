/**
 * Workshop preview for the dedicated Celestial Store page.
 *
 * Preview-only shell. The panel is props-driven, so each state supplies its
 * own balances, ownership, and purchase behavior directly — no server, no
 * ledger writes. The User Profile preview is where the same panel runs
 * against the live QI ledger and Energy account at
 * `?preview=user-profile&cave=/home/store`.
 */
import { useMemo, useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { allFamiliarOptions } from '../../../host/familiar/catalogue';
import {
  CELESTIAL_STORE_CONFIG,
  CelestialStorePanel,
  type CelestialStoreConfig,
  type CelestialStorePurchase,
  type CelestialStorePurchaseResult,
} from '@seihouse/library/celestial-store';
import type { QiAccountState } from '@seihouse/library/cultivation';
import type { EnergyAccountState } from '@seihouse/library/energy';

const entry = workshopEntries.find(candidate => candidate.id === 'celestial-store')!;

type CelestialStorePreviewState = 'wealthy' | 'low-balances' | 'collector' | 'signed-out' | 'discount' | 'tomorrow';

const STATES: { id: CelestialStorePreviewState; label: string; description: string }[] = [
  { id: 'wealthy', label: 'Ready to spend', description: 'Rich QI and Energy balances; every offer is affordable and purchasable in memory.' },
  { id: 'low-balances', label: 'Low balances', description: 'Too little of both currencies: every Buy is disabled with the honest reason.' },
  { id: 'collector', label: 'Collector', description: 'Everything owned, one Familiar equipped — the Owned and Equipped card states.' },
  { id: 'signed-out', label: 'Balances unavailable', description: 'No QI or Energy account mounted; balances show as unknown and purchases stay disabled.' },
  { id: 'discount', label: 'Configured discount', description: 'A genuine sale configured on one Energy offer: current price beside the struck normal price.' },
  { id: 'tomorrow', label: 'Tomorrow', description: 'The same shared rotation seeded one day ahead, to inspect the daily reshuffle.' },
];

const qiState = (balance: number | null): QiAccountState | undefined => balance === null ? undefined : {
  status: 'ready',
  snapshot: { uid: 'workshop-cultivator', balance, transactions: [] },
  error: null,
};

const energyState = (available: number | null): EnergyAccountState | undefined => available === null ? undefined : {
  status: 'ready',
  snapshot: {
    uid: 'workshop-cultivator', balance: available, held: 0, available,
    prices: [], activity: [], developmentControls: null, updatedAt: '2026-09-22T00:00:00.000Z',
  },
  error: null,
  pending: false,
  refresh: async () => {},
  grantDevelopment: async () => {},
  resetDevelopment: async () => {},
};

const DISCOUNT_CONFIG: CelestialStoreConfig = {
  ...CELESTIAL_STORE_CONFIG,
  offers: CELESTIAL_STORE_CONFIG.offers.map(offer =>
    offer.familiarId === 'celestial-guardian' ? { ...offer, salePrice: 450 } : offer),
};

function CelestialStorePreview({ state }: { state: CelestialStorePreviewState }) {
  const [owned, setOwned] = useState<readonly string[]>(
    state === 'collector' ? allFamiliarOptions.map(option => option.id) : [],
  );
  const [equipped, setEquipped] = useState<string | undefined>(state === 'collector' ? 'nine-tailed-fox' : undefined);
  const date = useMemo(() => {
    if (state !== 'tomorrow') return undefined;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, [state]);
  const balances = state === 'signed-out' ? { qi: null, energy: null }
    : state === 'low-balances' ? { qi: 1_200, energy: 40 }
    : { qi: 28_400, energy: 1_250 };
  const purchase = async (attempt: CelestialStorePurchase): Promise<CelestialStorePurchaseResult> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    setOwned(previous => previous.includes(attempt.familiarId) ? previous : [...previous, attempt.familiarId]);
    const name = allFamiliarOptions.find(option => option.id === attempt.familiarId)?.name ?? 'The Familiar';
    return { outcome: 'purchased', message: `${name} joins your cave. Nothing real was charged.` };
  };
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <CelestialStorePanel
        options={allFamiliarOptions}
        cultivation={qiState(balances.qi)}
        energy={energyState(balances.energy)}
        ownedFamiliarIds={owned}
        equippedFamiliarId={equipped}
        onEquip={id => setEquipped(id)}
        onPurchase={state === 'signed-out' ? undefined : purchase}
        date={date}
        config={state === 'discount' ? DISCOUNT_CONFIG : undefined}
      />
    </div>
  );
}

function CelestialStoreReference() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400 sm:px-8">
      The Celestial Store has no production original. It extracts the official Store out of the
      profile into its own destination, built here first against the approved reference art —
      two framed shelves of daily Familiar offers, Energy above QI — and transfers to
      Light-Novels as a whole system. The creator User Store on public profiles is a separate,
      untouched surface.
    </div>
  );
}

export function CelestialStoreWorkspace() {
  const [previewState, setPreviewState] = useState<CelestialStorePreviewState>('wealthy');
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'Balances, ownership, and purchases here are preview props; nothing is deducted or persisted. The User Profile preview mounts the same page against the live development ledgers.',
        defaultSection: 'states',
        sections: [{
          id: 'states',
          description: STATES.find(option => option.id === previewState)?.description,
          content: (
            <div className="flex flex-wrap gap-2">
              {STATES.map(option => (
                <button key={option.id} type="button" aria-pressed={previewState === option.id} onClick={() => setPreviewState(option.id)}
                  className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${previewState === option.id
                    ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                    : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'}`}>
                  {option.label}
                </button>
              ))}
            </div>
          ),
        }],
      }}
      renderReference={() => <CelestialStoreReference />}
      renderDevelopment={() => <CelestialStorePreview key={previewState} state={previewState} />}
    />
  );
}
