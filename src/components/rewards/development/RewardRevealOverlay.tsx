import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ParticleEffect } from '@seihouse/library-ui';
import './rewards.css';

/**
 * The celestial backdrop every reward reveal plays over: the particle shower
 * and the two ambient glows from the Relic Reveal. The accent stays neutral
 * until the reward is revealed, so the rarity colour lands as a payoff rather
 * than a spoiler. It sits on the Library's full-screen dialog layer (300, as
 * the Cave's dialogs and the Familiar's Energy panel do), above page chrome.
 */
export function RewardRevealOverlay({ label, accent, onBackdropClick, onEscape, children }: {
  /** Accessible name of the reveal dialog. */
  label: string;
  accent: string;
  /** Tapping the backdrop; supplied only once dismissing is allowed. */
  onBackdropClick?: () => void;
  /** Escape; supplied only once dismissing is allowed. */
  onEscape?: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!onEscape) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onEscape]);

  return (
    <AnimatePresence>
      <motion.div
        key="reward-reveal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md"
        onClick={onBackdropClick}
        data-reward-reveal
      >
        <ParticleEffect accent={accent} />
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] animate-pulse rounded-full bg-gold-accent/10 blur-[120px] motion-reduce:animate-none" />
          <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] animate-pulse rounded-full bg-portal/10 blur-[120px] motion-reduce:animate-none" />
        </div>
        <div className="absolute inset-0 overflow-y-auto">
          <div className="relative flex min-h-full w-full items-center justify-center p-4">{children}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
