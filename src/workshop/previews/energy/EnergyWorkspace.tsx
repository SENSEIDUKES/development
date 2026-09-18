/**
 * Workshop preview for the reusable Energy pieces.
 *
 * Preview-only shell. The pieces are driven by an in-process ledger so every
 * state (loading, ready, error, production account without development
 * controls) is reachable without a server. The profile preview is where the
 * same pieces run against the real `/api/energy` route.
 */
import { useMemo, useState } from 'react';
import { SEIToastProvider, useSEIToast } from '@seihouse/ui';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import type { EnergyClient } from '../../../components/energy/shared/energyClient';
import { useEnergyAccount } from '../../../components/energy/shared/useEnergyAccount';
import {
  EnergyActionCost,
  EnergyBalanceIndicator,
  EnergyDeductionNotice,
  EnergyInsufficientState,
  EnergyPanel,
  energyDeductionToast,
} from '../../../components/energy/development';
import { createLocalEnergyClient } from './localEnergyClient';

const entry = workshopEntries.find(candidate => candidate.id === 'energy')!;

type EnergyPreviewState = 'development-account' | 'production-account' | 'slow-network' | 'offline';

const STATES: { id: EnergyPreviewState; label: string; description: string }[] = [
  { id: 'development-account', label: 'Development account', description: 'A development user with the configured starting Energy and the grant/reset controls the server exposes to them.' },
  { id: 'production-account', label: 'Production account', description: 'A verified production user: zero starting Energy, no development controls anywhere.' },
  { id: 'slow-network', label: 'Slow network', description: 'The same development account behind a two-second delay, to inspect the loading states.' },
  { id: 'offline', label: 'Offline', description: 'Every request fails, to inspect the error state and its retry.' },
];

const clientFor = (state: EnergyPreviewState): EnergyClient => {
  if (state === 'offline') {
    const fail = async () => { throw new Error('Energy could not be reached. Check your connection and try again.'); };
    return { getSnapshot: fail, grantDevelopment: fail, resetDevelopment: fail };
  }
  return createLocalEnergyClient({
    uid: 'workshop-cultivator',
    developmentAccess: state !== 'production-account',
    delayMs: state === 'slow-network' ? 2_000 : 250,
  });
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EnergyPieces({ client }: { client: EnergyClient }) {
  const account = useEnergyAccount({ client });
  const { toast } = useSEIToast();
  const available = account.snapshot?.available ?? 0;
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <Section title="Balance indicator · lives inside other surfaces">
        <div className="flex flex-wrap items-center gap-4">
          <EnergyBalanceIndicator account={account} size="sm" />
          <EnergyBalanceIndicator account={account} size="md" />
          <EnergyBalanceIndicator account={account} size="lg" />
        </div>
      </Section>
      <Section title="Action cost indicator · read from the shared catalog, not yet on any generation button">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">Manifest chapter <EnergyActionCost actionId="chapter.generate" /></span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">Generate image <EnergyActionCost actionId="image.generate" /></span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">Narration (unpriced, renders nothing) <EnergyActionCost actionId="narration.generate" /></span>
        </div>
      </Section>
      <Section title="Successful deduction · notice and toast forms, not triggered by generation yet">
        <EnergyDeductionNotice details={{ amount: 1, actionLabel: 'Chapter', available: Math.max(0, available - 1) }} />
        <button type="button" className="workshop-touch-target mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
          onClick={() => toast(energyDeductionToast({ amount: 3, actionLabel: 'Image', available: Math.max(0, available - 3) }))}>
          Show the toast form
        </button>
      </Section>
      <Section title="Insufficient Energy · the blocked state a generation control will show">
        <EnergyInsufficientState required={3} available={Math.min(available, 1)} onOpenEnergy={() => toast({ title: 'A host opens its Energy panel here.', tone: 'info' })} />
      </Section>
      <Section title="Energy information panel · the profile's Energy destination">
        <EnergyPanel account={account} />
      </Section>
    </div>
  );
}

function EnergyReference() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400 sm:px-8">
      Energy has no production original. It is built here first, as the shared meter every SEN generation feature will draw from, and transfers to Light-Novels as a whole system.
    </div>
  );
}

export function EnergyWorkspace() {
  const [previewState, setPreviewState] = useState<EnergyPreviewState>('development-account');
  const client = useMemo(() => clientFor(previewState), [previewState]);
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'Every piece reads an in-process ledger with the same rules as the server. Nothing here spends Energy on a real generation.',
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
      renderReference={() => <EnergyReference />}
      renderDevelopment={() => (
        <SEIToastProvider key={previewState}>
          <EnergyPieces client={client} />
        </SEIToastProvider>
      )}
    />
  );
}
