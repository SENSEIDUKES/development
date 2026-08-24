import React from 'react';
import { motion } from 'motion/react';
import { Skull, TriangleAlert as AlertTriangle } from 'lucide-react';
import { SystemEvent } from '../shared/types';
import { FateResultCard } from './FateResultCard';
import { buildSystemContext, getColorCodeStyle, getColorCodeValue, getSystemColorStyle, getSystemPromptColor, getSystemColorMeaning, resolveFateFlagColorCode } from '../shared/colorCodes';
export { SYSTEM_COLORS_LEGEND } from '../shared/colorCodes';

interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
}

export const SystemBlock = React.memo(function SystemBlock({ content, system, className, ...props }: SystemBlockProps) {
  const {
    onAnimationStart: _anim,
    onDrag: _drag,
    onDragStart: _dStart,
    onDragEnd: _dEnd,
    style: callerStyle,
    ...safeProps
  } = props;

  const isIronFate = (system?.title || '').toLowerCase().includes('iron fate') || 
                     (system?.kind || '').toLowerCase().includes('iron fate') || 
                     content.toLowerCase().includes('iron fate');

  const isDeathFlag = (system?.title || '').toLowerCase().includes('death flag') || 
                      (system?.kind || '').toLowerCase().includes('death flag') || 
                      content.toLowerCase().includes('death flag');
  const fateFlagColorCode = isDeathFlag
    ? resolveFateFlagColorCode('death')
    : isIronFate
      ? resolveFateFlagColorCode('ironFate')
      : undefined;
  const getSystemRootStyle = (meaning: ReturnType<typeof getSystemColorMeaning>) => ({
    ...getSystemColorStyle(meaning),
    ...(fateFlagColorCode ? { '--fate-flag-color': getColorCodeValue(fateFlagColorCode) } : {}),
    ...callerStyle,
  }) as React.CSSProperties;

  // If structured system object exists, render holographic panel
  if (system) {
    if (system.fateResult) {
      return (
        <div {...safeProps}>
          <FateResultCard data={system.fateResult} />
        </div>
      );
    }

    // Semantic inference context: title, row labels/values, and visible content.
    const inferenceContext = buildSystemContext(system, content);
    let meaning = getSystemColorMeaning(system.promptType, inferenceContext);

    // Legacy chapters saved before promptType existed: keep their original kind
    // palette when semantic inference found nothing better than gray. Truly
    // unknown events stay on the intentional neutral/gray style.
    if (!system.promptType && (meaning.type === 'neutral' || meaning.type === 'other')) {
      const legacyMeaning = getSystemColorMeaning(system.kind);
      if (legacyMeaning.type !== 'neutral' && legacyMeaning.type !== 'other') {
        meaning = legacyMeaning;
      }
    }

    let colorStyles = getSystemPromptColor(meaning.type, inferenceContext);

    if (fateFlagColorCode) colorStyles += ' animate-menacing-fate';

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`system-block holographic-panel cursor-pointer my-6 md:my-8 rounded-md border font-mono p-3 md:p-4 max-w-xl mx-auto transition-all duration-300 ${colorStyles} ${className || ''}`}
        style={getSystemRootStyle(meaning)}
        data-color-code={meaning.colorCode}
        {...safeProps}
      >
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-inherit/30">
            <div className="flex items-center space-x-2">
              {isDeathFlag && <Skull data-color-code={resolveFateFlagColorCode('death')} style={getColorCodeStyle(resolveFateFlagColorCode('death'))} className="w-5 h-5 animate-pulse shrink-0" />}
              {isIronFate && <AlertTriangle data-color-code={resolveFateFlagColorCode('ironFate')} style={getColorCodeStyle(resolveFateFlagColorCode('ironFate'))} className="w-5 h-5 animate-bounce shrink-0" />}
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

  if (fateFlagColorCode) fallbackColorStyles += ' animate-menacing-fate';

  return (
    <div {...safeProps} style={getSystemRootStyle(meaning)} data-color-code={meaning.colorCode} className={`my-6 md:my-8 p-4 md:p-5 bg-black/50 border font-mono text-[11px] md:text-sm rounded-lg text-center tracking-widest leading-relaxed transition-all duration-500 hover:brightness-125 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] ${fallbackColorStyles} ${className || ''}`}>
      <div className="flex flex-col items-center justify-center mb-1.5 md:mb-2">
        {isDeathFlag && <Skull data-color-code={resolveFateFlagColorCode('death')} style={getColorCodeStyle(resolveFateFlagColorCode('death'))} className="w-5 h-5 md:w-6 md:h-6 animate-pulse mb-1.5" />}
        {isIronFate && <AlertTriangle data-color-code={resolveFateFlagColorCode('ironFate')} style={getColorCodeStyle(resolveFateFlagColorCode('ironFate'))} className="w-5 h-5 md:w-6 md:h-6 animate-bounce mb-1.5" />}
        <div className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">
          ✦ {meaning.name} ✦
        </div>
      </div>
      <span className="opacity-90">{text}</span>
    </div>
  );
});
