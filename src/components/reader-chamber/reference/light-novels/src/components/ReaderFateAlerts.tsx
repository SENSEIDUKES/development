import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryWorld } from '../types';
import { FateSurvivalExplanation } from './FateSurvivalExplanation';

interface ReaderFateAlertsProps {
  activeStory: StoryWorld;
  currentPowerStage: string;
  selectedChapterNum: number;
  showFateCodex: boolean;
  setShowFateCodex: (show: boolean) => void;
}

export function ReaderFateAlerts({
  activeStory,
  currentPowerStage,
  selectedChapterNum,
  showFateCodex,
  setShowFateCodex,
}: ReaderFateAlertsProps) {
  return (
    <>
      {activeStory.genre === 'Fate Survival' && (
        <div className="mb-8 p-5 rounded-lg bg-neutral-950 border border-red-950/40 relative overflow-hidden shadow-[0_0_25px_rgba(139,0,0,0.15)] animate-fadeIn">
          <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-red-600/10 to-transparent pointer-events-none rounded-bl-full" />
          <div className="flex items-center justify-between border-b border-red-950/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-red-500 animate-pulse text-xs">💀</span>
              <h4 className="font-sc font-bold text-xs sm:text-sm text-red-500 tracking-[0.2em] uppercase">
                Fate Survival Mode Active
              </h4>
            </div>
            <div className="px-2 py-0.5 rounded bg-red-950/30 border border-red-900/30 text-red-400 font-mono text-[9px] tracking-wider uppercase">
              DOOM DEADLINE: CHAPTER 7
            </div>
          </div>
          
          <p className="text-neutral-300 font-serif text-sm italic mb-4 leading-relaxed">
            "The timeline is moving toward a fated outcome. You must use limited choices, clues, and intervention to alter destiny before it becomes irreversible."
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans mb-4">
            <div className="space-y-1.5 p-3 rounded bg-black/40 border border-neutral-900">
              <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                Target Profile
              </div>
              <div className="font-display font-medium text-signal">
                MC: <span className="text-neutral-200 font-bold">{activeStory.mcName}</span>
              </div>
              <div className="text-neutral-400">
                Current Stage: <span className="text-gold-accent font-mono">{activeStory.memory?.currentPowerStage || currentPowerStage}</span>
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded bg-black/40 border border-neutral-900">
              <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                Chronos Calibration
              </div>
              <div className="font-display font-medium text-signal">
                Remaining Steps: <span className="text-red-500 font-bold">{Math.max(0, 7 - selectedChapterNum)} Chapters</span>
              </div>
              <div className="text-neutral-400">
                Status: <span className="text-red-400 font-bold uppercase tracking-wider">{selectedChapterNum >= 7 ? 'Critical Apex' : 'Fate Approaching'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-md bg-void border border-neutral-900 text-[11px] leading-relaxed text-neutral-400 font-sans">
              <strong className="text-neutral-300">How to intervene:</strong> Read carefully for death or crisis flags. The danger is not always physical—you could be surviving a Death, Love, Kingdom, Villain, Betrayal, Poverty, War, Regression, Reputation, or World Fate. Use the <span className="text-portal font-semibold">Alter Fate (Branch)</span> panel below to force a timeline shift!
            </div>

            <div className="flex justify-start">
              <button
                type="button"
                tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowFateCodex(!showFateCodex)}
                className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-signal text-xs font-sc uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5"
              >
                <span>{showFateCodex ? "✦ Hide Fate Codex" : "🔍 Inspect Fate Codex"}</span>
              </button>
            </div>

            <AnimatePresence>
              {showFateCodex && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden pt-2"
                >
                  <FateSurvivalExplanation compact={true} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {activeStory.hardcoreFateMode && (
        <div className="mb-8 p-5 rounded-lg bg-neutral-950 border border-red-950/40 relative overflow-hidden shadow-[0_0_20px_rgba(139,0,0,0.1)] animate-fadeIn">
          <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-red-600/10 to-transparent pointer-events-none rounded-bl-full" />
          <div className="flex items-center justify-between border-b border-red-950/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-red-500 animate-pulse text-xs">☠️</span>
              <h4 className="font-sc font-bold text-xs sm:text-sm text-red-500 tracking-[0.2em] uppercase">
                Hardcore Fate Mode Engaged
              </h4>
            </div>
            <div className="px-2 py-0.5 rounded bg-red-950/30 border border-red-900/30 text-red-400 font-mono text-[9px] tracking-wider uppercase animate-pulse">
              HIGH DANGER
            </div>
          </div>
          
          <p className="text-neutral-300 font-sans text-xs leading-relaxed">
            The system is authorized to introduce irreversible consequences, death flags on allies, sudden betrayals, and forced tradeoffs. There are no safe choices. Protect your timeline!
          </p>
        </div>
      )}
    </>
  );
}
