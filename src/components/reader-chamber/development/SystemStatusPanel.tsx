import React from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import type { SystemEvent, SystemStatusBar, SystemStatusScreen } from '../shared/types';
import type { ColorCodeId, SystemColorMeaning } from '../shared/colorCodes';
import {
  getColorCodeStyle,
  getSystemColorStyle,
  getSystemCompactClassification,
  resolveSystemOutcomeColorCode,
} from '../shared/colorCodes';
import type { SystemPromptRow } from '../shared/systemPromptPresentation';

/** An open Codex hovercard floats above this dialog and answers Escape first. */
const CODEX_HOVERCARD_SELECTOR = '[data-slot="codex-hovercard"]';

const PANEL_FOCUSABLE_SELECTOR = 'button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])';

/** Resource meters keep the established semantic System colors. */
const STATUS_BAR_COLOR_CODES: Record<SystemStatusBar['tone'], ColorCodeId> = {
  health: 'enemy',
  spirit: 'mainCharacter',
  progress: 'mentor',
};

/**
 * The two places a status screen renders: the in-flow compact card, which
 * previews the vitals, and the expanded stat panel, which shows the whole
 * screen at reading scale.
 */
export type SystemStatusScale = 'compact' | 'panel';

/** One glowing resource meter with a muted tone label and a bright value. */
export function SystemStatusMeter({ bar, scale = 'compact' }: { bar: SystemStatusBar; scale?: SystemStatusScale }) {
  const colorCode = STATUS_BAR_COLOR_CODES[bar.tone];
  const colorStyle = getColorCodeStyle(colorCode);
  const value = Math.min(bar.max, Math.max(0, bar.value));
  const position = (value / bar.max) * 100;
  const label = bar.display?.trim() || `${bar.value} / ${bar.max}`;
  const isPanel = scale === 'panel';

  return (
    <div data-status-bar={bar.tone} data-color-code={colorCode} style={colorStyle}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-bold uppercase text-current ${isPanel ? 'text-sm tracking-[0.22em] md:text-base' : 'text-[11px] tracking-[0.18em] md:text-xs'}`}>
          {bar.label}
        </span>
        <span className={`font-semibold tracking-wide text-neutral-50 ${isPanel ? 'text-sm md:text-base' : 'text-[11px] md:text-xs'}`}>
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
        className={`relative overflow-hidden rounded-full bg-black/55 ring-1 ring-inset ring-[color-mix(in_srgb,currentColor_22%,transparent)] ${isPanel ? 'mt-1.5 h-2.5' : 'mt-1 h-2'}`}
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

/** The two-column inset stat grid with signed gain/loss deltas. */
export function SystemStatusStatGrid({
  stats,
  scale = 'compact',
}: {
  stats: NonNullable<SystemStatusScreen['stats']>;
  scale?: SystemStatusScale;
}) {
  const isPanel = scale === 'panel';
  return (
    <div className={`grid grid-cols-2 ${isPanel ? 'gap-2.5' : 'gap-2'}`}>
      {stats.map((stat, index) => {
        const deltaColorCode = stat.delta === undefined
          ? undefined
          : resolveSystemOutcomeColorCode(undefined, stat.delta > 0 ? 'gain' : 'loss');
        return (
          <div
            key={`${stat.label}-${index}`}
            data-status-stat={stat.label}
            className={`rounded-md bg-black/35 ring-1 ring-inset ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${isPanel ? 'px-3.5 py-2.5' : 'px-3 py-2'}`}
          >
            <span className={`block uppercase tracking-[0.18em] text-neutral-400 ${isPanel ? 'text-[10px] md:text-[11px]' : 'text-[9px]'}`}>
              {stat.label}
            </span>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className={`break-words font-semibold text-neutral-50 [overflow-wrap:anywhere] ${isPanel ? 'text-xl md:text-2xl' : 'text-base md:text-lg'}`}>
                {stat.value}
              </span>
              {stat.delta !== undefined && deltaColorCode && (
                <span
                  data-status-delta={stat.delta > 0 ? 'gain' : 'loss'}
                  data-color-code={deltaColorCode}
                  style={getColorCodeStyle(deltaColorCode)}
                  className={`shrink-0 font-bold ${isPanel ? 'text-sm md:text-base' : 'text-xs md:text-sm'}`}
                >
                  {stat.delta > 0 ? `+${stat.delta}` : `−${Math.abs(stat.delta)}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Active effects: muted section label, accent name, bright right-aligned value. */
export function SystemStatusEffectList({
  effects,
  scale = 'compact',
}: {
  effects: NonNullable<SystemStatusScreen['effects']>;
  scale?: SystemStatusScale;
}) {
  const isPanel = scale === 'panel';
  return (
    <div className="border-t border-[color-mix(in_srgb,var(--system-color)_18%,transparent)] pt-2.5">
      <span className={`block uppercase tracking-[0.22em] text-neutral-500 ${isPanel ? 'text-[10px] md:text-[11px]' : 'text-[9px]'}`}>
        {effects.length > 1 ? 'Active Effects' : 'Active Effect'}
      </span>
      <div className="mt-1.5 space-y-1.5">
        {effects.map((effect, index) => {
          const toneColorCode = resolveSystemOutcomeColorCode(
            effect.tone === 'negative' ? 'negative' : 'positive',
          );
          return (
            <div
              key={`${effect.name}-${index}`}
              className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${isPanel ? 'text-sm md:text-base' : 'text-[11px] md:text-xs'}`}
            >
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
  );
}

/** Abilities: muted section label with main-character-blue ability names. */
export function SystemStatusAbilityList({
  abilities,
  scale = 'compact',
}: {
  abilities: NonNullable<SystemStatusScreen['abilities']>;
  scale?: SystemStatusScale;
}) {
  const isPanel = scale === 'panel';
  return (
    <div className="border-t border-[color-mix(in_srgb,var(--system-color)_18%,transparent)] pt-2.5">
      <span className={`block uppercase tracking-[0.22em] text-neutral-500 ${isPanel ? 'text-[10px] md:text-[11px]' : 'text-[9px]'}`}>
        {abilities.length > 1 ? 'Abilities' : 'Ability'}
      </span>
      <div className="mt-1.5 space-y-1.5">
        {abilities.map((ability, index) => (
          <div
            key={`${ability.name}-${index}`}
            className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${isPanel ? 'text-sm md:text-base' : 'text-[11px] md:text-xs'}`}
          >
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
  );
}

/**
 * The Structured Mechanical Expanded Info surface: the modern holographic stat
 * panel, portaled to <body> and viewport-locked above the Reader Chamber, so
 * the chapter never grows and the reader's scroll position never moves. It is
 * the whole status screen at reading scale — corner-bracketed dark-emerald
 * glass carrying the STATUS headline with its class line, classification, and
 * LEVEL pill, the semantic HP/QI/EXP meters, the full two-column stat grid with
 * signed deltas, active effects, abilities, and any legacy key/value rows.
 *
 * This replaces the retired Codex-style System Prompt pop-out: it is the only
 * expanded System presentation, and only Structured Mechanical prompts open it.
 *
 * Nothing here is narration — the root keeps the
 * `data-reader-narration="excluded"` boundary and lives outside the reader DOM,
 * so TTS still reads only the compact card's prose. Escape, the close button,
 * or a backdrop tap closes the panel and returns focus to the orb action.
 */
export function SystemStatusPanel({
  detailsId,
  system,
  status,
  rows,
  meaning,
  onClose,
  returnFocusRef,
}: {
  detailsId: string;
  system: SystemEvent;
  status: SystemStatusScreen;
  rows: SystemPromptRow[];
  meaning: SystemColorMeaning;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const backdropPressRef = React.useRef(false);
  const reduceMotion = useReducedMotion();
  const classification = getSystemCompactClassification(meaning);
  const headline = (system.title || '').trim();
  const flavor = (system.flavor || '').trim();

  const closeAndRestoreFocus = React.useCallback(() => {
    onClose();
    returnFocusRef.current?.focus();
  }, [onClose, returnFocusRef]);

  // Lock page scroll while the panel is open; restore whatever the page had.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Move focus into the dialog on open. Explicit close paths restore focus
  // immediately; cleanup also covers a live event replacement unmounting it.
  React.useEffect(() => {
    panelRef.current?.focus();
    const returnTarget = returnFocusRef;
    return () => {
      const orb = returnTarget.current;
      if (orb?.isConnected && document.activeElement === document.body) orb.focus();
    };
  }, [returnFocusRef]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (event.defaultPrevented) return;
        const hovercard = document.querySelector<HTMLElement>(CODEX_HOVERCARD_SELECTOR);
        if (hovercard) return;
        event.preventDefault();
        closeAndRestoreFocus();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(PANEL_FOCUSABLE_SELECTOR)]
        .filter(element => element.offsetParent !== null || element === document.activeElement);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeAndRestoreFocus]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      data-motion={reduceMotion ? 'reduced' : 'full'}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
      }}
      onPointerDown={(event) => {
        backdropPressRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPressRef.current && event.target === event.currentTarget) closeAndRestoreFocus();
        backdropPressRef.current = false;
      }}
    >
      <motion.div
        ref={panelRef}
        id={detailsId}
        role="dialog"
        aria-modal="true"
        {...(headline
          ? { 'aria-labelledby': `${detailsId}-title` }
          : { 'aria-label': 'System status panel' })}
        tabIndex={-1}
        data-system-status-panel="true"
        data-color-code={meaning.colorCode}
        data-reader-narration="excluded"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.15 }}
        onClick={(event) => event.stopPropagation()}
        style={getSystemColorStyle(meaning) as React.CSSProperties}
        className={`holographic-panel relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border font-mono bg-[color-mix(in_srgb,var(--system-color-surface)_9%,rgba(3,10,7,0.96))] shadow-[0_0_32px_color-mix(in_srgb,var(--system-color)_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)] outline-none ${meaning.borderColor} ${meaning.textColor}`}
      >
        {/* Corner brackets frame the panel the way the compact card's ticks do. */}
        <span aria-hidden="true" className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l-2 border-t-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />
        <span aria-hidden="true" className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r-2 border-t-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b-2 border-l-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b-2 border-r-2 border-[color-mix(in_srgb,var(--system-color)_55%,transparent)]" />

        <div className="shrink-0 px-5 pt-5 md:px-6 md:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {headline && (
                <h2
                  id={`${detailsId}-title`}
                  className="break-words text-lg font-bold uppercase leading-tight tracking-[0.18em] text-neutral-50 [overflow-wrap:anywhere] drop-shadow-[0_0_12px_color-mix(in_srgb,var(--system-color)_55%,transparent)] md:text-xl"
                >
                  {headline}
                </h2>
              )}
              {flavor && (
                <span className="mt-1 block break-words text-[11px] uppercase tracking-[0.16em] text-current opacity-75 [overflow-wrap:anywhere] md:text-xs">
                  {flavor}
                </span>
              )}
              <span className="mt-1 block text-[10px] uppercase tracking-wider opacity-60 md:text-[11px]">
                ✦ {classification.subtype} ✦
              </span>
            </div>
            <div className="flex shrink-0 items-start gap-1">
              {status.level && (
                <span className="mt-0.5 rounded-md border border-[color-mix(in_srgb,var(--system-color)_45%,transparent)] bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] shadow-[0_0_10px_color-mix(in_srgb,var(--system-color)_18%,transparent)] md:text-xs">
                  Level {status.level}
                </span>
              )}
              <button
                type="button"
                aria-label="Close System status panel"
                onClick={closeAndRestoreFocus}
                className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-neutral-400 outline-none transition-[color,transform] duration-200 hover:text-neutral-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030a07] motion-reduce:transition-none"
              >
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        <div
          data-system-status-scroll-region="true"
          role="region"
          aria-label="System status details"
          tabIndex={0}
          className="mt-3 min-h-0 space-y-3 overflow-y-auto overscroll-contain border-t border-[color-mix(in_srgb,var(--system-color)_22%,transparent)] px-5 pb-6 pt-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current/60 md:px-6"
        >
          {status.bars && status.bars.length > 0 && (
            <div className="space-y-3">
              {status.bars.map((bar, index) => (
                <SystemStatusMeter key={`${bar.label}-${index}`} bar={bar} scale="panel" />
              ))}
            </div>
          )}

          {status.stats && status.stats.length > 0 && (
            <SystemStatusStatGrid stats={status.stats} scale="panel" />
          )}

          {rows.length > 0 && (
            <div className="space-y-1.5">
              {rows.map((row, index) => (
                <div key={`${row.label}-${index}`} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3 text-xs md:text-sm">
                  <span className="min-w-0 break-words uppercase tracking-widest opacity-70 [overflow-wrap:anywhere]">{row.label}</span>
                  <span className="min-w-0 break-words text-right font-semibold tracking-wide [overflow-wrap:anywhere]">{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {status.effects && status.effects.length > 0 && (
            <SystemStatusEffectList effects={status.effects} scale="panel" />
          )}

          {status.abilities && status.abilities.length > 0 && (
            <SystemStatusAbilityList abilities={status.abilities} scale="panel" />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Portals the stat panel to <body> so it floats above the Reader Chamber. */
export function SystemStatusPanelPortal(props: React.ComponentProps<typeof SystemStatusPanel>) {
  if (typeof document === 'undefined') return null;
  return createPortal(<SystemStatusPanel {...props} />, document.body);
}
