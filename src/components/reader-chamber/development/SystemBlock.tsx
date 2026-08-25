import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, Skull, TriangleAlert as AlertTriangle } from 'lucide-react';
import type {
  SystemEvent,
  SystemPromptBadge,
  SystemPromptChange,
} from '../shared/types';
import { FateResultCard } from './FateResultCard';
import { WorldNotice } from './WorldNotice';
import { SystemOrbEmblem } from './SystemOrbEmblem';
import { SystemPromptMechanical } from './SystemPromptMechanical';
import {
  getSystemPromptSurface,
  getSystemPromptSurfaceClasses,
  getSystemPromptSurfaceStyle,
  resolveSystemPromptRoute,
} from '../shared/systemPromptPresentation';
import {
  getColorCodeStyle,
  getColorCodeSurfaceStyle,
  getSystemCompactClassification,
  resolveSystemBadgeColorCode,
  resolveSystemOutcomeColorCode,
} from '../shared/colorCodes';
export { SYSTEM_COLORS_LEGEND } from '../shared/colorCodes';

export interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
  /** Reader-owned rendering for named character Codex links in the summary prose. */
  renderProse?: (text: string) => React.ReactNode;
}

function normalizeSystemPromptBadge(badge: unknown): SystemPromptBadge | undefined {
  if (!badge || typeof badge !== 'object') return undefined;
  const candidate = badge as Partial<SystemPromptBadge>;
  if (typeof candidate.label !== 'string' || typeof candidate.value !== 'string') return undefined;
  const label = candidate.label.trim();
  const value = candidate.value.trim();
  return label && value ? { label, value } : undefined;
}

/**
 * Keeps badge information in the original `content` string for narration, but
 * removes the matching label/value phrase from the visible prose so it appears
 * once, as integrated System UI. If the prose does not contain the badge text,
 * the sentence is left untouched.
 */
function getVisibleSystemSentence(content: string, badge?: SystemPromptBadge) {
  const sentence = content.replace(/^\[|\]$/g, '').trim();
  if (!badge?.label.trim() || !badge.value.trim()) return sentence;

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const badgePhrase = new RegExp(
    `${escapeRegExp(badge.label.trim())}\\s*[:·-]\\s*${escapeRegExp(badge.value.trim())}\\.?`,
    'i',
  );

  return sentence
    .replace(badgePhrase, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

function getBadgeSeverityStyles(badge: SystemPromptBadge) {
  const { colorCode, inverted } = resolveSystemBadgeColorCode(badge.value);
  const pillStyle = getColorCodeSurfaceStyle(colorCode, {
    borderOpacity: inverted ? 0.8 : 0.15,
    backgroundOpacity: inverted ? 0 : 0.04,
  });

  return {
    colorCode,
    inverted,
    pillStyle: inverted
      ? { ...pillStyle, backgroundColor: 'rgb(0 0 0)' }
      : pillStyle,
    labelStyle: inverted ? getColorCodeStyle(colorCode) : undefined,
    valueStyle: getColorCodeStyle(colorCode),
  };
}

/**
 * System outcome row carrying genre-native outcomes as clean, flat text.
 * The card shows at most the first two outcomes as slots separated by a clear
 * divider, each split into a neutral white subject and a meaning-colored state
 * word with no numbers — a label carrying a numeric quantity (Lifespan 100,
 * Karma 15) compresses to its subject plus Increased/Decreased from the
 * direction (LIFESPAN INCREASED, KARMA DECREASED), while other labels color
 * only their final state word (REALM ASCENDED, TITLE STRIPPED).
 */
const COMPACT_OUTCOME_LIMIT = 2;

/**
 * Compact outcome wording: the white subject plus the meaning-colored state
 * word, never a number. A quantity label (Lifespan 100) yields its subject
 * with Increased/Decreased from the direction; any other label colors its
 * final word as the state (Realm ASCENDED, Title STRIPPED).
 */
function getCompactOutcomeParts(change: SystemPromptChange): { subject: string; state: string } {
  const label = change.label.trim();
  const quantityStart = label.search(/\d/);
  if (quantityStart !== -1) {
    return {
      subject: label.slice(0, quantityStart).trim(),
      state: change.direction === 'loss' ? 'Decreased' : 'Increased',
    };
  }
  const lastSpace = label.lastIndexOf(' ');
  if (lastSpace === -1) return { subject: '', state: label };
  return { subject: label.slice(0, lastSpace), state: label.slice(lastSpace + 1) };
}

function SystemConsequenceRow({ changes }: { changes: SystemPromptChange[] }) {
  const prioritizedChanges = React.useMemo(
    () => changes
      .filter(change => typeof change?.label === 'string' && change.label.trim() !== ''),
    [changes],
  );

  if (prioritizedChanges.length === 0) return null;

  const slots = prioritizedChanges.slice(0, COMPACT_OUTCOME_LIMIT);
  return (
    <div
      data-consequence-count={slots.length}
      className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[color-mix(in_srgb,currentColor_18%,transparent)] pt-2 [overflow-wrap:anywhere]"
    >
      {slots.map((change, index) => {
        const { subject, state } = getCompactOutcomeParts(change);
        const outcomeColorCode = resolveSystemOutcomeColorCode(change.tone, change.direction);
        return (
          <React.Fragment key={`${change.direction}-${change.label}-${index}`}>
            {index > 0 && (
              <span aria-hidden="true" className="font-mono text-[10px] text-current/35 md:text-[11px]">|</span>
            )}
            <span
              data-outcome-slot="true"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.10em] md:text-[11px] md:tracking-[0.18em]"
            >
              {subject && (
                <span data-outcome-subject="true" className="text-neutral-100">{subject}{' '}</span>
              )}
              <span
                data-outcome-state="true"
                data-color-code={outcomeColorCode}
                style={getColorCodeStyle(outcomeColorCode)}
              >
                {state}
              </span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const SystemBlock = React.memo(function SystemBlock({ content, system, renderProse, className, ...props }: SystemBlockProps) {
  const {
    onAnimationStart: _anim,
    onDrag: _drag,
    onDragStart: _dStart,
    onDragEnd: _dEnd,
    style: suppliedStyle,
    ...safeProps
  } = props;
  const reduceMotion = useReducedMotion();
  const surface = React.useMemo(() => getSystemPromptSurface(system, content), [content, system]);
  const systemRootStyle = getSystemPromptSurfaceStyle(surface, suppliedStyle);
  const detailsId = React.useId();
  const route = React.useMemo(() => resolveSystemPromptRoute(system), [system]);
  // The compact card's TTS sentence rests collapsed behind the bottom arrow
  // toggle to conserve reader screen space; narration reads it from the
  // block data, never from this visibility state.
  const [sentenceRevealed, setSentenceRevealed] = React.useState(false);

  const isIronFate = surface.fateFlag === 'ironFate';
  const isDeathFlag = surface.fateFlag === 'death';
  const fateFlagColorCode = surface.fateFlagColorCode;

  // Fate is a distinct top-level contract. Invalid Fate payloads never leak
  // into the legacy regular-prompt fallback.
  if (system?.kind === 'fate_system_prompt') {
    if (route?.presentation !== 'fate') return null;
    return (
      <FateResultCard
        {...safeProps}
        data={route.fateResult}
        style={suppliedStyle}
        className={className}
      />
    );
  }

  // An explicit World Notice must have readable document data. Only prompts
  // with no authored presentation are eligible for the legacy shape fallback.
  if (system?.kind === 'system_prompt' && !route) return null;

  // Regular System Prompts delegate through the shared presentation route.
  if (system) {
    if (route && route.presentation !== 'fate') {
      const { presentation, rows, changes: visibleChanges } = route;
      const menacingTone = surface.fateFlag ? ' animate-menacing-fate' : '';

      if (presentation === 'world_notice') {
      return (
        <WorldNotice
          title={system.title}
          flavor={system.flavor}
          content={content}
          notice={route.worldNotice}
          meaning={surface.meaning}
          style={systemRootStyle}
          className={className}
          readOnlyProps={safeProps}
        />
      );
      }

      // Compact regular System Prompt: title-led header with direct understandable
      // headline, secondary flavor text, single-term semantic classification line,
      // clean flat key/value rows with values spread to the card's ends, a
      // full-width status badge reserved for true status information, a two-slot
      // outcome row of white subjects and meaning-colored state words, and
      // tightened layout with no vertical dead space when the TTS summary is
      // minimized. A Narrative Notification has no expanded presentation: the
      // orb rests as an inert emblem, and the only control on the card is the
      // small bottom chevron that reveals or hides the TTS summary.
      if (presentation === 'narrative') {
      const badge = normalizeSystemPromptBadge(system.badge);
      const badgeSeverity = badge ? getBadgeSeverityStyles(badge) : undefined;
      const sentence = getVisibleSystemSentence(content, badge);
      const summaryId = `${detailsId}-summary`;
      const headline = (system.title || '').trim();
      const flavor = (system.flavor || '').trim();
      const compactRows = rows.slice(0, 3);
      const renderSystemText = renderProse ?? ((text: string) => text);
      const meaning = surface.meaning;
      const classification = getSystemCompactClassification(meaning);
      const accent = meaning.textColor;

      return (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
          data-motion={reduceMotion ? 'reduced' : 'full'}
          data-system-prompt-state="compact"
          data-system-presentation="narrative"
          data-color-code={meaning.colorCode}
          style={systemRootStyle}
          className={`system-block system-window cursor-default my-6 md:my-8 mx-auto max-w-xl relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,currentColor_40%,transparent)] bg-[color-mix(in_srgb,currentColor_7%,rgba(5,7,11,0.92))] px-4 py-3 md:px-5 md:py-3.5 shadow-[0_0_20px_color-mix(in_srgb,currentColor_10%,transparent),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ${accent}${menacingTone} ${className || ''}`}
          {...safeProps}
        >
          {/* The emblem's glow bleeds in from the right. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_50%,color-mix(in_srgb,currentColor_8%,transparent)_0%,transparent_62%)]" />
          <div className="relative flex flex-col">
            <div className="border-b border-[color-mix(in_srgb,currentColor_18%,transparent)] pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {headline && (
                    <span className="block font-mono text-base md:text-lg font-bold uppercase tracking-[0.18em] leading-snug text-current drop-shadow-[0_0_10px_color-mix(in_srgb,currentColor_55%,transparent)]">
                      {headline}
                    </span>
                  )}
                  {flavor && (
                    <span className="mt-0.5 block font-serif text-xs md:text-sm italic text-neutral-300">
                      {flavor}
                    </span>
                  )}
                  <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                    {'✦ '}
                    <span className={meaning.textColor} data-color-code={meaning.colorCode}>{classification.subtype}</span>
                    {' ✦'}
                  </span>
                </div>
                <SystemOrbEmblem />
              </div>
            </div>

            {/* Concise key/value facts as clean flat rows, values at the right edge */}
            {compactRows.length > 0 && (
              <div className="mt-2.5 space-y-1 font-mono text-[11px] md:text-xs">
                {compactRows.map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <span className="text-neutral-400 uppercase tracking-widest">{row.label}</span>
                    <span className="flex items-center justify-end gap-1.5 font-semibold tracking-wide text-right text-neutral-100">
                      {row.value}
                      {row.trend === 'up' && (
                        <ArrowUp
                          data-row-trend="up"
                          data-color-code={resolveSystemOutcomeColorCode(undefined, 'gain')}
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0"
                          style={getColorCodeStyle(resolveSystemOutcomeColorCode(undefined, 'gain'))}
                          strokeWidth={2.6}
                        />
                      )}
                      {row.trend === 'down' && (
                        <ArrowDown
                          data-row-trend="down"
                          data-color-code={resolveSystemOutcomeColorCode(undefined, 'loss')}
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0"
                          style={getColorCodeStyle(resolveSystemOutcomeColorCode(undefined, 'loss'))}
                          strokeWidth={2.6}
                        />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* True status information keeps a badge: one static full-width
                pill with the label at the left end and the severity value at
                the right end, so its size never varies with content. */}
            {badge && badgeSeverity && (
              <span
                data-color-code={badgeSeverity.colorCode}
                style={badgeSeverity.pillStyle}
                className="mt-2.5 flex w-full items-center justify-between gap-3 rounded-full border px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:text-[10px] md:tracking-[0.18em]"
              >
                <span className="text-neutral-300" style={badgeSeverity.labelStyle}>{badge.label}</span>{' '}
                <span className="font-bold" data-color-code={badgeSeverity.colorCode} style={badgeSeverity.valueStyle}>{badge.value}</span>
              </span>
            )}

            <SystemConsequenceRow changes={visibleChanges} />

            {sentence && (
              <p
                id={summaryId}
                data-system-summary="true"
                hidden={!sentenceRevealed}
                className="mt-2 border-t border-[color-mix(in_srgb,currentColor_18%,transparent)] pt-1.5 text-center font-serif text-xs md:text-sm italic leading-relaxed text-neutral-400"
              >
                {renderSystemText(sentence)}
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
                className="mx-auto mt-1 -mb-2.5 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-neutral-500 outline-none transition-[color,transform] duration-200 hover:text-neutral-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070b] motion-reduce:transition-none"
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

      return (
        <SystemPromptMechanical
          {...safeProps}
          content={content}
          system={system}
          rows={rows}
          status={route.status}
          surface={surface}
          style={systemRootStyle}
          className={className}
        />
      );
    }
  }

  // Fallback to legacy string-based parsing
  const text = content.replace(/^\[|\]$/g, '').trim();
  const fallbackColorStyles = getSystemPromptSurfaceClasses(surface);
  const meaning = surface.meaning;

  return (
    <div
      {...props}
      data-color-code={meaning.colorCode}
      style={systemRootStyle}
      className={`my-6 md:my-8 p-4 md:p-5 bg-black/50 border font-mono text-[11px] md:text-sm rounded-lg text-center tracking-widest leading-relaxed ${fallbackColorStyles} ${className || ''}`}
    >
      <div className="flex flex-col items-center justify-center mb-1.5 md:mb-2">
        {isDeathFlag && fateFlagColorCode && <Skull data-color-code={fateFlagColorCode} style={getColorCodeStyle(fateFlagColorCode)} className="w-5 h-5 md:w-6 md:h-6 animate-pulse motion-reduce:animate-none mb-1.5" />}
        {isIronFate && fateFlagColorCode && <AlertTriangle data-color-code={fateFlagColorCode} style={getColorCodeStyle(fateFlagColorCode)} className="w-5 h-5 md:w-6 md:h-6 animate-bounce motion-reduce:animate-none mb-1.5" />}
        <div className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">
          ✦ {meaning.name} ✦
        </div>
      </div>
      <span className="opacity-90">{text}</span>
    </div>
  );
});
