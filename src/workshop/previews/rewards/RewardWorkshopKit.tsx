/**
 * Workshop-only pieces shared by the Rewards workspaces: the balance strip,
 * the ledger feed, and the labels that keep simulated controls honest. None
 * of it is product UI.
 */
import React from 'react';
import { getDaoRankData, getRankForDaoXp, rankBackground } from '@seihouse/library/cultivation';
import { useRewardAccount } from './WorkshopEconomyProvider';

const formatWhole = (value: number) => value.toLocaleString('en-US');

/** Marks a control that stands in for a system that is not built yet. */
export function SimulatedBadge({ children = 'Simulated' }: { children?: React.ReactNode }) {
  return (
    <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-100" data-workshop-simulated>
      {children}
    </span>
  );
}

/** A labelled Workshop panel. */
export function WorkshopCard({ title, badge, description, children, className = '' }: {
  title: string;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">{title}</h2>
        {badge}
      </div>
      {description ? <div className="mt-1 text-[11px] leading-relaxed text-white/45">{description}</div> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export function WorkshopActionButton({ onClick, disabled, children, pressed }: {
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={pressed}
      className={`workshop-touch-target min-h-11 rounded-lg border px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${pressed
        ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
        : 'border-white/10 text-white/70 hover:border-white/25 hover:bg-white/5 hover:text-white'}`}>
      {children}
    </button>
  );
}

/** The Workshop account's three balances, as the ledgers report them. */
export function BalanceStrip() {
  const { qi, daoXp, energy } = useRewardAccount();
  const xp = daoXp.snapshot?.balance ?? null;
  const rankData = getDaoRankData(xp ?? 0);
  const rank = getRankForDaoXp(xp ?? 0);
  return (
    <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-center" data-reward-balances>
      <div>
        <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">DAO XP · rank</dt>
        <dd className="mt-1 font-mono text-sm text-sky-100" data-balance="dao-xp">{xp === null ? '…' : formatWhole(xp)}</dd>
        <dd className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-white/70" data-balance="rank">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: rankBackground(rank.visual) }} />
          {rankData.rank}
        </dd>
      </div>
      <div>
        <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">QI to spend</dt>
        <dd className="mt-1 font-mono text-sm text-amber-100" data-balance="qi">{qi.snapshot ? formatWhole(qi.snapshot.balance) : '…'}</dd>
      </div>
      <div>
        <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">Energy</dt>
        <dd className="mt-1 font-mono text-sm text-violet-200" data-balance="energy">{energy.snapshot ? formatWhole(energy.snapshot.available) : '…'}</dd>
      </div>
    </dl>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  achievement: 'Mystery Scroll',
  creation: 'Creation',
  'fate-survival-relic': 'Fate Survival Relic',
  'opening-balance': 'Opening balance',
  'dao-pillar': 'Dao Pillar',
  'mystery-scroll': 'Mystery Scroll',
  'familiar-training': 'Familiar training',
  'celestial-store': 'Celestial Store',
  'development-grant': 'Workshop grant',
};

/** Every recent ledger line across DAO XP, QI and Energy, newest first: where each balance came from. */
export function LedgerFeed({ limit = 8 }: { limit?: number }) {
  const { qi, daoXp, energy } = useRewardAccount();
  const lines = [
    ...(daoXp.snapshot?.transactions ?? []).map(line => ({ id: `dao-xp-${line.id}`, at: line.createdAt, text: `+${formatWhole(line.amount)} DAO XP`, source: SOURCE_LABELS[line.source] ?? line.source, tone: 'text-sky-200' })),
    ...(qi.snapshot?.transactions ?? []).map(line => ({ id: `qi-${line.id}`, at: line.createdAt, text: `${line.kind === 'spend' ? '−' : '+'}${formatWhole(line.amount)} QI`, source: SOURCE_LABELS[line.source] ?? line.source, tone: line.kind === 'spend' ? 'text-rose-200' : 'text-amber-100' })),
    ...(energy.snapshot?.activity ?? []).filter(line => line.kind === 'grant' || line.kind === 'spend').map(line => ({ id: `energy-${line.id}`, at: line.createdAt, text: `${line.kind === 'spend' ? '−' : '+'}${formatWhole(line.amount)} Energy`, source: line.description, tone: line.kind === 'spend' ? 'text-rose-200' : 'text-violet-200' })),
  ].sort((left, right) => right.at.localeCompare(left.at)).slice(0, limit);
  return (
    <WorkshopCard title="Ledger" description="What the server's ledgers recorded, newest first. The Workshop only reads them.">
      {lines.length === 0 ? <p className="text-[11px] italic text-white/35">Nothing recorded yet.</p> : (
        <ul className="space-y-1" data-reward-ledger>
          {lines.map(line => (
            <li key={line.id} className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
              <span className={line.tone}>{line.text}</span>
              <span className="truncate text-white/45">{line.source}</span>
            </li>
          ))}
        </ul>
      )}
    </WorkshopCard>
  );
}
