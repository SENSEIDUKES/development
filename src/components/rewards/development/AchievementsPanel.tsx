import React, { useMemo, useState } from 'react';
import { BookOpen, Compass, Feather, Lock, Radio, ScrollText, type LucideIcon } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  type AchievementCategory,
  type AchievementView,
  type MysteryScrollView,
  type OpenMysteryScrollResponse,
} from '../../../library/rewards/achievements';
import type { AchievementsState } from '../../../library/rewards/achievementsClient';
import { MysteryScrollReveal } from './MysteryScrollReveal';
import { RewardGrants } from './RewardGrants';
import { rewardTheme } from './rewardTheme';
import './rewards.css';

/** What `useAchievements()` returns; any host adapter with the same shape works. */
export type AchievementsAccount = AchievementsState & {
  open(scrollId: string): Promise<OpenMysteryScrollResponse>;
  refresh(): Promise<void>;
  connected: boolean;
};

const CATEGORY_ICONS: Record<AchievementCategory, LucideIcon> = {
  reading: BookOpen,
  creation: Feather,
  exploration: Compass,
  media: Radio,
};
const CATEGORY_ORDER: readonly AchievementCategory[] = ['reading', 'creation', 'exploration', 'media'];
const STATUS_LABELS: Record<AchievementView['status'], string> = {
  earned: 'Earned',
  'in-progress': 'In progress',
  locked: 'Not started',
  planned: 'Coming later',
};
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatWhole = (value: number) => value.toLocaleString('en-US');

function ScrollTile({ scroll, onSelect }: { scroll: MysteryScrollView; onSelect: () => void }) {
  const sealed = scroll.status === 'sealed';
  const { hex } = rewardTheme(scroll.rarity);
  const summary = sealed
    ? scroll.presentation === 'curated' ? `Sealed · ${scroll.rarity} milestone` : 'Sealed · contents hidden'
    : `Opened ${formatDate(scroll.openedAt ?? scroll.earnedAt)}${scroll.rarity ? ` · ${scroll.rarity}` : ''}`;
  return (
    <li>
      <button type="button" className="reward-scroll-tile" onClick={onSelect} data-reward-sealed={sealed || undefined}
        data-mystery-scroll={scroll.achievementKey}
        aria-label={sealed ? `Open the Mystery Scroll for ${scroll.achievementName}` : `View the opened scroll for ${scroll.achievementName}`}
        style={{ '--reward-tile-accent': `${hex}8c`, '--reward-tile-glow': `${hex}24` } as React.CSSProperties}>
        <span className="reward-scroll-seal" style={{ color: sealed ? '#d4af37' : hex }} aria-hidden>
          <ScrollText size={20} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm text-neutral-100">{scroll.achievementName}</span>
          <span className="block text-xs text-neutral-400">{summary}</span>
          {sealed && scroll.rewards ? <RewardGrants className="mt-1.5" grants={scroll.rewards} /> : null}
          {!sealed && scroll.delivered ? <RewardGrants className="mt-1.5" grants={scroll.delivered} tone="muted" /> : null}
        </span>
        {sealed && <span className="shrink-0 rounded-full border border-amber-300/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-100">Open</span>}
      </button>
    </li>
  );
}

function AchievementRow({ achievement }: { achievement: AchievementView }) {
  const progress = achievement.progress;
  const percent = progress && progress.target > 0 ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : 0;
  return (
    <li className="border-b border-white/10 py-3 last:border-b-0" data-achievement={achievement.key} data-achievement-status={achievement.status}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-display text-sm text-neutral-100">
            {achievement.hidden ? <Lock size={13} aria-hidden className="shrink-0 text-neutral-500" /> : null}
            <span className="[overflow-wrap:anywhere]">{achievement.name}</span>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-400 [overflow-wrap:anywhere]">{achievement.description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${achievement.status === 'earned'
          ? 'border-amber-300/40 text-amber-100' : achievement.status === 'planned' ? 'border-white/10 text-neutral-500' : 'border-white/15 text-neutral-300'}`}>
          {STATUS_LABELS[achievement.status]}
        </span>
      </div>
      {progress && achievement.status !== 'earned' ? (
        <div className="mt-2">
          <div className="reward-progress-track" role="progressbar" aria-label={`${achievement.name} progress`}
            aria-valuemin={0} aria-valuemax={progress.target} aria-valuenow={progress.current}
            aria-valuetext={`${formatWhole(progress.current)} of ${formatWhole(progress.target)} ${progress.unit}`}>
            <span className="reward-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 font-mono text-[10px] text-neutral-500">{formatWhole(progress.current)} / {formatWhole(progress.target)} {progress.unit}</p>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
        {achievement.curatedRewards ? (
          <>
            <span>{achievement.rarity ? `${achievement.rarity} milestone scroll:` : 'Milestone scroll:'}</span>
            <RewardGrants grants={achievement.curatedRewards} />
          </>
        ) : achievement.status === 'planned' ? (
          <span>Reward decided when this goal opens.</span>
        ) : (
          <span className="flex items-center gap-1"><ScrollText size={12} aria-hidden /> Reward: a Mystery Scroll</span>
        )}
      </div>
    </li>
  );
}

/**
 * Library achievements and the Mystery Scrolls they earn. Everything shown is
 * the server's snapshot: progress, which goals stay hidden, which scrolls are
 * sealed and what an opened scroll delivered. Opening a scroll is the only
 * action, and the server decides what it holds.
 */
export function AchievementsPanel({ achievements, minimumUnsealMs }: {
  achievements: AchievementsAccount;
  /** Passed to the scroll reveal; tests set 0. */
  minimumUnsealMs?: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const snapshot = achievements.snapshot;
  const scrolls = useMemo(() => snapshot
    ? [...snapshot.scrolls].sort((left, right) => Number(right.status === 'sealed') - Number(left.status === 'sealed'))
    : [], [snapshot]);
  const selected = selectedId ? snapshot?.scrolls.find(scroll => scroll.id === selectedId) ?? null : null;
  const selectedDescription = selected ? snapshot?.achievements.find(entry => entry.key === selected.achievementKey)?.description : undefined;

  if (achievements.status === 'unavailable') {
    return <SEIInlineAlert tone="info" title="Achievements not connected">Achievements and Mystery Scrolls are not connected here.</SEIInlineAlert>;
  }
  if (!snapshot) {
    return achievements.status === 'error' ? (
      <SEIInlineAlert tone="danger" role="alert" title="Achievements unavailable">
        {achievements.error ?? 'Achievements are unavailable right now.'}
        <LibraryButton className="mt-3" size="sm" variant="secondary" onClick={() => void achievements.refresh()}>Try again</LibraryButton>
      </SEIInlineAlert>
    ) : <SEILoadingState size="sm" title="Loading achievements" />;
  }

  const active = snapshot.achievements.filter(entry => entry.status !== 'planned');
  const earnedCount = active.filter(entry => entry.status === 'earned').length;
  const sealedCount = snapshot.scrolls.filter(scroll => scroll.status === 'sealed').length;

  return (
    <div className="min-w-0 space-y-4" data-achievements-panel>
      <LibraryPanel padding="md" as="section" aria-labelledby="reward-scrolls-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="reward-scrolls-heading" className="reward-panel-heading">Mystery Scrolls · {sealedCount} sealed</h3>
          <p className="text-[11px] text-neutral-500">{earnedCount} of {active.length} achievements earned</p>
        </div>
        {scrolls.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400" data-reward-empty>Earn an achievement to receive your first Mystery Scroll.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {scrolls.map(scroll => <ScrollTile key={scroll.id} scroll={scroll} onSelect={() => setSelectedId(scroll.id)} />)}
          </ul>
        )}
        {achievements.error ? <p role="alert" className="mt-3 text-xs text-red-300">{achievements.error}</p> : null}
        <p className="mt-3 text-[11px] text-neutral-500" data-reward-delivery={snapshot.delivery}>
          {snapshot.delivery === 'on-open'
            ? 'A scroll’s reward lands the moment you open it.'
            : 'A scroll’s reward lands when you earn it; opening reveals what it was.'}
        </p>
      </LibraryPanel>

      {CATEGORY_ORDER.map(category => {
        const entries = snapshot.achievements.filter(entry => entry.category === category);
        if (!entries.length) return null;
        const Icon = CATEGORY_ICONS[category];
        return (
          <LibraryPanel key={category} padding="md" as="section" aria-labelledby={`reward-category-${category}`} data-achievement-category={category}>
            <h3 id={`reward-category-${category}`} className="reward-panel-heading flex items-center gap-2">
              <Icon size={14} aria-hidden /> {ACHIEVEMENT_CATEGORY_LABELS[category]}
            </h3>
            <ul className="mt-1">
              {entries.map(entry => <AchievementRow key={entry.key} achievement={entry} />)}
            </ul>
          </LibraryPanel>
        );
      })}

      {selected ? (
        <MysteryScrollReveal key={selected.id} scroll={selected} description={selectedDescription}
          onOpen={achievements.open} onClose={() => setSelectedId(null)} minimumUnsealMs={minimumUnsealMs} />
      ) : null}
    </div>
  );
}
