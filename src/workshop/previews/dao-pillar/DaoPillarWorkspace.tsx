/**
 * Workshop preview for the Daily Dao Pillar calendar.
 *
 * Preview-only shell. The view is driven by an in-process calendar service so
 * every state (fresh cycle, mid-cycle with missed days, collected today, a
 * milestone day, before the start, after the end, a failing claim, offline)
 * is reachable without a server. The User Profile preview is where the same
 * view runs against the real `/api/dao-pillar` route.
 */
import { useMemo, useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { DaoPillarView } from '../../../components/dao-pillar/development/DaoPillarView';
import { useDaoPillarCalendar } from '../../../components/dao-pillar/shared/useDaoPillarCalendar';
import type { DaoPillarClient } from '../../../components/dao-pillar/shared/daoPillarClient';
import { createLocalDaoPillarClient } from './localDaoPillarClient';

const entry = workshopEntries.find(candidate => candidate.id === 'dao-pillar')!;

type DaoPillarPreviewState = 'mid-cycle' | 'fresh-start' | 'collected-today' | 'milestone-today' | 'before-start' | 'cycle-complete' | 'claim-failed' | 'slow-network' | 'offline';

const STATES: { id: DaoPillarPreviewState; label: string; description: string }[] = [
  { id: 'mid-cycle', label: 'Day 13, mid-cycle', description: 'Twelve days behind, two of them missed, today open to collect. The reference layout.' },
  { id: 'fresh-start', label: 'Day 1', description: 'The first day of a new cycle: nothing collected yet, everything ahead locked.' },
  { id: 'collected-today', label: 'Collected today', description: 'Today already collected; the tile shows its check and tapping it shows when.' },
  { id: 'milestone-today', label: 'Milestone day', description: 'Day 14 open: the 500 Qi milestone with its stronger emphasis.' },
  { id: 'before-start', label: 'Before the start', description: 'The theme has not begun; every tile is locked and the footer says when it opens.' },
  { id: 'cycle-complete', label: 'Cycle complete', description: 'Thirty days behind us; the calendar is read-only history.' },
  { id: 'claim-failed', label: 'Claim failure', description: 'The server refuses the collection; the tile stays open to retry and nothing is deposited.' },
  { id: 'slow-network', label: 'Slow network', description: 'Two seconds of latency on every read and claim, to inspect the loading states.' },
  { id: 'offline', label: 'Offline', description: 'Every request fails, to inspect the error state and its retry.' },
];

const clientFor = (state: DaoPillarPreviewState): DaoPillarClient => {
  const uid = 'workshop-cultivator';
  switch (state) {
    case 'fresh-start': return createLocalDaoPillarClient({ uid, todayIsDay: 1, delayMs: 250 });
    case 'collected-today': return createLocalDaoPillarClient({ uid, collectedDays: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12], collectedToday: true, delayMs: 250 });
    case 'milestone-today': return createLocalDaoPillarClient({ uid, todayIsDay: 14, collectedDays: [7, 8, 9, 10, 11, 12, 13], delayMs: 250 });
    case 'before-start': return createLocalDaoPillarClient({ uid, phase: 'before', delayMs: 250 });
    case 'cycle-complete': return createLocalDaoPillarClient({ uid, phase: 'after', collectedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].filter(day => day !== 17 && day !== 23), delayMs: 250 });
    case 'claim-failed': return createLocalDaoPillarClient({ uid, mode: 'claim-failed', collectedDays: [9, 10, 11, 12], delayMs: 250 });
    case 'slow-network': return createLocalDaoPillarClient({ uid, collectedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], delayMs: 2_000 });
    case 'offline': return createLocalDaoPillarClient({ uid, mode: 'offline' });
    case 'mid-cycle':
    default:
      return createLocalDaoPillarClient({ uid, collectedDays: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12], delayMs: 250 });
  }
};

function DaoPillarPreview({ client }: { client: DaoPillarClient }) {
  const [deposits, setDeposits] = useState<string[]>([]);
  const calendar = useDaoPillarCalendar({
    client,
    onRewardDelivered: delivered => setDeposits(previous => [
      `${new Date().toLocaleTimeString()} · +${delivered.reduce((total, entry) => total + entry.amount, 0)} Qi deposited by the server`,
      ...previous,
    ].slice(0, 5)),
  });
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <DaoPillarView calendar={calendar} />
      <section className="mt-8 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">Workshop only · what the host would mirror onto the profile</h2>
        {deposits.length === 0
          ? <p className="mt-3 text-[11px] italic text-white/30">No deposit delivered yet.</p>
          : <ul className="mt-3 space-y-1 text-[11px] text-white/60">{deposits.map(line => <li key={line}>{line}</li>)}</ul>}
      </section>
    </div>
  );
}

function DaoPillarReference() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400 sm:px-8">
      The Daily Dao Pillar calendar has no production original. It replaces the profile's daily refinement check-in with a server-owned 30-day reward calendar, built here first against the approved Beta Test design, and transfers to Light-Novels as a whole system.
    </div>
  );
}

export function DaoPillarWorkspace() {
  const [previewState, setPreviewState] = useState<DaoPillarPreviewState>('mid-cycle');
  const client = useMemo(() => clientFor(previewState), [previewState]);
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'The calendar reads an in-process service with the same rules as the server: it decides the day, the reward, and the deposit. Claims here award nothing real.',
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
      renderReference={() => <DaoPillarReference />}
      renderDevelopment={() => <DaoPillarPreview key={previewState} client={client} />}
    />
  );
}
