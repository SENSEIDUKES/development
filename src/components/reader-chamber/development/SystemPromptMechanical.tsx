import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Skull, TriangleAlert as AlertTriangle } from 'lucide-react';
import type { SystemEvent, SystemStatusBar, SystemStatusScreen } from '../shared/types';
import type { ColorCodeId } from '../shared/colorCodes';
import {
  getColorCodeStyle,
  getSystemCompactClassification,
  resolveSystemOutcomeColorCode,
} from '../shared/colorCodes';
import {
  type SystemPromptRow,
  type SystemPromptSurface,
} from '../shared/systemPromptPresentation';

interface SystemPromptMechanicalProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system: SystemEvent;
  rows: SystemPromptRow[];
  status?: SystemStatusScreen;
  surface: SystemPromptSurface;
}

/** Resource meters keep the established semantic System colors. */
const STATUS_BAR_COLOR_CODES: Record<SystemStatusBar['tone'], ColorCodeId> = {
  health: 'enemy',
  spirit: 'mainCharacter',
  progress: 'mentor',
};

/** One glowing resource meter with a muted tone label and a bright value. */
function SystemStatusMeter({ bar }: { bar: SystemStatusBar }) {
  const colorCode = STATUS_BAR_COLOR_CODES[bar.tone];
  const colorStyle = getColorCodeStyle(colorCode);
  const value = Math.min(bar.max, Math.max(0, bar.value));
  const position = (value / bar.max) * 100;
  const label = bar.display?.trim() || `${bar.value} / ${bar.max}`;

  return (
    <div data-status-bar={bar.tone} data-color-code={colorCode} style={colorStyle}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-current md:text-xs">
          {bar.label}
        </span>
        <span className="text-[11px] font-semibold tracking-wide text-neutral-50 md:text-xs">
          {label}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${bar.label} meter`}
        aria-valuemin={0}
        aria-valuemax={bar.max}
        aria-valuenow={value}
        aria-valuetext={label}
        className="relative mt-1 h-2 overflow-hidden rounded-full bg-black/55 ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_22%,transparent)]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-full bg-current shadow-[0_0_8px_currentColor]"
          style={{ width: `${position}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The LitRPG status-screen form of a regular System Prompt: a layered
 * dark-emerald holographic glass panel with a controlled edge glow and corner
 * ticks. Events carrying a `status` screen render the modern game status
 * layout — headline with a level pill, resource meters (HP red, Qi blue, EXP
 * gold), a two-column inset stat grid with signed gain/loss deltas, active
 * effects, and abilities. Events without one keep the legacy plain-rows grid.
 * Either way the TTS sentence rests collapsed behind the same small centered
 * chevron toggle the Narrative card uses; narration reads it from the block
 * data, never from this visibility state.
 */
export function SystemPromptMechanical({
  content,
  system,
  rows,
  status,
  surface,
  className,
  ...props
}: SystemPromptMechanicalProps) {
  const reduceMotion = useReducedMotion();
  const {
    onAnimationStart: _animationStart,
    onDrag: _drag,
    onDragStart: _dragStart,
    onDragEnd: _dragEnd,
    style,
    ...safeProps
  } = props;
  const [sentenceRevealed, setSentenceRevealed] = React.useState(false);
  const summaryId = React.useId();
  const isDeathFlag = surface.fateFlag === 'death';
  const isIronFate = surface.fateFlag === 'ironFate';
  const meaning = surface.meaning;
  const classification = getSystemCompactClassification(meaning);
  const sentence = content.replace(/^\[|\]$/g, '').trim();
  const flavor = (system.flavor || '').trim();

  return (
    <motion.div
      {...safeProps}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
      data-interactive="false"
      data-motion={reduceMotion ? 'reduced' : 'full'}
      data-color-code={meaning.colorCode}
      data-system-presentation="mechanical"
      style={style}
      className={`system-block holographic-panel relative cursor-default my-6 md:my-8 mx-auto max-w-xl overflow-hidden rounded-xl border font-mono px-4 py-3.5 md:px-5 md:py-4 bg-[color-mix(in_srgb,var(--system-color-surface)_9%,rgba(3,10,7,0.94))] shadow-[0_0_24px_color-mix(in_srgb,var(--system-color)_14%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none ${meaning.borderColor} ${meaning.textColor}${meaning.type === 'system_error' ? ' animate-pulse' : ''}${surface.fateFlag ? ' animate-menacing-fate' : ''} ${className || ''}`}
    >
      {/* Corner ticks echo the status frame without adding interactive noise. */}
      <span aria-hidden="true" className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />
      <span aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />

      <div className="relative flex flex-col space-y-3">
        <div className="flex items-center justify-between gap-3 border-b pb-2.5 border-[color-mix(in_srgb,var(--system-color)_22%,transparent)]">
          <div className="flex items-center space-x-2 min-w-0">
            {isDeathFlag && surface.fateFlagColorCode && (
              <Skull
                data-color-code={surface.fateFlagColorCode}
                style={getColorCodeStyle(surface.fateFlagColorCode)}
                className="w-5 h-5 animate-pulse motion-reduce:animate-none shrink-0"
              />
            )}
            {isIronFate && surface.fateFlagColorCode && (
              <AlertTriangle
                data-color-code={surface.fateFlagColorCode}
                style={getColorCodeStyle(surface.fateFlagColorCode)}
                className="w-5 h-5 animate-bounce motion-reduce:animate-none shrink-0"
              />
            )}
            <div className="min-w-0 flex flex-col">
              <span className="break-words font-bold uppercase tracking-[0.18em] text-sm md:text-base leading-tight text-neutral-50 [overflow-wrap:anywhere] drop-shadow-[0_0_10px_color-mix(in_srgb,var(--system-color)_45%,transparent)]">
                {system.title}
              </span>
              {flavor && (
                <span className="mt-0.5 break-words text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-current opacity-70 [overflow-wrap:anywhere]">
                  {flavor}
                </span>
              )}
              <span className="mt-0.5 text-[9px] uppercase tracking-wider opacity-60 font-mono">
                ✦ {classification.subtype} ✦
              </span>
            </div>
          </div>
          {status?.level ? (
            <span className="shrink-0 rounded-md border border-[color-mix(in_srgb,var(--system-color)_45%,transparent)] bg-black/40 px-2.5 py-1 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] shadow-[0_0_10px_color-mix(in_srgb,var(--system-color)_18%,transparent)]">
              Level {status.level}
            </span>
          ) : system.rarity ? (
            <span className="rarity-accent shrink-0 text-[10px] uppercase px-2 py-0.5 border rounded-sm bg-black/40 text-inherit">
              {system.rarity}
            </span>
          ) : null}
        </div>

        {status?.bars && status.bars.length > 0 && (
          <div className="space-y-2.5">
            {status.bars.map((bar, index) => (
              <SystemStatusMeter key={`${bar.label}-${index}`} bar={bar} />
            ))}
          </div>
        )}

        {status?.stats && status.stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {status.stats.map((stat, index) => {
              const deltaColorCode = stat.delta === undefined
                ? undefined
                : resolveSystemOutcomeColorCode(undefined, stat.delta > 0 ? 'gain' : 'loss');
              return (
                <div
                  key={`${stat.label}-${index}`}
                  data-status-stat={stat.label}
                  className="rounded-md bg-black/35 px-3 py-2 ring-1 ring-inset ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <span className="block text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                    {stat.label}
                  </span>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2">
                    <span className="break-words text-base md:text-lg font-semibold text-neutral-50 [overflow-wrap:anywhere]">
                      {stat.value}
                    </span>
                    {stat.delta !== undefined && deltaColorCode && (
                      <span
                        data-status-delta={stat.delta > 0 ? 'gain' : 'loss'}
                        data-color-code={deltaColorCode}
                        style={getColorCodeStyle(deltaColorCode)}
                        className="shrink-0 text-xs md:text-sm font-bold"
                      >
                        {stat.delta > 0 ? `+${stat.delta}` : `−${Math.abs(stat.delta)}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legacy mechanical events keep the plain key/value grid. */}
        {rows.length > 0 && (
          <div className="space-y-1.5">
            {rows.map((row, index) => (
              <div key={`${row.label}-${index}`} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3 text-[11px] md:text-xs">
                <span className="min-w-0 break-words opacity-70 uppercase tracking-widest [overflow-wrap:anywhere]">{row.label}</span>
                <span className="min-w-0 break-words font-semibold tracking-wide text-right [overflow-wrap:anywhere]">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {status?.effects && status.effects.length > 0 && (
          <div className="border-t border-[color-mix(in_srgb,var(--system-color)_18%,transparent)] pt-2.5">
            <span className="block text-[9px] uppercase tracking-[0.22em] text-neutral-500">
              {status.effects.length > 1 ? 'Active Effects' : 'Active Effect'}
            </span>
            <div className="mt-1.5 space-y-1.5">
              {status.effects.map((effect, index) => {
                const toneColorCode = resolveSystemOutcomeColorCode(
                  effect.tone === 'negative' ? 'negative' : 'positive',
                );
                return (
                  <div key={`${effect.name}-${index}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] md:text-xs">
                    <span className="break-words font-semibold tracking-wide text-[var(--system-color)] [overflow-wrap:anywhere]">
                      {effect.name}
                    </span>
                    {effect.detail && (
                      <>
                        <span aria-hidden="true" className="text-current/40">·</span>
                        <span className="break-words text-neutral-300 [overflow-wrap:anywhere]">{effect.detail}</span>
                      </>
                    )}
                    {effect.value && (
                      <span
                        data-color-code={toneColorCode}
                        style={getColorCodeStyle(toneColorCode)}
                        className="ml-auto shrink-0 font-bold tracking-wide"
                      >
                        {effect.value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status?.abilities && status.abilities.length > 0 && (
          <div className="border-t border-[color-mix(in_srgb,var(--system-color)_18%,transparent)] pt-2.5">
            <span className="block text-[9px] uppercase tracking-[0.22em] text-neutral-500">
              {status.abilities.length > 1 ? 'Abilities' : 'Ability'}
            </span>
            <div className="mt-1.5 space-y-1.5">
              {status.abilities.map((ability, index) => (
                <div key={`${ability.name}-${index}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] md:text-xs">
                  <span
                    data-color-code="mainCharacter"
                    style={getColorCodeStyle('mainCharacter')}
                    className="break-words font-semibold tracking-wide [overflow-wrap:anywhere]"
                  >
                    {ability.name}
                  </span>
                  {ability.detail && (
                    <>
                      <span aria-hidden="true" className="text-current/40">·</span>
                      <span className="break-words text-neutral-300 [overflow-wrap:anywhere]">{ability.detail}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {sentence && (
          <p
            id={summaryId}
            data-system-summary="true"
            hidden={!sentenceRevealed}
            className="mt-1 border-t border-[color-mix(in_srgb,var(--system-color)_18%,transparent)] pt-2 text-center font-serif text-xs md:text-sm italic leading-relaxed text-neutral-400"
          >
            {sentence}
          </p>
        )}
        {sentence && (
          <button
            type="button"
            data-system-summary-toggle="true"
            aria-expanded={sentenceRevealed}
            aria-controls={summaryId}
            aria-label={sentenceRevealed ? 'Hide System narration' : 'Reveal System narration'}
            onClick={(event) => {
              event.stopPropagation();
              setSentenceRevealed(current => !current);
            }}
            className="mx-auto -mb-2 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-neutral-500 outline-none transition-[color,transform] duration-200 hover:text-neutral-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070b] motion-reduce:transition-none"
          >
            <ChevronDown
              data-system-summary-toggle-icon="true"
              className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${sentenceRevealed ? 'rotate-180' : ''}`}
              strokeWidth={2.2}
            />
          </button>
        )}
      </div>
    </motion.div>
  );
}
