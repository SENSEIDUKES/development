import React from 'react';
import { SEIButton, SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import type { QiAccountState } from '../../../library/cultivation/contracts';
import {
  ENERGY_ITEM_PRICES,
  ENERGY_PACKS,
  ENERGY_USD_PER_UNIT,
  QI_ITEM_PRICES,
  QI_PACKS,
  QI_USD_PER_UNIT,
} from '../../../library/cultivation/economyStandards';
import { QiAmount, formatQi } from '../../../library/cultivation/QiAmount';
import { DAO_RANKS, getDaoRankData } from '../../../library/cultivation/progression';
import {
  formatEnergyPriceRange,
  pricedEnergyActions,
  type EnergyActivityEntry,
} from '../shared/energyContracts';
import type { EnergyAccountState } from '../shared/useEnergyAccount';
import { formatEnergy } from './EnergyAmount';
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

const usd = (amount: number) => `$${amount.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;

function StandardList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="economy-standard-list">
      <h4>{title}</h4>
      <ul>{children}</ul>
    </div>
  );
}

export interface EnergyPanelProps {
  account: EnergyAccountState;
  /** Read-only, host-owned QI ledger projection. It is a spendable balance. */
  qi?: QiAccountState;
  /** Permanent profile DAO XP. It is intentionally independent of QI. */
  daoXp?: number | null;
  /** Optional title heading level; the panel itself has no page heading. */
  className?: string;
}

/**
 * The Library economy page: live Energy, spendable QI, and permanent DAO XP
 * together with their shared working standards. It renders balances from their
 * authoritative projections and keeps purchase/checkout deliberately outside
 * this presentational page.
 */
export function EnergyPanel({ account, qi, daoXp, className = '' }: EnergyPanelProps) {
  const { status, snapshot, error, pending } = account;
  const controls = snapshot?.developmentControls ?? null;
  const priced = snapshot?.prices.filter(entry => entry.price !== null) ?? pricedEnergyActions();
  const qiState = !qi || qi.status === 'unavailable' || qi.status === 'error' ? 'unavailable'
    : qi.status === 'ready' ? 'ready' : 'loading';
  const qiBalance = qi?.snapshot?.balance ?? null;
  const daoData = daoXp === undefined || daoXp === null ? null : getDaoRankData(daoXp);
  const daoBandProgress = daoData && daoData.maxDaoXp !== null
    ? daoData.currentDaoXp - daoData.rankThreshold
    : 0;
  const daoBandSize = daoData && daoData.maxDaoXp !== null
    ? daoData.maxDaoXp - daoData.rankThreshold
    : 0;

  return (
    <div className={`space-y-5 ${className}`.trim()} data-energy-panel data-energy-status={status}>
      <section className="economy-summary" aria-label="Energy, QI, and DAO XP balances" data-economy-summary>
        <article className="economy-summary-card" data-economy-balance="energy">
          <p className="economy-summary-label">Live Energy</p>
          {status === 'loading' && !snapshot ? (
            <SEILoadingState size="sm" title="Reading your Energy" />
          ) : (
            <EnergyBalanceIndicator account={account} size="lg" className="mt-1 text-neutral-100" />
          )}
          <p className="economy-summary-detail">Available for generation{snapshot?.held ? ` · ${formatEnergy(snapshot.held)} held` : ''}</p>
        </article>

        <article className="economy-summary-card" data-economy-balance="qi">
          <p className="economy-summary-label">Spendable QI</p>
          <QiAmount
            amount={qiBalance}
            state={qiState}
            className="economy-qi-amount mt-1"
            label={qiState === 'ready' && qiBalance !== null ? `QI balance ${formatQi(qiBalance)}` : 'QI balance unavailable'}
          />
          <p className="economy-summary-detail">Earn or purchase QI · never rank progress</p>
        </article>

        <article className="economy-summary-card" data-economy-balance="dao-xp">
          <p className="economy-summary-label">Permanent DAO XP</p>
          {daoData ? (
            <>
              <p className="economy-dao-total">{formatQi(daoData.currentDaoXp)} <span>DAO XP</span></p>
              <p className="economy-summary-detail" data-dao-rank-summary>
                {daoData.maxDaoXp === null
                  ? `${daoData.rank} · maximum rank`
                  : `Current rank: ${daoData.rank} · ${formatQi(daoBandProgress)} / ${formatQi(daoBandSize)} to ${daoData.nextRank}`}
              </p>
              <div className="economy-dao-progress" role="progressbar"
                aria-label={daoData.maxDaoXp === null ? 'DAO XP maximum rank' : `DAO XP progress toward ${daoData.nextRank}`}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(daoData.progress)}
                aria-valuetext={daoData.maxDaoXp === null
                  ? `${formatQi(daoData.currentDaoXp)} DAO XP, maximum rank`
                  : `${formatQi(daoData.currentDaoXp)} DAO XP of ${formatQi(daoData.maxDaoXp)} toward ${daoData.nextRank}`}
              >
                <span style={{ width: `${daoData.progress}%` }} />
              </div>
            </>
          ) : (
            <p className="economy-summary-detail mt-2">DAO XP is unavailable until the profile supplies permanent progression.</p>
          )}
        </article>
      </section>

      {status === 'error' && error ? (
        <SEIInlineAlert tone="warning" title="Energy could not be read" action={<SEIButton type="button" variant="soft" onClick={() => void account.refresh()}>Try again</SEIButton>}>
          {error}
        </SEIInlineAlert>
      ) : null}
      {status === 'unavailable' ? (
        <SEIInlineAlert tone="info" title="Energy is not connected here">Sign in to see your Energy balance and activity.</SEIInlineAlert>
      ) : null}

      <section className="economy-section" data-economy-section="energy" aria-labelledby="energy-working-standards">
        <div>
          <h3 id="energy-working-standards">Energy</h3>
          <p>Energy powers generation throughout SEN. <strong>1 Energy = {usd(ENERGY_USD_PER_UNIT)}.</strong></p>
        </div>
        <div className="economy-standard-grid">
          <StandardList title="Packs">
            {ENERGY_PACKS.map(pack => <li key={pack.amount}><span>{formatEnergy(pack.amount)} Energy</span><strong>{usd(pack.priceUsd)}</strong></li>)}
          </StandardList>
          <StandardList title="Item prices">
            {Object.entries(ENERGY_ITEM_PRICES).map(([rarity, price]) => <li key={rarity}><span>{rarity}</span><strong>{formatEnergy(price!)} Energy</strong></li>)}
          </StandardList>
        </div>
        <StandardList title="Projected generation costs">
          {priced.map(entry => (
            <li key={entry.actionId} data-energy-action={entry.actionId}>
              <span>{entry.label} <em>Projected</em></span>
              <strong>{formatEnergyPriceRange(entry)} Energy</strong>
            </li>
          ))}
        </StandardList>
        <p className="economy-note">Packs are displayed working prices only. No checkout is connected here; projected generation costs become charges only when a host completes a successful server-authorized generation.</p>
      </section>

      <section className="economy-section" data-economy-section="qi" aria-labelledby="qi-working-standards">
        <div>
          <h3 id="qi-working-standards">QI</h3>
          <p>QI is a spendable balance users can earn or purchase. <strong>1 QI = {usd(QI_USD_PER_UNIT)}.</strong> Buying or spending QI never changes DAO XP or rank.</p>
        </div>
        <div className="economy-standard-grid">
          <StandardList title="Packs">
            {QI_PACKS.map(pack => <li key={pack.amount}><span>{formatQi(pack.amount)} QI</span><strong>{usd(pack.priceUsd)}</strong></li>)}
          </StandardList>
          <StandardList title="Item prices">
            {Object.entries(QI_ITEM_PRICES).map(([rarity, price]) => <li key={rarity}><span>{rarity}</span><strong>{formatQi(price)} QI</strong></li>)}
          </StandardList>
        </div>
        <p className="economy-note">Pack prices are visible for planning only. This page does not add a checkout, daily award, or achievement payout.</p>
      </section>

      <section className="economy-section" data-economy-section="dao-xp" aria-labelledby="dao-xp-ranks">
        <div>
          <h3 id="dao-xp-ranks">DAO XP ranks</h3>
          <p>DAO XP is permanent earned progression. The rank ladder below is the source of truth for profile rank, aura unlocks, and progress displays.</p>
        </div>
        <ol className="economy-rank-list">
          {DAO_RANKS.map(rank => <li key={rank.id} data-dao-rank={rank.id}><span>{rank.name}</span><strong>{formatQi(rank.threshold)} DAO XP</strong></li>)}
        </ol>
      </section>

      {snapshot ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-labelledby="energy-panel-activity">
          <h3 id="energy-panel-activity" className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400">Recent Energy activity</h3>
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
