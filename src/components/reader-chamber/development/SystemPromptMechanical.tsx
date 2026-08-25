import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Skull, TriangleAlert as AlertTriangle } from 'lucide-react';
import type { SystemEvent } from '../shared/types';
import { getColorCodeStyle } from '../shared/colorCodes';
import {
  getSystemPromptSurfaceClasses,
  type SystemPromptRow,
  type SystemPromptSurface,
} from '../shared/systemPromptPresentation';

interface SystemPromptMechanicalProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system: SystemEvent;
  rows: SystemPromptRow[];
  surface: SystemPromptSurface;
}

/** The LitRPG/stat-display form of a regular System Prompt. */
export function SystemPromptMechanical({
  content,
  system,
  rows,
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
  const isDeathFlag = surface.fateFlag === 'death';
  const isIronFate = surface.fateFlag === 'ironFate';

  return (
    <motion.div
      {...safeProps}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
      data-interactive="false"
      data-motion={reduceMotion ? 'reduced' : 'full'}
      data-color-code={surface.meaning.colorCode}
      data-system-presentation="mechanical"
      style={style}
      className={`system-block holographic-panel cursor-default my-6 md:my-8 rounded-md border font-mono p-3 md:p-4 max-w-xl mx-auto transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none ${getSystemPromptSurfaceClasses(surface)} ${className || ''}`}
    >
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between border-b pb-2 border-inherit/30">
          <div className="flex items-center space-x-2">
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
              <span className="break-words font-bold uppercase tracking-widest text-xs md:text-sm leading-tight [overflow-wrap:anywhere]">{system.title}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono mt-0.5">
                ✦ {surface.meaning.name} ✦
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
            {rows.map((row, index) => (
              <div key={`${row.label}-${index}`} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3 text-[11px] md:text-xs">
                <span className="min-w-0 break-words opacity-70 uppercase tracking-widest [overflow-wrap:anywhere]">{row.label}</span>
                <span className="min-w-0 break-words font-semibold tracking-wide text-right [overflow-wrap:anywhere]">{row.value}</span>
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
