import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, AlertTriangle, Eye, HelpCircle, Heart, Flame, ShieldAlert, Award, RefreshCw, Star, Skull } from 'lucide-react';

interface FateType {
  type: string;
  doomedOutcome: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const FATE_TYPES: FateType[] = [
  {
    type: 'Death Fate',
    doomedOutcome: 'Someone is destined to die',
    description: 'A physical expiry written in the stars. A master, a lover, or the protagonist themselves has a finite countdown that must be interrupted.',
    icon: <Skull size={15} />,
    color: 'from-red-950/40 to-black border-red-800/40 text-red-400'
  },
  {
    type: 'Love Fate',
    doomedOutcome: 'Two people always end up separated',
    description: 'An emotional doom. Perfect alignment cursed by geographic, political, or karmic schisms, forcing eternal distance.',
    icon: <Heart size={15} />,
    color: 'from-pink-950/40 to-black border-pink-800/40 text-pink-400'
  },
  {
    type: 'Kingdom Fate',
    doomedOutcome: 'A nation always collapses',
    description: 'Structural decay. Civil war, imperial invasion, or spiritual corruption that inevitably turns a magnificent dynasty to ash.',
    icon: <Shield size={15} />,
    color: 'from-yellow-950/40 to-black border-yellow-800/40 text-amber-400'
  },
  {
    type: 'Villain Fate',
    doomedOutcome: 'The MC always becomes corrupted',
    description: 'The tragedy of forced descent. No matter how noble their starting heart, the MC is systematically stripped of hope until they become the final boss.',
    icon: <Flame size={15} />,
    color: 'from-purple-950/40 to-black border-purple-800/40 text-purple-400'
  },
  {
    type: 'Betrayal Fate',
    doomedOutcome: 'A trusted ally always turns',
    description: 'The dagger in the dark. An unbreakable brotherhood or sworn partnership is doomed by external leverage, memory wipe, or hidden avarice.',
    icon: <ShieldAlert size={15} />,
    color: 'from-orange-950/40 to-black border-orange-800/40 text-orange-400'
  },
  {
    type: 'Poverty Fate',
    doomedOutcome: 'A clan/business/family falls into ruin',
    description: 'Socioeconomic oblivion. The merchant empire or ancient noble clan is bled dry by sabotage, high-tier sanctions, or consecutive tragedies.',
    icon: <Award size={15} />,
    color: 'from-yellow-950/30 to-black border-amber-900/30 text-amber-500'
  },
  {
    type: 'War Fate',
    doomedOutcome: 'Peace always fails',
    description: 'The cycle of conflict. Treaties are broken, borders are raided, and peace summits are assassinated, keeping the world locked in endless bloodletting.',
    icon: <AlertTriangle size={15} />,
    color: 'from-red-900/30 to-black border-red-700/30 text-red-500'
  },
  {
    type: 'Regression Fate',
    doomedOutcome: 'No matter what changes, the loop returns',
    description: 'The temporal cage. Defeating the dark lord or saving the realm only triggers a silent rewind, wiping memory and forcing a re-run of history.',
    icon: <RefreshCw size={15} />,
    color: 'from-blue-950/40 to-black border-blue-800/40 text-blue-400'
  },
  {
    type: 'Reputation Fate',
    doomedOutcome: 'The MC is always framed or disgraced',
    description: 'Social exile. Every act of heroism is twisted into a demonic plot, turning the entire righteous alliance and public memory against them.',
    icon: <HelpCircle size={15} />,
    color: 'from-neutral-900 to-black border-neutral-700/40 text-neutral-400'
  },
  {
    type: 'World Fate',
    doomedOutcome: 'The timeline always ends in apocalypse',
    description: 'Cosmic extinction. Void beasts break the celestial dome, or the world energy dries up entirely, collapsing the timeline in beautiful heat-death.',
    icon: <Star size={15} />,
    color: 'from-cyan-950/40 to-black border-cyan-800/40 text-cyan-400'
  }
];

export const FateSurvivalExplanation: React.FC<{ compact?: boolean }> = React.memo(({ compact = false }) => {
  const [selectedFate, setSelectedFate] = useState<number | null>(null);

  return (
    <div className={`rounded-xl border bg-gradient-to-b from-neutral-950 via-void to-void overflow-hidden transition-all duration-500 ${
      compact ? 'border-human/30 shadow-[0_0_15px_rgba(139,0,0,0.1)] p-4' : 'border-human/50 shadow-[0_0_25px_rgba(139,0,0,0.2)] p-6'
    }`}>
      {/* Title block */}
      <div className="flex items-start justify-between gap-4 border-b border-neutral-900 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-human animate-pulse">✦</span>
            <span className="font-sc text-[10px] sm:text-xs text-human tracking-[0.2em] font-bold uppercase">Novel Genre Codex</span>
          </div>
          <h3 className="font-display font-bold text-lg sm:text-2xl text-signal tracking-wide">
            Fate Survival
          </h3>
        </div>
        <div className="px-2.5 py-1 rounded bg-human/10 border border-human/30 text-human font-mono text-[9px] font-bold uppercase tracking-widest animate-pulse">
          GENRE MODE ACTIVE
        </div>
      </div>

      {/* Definition */}
      <div className="space-y-3 mb-6">
        <p className="font-display text-lg sm:text-xl text-signal leading-relaxed font-bold border-l-2 border-human pl-4 py-0.5">
          "Read the story. Survive the world."
        </p>
        <p className="font-serif text-sm text-neutral-400 leading-relaxed italic">
          A story mode/genre where the world, relationship, character, kingdom, timeline, or destiny is moving toward a known or hidden <strong>“fated outcome,”</strong> and the reader/player must use limited choices, clues, sacrifices, and interventions to alter that outcome before it becomes irreversible.
        </p>
        <p className="font-sans text-xs text-neutral-500 leading-relaxed mt-4">
          A Curated Experience Designed by Ⓢ SEIHOUSE PRODUCTIONS LLC
        </p>
      </div>

      {/* Key Shift Concept */}
      <div className="mb-6 p-4 rounded-lg bg-neutral-950/60 border border-neutral-900/80">
        <div className="flex items-center gap-2 mb-2">
          <Eye size={14} className="text-portal animate-pulse" />
          <h4 className="font-sc font-bold text-xs text-portal tracking-wider uppercase">The Key Paradigm Shift</h4>
        </div>
        <p className="font-sans font-medium text-xs text-signal mb-1">
          The danger is not always physical.
        </p>
        <p className="font-serif text-xs text-neutral-400 italic">
          The concept of “survival” in this domain can mean keeping a lineage intact, protecting a destined bond, saving a crumbling dynasty, or preventing the decay of human integrity itself.
        </p>
      </div>

      {/* Fate Types Interactive Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-sc text-xs text-neutral-300 font-bold uppercase tracking-wider">Manifestations of Fate</span>
          <span className="text-[10px] font-sans text-neutral-500 font-mono">Select a fate type below</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FATE_TYPES.map((fate, index) => {
            const isSelected = selectedFate === index;
            return (
              <div key={fate.type} className="flex flex-col">
                <button
                  type="button"
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedFate(isSelected ? null : index)}
                  className={`w-full text-left p-2.5 rounded-lg border bg-gradient-to-r transition-all duration-300 flex items-center justify-between ${
                    isSelected 
                      ? `${fate.color} shadow-[0_0_12px_rgba(139,0,0,0.15)] scale-[1.01]` 
                      : 'border-neutral-900 hover:border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-signal'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`p-1 rounded bg-black/40 ${isSelected ? 'text-inherit' : 'text-neutral-500'}`}>
                      {fate.icon}
                    </span>
                    <span className="font-sans text-xs font-semibold">{fate.type}</span>
                  </div>
                  <span className={`font-mono text-[10px] ${isSelected ? 'text-inherit font-bold' : 'text-neutral-500'}`}>
                    {isSelected ? '✦' : '→'}
                  </span>
                </button>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-black/50 border-x border-b border-neutral-900 rounded-b-lg -mt-1 mx-1.5 p-3 space-y-2 text-xs"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block mb-0.5">The Doomed Outcome</span>
                        <span className="font-display font-bold text-signal">{fate.doomedOutcome}</span>
                      </div>
                      <p className="font-sans text-neutral-400 leading-relaxed text-[11px]">
                        {fate.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
