import React from 'react';
import { SEIButton, SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import type { EnergyActivityEntry } from '../shared/energyContracts';
import type { EnergyAccountState } from '../shared/useEnergyAccount';
import { EnergyAmount, formatEnergy } from './EnergyAmount';
import { EnergyBalanceIndicator } from './EnergyBalanceIndicator';
import './energy.css';

const activityDirection = (entry: EnergyActivityEntry): string => {
  switch (entry.kind) {
    case 'grant': return `+${formatEnergy(entry.amount)}`;
    case 'charge': return `−${formatEnergy(entry.amount)}`;
    case 'reserve': return `${formatEnergy(entry.amount)} held`;
    case 'release': return `${formatEnergy(entry.amount)} returned`;
  }
};

const activityTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export interface EnergyPanelProps {
  account: EnergyAccountState;
  /** Optional title heading level; the panel itself has no page heading. */
  className?: string;
}

/**
 * The Energy information panel: balance, what Energy is for, current example
 * costs, recent activity, and — only when the server exposed them — the
 * development grant and reset controls. Everything shown is the server's
 * snapshot; the panel decides layout, never numbers.
 */
export function EnergyPanel({ account, className = '' }: EnergyPanelProps) {
  const { status, snapshot, error, pending } = account;
  const controls = snapshot?.developmentControls ?? null;
  const priced = snapshot?.prices.filter(entry => entry.price !== null) ?? [];

  return (
    <div className={`space-y-5 ${className}`.trim()} data-energy-panel data-energy-status={status}>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-labelledby="energy-panel-balance">
        <div className="energy-panel-balance">
          <div>
            <h3 id="energy-panel-balance" className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400">Available Energy</h3>
            {status === 'loading' && !snapshot ? (
              <SEILoadingState size="sm" title="Reading your Energy" />
            ) : (
              <EnergyBalanceIndicator account={account} size="lg" className="mt-1 text-neutral-100" />
            )}
          </div>
          {snapshot && snapshot.held > 0 ? (
            <p className="energy-panel-row-meta" data-energy-held>
              <EnergyAmount amount={snapshot.held} size="sm" label={`${formatEnergy(snapshot.held)} Energy held for work in progress`} /> held for work in progress
            </p>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          Energy powers generation throughout SEN. Each chapter, image, or other generated piece draws a small amount; your balance only moves when something is actually made.
        </p>
      </section>

      {status === 'error' && error ? (
        <SEIInlineAlert tone="warning" title="Energy could not be read" action={<SEIButton type="button" variant="soft" onClick={() => void account.refresh()}>Try again</SEIButton>}>
          {error}
        </SEIInlineAlert>
      ) : null}
      {status === 'unavailable' ? (
        <SEIInlineAlert tone="info" title="Energy is not connected here">Sign in to see your Energy balance and activity.</SEIInlineAlert>
      ) : null}

      {priced.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-labelledby="energy-panel-costs">
          <h3 id="energy-panel-costs" className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400">Example costs</h3>
          <ul className="energy-panel-list mt-2" data-energy-costs>
            {priced.map(entry => (
              <li key={entry.actionId} className="energy-panel-row" data-energy-action={entry.actionId}>
                <span className="text-neutral-200">{entry.label}</span>
                <EnergyAmount amount={entry.price} size="sm" label={`${entry.label} costs ${formatEnergy(entry.price!)} Energy`} />
              </li>
            ))}
          </ul>
          <p className="energy-panel-row-meta mt-2">Test prices for development. Nothing spends Energy yet.</p>
        </section>
      ) : null}

      {snapshot ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-labelledby="energy-panel-activity">
          <h3 id="energy-panel-activity" className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400">Recent activity</h3>
          {snapshot.activity.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">No Energy activity yet.</p>
          ) : (
            <ol className="energy-panel-list mt-2" data-energy-activity>
              {snapshot.activity.map(entry => (
                <li key={entry.id} className="energy-panel-row" data-energy-activity-kind={entry.kind}>
                  <span className="min-w-0">
                    <span className="block text-neutral-200">{entry.description}</span>
                    <span className="energy-panel-row-meta block">{activityTime(entry.createdAt)} · balance {formatEnergy(entry.balanceAfter)}</span>
                  </span>
                  <span className="shrink-0 text-neutral-300">{activityDirection(entry)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {controls ? (
        <section className="rounded-xl border border-dashed border-cyan-400/25 bg-cyan-500/[0.04] p-4" aria-labelledby="energy-panel-development" data-energy-development-controls>
          <h3 id="energy-panel-development" className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-200/70">Development controls</h3>
          <p className="mt-1 text-xs text-neutral-400">
            Test Energy for this development account. New development accounts start with {formatEnergy(controls.initialGrant)} Energy. These controls never appear for production users.
          </p>
          <div className="energy-panel-dev mt-3">
            <SEIButton type="button" variant="soft" loading={pending} disabled={pending} onClick={() => void account.grantDevelopment()}>
              {`Grant ${formatEnergy(controls.defaultGrant)} Energy`}
            </SEIButton>
            <SEIButton type="button" variant="ghost" disabled={pending} onClick={() => void account.resetDevelopment()}>
              Reset to starting Energy
            </SEIButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}
