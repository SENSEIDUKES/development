import React from 'react';
import { motion } from 'motion/react';
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle, Flame } from 'lucide-react';
import { FateResultData } from '../shared/types';
import {
  getColorCodeStyle,
  getColorCodeSurfaceStyle,
  getColorCodeValue,
  resolveFateConsequenceDetailColorCode,
  resolveFateResultColorCode,
} from '../shared/colorCodes';
import { normalizeFateResultData } from '../shared/systemPromptPresentation';

export interface FateResultCardProps extends React.HTMLAttributes<HTMLDivElement> {
  data: FateResultData;
}

export const FateResultCard = React.memo(function FateResultCard({
  data: receivedData,
  className,
  style: suppliedStyle,
  ...props
}: FateResultCardProps) {
  const data = normalizeFateResultData(receivedData);
  if (!data) return null;
  const {
    onAnimationStart: _animationStart,
    onDrag: _drag,
    onDragStart: _dragStart,
    onDragEnd: _dragEnd,
    ...safeProps
  } = props;
  const colorCode = resolveFateResultColorCode(data.outcome);
  let Icon = Flame;
  let borderOpacity = 0.6;
  let backgroundOpacity = 0.4;
  let glowOpacity = 0.4;

  switch (data.outcome) {
    case 'FATE AVERTED':
      Icon = CheckCircle;
      borderOpacity = 0.5;
      backgroundOpacity = 0.1;
      glowOpacity = 0.3;
      break;
    case 'FATE SCARRED':
      Icon = AlertCircle;
      borderOpacity = 0.5;
      backgroundOpacity = 0.1;
      glowOpacity = 0.3;
      break;
    case 'DOOM MANIFESTED':
    default:
      Icon = Flame;
      break;
  }

  const colorValue = getColorCodeValue(colorCode);
  const newStoryStateColorCode = resolveFateConsequenceDetailColorCode('newStoryState');
  const genreShiftColorCode = resolveFateConsequenceDetailColorCode('genreShift');
  const fateStyle: React.CSSProperties = {
    ...getColorCodeSurfaceStyle(colorCode, { borderOpacity, backgroundOpacity, glowOpacity }),
    backgroundImage: `linear-gradient(to bottom right, color-mix(in srgb, ${colorValue} 18%, #171717), #171717, color-mix(in srgb, ${colorValue} 9%, #171717))`,
  };

  return (
    <motion.div
      {...safeProps}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      data-system-presentation="fate"
      data-reader-narration="excluded"
      data-color-code={colorCode}
      style={{ ...fateStyle, ...suppliedStyle }}
      className={`my-6 md:my-8 mx-auto max-w-2xl p-5 md:p-6 border-2 rounded-2xl font-mono collectible-card relative overflow-hidden ${data.outcome === 'DOOM MANIFESTED' ? 'animate-pulse' : ''} ${className || ''}`}
    >
      {/* Mystical background overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0wIDRMMCAwTDQgNEwwIDQiIGZpbGw9IiMzMzMiLz4KPC9zdmc+')] opacity-20 pointer-events-none mix-blend-screen" />
      <div className="absolute -inset-10 bg-white/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-center space-x-3 mb-5 border-b border-inherit/30 pb-4">
          <Icon className="w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_10px_currentColor]" />
          <h2 className="text-lg md:text-2xl font-black tracking-[0.2em] uppercase drop-shadow-[0_0_15px_currentColor]">
            FATE RESULT: {data.outcome}
          </h2>
          <Icon className="w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_10px_currentColor]" />
        </div>

        <div className="space-y-4 md:space-y-5 text-sm md:text-base relative">
          <div className="bg-black/40 p-4 rounded-xl border border-inherit/20 backdrop-blur-sm">
            <h3 className="uppercase tracking-[0.2em] opacity-80 mb-2 text-xs md:text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]" />
              Timeline Scar
            </h3>
            <p className="font-semibold text-signal text-base md:text-lg leading-relaxed">{data.timelineScar}</p>
          </div>

          {data.permanentCosts && data.permanentCosts.length > 0 && (
            <div className="bg-black/40 p-4 rounded-xl border border-inherit/20 backdrop-blur-sm">
              <h3 className="uppercase tracking-[0.2em] opacity-80 mb-2 text-xs md:text-sm font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]" />
                {data.outcome === 'FATE AVERTED' ? 'Permanent Cost' : 'Permanent Restrictions'}
              </h3>
              <ul className="space-y-1.5 text-gray-300">
                {data.permanentCosts.map((cost, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-current opacity-70 mt-0.5">❖</span>
                    <span className="leading-relaxed text-sm">{cost}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data.newStoryState || data.genreShift) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.newStoryState && (
                <div className="bg-black/40 p-4 rounded-xl border border-inherit/20 backdrop-blur-sm">
                  <h3 className="uppercase tracking-[0.2em] opacity-80 mb-2 text-xs md:text-sm font-bold">New Story State</h3>
                  <p
                    className="font-bold text-base"
                    data-color-code={newStoryStateColorCode}
                    data-fate-consequence-detail="newStoryState"
                    style={getColorCodeStyle(newStoryStateColorCode)}
                  >
                    {data.newStoryState}
                  </p>
                </div>
              )}

              {data.genreShift && (
                <div className="bg-black/40 p-4 rounded-xl border border-inherit/20 backdrop-blur-sm">
                  <h3 className="uppercase tracking-[0.2em] opacity-80 mb-2 text-xs md:text-sm font-bold">Genre Shift</h3>
                  <p
                    className="font-bold text-base"
                    data-color-code={genreShiftColorCode}
                    data-fate-consequence-detail="genreShift"
                    style={getColorCodeStyle(genreShiftColorCode)}
                  >
                    {data.genreShift}
                  </p>
                </div>
              )}
            </div>
          )}

          {data.newActiveStats && data.newActiveStats.length > 0 && (
            <div className="bg-black/40 p-4 rounded-xl border border-inherit/20 backdrop-blur-sm">
              <h3 className="uppercase tracking-[0.2em] opacity-80 mb-2 text-xs md:text-sm font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]" />
                New Active Stats
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.newActiveStats.map((stat, idx) => (
                  <span key={idx} className="px-2 py-1 border-2 border-inherit/30 rounded-md bg-black/60 text-xs md:text-sm tracking-widest font-bold shadow-inner">
                    {stat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
