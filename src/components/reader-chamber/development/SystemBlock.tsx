import React from 'react';
import { motion } from 'motion/react';
import { ChevronUp, Skull, TriangleAlert as AlertTriangle } from 'lucide-react';
import type {
  SystemEvent,
  SystemPromptBadge,
  SystemPromptChange,
  SystemPromptExpandedData,
  SystemPromptExpandedProgress,
  SystemPromptExpandedSection,
  SystemPromptExpandedTone,
} from '../shared/types';
import { FateResultCard } from './FateResultCard';
import { getSystemPromptColor, getSystemColorMeaning, getSystemCompactClassification, buildSystemContext } from '../shared/systemColors';
export { SYSTEM_COLORS_LEGEND } from '../shared/systemColors';

interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
  /** Reader-owned rendering for named character Codex links in summary and expanded copy. */
  renderProse?: (text: string) => React.ReactNode;
}

const CONSEQUENCE_FIT_SAFETY_PX = 24;

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
    `${escapeRegExp(badge.label.trim())}\\s*[:\u00b7-]\\s*${escapeRegExp(badge.value.trim())}\\.?`,
    'i',
  );

  return sentence
    .replace(badgePhrase, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

/**
 * Threat-severity treatment for the compact badge: the label stays neutral
 * and only the severity value carries color, so severity reads at a glance.
 * Deadly inverts the pill itself — black surface, white text, strong border.
 */
const BADGE_SEVERITY_STYLES: Record<string, { pill: string; label: string; value: string }> = {
  light: { pill: 'border-white/15 bg-white/[0.04]', label: 'text-neutral-300', value: 'text-yellow-300' },
  moderate: { pill: 'border-white/15 bg-white/[0.04]', label: 'text-neutral-300', value: 'text-orange-400' },
  severe: { pill: 'border-white/15 bg-white/[0.04]', label: 'text-neutral-300', value: 'text-red-400' },
  deadly: { pill: 'border-neutral-100/80 bg-black', label: 'text-white', value: 'text-white' },
  unknown: { pill: 'border-white/15 bg-white/[0.04]', label: 'text-neutral-300', value: 'text-neutral-400' },
};

/** Unrecognized badge values stay ordinary: neutral label, white value. */
const BADGE_SEVERITY_NEUTRAL = {
  pill: 'border-white/15 bg-white/[0.04]',
  label: 'text-neutral-300',
  value: 'text-neutral-100',
};

function getBadgeSeverityStyles(badge: SystemPromptBadge) {
  return BADGE_SEVERITY_STYLES[badge.value.trim().toLowerCase()] ?? BADGE_SEVERITY_NEUTRAL;
}

const EXPANDED_TONE_STYLES: Record<SystemPromptExpandedTone, {
  surface: string;
  accent: string;
  progress: string;
}> = {
  neutral: {
    surface: 'border-current/20 bg-white/[0.025]',
    accent: 'text-current',
    progress: 'bg-current',
  },
  positive: {
    surface: 'border-emerald-400/25 bg-emerald-500/[0.045]',
    accent: 'text-emerald-300',
    progress: 'bg-emerald-400',
  },
  warning: {
    surface: 'border-amber-400/30 bg-amber-500/[0.045]',
    accent: 'text-amber-300',
    progress: 'bg-amber-400',
  },
  danger: {
    surface: 'border-red-400/30 bg-red-500/[0.05]',
    accent: 'text-red-300',
    progress: 'bg-red-400',
  },
};

function getExpandedTone(value: unknown): SystemPromptExpandedTone {
  return typeof value === 'string' && value in EXPANDED_TONE_STYLES
    ? value as SystemPromptExpandedTone
    : 'neutral';
}

function normalizeExpandedData(value: unknown): SystemPromptExpandedData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<SystemPromptExpandedData>;
  if (!Array.isArray(candidate.sections)) return undefined;

  const sections = candidate.sections.filter((section): section is SystemPromptExpandedSection => (
    Boolean(section)
    && typeof section === 'object'
    && typeof section.heading === 'string'
    && section.heading.trim() !== ''
  ));
  if (sections.length === 0) return undefined;

  const subject = candidate.subject
    && typeof candidate.subject === 'object'
    && typeof candidate.subject.name === 'string'
    && candidate.subject.name.trim() !== ''
    ? {
        name: candidate.subject.name.trim(),
        ...(typeof candidate.subject.role === 'string' && candidate.subject.role.trim()
          ? { role: candidate.subject.role.trim() }
          : {}),
      }
    : undefined;

  return { ...(subject ? { subject } : {}), sections };
}

function SystemExpandedProgress({
  heading,
  progress,
  tone,
}: {
  heading: string;
  progress: SystemPromptExpandedProgress;
  tone: SystemPromptExpandedTone;
}) {
  const min = Number.isFinite(progress.min) ? progress.min! : 0;
  const max = Number.isFinite(progress.max) && progress.max > min ? progress.max : min + 1;
  const value = Number.isFinite(progress.value)
    ? Math.min(max, Math.max(min, progress.value))
    : min;
  const position = ((value - min) / (max - min)) * 100;
  const isBipolar = min < 0 && max > 0;
  const zeroPosition = isBipolar ? ((0 - min) / (max - min)) * 100 : 0;
  const segmentStart = Math.min(position, zeroPosition);
  const segmentWidth = Math.abs(position - zeroPosition);
  const toneStyles = EXPANDED_TONE_STYLES[tone];
  const label = typeof progress.label === 'string' && progress.label.trim()
    ? progress.label.trim()
    : `${progress.value}/${progress.max}`;

  return (
    <div className="mt-2.5">
      <div className={`mb-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] ${toneStyles.accent}`}>
        {label}
      </div>
      <div
        role="progressbar"
        aria-label={`${heading} progress`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={label}
        className="relative h-1.5 overflow-hidden rounded-full bg-black/55 ring-1 ring-inset ring-white/10"
      >
        {isBipolar && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-white/30"
            style={{ left: `${zeroPosition}%` }}
          />
        )}
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 rounded-full shadow-[0_0_8px_currentColor] ${toneStyles.progress}`}
          style={{
            left: `${isBipolar ? segmentStart : 0}%`,
            width: `${isBipolar ? segmentWidth : position}%`,
          }}
        />
        <span
          aria-hidden="true"
          className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 ${toneStyles.progress}`}
          style={{ left: `${position}%` }}
        />
      </div>
    </div>
  );
}

function SystemExpandedBreakdown({
  data,
  detailsId,
  renderText,
}: {
  data: SystemPromptExpandedData;
  detailsId: string;
  renderText: (text: string) => React.ReactNode;
}) {
  return (
    <div
      id={detailsId}
      data-system-expanded="true"
      data-reader-narration="excluded"
      className="mt-4 border-t border-inherit/30 pt-4"
    >
      <div className="space-y-3">
        {data.sections.map((section, index) => {
          const tone = getExpandedTone(section.tone);
          const toneStyles = EXPANDED_TONE_STYLES[tone];
          const statusTone = section.status?.tone
            ? getExpandedTone(section.status.tone)
            : tone;
          const statusStyles = EXPANDED_TONE_STYLES[statusTone];
          const items = Array.isArray(section.items)
            ? section.items.filter(item => typeof item === 'string' && item.trim() !== '')
            : [];
          const headingId = `${detailsId}-section-${index}`;

          return (
            <section
              key={`${section.heading}-${index}`}
              aria-labelledby={headingId}
              data-system-expanded-section={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
              className={`rounded-xl border px-3.5 py-3 ${toneStyles.surface}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3
                  id={headingId}
                  className={`font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${toneStyles.accent}`}
                >
                  {section.heading}
                </h3>
                {section.status?.label?.trim() && (
                  <span className={`rounded-full border border-current/30 bg-black/25 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${statusStyles.accent}`}>
                    {section.status.label.trim()}
                  </span>
                )}
              </div>
              {typeof section.value === 'string' && section.value.trim() && (
                <p className="mt-2 break-words font-serif text-sm leading-relaxed text-neutral-100 md:text-base">
                  {renderText(section.value.trim())}
                </p>
              )}
              {typeof section.detail === 'string' && section.detail.trim() && (
                <p className="mt-1.5 break-words font-serif text-[13px] leading-relaxed text-neutral-300 md:text-sm">
                  {renderText(section.detail.trim())}
                </p>
              )}
              {section.progress && (
                <SystemExpandedProgress heading={section.heading} progress={section.progress} tone={tone} />
              )}
              {items.length > 0 && (
                <ul className="mt-2.5 space-y-2 border-l border-current/25 pl-3">
                  {items.map((item, itemIndex) => (
                    <li key={`${item}-${itemIndex}`} className="break-words font-serif text-[13px] leading-relaxed text-neutral-200 md:text-sm">
                      {renderText(item.trim())}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One non-scrolling consequence row. Changes are priority ordered: mobile and
 * other narrow containers reveal a third item only when its measured natural
 * width fits with breathing room, otherwise they keep the first two. A fourth
 * remains available only on roomy non-mobile layouts.
 */
function SystemConsequenceRow({ changes }: { changes: SystemPromptChange[] }) {
  const prioritizedChanges = React.useMemo(
    () => changes
      .filter(change => typeof change?.label === 'string' && change.label.trim() !== '')
      .slice(0, 4),
    [changes],
  );
  const rowRef = React.useRef<HTMLDivElement>(null);
  const measurementRef = React.useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = React.useState(prioritizedChanges.length);

  React.useLayoutEffect(() => {
    const row = rowRef.current;
    const measurement = measurementRef.current;
    if (!row || !measurement) return;

    const updateVisibleCount = () => {
      const availableWidth = row.clientWidth;
      if (availableWidth <= 0) return;

      const widths = [...measurement.children].map(child => (
        (child as HTMLElement).getBoundingClientRect().width
      ));
      const gap = Number.parseFloat(window.getComputedStyle(measurement).columnGap) || 0;
      const fits = (count: number) => (
        widths.slice(0, count).reduce((total, width) => total + width, 0)
        + gap * Math.max(0, count - 1)
        <= availableWidth - CONSEQUENCE_FIT_SAFETY_PX
      );
      const isMobileViewport = window.innerWidth < 768;

      let nextCount = Math.min(2, prioritizedChanges.length);
      if (
        !isMobileViewport
        && prioritizedChanges.length >= 4
        && fits(4)
      ) {
        nextCount = 4;
      } else if (prioritizedChanges.length >= 3 && fits(3)) {
        nextCount = 3;
      }
      setVisibleCount(nextCount);
    };

    let isMounted = true;
    const updateWhileMounted = () => {
      if (isMounted) updateVisibleCount();
    };

    updateVisibleCount();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateWhileMounted);
    resizeObserver?.observe(row);
    resizeObserver?.observe(measurement);
    window.addEventListener('resize', updateWhileMounted);
    void document.fonts?.ready.then(updateWhileMounted);

    return () => {
      isMounted = false;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateWhileMounted);
    };
  }, [prioritizedChanges]);

  const consequenceClass = 'shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.10em] text-neutral-200 md:text-[11px] md:tracking-[0.18em]';

  // One shared chip body so the hidden measurement mirror matches the visible
  // row exactly: the sign carries the direction color (gains green, losses
  // red) while the label stays readable neutral.
  const renderConsequence = (change: SystemPromptChange) => (
    <>
      <span className={change.direction === 'loss' ? 'text-red-400' : 'text-emerald-400'}>
        {change.direction === 'loss' ? '−' : '+'}
      </span>{' '}
      {change.label.trim()}
    </>
  );

  if (prioritizedChanges.length === 0) return null;

  return (
    <div className="relative mt-3 border-t border-inherit/30 pt-2.5">
      <div
        ref={rowRef}
        data-consequence-count={visibleCount}
        className="flex min-w-0 flex-nowrap items-center justify-between gap-x-3 whitespace-nowrap"
      >
        {prioritizedChanges.slice(0, visibleCount).map((change, index) => (
          <span key={`${change.direction}-${change.label}-${index}`} className={consequenceClass}>
            {renderConsequence(change)}
          </span>
        ))}
      </div>
      <div
        ref={measurementRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 flex w-max items-center gap-x-3 whitespace-nowrap opacity-0"
      >
        {prioritizedChanges.map((change, index) => (
          <span key={`${change.direction}-${change.label}-${index}`} className={consequenceClass}>
            {renderConsequence(change)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Temporary System action: the existing Codex orb — radial glow, glass sphere,
 * dashed and dotted orbit rings, luminous ✦ core — scaled down to the compact
 * System Prompt's kicker row until a dedicated System sigil is approved. When
 * expanded data exists it is the one accessible open/close control; the core
 * changes to an upward chevron while open. Its ring spin rests under
 * `prefers-reduced-motion`.
 */
function SystemOrbEmblem({
  isExpanded,
  detailsId,
  onToggle,
}: {
  isExpanded?: boolean;
  detailsId?: string;
  onToggle?: () => void;
}) {
  const orb = (
    <span className="relative block h-9 w-9 shrink-0 md:h-10 md:w-10">
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,currentColor_30%,transparent)_0%,transparent_70%)] animate-pulse motion-reduce:animate-none" />
      <span className="absolute inset-[3px] rounded-full border border-[color-mix(in_srgb,currentColor_40%,transparent)] bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,currentColor_38%,transparent)_0%,rgba(1,11,20,0.95)_72%)] shadow-[0_0_12px_color-mix(in_srgb,currentColor_45%,transparent),inset_0_0_6px_color-mix(in_srgb,currentColor_28%,transparent)]" />
      <span className="absolute inset-0 rounded-full border border-dashed border-[color-mix(in_srgb,currentColor_45%,transparent)] animate-[spin_12s_linear_infinite] motion-reduce:animate-none" />
      <span className="absolute -inset-1 rounded-full border border-dotted border-[color-mix(in_srgb,currentColor_25%,transparent)] animate-[spin_20s_linear_infinite_reverse] motion-reduce:animate-none" />
      <span className="absolute inset-0 flex items-center justify-center">
        {isExpanded ? (
          <ChevronUp
            data-system-orb-icon="open"
            className="h-3.5 w-3.5 text-current drop-shadow-[0_0_6px_currentColor]"
            strokeWidth={2.4}
          />
        ) : (
          <span data-system-orb-icon="closed" className="text-[10px] text-current drop-shadow-[0_0_6px_currentColor] md:text-xs">✦</span>
        )}
      </span>
    </span>
  );

  if (!onToggle || !detailsId) {
    return <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center">{orb}</span>;
  }

  return (
    <button
      type="button"
      aria-expanded={Boolean(isExpanded)}
      aria-controls={isExpanded ? detailsId : undefined}
      aria-label={isExpanded ? 'Collapse System Prompt details' : 'Expand System Prompt details'}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="group flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-current outline-none transition-[filter,transform] duration-200 hover:brightness-125 active:scale-95 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020a16] motion-reduce:transition-none"
    >
      {orb}
    </button>
  );
}

export const SystemBlock = React.memo(function SystemBlock({ content, system, renderProse, className, ...props }: SystemBlockProps) {
  const { onAnimationStart: _anim, onDrag: _drag, onDragStart: _dStart, onDragEnd: _dEnd, ...safeProps } = props;
  const detailsId = React.useId();
  const eventKey = `${system?.kind ?? ''}|${system?.promptType ?? ''}|${system?.title ?? ''}|${content}`;
  const [expandedEventKey, setExpandedEventKey] = React.useState<string | null>(null);

  const isIronFate = (system?.title || '').toLowerCase().includes('iron fate') || 
                     (system?.kind || '').toLowerCase().includes('iron fate') || 
                     content.toLowerCase().includes('iron fate');

  const isDeathFlag = (system?.title || '').toLowerCase().includes('death flag') || 
                      (system?.kind || '').toLowerCase().includes('death flag') || 
                      content.toLowerCase().includes('death flag');

  // If structured system object exists, render the matching System presentation.
  if (system) {
    if (system.fateResult) {
      return (
        <div {...safeProps}>
          <FateResultCard data={system.fateResult} />
        </div>
      );
    }

    // Parsed payloads can deliver a non-array `rows`; normalize once before the
    // presentation branch and the row mapping (same guard as buildSystemContext).
    const rows = Array.isArray(system.rows) ? system.rows : [];
    const visibleChanges = Array.isArray(system.changes) ? system.changes : [];

    const menacingTone = isDeathFlag
      ? ' animate-menacing-red'
      : isIronFate
        ? ' animate-menacing-amber'
        : '';

    // Reworked 2026-08-22 to the production information hierarchy. The compact
    // System Prompt is title-led: the dramatic per-event headline
    // (`system.title`) leads with the temporary orb emblem resting at the right
    // edge, followed by a small `✦ classification ✦` line from the semantic
    // System color meaning, up to three concise key/value rows
    // (`system.rows`, production panel anatomy), an optional event badge, one
    // non-scrolling horizontal row of prioritized signed consequences
    // (`system.changes`, gains green / losses red), and the concise serif
    // sentence (`content` — the only text narration reads) in its own bottom
    // section. Mobile shows three consequences only when all three fit,
    // otherwise the first two; roomy layouts may show four. Optional
    // Reader-owned expanded data turns the orb into an in-place disclosure
    // control and replaces only that consequence row with a complete
    // Codex-shaped breakdown. Everything renders from structured data; the
    // component hardcodes no event text. Tinted by the same semantic System
    // color system as the structured panels (blue is the default voice) over
    // blue-black depth.
    //
    // Routing: events carrying signed consequences (or no rows at all) render
    // compact. Events carrying rows without consequences keep the holographic
    // panel below, so dense mechanical readouts, rarity chips, and existing
    // row-bearing events stay untouched.
    if (rows.length === 0 || visibleChanges.length > 0) {
      const badge = normalizeSystemPromptBadge(system.badge);
      const badgeSeverity = badge ? getBadgeSeverityStyles(badge) : undefined;
      const sentence = getVisibleSystemSentence(content, badge);
      const headline = (system.title || '').trim();
      const compactRows = rows.slice(0, 3);
      const expandedData = normalizeExpandedData(system.expanded);
      const isExpanded = Boolean(expandedData && expandedEventKey === eventKey);
      const renderSystemText = renderProse ?? ((text: string) => text);
      const inferenceContext = buildSystemContext(system, content);
      const meaning = getSystemColorMeaning(system.promptType, inferenceContext);
      const classification = getSystemCompactClassification(meaning);
      const accent = `${meaning.borderColor} ${meaning.textColor}`;

      return (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          data-system-prompt-state={isExpanded ? 'expanded' : 'compact'}
          className={`system-block cursor-default my-6 md:my-8 mx-auto max-w-xl relative overflow-hidden rounded-2xl border bg-[#020a16]/85 px-5 py-4 md:px-6 md:py-5 shadow-[0_0_28px_color-mix(in_srgb,currentColor_16%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 ${accent}${menacingTone} ${className || ''}`}
          {...safeProps}
        >
          {/* Blue-black depth: the emblem's glow bleeds in from the right. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_50%,color-mix(in_srgb,currentColor_13%,transparent)_0%,transparent_62%)]" />
          <div className="relative flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {headline && (
                  <span className="block font-mono text-base md:text-lg font-bold uppercase tracking-[0.18em] leading-snug text-current drop-shadow-[0_0_10px_color-mix(in_srgb,currentColor_55%,transparent)]">
                    {headline}
                  </span>
                )}
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                  {'✦ '}
                  <span className="text-neutral-300">{classification.category}</span>
                  {' | '}
                  <span className={meaning.textColor}>{classification.subtype}</span>
                  {` (${meaning.colorName}) ✦`}
                </span>
              </div>
              <SystemOrbEmblem
                isExpanded={isExpanded}
                detailsId={expandedData ? detailsId : undefined}
                onToggle={expandedData
                  ? () => setExpandedEventKey(current => current === eventKey ? null : eventKey)
                  : undefined}
              />
            </div>
            {isExpanded && expandedData?.subject && (
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-300 md:text-[11px]">
                <span>{renderSystemText(expandedData.subject.name)}</span>
                {expandedData.subject.role && (
                  <>
                    <span aria-hidden="true" className="text-current/45">|</span>
                    <span className="text-neutral-400">{expandedData.subject.role}</span>
                  </>
                )}
              </div>
            )}
            {compactRows.length > 0 && (
              <div className="mt-3 space-y-1.5 font-mono text-[11px] md:text-xs">
                {compactRows.map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <span className="text-neutral-400 uppercase tracking-widest">{row.label}</span>
                    <span className="font-semibold tracking-wide text-right text-neutral-100">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
            {badge && badgeSeverity && (
              <span className={`mt-2.5 self-start rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:text-[10px] md:tracking-[0.18em] ${badgeSeverity.pill}`}>
                <span className={badgeSeverity.label}>{badge.label}</span>{' '}
                <span aria-hidden="true" className={badgeSeverity.label}>·</span>{' '}
                <span className={`font-bold ${badgeSeverity.value}`}>{badge.value}</span>
              </span>
            )}
            {isExpanded && expandedData ? (
              <SystemExpandedBreakdown
                data={expandedData}
                detailsId={detailsId}
                renderText={renderSystemText}
              />
            ) : (
              <SystemConsequenceRow changes={visibleChanges} />
            )}
            {sentence && (
              <p data-system-summary="true" className="mt-3 border-t border-inherit/30 pt-2.5 text-center font-serif text-base italic leading-relaxed text-neutral-100 md:text-lg">
                {renderSystemText(sentence)}
              </p>
            )}
          </div>
        </motion.div>
      );
    }

    // Semantic inference context: title, row labels/values, and visible content.
    const inferenceContext = buildSystemContext(system, content);
    let colorStyles = getSystemPromptColor(system.promptType, inferenceContext);
    const meaning = getSystemColorMeaning(system.promptType, inferenceContext);

    colorStyles += menacingTone;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`system-block holographic-panel cursor-pointer my-6 md:my-8 rounded-md border font-mono p-3 md:p-4 max-w-xl mx-auto transition-all duration-300 ${colorStyles} ${className || ''}`}
        {...safeProps}
      >
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-inherit/30">
            <div className="flex items-center space-x-2">
              {isDeathFlag && <Skull className="w-5 h-5 text-red-500 animate-pulse shrink-0" />}
              {isIronFate && <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce shrink-0" />}
              <div className="flex flex-col">
                <span className="font-bold uppercase tracking-widest text-xs md:text-sm leading-tight">{system.title}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono mt-0.5">
                  ✦ {meaning.name} ✦
                </span>
              </div>
            </div>
            {system.rarity && (
              <span className="rarity-accent text-[10px] uppercase px-2 py-0.5 border rounded-sm bg-black/40 text-inherit">
                {system.rarity}
              </span>
            )}
          </div>
          
          {rows.length > 0 && (
            <div className="space-y-1.5">
              {rows.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] md:text-xs">
                  <span className="opacity-70 uppercase tracking-widest">{row.label}</span>
                  <span className="font-semibold tracking-wide text-right">{row.value}</span>
                </div>
              ))}
            </div>
          )}
          
          {content && content.trim() !== '' && (
            <div className="mt-1.5 text-[11px] md:text-xs opacity-70 border-t border-inherit/30 pt-2 text-center italic leading-relaxed">
              {content.replace(/^\[|\]$/g, '').trim()}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fallback to legacy string-based parsing
  const text = content.replace(/^\[|\]$/g, '').trim();
  let fallbackColorStyles = getSystemPromptColor(undefined, text);
  const meaning = getSystemColorMeaning(undefined, text);

  if (isDeathFlag) {
    fallbackColorStyles += ' animate-menacing-red';
  } else if (isIronFate) {
    fallbackColorStyles += ' animate-menacing-amber';
  }

  return (
    <div {...props} className={`my-6 md:my-8 p-4 md:p-5 bg-black/50 border font-mono text-[11px] md:text-sm rounded-lg text-center tracking-widest leading-relaxed transition-all duration-500 hover:brightness-125 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] ${fallbackColorStyles} ${className || ''}`}>
      <div className="flex flex-col items-center justify-center mb-1.5 md:mb-2">
        {isDeathFlag && <Skull className="w-5 h-5 md:w-6 md:h-6 text-red-500 animate-pulse mb-1.5" />}
        {isIronFate && <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-amber-500 animate-bounce mb-1.5" />}
        <div className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">
          ✦ {meaning.name} ✦
        </div>
      </div>
      <span className="opacity-90">{text}</span>
    </div>
  );
});
