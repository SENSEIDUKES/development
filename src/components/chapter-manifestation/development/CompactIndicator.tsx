import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Maximize2, Loader2 } from 'lucide-react';
import type { LoadingTaskCard } from '../../../library/manifestations/taskCard';

export interface CompactIndicatorProps {
  task: LoadingTaskCard;
  /** Shown when the operation can be expanded back to the primary veil. */
  onExpand?: () => void;
}

/**
 * Compact mode — the persistent floating corner indicator for minimized,
 * short, or background operations. Pure presentation driven by the same
 * LoadingTaskCard the primary veil consumes.
 */
export default function CompactIndicator({ task, onExpand }: CompactIndicatorProps) {
  const isVersa = task.agentId === 'versa';
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="fixed bottom-32 left-6 z-[9999] flex flex-col items-start select-none">
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute bottom-20 left-0 w-72 bg-zinc-950/95 border ${isVersa ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-portal/30 hover:border-portal/50'} text-zinc-100 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col gap-3 transition-all duration-300 pointer-events-auto`}
          >
            {/* Floating Widget Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`w-2 h-2 rounded-full ${isVersa ? 'bg-amber-500' : 'bg-portal'} animate-ping absolute inset-0`}></div>
                  <div className={`w-2 h-2 rounded-full ${isVersa ? 'bg-amber-500' : 'bg-portal'} relative`}></div>
                </div>
                <span className={`font-sc text-[10px] tracking-[0.15em] ${isVersa ? 'text-amber-500' : 'text-portal'} uppercase font-bold`}>
                  {task.compactTitle}
                </span>
              </div>

              {onExpand && (
                <button
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                  onClick={() => {
                    onExpand();
                    setShowDetails(false);
                  }}
                  title="Expand Visual Chamber"
                  aria-label="Expand Visual Chamber"
                  className={`p-1 rounded text-zinc-400 ${isVersa ? 'hover:text-amber-500' : 'hover:text-portal'} hover:bg-zinc-900/50 transition-all cursor-pointer`}
                >
                  <Maximize2 size={13} />
                </button>
              )}
            </div>

            {/* Floating Widget Body */}
            <div className="text-left">
              <p className="text-xs font-semibold text-zinc-150 leading-tight">
                {task.compactBody}
              </p>
              <p className="text-[11px] text-zinc-400 italic mt-1 leading-relaxed">
                {task.compactStatus}
              </p>
            </div>

            {/* Progress / Time Footer */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 bg-zinc-900/40 px-2.5 py-1.5 rounded-lg border border-zinc-900">
              <div className="flex items-center gap-1.5">
                <Loader2 size={11} className={`animate-spin ${isVersa ? 'text-amber-500' : 'text-portal'}`} />
                <span>Aether Stream Active</span>
              </div>
              {task.estimatedSecondsRemaining !== null && (
                <span>~{task.estimatedSecondsRemaining}s left</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The compact glowing circular icon button */}
      <motion.button
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
        onClick={() => setShowDetails(prev => !prev)}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
        aria-label={showDetails ? "Hide generation details" : "Show generation details"}
        className={`relative w-14 h-14 rounded-full bg-zinc-950/90 border ${isVersa ? 'border-amber-500/40 hover:border-amber-500/80' : 'border-portal/40 hover:border-portal/80'} flex items-center justify-center cursor-pointer pointer-events-auto transition-all duration-300 outline-none`}
        animate={{
          scale: [1, 1.04, 1],
          boxShadow: isVersa
            ? [
                "0 0 10px rgba(245, 158, 11, 0.15)",
                "0 0 25px rgba(245, 158, 11, 0.65)",
                "0 0 10px rgba(245, 158, 11, 0.15)"
              ]
            : [
                "0 0 10px rgba(4, 172, 255, 0.15)",
                "0 0 25px rgba(4, 172, 255, 0.65)",
                "0 0 10px rgba(4, 172, 255, 0.15)"
              ]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Slow-Rotating Outer Ritual Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
          className={`absolute -inset-1 rounded-full border border-dashed ${isVersa ? 'border-amber-500/25' : 'border-portal/25'}`}
        />

        {/* Glowing Ambient Radial BG */}
        <div className={`absolute inset-0.5 rounded-full bg-gradient-to-tr ${isVersa ? 'from-amber-500/10 to-red-500/5' : 'from-portal/10 to-blue-500/5'} blur-xs`} />

        {/* Main Icon Content Wrapper */}
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden relative shadow-inner">
          {task.icon.kind === 'image' ? (
            <img
              src={task.icon.src}
              alt={task.icon.alt}
              className="w-full h-full object-contain relative z-10 p-0.5"
              referrerPolicy="no-referrer"
              style={isVersa ? { filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' } : { filter: 'drop-shadow(0 0 4px rgba(4, 172, 255, 0.5))' }}
            />
          ) : (
            <Compass size={18} className={`${isVersa ? 'text-amber-500' : 'text-portal'} animate-pulse`} />
          )}
        </div>

        {/* Dynamic blink status node on top-right of the circle badge */}
        <div className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border ${isVersa ? 'border-amber-500/30' : 'border-portal/30'} flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.8)]`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isVersa ? 'bg-amber-500' : 'bg-portal'} animate-pulse`} />
        </div>
      </motion.button>
    </div>
  );
}
