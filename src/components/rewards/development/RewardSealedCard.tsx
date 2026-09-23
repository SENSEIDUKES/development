import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Shield } from 'lucide-react';
import { RewardLabel, RewardOrnament, RewardSigil } from './RewardSigil';
import { NEUTRAL_REWARD_THEME, rewardVibrate } from './rewardTheme';

/**
 * The closed face of the reward card, from the Relic Reveal: the same frame,
 * hairline and sigil as the revealed card, rendered in the neutral sealed tone
 * so nothing about the rarity leaks before the tap.
 */
export function RewardSealedCard({ label, line, tapHint = 'Tap to reveal', onReveal }: {
  /** "Sealed Relic". */
  label: string;
  /** "A relic stirs within the seal." */
  line: string;
  tapHint?: string;
  onReveal: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const hex = NEUTRAL_REWARD_THEME.hex;
  return (
    <motion.button
      type="button"
      key="reward-sealed"
      initial={reduceMotion ? { opacity: 0 } : { scale: 0.8, y: 50, opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 100 }}
      className="group relative cursor-pointer rounded-[1.5rem] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7dd3ff]"
      data-celestial-foreground
      data-reward-sealed
      aria-label={`${label}. ${tapHint}.`}
      onClick={event => { event.stopPropagation(); rewardVibrate('heavyTap'); onReveal(); }}
    >
      <div aria-hidden className="pointer-events-none absolute -inset-8 rounded-full reward-halo-pulse"
        style={{ background: `radial-gradient(ellipse at 50% 42%, ${hex}14 0%, transparent 62%)` }} />
      <div className="relative w-full max-w-[280px] overflow-hidden rounded-[1.5rem] bg-[#060607]/95 px-6 pb-6 pt-6 text-center transition-shadow duration-700 group-hover:shadow-[0_0_60px_rgba(229,231,235,0.14)] sm:max-w-[320px] sm:px-7 sm:pt-7"
        style={{ border: `1px solid ${hex}33`, boxShadow: `0 0 44px ${hex}14, inset 0 0 70px rgba(0,0,0,0.7)` }}>
        <div aria-hidden className="pointer-events-none absolute inset-[5px] rounded-[1.2rem]" style={{ border: `1px solid ${hex}1a` }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.045] to-transparent" />
        <div className="relative z-10 flex flex-col items-center">
          <RewardLabel hex={hex}>{label}</RewardLabel>
          <div className="relative my-4 flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
            <RewardSigil hex={hex} variant="sealed"><Shield size={16} strokeWidth={1} /></RewardSigil>
          </div>
          <div className="mb-3"><RewardOrnament hex={hex} /></div>
          <p className="font-serif text-[11px] italic tracking-wide text-neutral-500">{line}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500 opacity-60 transition-all duration-500 group-hover:text-neutral-300 group-hover:opacity-100">
            {tapHint}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
