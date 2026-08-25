import React from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Skull, TriangleAlert as AlertTriangle, X } from 'lucide-react';
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
import { WorldNotice } from './WorldNotice';
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
  getSystemColorStyle,
  getSystemCompactClassification,
  resolveSystemBadgeColorCode,
  resolveSystemOutcomeColorCode,
} from '../shared/colorCodes';
import type { ColorCodeId, SystemColorMeaning } from '../shared/colorCodes';
export { SYSTEM_COLORS_LEGEND } from '../shared/colorCodes';

export interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
  /** Reader-owned rendering for named character Codex links in summary and expanded copy. */
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

function getExpandedTone(value: unknown): SystemPromptExpandedTone {
  return typeof value === 'string' && ['neutral', 'positive', 'warning', 'danger'].includes(value)
    ? value as SystemPromptExpandedTone
    : 'neutral';
}

/**
 * Expanded sections share the outcome semantics. Neutral sections retain the
 * event's System color so an informational panel still reads as one event.
 */
function getExpandedToneColorCode(
  tone: SystemPromptExpandedTone,
  fallbackColorCode: ColorCodeId,
): ColorCodeId {
  if (tone === 'neutral') return fallbackColorCode;
  return resolveSystemOutcomeColorCode(tone === 'danger' ? 'negative' : tone);
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
  fallbackColorCode,
}: {
  heading: string;
  progress: SystemPromptExpandedProgress;
  tone: SystemPromptExpandedTone;
  fallbackColorCode: ColorCodeId;
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
  const colorCode = getExpandedToneColorCode(tone, fallbackColorCode);
  const colorStyle = getColorCodeStyle(colorCode);
  const label = typeof progress.label === 'string' && progress.label.trim()
    ? progress.label.trim()
    : `${progress.value}/${progress.max}`;

  return (
    <div data-color-code={colorCode} className="mt-2.5">
      <div
        className="mb-1.5 font-mono text-[10px] font-semibold tracking-[0.16em]"
        style={colorStyle}
      >
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
          className="absolute inset-y-0 rounded-full bg-current shadow-[0_0_8px_currentColor]"
          style={{
            ...colorStyle,
            left: `${isBipolar ? segmentStart : 0}%`,
            width: `${isBipolar ? segmentWidth : position}%`,
          }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-current"
          style={{ ...colorStyle, left: `${position}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Marker of an open Codex hovercard anywhere in the document. The hovercard
 * portals above the overlay, so while one is open the overlay defers Escape to
 * it — the topmost layer always closes first.
 */
const CODEX_HOVERCARD_SELECTOR = '[data-slot="codex-hovercard"]';

const OVERLAY_FOCUSABLE_SELECTOR = 'button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])';

/** Codex sections beyond this index render only on md and wider viewports. */
const MOBILE_SECTION_LIMIT = 3;

/**
 * The expanded System event report: a focused, viewport-locked overlay opened
 * by the compact card's orb action and portaled to <body>, floating above the
 * Reader Chamber. The chapter never grows and the reader's scroll position
 * never moves. One flat panel — classification, headline, subject, optional
 * badge, the System outcome row, then Codex sections separated by simple
 * dividers (never stacked cards). Mobile prioritizes the three highest-value
 * sections (the rest are `hidden md:block`); larger screens show every section
 * in the same structure. A single keyboard-focusable body scroller handles
 * short-height screens and Reader-authored long content while the title and
 * close action remain pinned, so the page itself never moves. Nothing here is
 * narration: the root keeps the
 * `data-reader-narration="excluded"` boundary and lives outside the reader
 * DOM, so TTS still reads only the compact card's prose. Escape, the close
 * button, or a backdrop tap closes the report and returns focus to the orb.
 */
function SystemExpandedOverlay({
  data,
  detailsId,
  headline,
  meaning,
  badge,
  changes,
  renderText,
  onClose,
  returnFocusRef,
}: {
  data: SystemPromptExpandedData;
  detailsId: string;
  headline: string;
  meaning: SystemColorMeaning;
  badge?: SystemPromptBadge;
  changes: SystemPromptChange[];
  renderText: (text: string) => React.ReactNode;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const backdropPressRef = React.useRef(false);
  const reduceMotion = useReducedMotion();
  const classification = getSystemCompactClassification(meaning);
  const badgeSeverity = badge ? getBadgeSeverityStyles(badge) : undefined;

  const closeAndRestoreFocus = React.useCallback(() => {
    onClose();
    returnFocusRef.current?.focus();
  }, [onClose, returnFocusRef]);

  // Lock page scroll while the report is open; restore whatever the page had.
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
        // An open Codex hovercard floats above this dialog; it closes first.
        const hovercard = document.querySelector<HTMLElement>(CODEX_HOVERCARD_SELECTOR);
        if (hovercard) return;
        event.preventDefault();
        closeAndRestoreFocus();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(OVERLAY_FOCUSABLE_SELECTOR)]
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
          : { 'aria-label': 'System event report' })}
        tabIndex={-1}
        data-system-expanded="true"
        data-color-code={meaning.colorCode}
        data-reader-narration="excluded"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.15 }}
        onClick={(event) => event.stopPropagation()}
        style={getSystemColorStyle(meaning) as React.CSSProperties}
        className={`flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-[#020a16]/95 shadow-[0_0_32px_color-mix(in_srgb,currentColor_18%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)] outline-none ${meaning.borderColor} ${meaning.textColor}`}
      >
        <div className="shrink-0 px-5 pt-4 md:px-6 md:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                {'✦ '}
                <span className="text-neutral-300">{classification.category}</span>
                {' | '}
                <span className={meaning.textColor}>{classification.subtype}</span>
                {' ✦'}
              </span>
              {headline && (
                <h2
                  id={`${detailsId}-title`}
                  className="mt-1 break-words font-mono text-base font-bold uppercase leading-snug tracking-[0.18em] text-current [overflow-wrap:anywhere] drop-shadow-[0_0_10px_color-mix(in_srgb,currentColor_55%,transparent)] md:text-lg"
                >
                  {headline}
                </h2>
              )}
            </div>
            <button
              type="button"
              aria-label="Close System event report"
              onClick={closeAndRestoreFocus}
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-neutral-400 outline-none transition-[color,transform] duration-200 hover:text-neutral-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020a16] motion-reduce:transition-none"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div
          data-system-expanded-scroll-region="true"
          role="region"
          aria-label="System event report details"
          tabIndex={0}
          className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current/60 md:px-6 md:pb-5"
        >
          {data.subject && (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-300 md:text-[11px]">
              <span>{renderText(data.subject.name)}</span>
              {data.subject.role && (
                <>
                  <span aria-hidden="true" className="text-current/45">|</span>
                  <span className="text-neutral-400">{data.subject.role}</span>
                </>
              )}
            </div>
          )}
          {badge && badgeSeverity && (
            <span
              data-color-code={badgeSeverity.colorCode}
              style={badgeSeverity.pillStyle}
              className="mt-2.5 self-start rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:text-[10px] md:tracking-[0.18em]"
            >
              <span className="text-neutral-300" style={badgeSeverity.labelStyle}>{badge.label}</span>{' '}
              <span aria-hidden="true" className="text-neutral-300" style={badgeSeverity.labelStyle}>·</span>{' '}
              <span className="font-bold" data-color-code={badgeSeverity.colorCode} style={badgeSeverity.valueStyle}>{badge.value}</span>
            </span>
          )}
          <SystemConsequenceRow changes={changes} variant="expanded" />
          {data.sections.map((section, index) => {
            const tone = getExpandedTone(section.tone);
            const toneColorCode = getExpandedToneColorCode(tone, meaning.colorCode);
            const toneStyle = getColorCodeStyle(toneColorCode);
            const statusTone = section.status?.tone
              ? getExpandedTone(section.status.tone)
              : tone;
            const statusColorCode = getExpandedToneColorCode(statusTone, meaning.colorCode);
            const statusStyle = getColorCodeStyle(statusColorCode);
            const items = Array.isArray(section.items)
              ? section.items.filter(item => typeof item === 'string' && item.trim() !== '')
              : [];
            const headingId = `${detailsId}-section-${index}`;

            return (
              <section
                key={`${section.heading}-${index}`}
                aria-labelledby={headingId}
                data-system-expanded-section={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                data-color-code={toneColorCode}
                className={`mt-3 border-t border-white/10 pt-3${index >= MOBILE_SECTION_LIMIT ? ' hidden md:block' : ''}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    id={headingId}
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={toneStyle}
                  >
                    {section.heading}
                  </h3>
                  {section.status?.label?.trim() && (
                    <span
                      data-color-code={statusColorCode}
                      className="max-w-full break-words rounded-full border border-current/30 bg-black/25 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] [overflow-wrap:anywhere]"
                      style={statusStyle}
                    >
                      {section.status.label.trim()}
                    </span>
                  )}
                </div>
                {typeof section.value === 'string' && section.value.trim() && (
                  <p className="mt-2 break-words font-serif text-sm leading-relaxed text-neutral-100 [overflow-wrap:anywhere] md:text-base">
                    {renderText(section.value.trim())}
                  </p>
                )}
                {typeof section.detail === 'string' && section.detail.trim() && (
                  <p className="mt-1.5 break-words font-serif text-[13px] leading-relaxed text-neutral-300 [overflow-wrap:anywhere] md:text-sm">
                    {renderText(section.detail.trim())}
                  </p>
                )}
                {section.progress && (
                  <SystemExpandedProgress
                    heading={section.heading}
                    progress={section.progress}
                    tone={tone}
                    fallbackColorCode={meaning.colorCode}
                  />
                )}
                {items.length > 0 && (
                  <ul className="mt-2.5 space-y-2 border-l border-current/25 pl-3">
                    {items.map((item, itemIndex) => (
                      <li key={`${item}-${itemIndex}`} className="break-words font-serif text-[13px] leading-relaxed text-neutral-200 [overflow-wrap:anywhere] md:text-sm">
                        {renderText(item.trim())}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * System outcome row carrying genre-native outcomes as clean, flat text.
 * The compact card shows at most the first two outcomes as slots separated by
 * a clear divider, each split into a neutral white subject and a
 * meaning-colored state word with no numbers — a label carrying a numeric
 * quantity (Lifespan 100, Karma 15) compresses to its subject plus
 * Increased/Decreased from the direction (LIFESPAN INCREASED, KARMA
 * DECREASED), while other labels color only their final state word (REALM
 * ASCENDED, TITLE STRIPPED). The expanded event report lists every outcome in
 * full and keeps the exact figures: plus and minus signs appear only on
 * genuine mathematical changes (QI +200, KARMA −15, HEALTH −30%); plain
 * status outcomes render unsigned.
 */
/** The compact card's bottom half holds at most two outcome slots. */
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

function SystemConsequenceRow({ changes, variant }: { changes: SystemPromptChange[]; variant: 'compact' | 'expanded' }) {
  const prioritizedChanges = React.useMemo(
    () => changes
      .filter(change => typeof change?.label === 'string' && change.label.trim() !== ''),
    [changes],
  );

  const renderConsequence = (change: SystemPromptChange) => {
    const label = change.label.trim();
    const quantityStart = label.search(/\d/);
    if (quantityStart === -1) return label;
    return (
      <>
        {label.slice(0, quantityStart)}
        {change.direction === 'loss' ? '−' : '+'}
        {label.slice(quantityStart)}
      </>
    );
  };

  if (prioritizedChanges.length === 0) return null;

  if (variant === 'compact') {
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

  return (
    <div
      data-consequence-count={prioritizedChanges.length}
      className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[color-mix(in_srgb,currentColor_18%,transparent)] pt-2 [overflow-wrap:anywhere]"
    >
      {prioritizedChanges.map((change, index) => {
        const outcomeColorCode = resolveSystemOutcomeColorCode(change.tone, change.direction);
        return (
          <span
            key={`${change.direction}-${change.label}-${index}`}
            data-color-code={outcomeColorCode}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.10em] md:text-[11px] md:tracking-[0.18em]"
            style={getColorCodeStyle(outcomeColorCode)}
          >
            {renderConsequence(change)}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Temporary System action: the existing Codex orb — radial glow, glass sphere,
 * dashed and dotted orbit rings, luminous ✦ core — scaled down to the compact
 * System Prompt's kicker row until a dedicated System sigil is approved. When
 * expanded data exists it is the one accessible control that opens the
 * viewport-locked event report overlay; the core changes to an upward chevron
 * while the report is open, and `buttonRef` lets the overlay restore focus
 * here on close. Its ring spin rests under `prefers-reduced-motion`.
 */
function SystemOrbEmblem({
  isExpanded,
  detailsId,
  onToggle,
  buttonRef,
}: {
  isExpanded?: boolean;
  detailsId?: string;
  onToggle?: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
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
      ref={buttonRef}
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
  const eventKey = `${system?.kind ?? ''}|${system?.promptType ?? ''}|${route?.presentation ?? ''}|${system?.title ?? ''}|${content}`;
  const [expandedEventKey, setExpandedEventKey] = React.useState<string | null>(null);
  // The compact card's TTS sentence rests collapsed behind the bottom arrow
  // toggle to conserve reader screen space; narration reads it from the
  // block data, never from this visibility state.
  const [sentenceRevealed, setSentenceRevealed] = React.useState(false);
  const orbButtonRef = React.useRef<HTMLButtonElement>(null);

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
      // minimized.
      if (presentation === 'narrative') {
      const badge = normalizeSystemPromptBadge(system.badge);
      const badgeSeverity = badge ? getBadgeSeverityStyles(badge) : undefined;
      const sentence = getVisibleSystemSentence(content, badge);
      const summaryId = `${detailsId}-summary`;
      const headline = (system.title || '').trim();
      const flavor = (system.flavor || '').trim();
      const compactRows = rows.slice(0, 3);
      const expandedData = normalizeExpandedData(system.expanded);
      const isExpanded = Boolean(expandedData && expandedEventKey === eventKey);
      const renderSystemText = renderProse ?? ((text: string) => text);
      const meaning = surface.meaning;
      const classification = getSystemCompactClassification(meaning);
      const accent = meaning.textColor;

      return (
        <>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
            data-motion={reduceMotion ? 'reduced' : 'full'}
            data-system-prompt-state={isExpanded ? 'expanded' : 'compact'}
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
                  <SystemOrbEmblem
                    isExpanded={isExpanded}
                    detailsId={expandedData ? detailsId : undefined}
                    onToggle={expandedData
                      ? () => setExpandedEventKey(current => current === eventKey ? null : eventKey)
                      : undefined}
                    buttonRef={orbButtonRef}
                  />
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

              <SystemConsequenceRow changes={visibleChanges} variant="compact" />

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
          {isExpanded && expandedData && typeof document !== 'undefined' && createPortal(
            <SystemExpandedOverlay
              data={expandedData}
              detailsId={detailsId}
              headline={headline}
              meaning={meaning}
              badge={badge}
              changes={visibleChanges}
              renderText={renderSystemText}
              onClose={() => setExpandedEventKey(null)}
              returnFocusRef={orbButtonRef}
            />,
            document.body,
          )}
        </>
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
