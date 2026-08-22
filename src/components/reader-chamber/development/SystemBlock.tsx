import React from 'react';
import { motion } from 'motion/react';
import { Skull, TriangleAlert as AlertTriangle } from 'lucide-react';
import { SystemEvent } from '../shared/types';
import { FateResultCard } from './FateResultCard';
import { getSystemPromptColor, getSystemColorMeaning, buildSystemContext } from '../shared/systemColors';
export { SYSTEM_COLORS_LEGEND } from '../shared/systemColors';

interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
}

/**
 * Temporary System emblem: the existing Codex orb — radial glow, glass sphere,
 * dashed and dotted orbit rings, luminous ✦ core — scaled down beside the
 * compact System Prompt until a dedicated System sigil is approved. Purely
 * decorative; it inherits the block's semantic accent through `currentColor`,
 * and the ring spin rests under `prefers-reduced-motion`.
 */
function SystemOrbEmblem() {
  return (
    <div aria-hidden="true" className="relative h-[68px] w-[68px] shrink-0 md:h-20 md:w-20">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,currentColor_30%,transparent)_0%,transparent_70%)] animate-pulse" />
      <div className="absolute inset-[6px] rounded-full border border-[color-mix(in_srgb,currentColor_40%,transparent)] bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,currentColor_38%,transparent)_0%,rgba(1,11,20,0.95)_72%)] shadow-[0_0_20px_color-mix(in_srgb,currentColor_45%,transparent),inset_0_0_10px_color-mix(in_srgb,currentColor_28%,transparent)]" />
      <div className="absolute inset-0 rounded-full border border-dashed border-[color-mix(in_srgb,currentColor_45%,transparent)] animate-[spin_12s_linear_infinite] motion-reduce:animate-none" />
      <div className="absolute -inset-1 rounded-full border border-dotted border-[color-mix(in_srgb,currentColor_25%,transparent)] animate-[spin_20s_linear_infinite_reverse] motion-reduce:animate-none" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm md:text-base text-current drop-shadow-[0_0_8px_currentColor]">✦</span>
      </div>
    </div>
  );
}

export const SystemBlock = React.memo(function SystemBlock({ content, system, className, ...props }: SystemBlockProps) {
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

    const menacingTone = isDeathFlag
      ? ' animate-menacing-red'
      : isIronFate
        ? ' animate-menacing-amber'
        : '';

    // Approved 2026-08-22 compact System Prompt: the fixed SYSTEM label, one
    // concise event sentence in reader serif, up to two structured signed
    // changes beneath it, and the temporary orb emblem — tinted by the same
    // semantic System color system as the structured panels (blue is the
    // default voice) over blue-black depth. Events carrying mechanical rows
    // keep the holographic panel below.
    if (!system.rows || system.rows.length === 0) {
      const sentence = content.replace(/^\[|\]$/g, '').trim();
      const visibleChanges = (system.changes ?? []).slice(0, 2);
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
          <div className="relative flex items-center gap-4 md:gap-6">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-mono text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.3em] text-current drop-shadow-[0_0_6px_color-mix(in_srgb,currentColor_45%,transparent)]">
                System
              </span>
              {sentence && (
                <p className="mt-2 font-serif text-base leading-relaxed text-neutral-100 md:text-lg">
                  {sentence}
                </p>
              )}
              {visibleChanges.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {visibleChanges.map((change, index) => (
                    <span
                      key={index}
                      className="font-mono text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.22em] text-current opacity-90"
                    >
                      {change.direction === 'loss' ? '−' : '+'} {change.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <SystemOrbEmblem />
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
          
          {system.rows && system.rows.length > 0 && (
            <div className="space-y-1.5">
              {system.rows.map((row, idx) => (
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
