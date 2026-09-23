import React, { useState } from 'react';
import { Swords } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import type { RelicsState } from '../../../library/relics/relicsClient';
import { RewardGrants } from '../../rewards/development/RewardGrants';
import { rewardTheme } from '../../rewards/development/rewardTheme';
import '../../rewards/development/rewards.css';
import { RelicReveal, relicIcon } from './RelicReveal';

/** What `useRelics()` returns; any host adapter with the same shape works. */
export type RelicsAccount = RelicsState & { refresh(): Promise<void>; connected: boolean };

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * The cultivator's Fate Survival Relics: a small collection, one Relic per
 * survived challenge, each showing the DAO XP and Energy it delivered.
 * Nothing here is equipped, attuned, offered, or spent.
 */
export function FateSurvivalRelicsPanel({ relics }: { relics: RelicsAccount }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const snapshot = relics.snapshot;
  const selected = selectedId ? snapshot?.relics.find(relic => relic.id === selectedId) ?? null : null;

  if (relics.status === 'unavailable') {
    return <SEIInlineAlert tone="info" title="Relics not connected">Fate Survival Relics are not connected here.</SEIInlineAlert>;
  }
  if (!snapshot) {
    return relics.status === 'error' ? (
      <SEIInlineAlert tone="danger" role="alert" title="Relics unavailable">
        {relics.error ?? 'Relics are unavailable right now.'}
        <LibraryButton className="mt-3" size="sm" variant="secondary" onClick={() => void relics.refresh()}>Try again</LibraryButton>
      </SEIInlineAlert>
    ) : <SEILoadingState size="sm" title="Loading Relics" />;
  }

  return (
    <LibraryPanel padding="md" as="section" aria-labelledby="fate-survival-relics-heading" data-fate-survival-relics>
      <h3 id="fate-survival-relics-heading" className="reward-panel-heading flex items-center gap-2">
        <Swords size={14} aria-hidden /> Fate Survival Relics · {snapshot.relics.length}
      </h3>
      {snapshot.relics.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400" data-reward-empty>
          Relics come only from Fate Survival challenges. Survive one to earn your first.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {snapshot.relics.map(relic => {
            const { hex } = rewardTheme(relic.rarity);
            const Icon = relicIcon(relic.name);
            return (
              <li key={relic.id}>
                <button type="button" className="reward-scroll-tile" onClick={() => setSelectedId(relic.id)}
                  aria-label={`View ${relic.name}, a ${relic.rarity} Relic`} data-fate-survival-relic={relic.relicKey}
                  style={{ '--reward-tile-accent': `${hex}8c`, '--reward-tile-glow': `${hex}24` } as React.CSSProperties}>
                  <span className="reward-scroll-seal" style={{ color: hex }} aria-hidden><Icon size={20} strokeWidth={1.5} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm text-neutral-100">{relic.name}</span>
                    <span className="block text-xs" style={{ color: `${hex}d9` }}>{relic.rarity} · {relic.outcome.toLowerCase()}</span>
                    <span className="block text-[11px] text-neutral-500">{formatDate(relic.earnedAt)}</span>
                    <RewardGrants className="mt-1.5" grants={relic.delivered.length ? relic.delivered : relic.rewards} tone="muted" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {selected ? <RelicReveal key={selected.id} relic={selected} initiallyRevealed onClose={() => setSelectedId(null)} /> : null}
    </LibraryPanel>
  );
}
