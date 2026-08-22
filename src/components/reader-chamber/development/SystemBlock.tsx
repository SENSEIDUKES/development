import React from 'react';
import { motion } from 'motion/react';
import { Skull, TriangleAlert as AlertTriangle } from 'lucide-react';
import type { SystemEvent, SystemPromptBadge, SystemPromptChange } from '../shared/types';
import { FateResultCard } from './FateResultCard';
import { getSystemPromptColor, getSystemColorMeaning, buildSystemContext } from '../shared/systemColors';
export { SYSTEM_COLORS_LEGEND } from '../shared/systemColors';

interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
  /** Reader-owned rendering for named character Codex links inside prose. */
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

  const consequenceClass = 'shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.10em] text-current opacity-90 md:text-[11px] md:tracking-[0.18em]';

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
            {change.direction === 'loss' ? '−' : '+'} {change.label.trim()}
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
            {change.direction === 'loss' ? '−' : '+'} {change.label.trim()}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Temporary System emblem: the existing Codex orb — radial glow, glass sphere,
 * dashed and dotted orbit rings, luminous ✦ core — scaled down to the compact
 * System Prompt's kicker row until a dedicated System sigil is approved. Purely
 * decorative; it inherits the block's semantic accent through `currentColor`,
 * and the ring spin rests under `prefers-reduced-motion`.
 */
function SystemOrbEmblem() {
  return (
    <div aria-hidden="true" className="relative h-9 w-9 shrink-0 md:h-10 md:w-10">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,currentColor_30%,transparent)_0%,transparent_70%)] animate-pulse motion-reduce:animate-none" />      <div className="absolute inset-[3px] rounded-full border border-[color-mix(in_srgb,currentColor_40%,transparent)] bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,currentColor_38%,transparent)_0%,rgba(1,11,20,0.95)_72%)] shadow-[0_0_12px_color-mix(in_srgb,currentColor_45%,transparent),inset_0_0_6px_color-mix(in_srgb,currentColor_28%,transparent)]" />
      <div className="absolute inset-0 rounded-full border border-dashed border-[color-mix(in_srgb,currentColor_45%,transparent)] animate-[spin_12s_linear_infinite] motion-reduce:animate-none" />
      <div className="absolute -inset-1 rounded-full border border-dotted border-[color-mix(in_srgb,currentColor_25%,transparent)] animate-[spin_20s_linear_infinite_reverse] motion-reduce:animate-none" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] md:text-xs text-current drop-shadow-[0_0_6px_currentColor]">✦</span>
      </div>
    </div>
  );
}

export const SystemBlock = React.memo(function SystemBlock({ content, system, renderProse, className, ...props }: SystemBlockProps) {
  const { onAnimationStart: _anim, onDrag: _drag, onDragStart: _dStart, onDragEnd: _dEnd, ...safeProps } = props;

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

    const menacingTone = isDeathFlag
      ? ' animate-menacing-red'
      : isIronFate
        ? ' animate-menacing-amber'
        : '';

    // Approved 2026-08-22 compact System Prompt, rebuilt around three parts:
    // the fixed SYSTEM kicker (with the temporary orb emblem resting beside
    // it), one dramatic per-event headline from `system.title`, one concise
    // event sentence in reader serif from `content` — the only text narration
    // reads — an optional event badge, and one non-scrolling horizontal bottom
    // row of prioritized signed consequences from `system.changes`. Mobile
    // shows three only when all three fit, otherwise the first two; roomy
    // layouts may show four. Everything renders from structured data; the
    // component hardcodes no event text. Tinted by the same semantic
    // System color system as the structured panels (blue is the default voice)
    // over blue-black depth. Events carrying mechanical rows keep the
    // holographic panel below.
    if (rows.length === 0) {
      const badge = normalizeSystemPromptBadge(system.badge);
      const sentence = getVisibleSystemSentence(content, badge);
      const headline = (system.title || '').trim();
      const visibleChanges = Array.isArray(system.changes) ? system.changes : [];
      const inferenceContext = buildSystemContext(system, content);
      const meaning = getSystemColorMeaning(system.promptType, inferenceContext);
      const accent = `${meaning.borderColor} ${meaning.textColor}`;

      return (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`system-block cursor-pointer my-6 md:my-8 mx-auto max-w-xl relative overflow-hidden rounded-2xl border bg-[#020a16]/85 px-5 py-4 md:px-6 md:py-5 shadow-[0_0_28px_color-mix(in_srgb,currentColor_16%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 ${accent}${menacingTone} ${className || ''}`}
          {...safeProps}
        >
          {/* Blue-black depth: the emblem's glow bleeds in from the right. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_50%,color-mix(in_srgb,currentColor_13%,transparent)_0%,transparent_62%)]" />
          <div className="relative flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.3em] text-current drop-shadow-[0_0_6px_color-mix(in_srgb,currentColor_45%,transparent)]">
                System
              </span>
              <SystemOrbEmblem />
            </div>
            {headline && (
              <span className="mt-3 font-mono text-base md:text-lg font-bold uppercase tracking-[0.18em] leading-snug text-current drop-shadow-[0_0_10px_color-mix(in_srgb,currentColor_55%,transparent)]">
                {headline}
              </span>
            )}
            {badge && (
              <span className="mt-2.5 self-start rounded-full border border-current/35 bg-[color-mix(in_srgb,currentColor_10%,transparent)] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:text-[10px] md:tracking-[0.18em]">
                {badge.label} <span aria-hidden="true">·</span>{' '}
                <span className="font-bold">{badge.value}</span>
              </span>
            )}
            {sentence && (
              <p className="mt-2 font-serif text-base leading-relaxed text-neutral-100 md:text-lg">
                {renderProse ? renderProse(sentence) : sentence}
              </p>
            )}
            <SystemConsequenceRow changes={visibleChanges} />
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
