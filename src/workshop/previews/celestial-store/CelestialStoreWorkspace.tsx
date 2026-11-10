/**
 * Workshop preview for the dedicated Celestial Store stage.
 *
 * Preview-only shell. The panel is props-driven, so each state supplies its
 * own balances, ownership, and purchase behavior directly — no server, no
 * ledger writes. The User Profile preview (`?preview=user-profile&cave=/home/store`)
 * and the NovelExpanded app (`/app/?page=profile&cave=%2Fhome%2Fstore`) mount
 * the same stage against the live QI ledger and Energy account.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { allFamiliarOptions } from '../../../host/familiar/catalogue';
import {
  CELESTIAL_STORE_CONFIG,
  CelestialStorePanel,
  dailyStoreRotation,
  type CelestialStoreConfig,
  type CelestialStorePurchase,
  type CelestialStorePurchaseResult,
} from '@seihouse/library/celestial-store';
import type { QiAccountState } from '@seihouse/library/cultivation';
import type { EnergyAccountState } from '@seihouse/library/energy';

const entry = workshopEntries.find(candidate => candidate.id === 'celestial-store')!;

type CelestialStorePreviewState = 'wealthy' | 'mixed' | 'low-balances' | 'collector' | 'signed-out' | 'discount' | 'tomorrow';
type CelestialStoreViewportMode = 'responsive' | 'phone';

const STATES: { id: CelestialStorePreviewState; label: string; description: string }[] = [
  { id: 'wealthy', label: 'Ready to spend', description: 'Rich QI and Energy balances; every offer is affordable and purchasable in memory.' },
  { id: 'mixed', label: 'Mixed (2 owned)', description: 'Two daily offers already owned (one equipped) alongside four priced offers for sale — compare Owned vs For Sale weight.' },
  { id: 'low-balances', label: 'Low balances', description: 'Too little of both currencies: every Buy is disabled with the honest reason.' },
  { id: 'collector', label: 'Collector', description: 'Everything owned, one Familiar equipped — matches the practice account when all daily offers are owned.' },
  { id: 'signed-out', label: 'Balances unavailable', description: 'No QI or Energy account mounted; balances show as unknown and purchases stay disabled.' },
  { id: 'discount', label: 'Configured discount', description: 'A genuine sale configured on today’s lead Energy offer: current price beside the struck normal price.' },
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

function buildDiscountConfig(referenceDate?: Date): CelestialStoreConfig {
  const lead = dailyStoreRotation(allFamiliarOptions, referenceDate ?? new Date()).energy[0];
  const targetId = lead?.familiarId ?? 'celestial-guardian';
  const salePrice = lead ? Math.max(100, Math.round(lead.price * 0.75)) : 450;
  return {
    ...CELESTIAL_STORE_CONFIG,
    offers: CELESTIAL_STORE_CONFIG.offers.map(offer =>
      offer.familiarId === targetId ? { ...offer, salePrice } : offer),
  };
}

function CelestialStorePreview({
  state,
  viewportMode,
}: {
  state: CelestialStorePreviewState;
  viewportMode: CelestialStoreViewportMode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [stageHeight, setStageHeight] = useState<string>('calc(100dvh - 8.5rem)');

  const date = useMemo(() => {
    if (state !== 'tomorrow') return undefined;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, [state]);

  const initialMixedOwned = useMemo(() => {
    const today = dailyStoreRotation(allFamiliarOptions, date ?? new Date());
    const ordered = [...today.energy, ...today.qi];
    return [ordered[0]?.familiarId, ordered[3]?.familiarId].filter((id): id is string => Boolean(id));
  }, [date]);

  const [owned, setOwned] = useState<readonly string[]>(() => (
    state === 'collector'
      ? allFamiliarOptions.map(option => option.id)
      : state === 'mixed'
        ? initialMixedOwned
        : []
  ));
  const [equipped, setEquipped] = useState<string | undefined>(() => (
    state === 'collector'
      ? 'nine-tailed-fox'
      : state === 'mixed'
        ? initialMixedOwned[0]
        : undefined
  ));

  const discountConfig = useMemo(
    () => (state === 'discount' ? buildDiscountConfig(date) : undefined),
    [state, date],
  );

  // Measure the remaining viewport below Workshop Controls so the stage fills
  // the screen cleanly without pushing the Workshop document into vertical scroll.
  useEffect(() => {
    const updateHeight = () => {
      const node = hostRef.current;
      if (!node || typeof window === 'undefined') return;
      const top = node.getBoundingClientRect().top;
      const bottomInset = window.innerWidth >= 640 ? 16 : 0;
      const available = Math.max(380, Math.floor(window.innerHeight - top - bottomInset));
      setStageHeight(`${available}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    const controls = document.querySelector('[data-workshop-controls]');
    const observer = typeof ResizeObserver !== 'undefined' && controls
      ? new ResizeObserver(updateHeight)
      : null;
    if (controls && observer) observer.observe(controls);
    return () => {
      window.removeEventListener('resize', updateHeight);
      observer?.disconnect();
    };
  }, [viewportMode]);

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
    <div
      ref={hostRef}
      className={viewportMode === 'phone'
        ? 'w-full text-neutral-200 sm:px-6 sm:pt-3'
        : 'mx-auto w-full max-w-6xl text-neutral-200 sm:px-6 sm:pt-3'}
    >
      <div
        className={viewportMode === 'phone'
          ? 'w-full overflow-hidden sm:mx-auto sm:w-[390px] sm:rounded-2xl sm:border sm:border-white/15'
          : 'w-full overflow-hidden sm:rounded-2xl sm:border sm:border-white/15'}
        style={{ ['--celestial-store-height' as string]: stageHeight }}
      >
        <CelestialStorePanel
          options={allFamiliarOptions}
          cultivation={qiState(balances.qi)}
          energy={energyState(balances.energy)}
          ownedFamiliarIds={owned}
          equippedFamiliarId={equipped}
          onEquip={id => setEquipped(id)}
          onPurchase={state === 'signed-out' ? undefined : purchase}
          date={date}
          config={discountConfig}
        />
      </div>
    </div>
  );
}

export function CelestialStoreWorkspace() {
  const [previewState, setPreviewState] = useState<CelestialStorePreviewState>('wealthy');
  const [viewportMode, setViewportMode] = useState<CelestialStoreViewportMode>('responsive');

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        description: 'Preview props only — nothing deducted or persisted. Open Profile › Store in /app/ for live ledgers.',
        defaultSection: 'states',
        sections: [
          {
            id: 'states',
            description: STATES.find(option => option.id === previewState)?.description,
            content: (
              <div className="flex flex-wrap gap-2">
                {STATES.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={previewState === option.id}
                    onClick={() => setPreviewState(option.id)}
                    className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${previewState === option.id
                      ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                      : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ),
          },
          {
            id: 'pages',
            description: 'Switch between the adaptive container (segmented top pills on phones, Genshin-style left Shop rail on wider screens) and a pinned 390px phone frame on desktop.',
            content: (
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'responsive', label: 'Adaptive stage' },
                  { id: 'phone', label: 'Phone frame · 390px' },
                ] as const).map(option => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={viewportMode === option.id}
                    onClick={() => setViewportMode(option.id)}
                    className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${viewportMode === option.id
                      ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                      : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ),
          },
        ],
      }}
      renderDevelopment={() => (
        <CelestialStorePreview
          key={previewState}
          state={previewState}
          viewportMode={viewportMode}
        />
      )}
    />
  );
}
