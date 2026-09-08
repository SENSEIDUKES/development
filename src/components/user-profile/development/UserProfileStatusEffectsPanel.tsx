import React from 'react';
import { Orbit, Shield, Sparkles } from 'lucide-react';
import { LibraryCard, LibraryCardDescription, LibraryCardTitle } from '@seihouse/library-ui';
import { SEIEmptyState, SEIProgressBar } from '@seihouse/ui';
import type { ActiveStatusEffect } from '../shared/types';

interface UserProfileStatusEffectsPanelProps {
  effects: ActiveStatusEffect[];
}

const DEBUFF_TYPES = ['Curse', 'Affliction'];

const formatDuration = (durationMs: number): string => {
  const hours = Math.round(durationMs / (60 * 60 * 1000));
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
};

const formatExpiry = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * Active Status Effects destination. Renders exactly the fields the production
 * profile page showed for each effect (type, scope, duration, description,
 * visual, challenge progress, completion, counterplay, reward hook), one card
 * per effect, with a real empty state when nothing is active.
 */
export function UserProfileStatusEffectsPanel({ effects }: UserProfileStatusEffectsPanelProps) {
  if (effects.length === 0) {
    return (
      <SEIEmptyState
        icon={Orbit}
        title="No status effects are active"
        description="Attune a relic that carries a blessing or curse, or survive a tribulation, and its effect will settle here."
        size="md"
        titleAs="h3"
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Active status effects">
      {effects.map(effect => {
        const isDebuff = DEBUFF_TYPES.includes(effect.effectDef.type);
        const accent = isDebuff ? '#ff3333' : '#04ACFF';
        const showProgress =
          effect.progress !== undefined
          && effect.targetProgress !== undefined
          && !effect.completedAt;
        const percent = showProgress
          ? Math.min(100, (effect.progress! / effect.targetProgress!) * 100)
          : 0;

        return (
          <li key={effect.id} className="min-w-0">
            <LibraryCard
              as="article"
              padding="sm"
              accentColor={accent}
              className="h-full"
              contentClassName="gap-3"
              data-effect-type={effect.effectDef.type}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <LibraryCardTitle as="h3" className="font-sc text-base uppercase tracking-wider">
                    {effect.effectDef.name}
                  </LibraryCardTitle>
                  <p
                    className="mt-1 font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: accent }}
                  >
                    {effect.effectDef.type} • {effect.effectDef.scope}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
                  style={{ borderColor: `${accent}66`, color: accent }}
                  title={`Expires ${formatExpiry(effect.expiresAt)}`}
                >
                  {formatDuration(effect.effectDef.durationMs)}
                </span>
              </div>

              <LibraryCardDescription className="font-serif text-[13px] text-neutral-300">
                {effect.effectDef.description}
              </LibraryCardDescription>

              {effect.effectDef.visual ? (
                <p className="font-sans text-[11px] italic text-neutral-400">
                  Visual: {effect.effectDef.visual}
                </p>
              ) : null}

              {showProgress ? (
                <SEIProgressBar
                  size="sm"
                  tone={isDebuff ? 'danger' : 'sea'}
                  value={percent}
                  label={`Challenge progress: ${effect.progress} / ${effect.targetProgress} Qi`}
                  showValue
                />
              ) : null}

              {effect.completedAt ? (
                <div className="flex w-fit items-center gap-1.5 rounded border border-green-500/30 bg-green-950/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
                  <Sparkles size={12} aria-hidden="true" />
                  Reward unlocked • Completed
                </div>
              ) : null}

              {effect.effectDef.counterplay || effect.effectDef.rewardHook ? (
                <dl className="mt-1 space-y-2 border-t border-white/10 pt-3 text-[11px]">
                  {effect.effectDef.counterplay ? (
                    <div className="flex items-start gap-2">
                      <dt className="sr-only">Counterplay</dt>
                      <Shield size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-neutral-400" />
                      <dd className="font-sans leading-relaxed text-neutral-300">{effect.effectDef.counterplay}</dd>
                    </div>
                  ) : null}
                  {effect.effectDef.rewardHook ? (
                    <div className="flex items-start gap-2">
                      <dt className="sr-only">Reward</dt>
                      <Sparkles size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-400/90" />
                      <dd className="font-sans leading-relaxed text-amber-200/90">{effect.effectDef.rewardHook}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </LibraryCard>
          </li>
        );
      })}
    </ul>
  );
}
