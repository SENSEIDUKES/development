import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Sparkles, Award, Shield, Zap, RefreshCw, Save, Sliders, Compass, Globe, Key } from 'lucide-react';
import { ParticleEffect } from '@seihouse/sen/ui';
import { CosmicArtifact } from '../shared/types';

/**
 * Development copy of the Relic Reveal sequence — the active UI-work copy.
 *
 * Reference (kept untouched): `src/components/relics/reference/RelicReveal.tsx`.
 * Iterate here first; port approved changes back to the reference and then to
 * Light-Novels `src/components/ModalsAndToasts.tsx`.
 *
 * Differences from the reference copy (2026-07-30 cleanup pass):
 * 1. Rank background theme lighting only appears after the reveal — the
 *    celestial backdrop stays rank-neutral while the card is sealed.
 * 2. The initial Claim Relic card is rebuilt as the closed face of the final
 *    premium card (same frame, hairline, and sigil in the neutral sealed
 *    tone) instead of the placeholder grid panel.
 * 3. The bottom-right info box no longer repeats the rank — it names the
 *    artifact type only; the rank lives in the header label.
 * 4. Sparks shake loose from the card rim during the reveal spin.
 */

// Vibration patterns copied verbatim from Light-Novels `src/lib/vibration.ts`.
const VIBRATION_PATTERNS = {
  softTap: [15],
  heavyTap: [50],
} as const;

const vibrate = (pattern: keyof typeof VIBRATION_PATTERNS) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([...VIBRATION_PATTERNS[pattern]]);
    } catch {
      // Vibration is best-effort; never block the reveal on it.
    }
  }
};

type RarityTheme = {
  /** Raw accent hex used for sigil strokes, auras, and glow. */
  hex: string;
  glowColor: string; textColor: string; titleColor: string;
  dotClass: string; sparkleClass: string; borderGlow: string; buttonHover: string;
};

const NEUTRAL_THEME: RarityTheme = {
  hex: '#e5e7eb',
  glowColor: 'rgba(255,255,255,0.8)',
  textColor: 'text-neutral-200',
  titleColor: 'text-neutral-200',
  dotClass: 'bg-neutral-300 shadow-[0_0_5px_rgba(255,255,255,0.8)]',
  sparkleClass: 'text-neutral-500',
  borderGlow: 'border-neutral-300/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]',
  buttonHover: 'hover:border-neutral-500/80',
};

const RARITY_THEMES: Record<string, RarityTheme> = {
  Transcendent: { hex: "#22d3ee", glowColor: "rgba(34,211,238,0.7)", textColor: "text-cyan-200", titleColor: "text-cyan-100", dotClass: "bg-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)]", sparkleClass: "text-cyan-700/80", borderGlow: "border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]", buttonHover: "hover:border-cyan-500/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]" },
  Mythic: { hex: "#ef4444", glowColor: "rgba(239,68,68,0.7)", textColor: "text-red-200", titleColor: "text-red-100", dotClass: "bg-red-200 shadow-[0_0_8px_rgba(239,68,68,0.8)]", sparkleClass: "text-red-800/80", borderGlow: "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]", buttonHover: "hover:border-red-500/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" },
  Legendary: { hex: "#f59e0b", glowColor: "rgba(245,158,11,0.7)", textColor: "text-amber-200", titleColor: "text-amber-100", dotClass: "bg-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.8)]", sparkleClass: "text-amber-700/60", borderGlow: "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]", buttonHover: "hover:border-amber-500/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]" },
  Epic: { hex: "#a855f7", glowColor: "rgba(168,85,247,0.7)", textColor: "text-purple-200", titleColor: "text-purple-100", dotClass: "bg-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.8)]", sparkleClass: "text-purple-800/80", borderGlow: "border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]", buttonHover: "hover:border-purple-500/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]" },
  Rare: { hex: "#10b981", glowColor: "rgba(16,185,129,0.7)", textColor: "text-emerald-200", titleColor: "text-emerald-100", dotClass: "bg-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.8)]", sparkleClass: "text-emerald-800/80", borderGlow: "border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]", buttonHover: "hover:border-emerald-500/60 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]" },
  Common: { hex: "#9ca3af", glowColor: "rgba(156,163,175,0.55)", textColor: "text-neutral-300", titleColor: "text-neutral-200", dotClass: "bg-neutral-300 shadow-[0_0_6px_rgba(156,163,175,0.6)]", sparkleClass: "text-neutral-600", borderGlow: "border-neutral-500/30 shadow-[0_0_12px_rgba(156,163,175,0.08)]", buttonHover: "hover:border-neutral-400/50" },
};

/**
 * Per-rank atmosphere ladder. The card layout is identical for every rank;
 * only the ambient effects scale. Every flag renders as a pointer-events-none
 * overlay, and all of them are disabled under prefers-reduced-motion.
 */
type RelicRarityEffects = {
  /** Subtle colored halo behind the card. */
  halo: boolean;
  /** Soft shimmer sweeping softly across the card edge. */
  edgeShimmer: boolean;
  /** Slow pulse on the halo. */
  pulse: boolean;
  /** Number of slow-drifting motes floating around the card. */
  particles: number;
  /** Warm glow washing the space behind the full card. */
  warmGlow: boolean;
  /** Slightly brighter central seal. */
  brighterSeal: boolean;
  /** Brief one-shot flare the moment the relic is revealed. */
  revealFlare: boolean;
};

const NO_RELIC_EFFECTS: RelicRarityEffects = {
  halo: false, edgeShimmer: false, pulse: false, particles: 0,
  warmGlow: false, brighterSeal: false, revealFlare: false,
};

const RARITY_EFFECTS: Record<string, RelicRarityEffects> = {
  // Clean border, almost no particles.
  Common: { ...NO_RELIC_EFFECTS },
  // Soft edge shimmer plus a subtle colored halo.
  Rare: { ...NO_RELIC_EFFECTS, halo: true, edgeShimmer: true },
  // Slow pulse plus a few drifting particles.
  Epic: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 3 },
  // Warm glow behind the full card, slightly brighter seal, brief reveal flare.
  Legendary: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 5, warmGlow: true, brighterSeal: true, revealFlare: true },
  Mythic: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 6, warmGlow: true, brighterSeal: true, revealFlare: true },
  Transcendent: { ...NO_RELIC_EFFECTS, halo: true, pulse: true, particles: 6, warmGlow: true, brighterSeal: true, revealFlare: true },
};

/** Deterministic drift-mote layout (no per-render randomness). */
const RELIC_DRIFT_MOTES = Array.from({ length: 6 }, (_, i) => ({
  left: `${10 + ((i * 67) % 78)}%`,
  top: `${28 + ((i * 41) % 58)}%`,
  size: 2.5 + (i % 3),
  duration: 7 + (i % 4) * 2.5,
  delay: (i * 1.7) % 8,
}));

const RELIC_SIGIL_CSS = `
  .relic-sigil-spin { transform-box: view-box; transform-origin: 120px 120px; animation: relic-sigil-rotate 90s linear infinite; }
  .relic-sigil-spin-rev { transform-box: view-box; transform-origin: 120px 120px; animation: relic-sigil-rotate-rev 60s linear infinite; }
  @keyframes relic-sigil-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes relic-sigil-rotate-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  .relic-twinkle { animation: relic-twinkle 2.8s ease-in-out infinite; }
  @keyframes relic-twinkle { 0%, 100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.15); } }
  .relic-breathe { animation: relic-breathe 4.5s ease-in-out infinite; }
  @keyframes relic-breathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  .relic-halo-pulse { animation: relic-halo-pulse 5.5s ease-in-out infinite; }
  @keyframes relic-halo-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.95; } }
  .relic-shimmer-band { animation: relic-shimmer-sweep 7s ease-in-out infinite; }
  @keyframes relic-shimmer-sweep { 0% { transform: translateX(-140%) skewX(-16deg); } 55%, 100% { transform: translateX(340%) skewX(-16deg); } }
  .relic-drift { animation-name: relic-drift; animation-timing-function: linear; animation-iteration-count: infinite; }
  @keyframes relic-drift { 0% { transform: translateY(10px) scale(0.6); opacity: 0; } 15% { opacity: 0.8; } 80% { opacity: 0.45; } 100% { transform: translateY(-52px) scale(1); opacity: 0; } }
  .relic-reveal-flare { animation: relic-reveal-flare 1.2s ease-out 1 both; }
  @keyframes relic-reveal-flare { 0% { opacity: 0.85; transform: scale(0.65); } 100% { opacity: 0; transform: scale(1.4); } }
  /* One-shot sparks shaken loose while the card spins from sealed to revealed.
     Each spark sets --sx/--sy (flight vector) and --sr (tumble) inline. */
  .relic-spin-spark { animation: relic-spin-spark-shed 0.9s cubic-bezier(0.16, 0.6, 0.35, 1) 1 both; }
  @keyframes relic-spin-spark-shed {
    0% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(0.4); }
    18% { opacity: 1; }
    100% { opacity: 0; transform: translate(var(--sx, 0px), var(--sy, -40px)) rotate(var(--sr, 90deg)) scale(1); }
  }
  .relic-claim-btn { transition: box-shadow 0.5s ease, filter 0.5s ease; }
  .relic-claim-btn:hover { box-shadow: 0 0 30px var(--relic-hex-glow, rgba(255,255,255,0.25)); filter: brightness(1.12); }
  .relic-claim-btn:focus-visible { outline: 2px solid var(--relic-hex-glow, rgba(255,255,255,0.4)); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    .relic-sigil-spin, .relic-sigil-spin-rev, .relic-twinkle, .relic-breathe, .relic-halo-pulse, .relic-shimmer-band, .relic-drift, .relic-reveal-flare, .relic-spin-spark { animation: none; }
  }
`;

/**
 * Deterministic spark layout for the reveal spin — sparks shed from the card
 * rim while it rotates from sealed to revealed. No per-render randomness.
 */
const RELIC_SPIN_SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.22;
  const dist = 56 + ((i * 37) % 46);
  return {
    left: `${50 + Math.cos(angle) * 42}%`,
    top: `${50 + Math.sin(angle) * 42}%`,
    sx: `${Math.cos(angle) * dist}px`,
    sy: `${Math.sin(angle) * dist - 26}px`,
    sr: `${(i % 2 === 0 ? 1 : -1) * (80 + ((i * 53) % 120))}deg`,
    size: 1.5 + (i % 3),
    delay: (i % 5) * 0.05,
    long: i % 4 === 0,
  };
});

const RELIC_TICKS = Array.from({ length: 36 }, (_, i) => {
  const a = (i * 10 * Math.PI) / 180;
  const long = i % 9 === 0;
  const r1 = long ? 84 : 88;
  return (
    <line
      key={i}
      x1={120 + Math.cos(a) * r1}
      y1={120 + Math.sin(a) * r1}
      x2={120 + Math.cos(a) * 92}
      y2={120 + Math.sin(a) * 92}
      strokeWidth={long ? 0.8 : 0.4}
      opacity={long ? 0.7 : 0.45}
    />
  );
});

const RELIC_ICON_MAP: Array<{ keywords: string[]; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { keywords: ['medallion', 'badge'], Icon: Award },
  { keywords: ['seal', 'signet'], Icon: Shield },
  { keywords: ['gourd', 'nectar', 'cauldron', 'potion'], Icon: Zap },
  { keywords: ['spindle', 'thread', 'matrix'], Icon: RefreshCw },
  { keywords: ['pen', 'brush', 'scribe'], Icon: Save },
  { keywords: ['crown', 'circlet', 'tiara'], Icon: Sliders },
  { keywords: ['compass'], Icon: Compass },
  { keywords: ['mirror'], Icon: Globe },
  { keywords: ['key'], Icon: Key },
];

function getRelicIcon(relicName?: string): React.ComponentType<{ size?: number; strokeWidth?: number }> {
  const name = (relicName ?? '').toLowerCase();
  const match = RELIC_ICON_MAP.find(entry => entry.keywords.some(kw => name.includes(kw)));
  return match ? match.Icon : Compass;
}

export interface RelicRevealProps {
  /** The relic being celebrated. */
  artifact: CosmicArtifact;
  /** Fired by the "Claim Relic" button (and only by it). */
  onClaim: (artifact: CosmicArtifact) => void;
  /** Fired when the revealed backdrop is tapped. Matches the source behavior. */
  onDismiss?: () => void;
  /**
   * Workshop tool: change this value to replay the revealed-state entrance,
   * one-shot flare, and particle ramp without closing the overlay.
   */
  replayKey?: number;
}

export function RelicReveal({ artifact, onClaim, onDismiss, replayKey = 0 }: RelicRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isArtifactRevealed, setIsArtifactRevealed] = useState(false);

  // Replay tool: jump straight to the revealed state and remount the reveal.
  useEffect(() => {
    if (replayKey > 0) setIsArtifactRevealed(true);
  }, [replayKey]);

  return (
    <AnimatePresence>
      <motion.div
        key="artifact-celebration-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md"
        onClick={() => {
          if (isArtifactRevealed) {
            (onDismiss ?? onClaim)(artifact);
          }
        }}
      >
        {/* Immersive interactive canvas celestial particle shower.
            Rank-tinted background lighting is held back until the reveal —
            before that the backdrop stays rank-neutral so the rarity
            color lands as a payoff, not a spoiler. */}
        <ParticleEffect
          accent={
            isArtifactRevealed
              ? (RARITY_THEMES[artifact.rarity] ?? NEUTRAL_THEME).hex
              : NEUTRAL_THEME.hex
          }
        />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating particle ambient glow */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold-accent/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-portal/10 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <div className="absolute inset-0 overflow-y-auto">
          <div className="relative min-h-full w-full flex items-center justify-center p-4">
          {!isArtifactRevealed ? (
            <motion.div
              key="mystery-relic"
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, y: 50, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 1.1, opacity: 0, rotateY: 90 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 20, stiffness: 100 }}
              className="relative group cursor-pointer"
              data-celestial-foreground
              onClick={(e) => {
                e.stopPropagation();
                vibrate('heavyTap');
                setIsArtifactRevealed(true);
              }}
            >
              {/* Sealed aura — rank-neutral so the rarity color is not leaked */}
              <div
                aria-hidden
                className="absolute -inset-8 pointer-events-none rounded-full relic-halo-pulse"
                style={{ background: `radial-gradient(ellipse at 50% 42%, ${NEUTRAL_THEME.hex}14 0%, transparent 62%)` }}
              />

              {/* The closed face of the final premium card: identical frame,
                  hairline, and sigil — rendered in the neutral sealed tone. */}
              <div
                className="relative w-full max-w-[280px] sm:max-w-[320px] bg-[#060607]/95 rounded-[1.5rem] px-6 pt-6 pb-6 sm:px-7 sm:pt-7 text-center overflow-hidden transition-shadow duration-700 group-hover:shadow-[0_0_60px_rgba(229,231,235,0.14)]"
                style={{
                  border: `1px solid ${NEUTRAL_THEME.hex}33`,
                  boxShadow: `0 0 44px ${NEUTRAL_THEME.hex}14, inset 0 0 70px rgba(0,0,0,0.7)`,
                }}
              >
                <style>{RELIC_SIGIL_CSS}</style>
                {/* Inner hairline frame — mirrors the revealed card */}
                <div aria-hidden className="absolute inset-[5px] rounded-[1.2rem] pointer-events-none" style={{ border: `1px solid ${NEUTRAL_THEME.hex}1a` }} />
                {/* Top sheen */}
                <div aria-hidden className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-white/[0.045] to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                  {/* Sealed label — same ornament row as the revealed rarity label */}
                  <div className="flex items-center justify-center gap-2.5 w-full">
                    <div className="h-px w-7" style={{ background: `linear-gradient(to right, transparent, ${NEUTRAL_THEME.hex}4d)` }} />
                    <Sparkles size={11} strokeWidth={1.5} style={{ color: `${NEUTRAL_THEME.hex}b3`, filter: `drop-shadow(0 0 5px ${NEUTRAL_THEME.hex}66)` }} />
                    <span
                      className="text-[10px] uppercase tracking-[0.35em] font-serif whitespace-nowrap"
                      style={{ color: `${NEUTRAL_THEME.hex}a6`, textShadow: `0 0 12px ${NEUTRAL_THEME.hex}40` }}
                    >
                      Sealed Relic
                    </span>
                    <Sparkles size={11} strokeWidth={1.5} style={{ color: `${NEUTRAL_THEME.hex}b3`, filter: `drop-shadow(0 0 5px ${NEUTRAL_THEME.hex}66)` }} />
                    <div className="h-px w-7" style={{ background: `linear-gradient(to left, transparent, ${NEUTRAL_THEME.hex}4d)` }} />
                  </div>

                  {/* Sealed sigil — the same assembly as the revealed card,
                      dimmed and breathing, waiting to be woken */}
                  <div className="relative w-36 h-36 sm:w-44 sm:h-44 my-4 flex items-center justify-center">
                    <div
                      aria-hidden
                      className="absolute inset-4 rounded-full relic-breathe"
                      style={{ background: `radial-gradient(circle, ${NEUTRAL_THEME.hex}14 0%, transparent 68%)` }}
                    />
                    <svg
                      viewBox="0 0 240 240"
                      className="relative w-full h-full"
                      fill="none"
                      stroke="currentColor"
                      style={{ color: `${NEUTRAL_THEME.hex}8c`, filter: `drop-shadow(0 0 8px ${NEUTRAL_THEME.hex}40)` }}
                      aria-hidden
                    >
                      <g className="relic-sigil-spin" opacity="0.5">
                        <circle cx="120" cy="120" r="112" strokeWidth="0.5" strokeDasharray="1 7" />
                        <circle cx="120" cy="120" r="103" strokeWidth="0.7" />
                        <path d="M120 34 L206 120 L120 206 L34 120 Z" strokeWidth="0.8" opacity="0.85" />
                        <circle cx="120" cy="34" r="2" fill="currentColor" stroke="none" />
                        <circle cx="206" cy="120" r="2" fill="currentColor" stroke="none" />
                        <circle cx="120" cy="206" r="2" fill="currentColor" stroke="none" />
                        <circle cx="34" cy="120" r="2" fill="currentColor" stroke="none" />
                      </g>
                      <g className="relic-sigil-spin-rev" opacity="0.45">
                        <circle cx="120" cy="120" r="92" strokeWidth="0.4" />
                        {RELIC_TICKS}
                      </g>
                      <g opacity="0.8">
                        <circle cx="120" cy="120" r="58" strokeWidth="0.8" />
                        <circle cx="120" cy="120" r="51" strokeWidth="0.45" strokeDasharray="3 2.5" opacity="0.7" />
                        <path
                          d="M120 74 L127.5 112.5 L166 120 L127.5 127.5 L120 166 L112.5 127.5 L74 120 L112.5 112.5 Z"
                          strokeWidth="1"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M120 90 L126.6 113.4 L150 120 L126.6 126.6 L120 150 L113.4 126.6 L90 120 L113.4 113.4 Z"
                          strokeWidth="0.5"
                          opacity="0.65"
                          transform="rotate(45 120 120)"
                        />
                      </g>
                    </svg>
                    {/* Wax-seal core — the face stays shut until the tap */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ color: `${NEUTRAL_THEME.hex}cc`, filter: `drop-shadow(0 0 8px ${NEUTRAL_THEME.hex}59)` }}>
                      <Shield size={16} strokeWidth={1} />
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 mb-3">
                    <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${NEUTRAL_THEME.hex}40)` }} />
                    <div className="w-1.5 h-1.5 rotate-45" style={{ border: `1px solid ${NEUTRAL_THEME.hex}73`, boxShadow: `0 0 7px ${NEUTRAL_THEME.hex}4d` }} />
                    <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${NEUTRAL_THEME.hex}40)` }} />
                  </div>

                  <p className="text-[11px] font-serif italic text-neutral-500 tracking-wide">
                    A relic stirs within the seal.
                  </p>
                  <p className="text-neutral-500 font-mono text-[10px] mt-2 uppercase tracking-[0.3em] opacity-60 group-hover:opacity-100 group-hover:text-neutral-300 transition-all duration-500">
                    Tap to Reveal
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`revealed-relic-${replayKey}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, rotateY: -55 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, rotateY: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 22, stiffness: 150 }}
              className="relative max-w-[300px] sm:max-w-[340px] w-full z-10"
              data-celestial-foreground
              style={{ transformPerspective: 1200 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const rarity = artifact.rarity;
                const theme = RARITY_THEMES[rarity] ?? NEUTRAL_THEME;
                const fx = RARITY_EFFECTS[rarity] ?? NO_RELIC_EFFECTS;
                const { hex, titleColor } = theme;

                return (
                  <>
                    <style>{RELIC_SIGIL_CSS}</style>

                    {/* Legendary+: warm glow washing the space behind the full card */}
                    {fx.warmGlow && (
                      <div
                        aria-hidden
                        className="absolute -inset-16 pointer-events-none relic-halo-pulse"
                        style={{ background: `radial-gradient(ellipse at 50% 44%, ${hex}1f 0%, ${hex}0a 38%, transparent 66%)`, filter: 'blur(6px)' }}
                      />
                    )}

                    {/* Rarity aura bleeding out from behind the card */}
                    <div
                      aria-hidden
                      className={`absolute -inset-10 pointer-events-none ${fx.pulse ? 'relic-halo-pulse' : ''}`}
                      style={{ background: `radial-gradient(ellipse at 50% 36%, ${hex}${fx.halo ? '2e' : '10'} 0%, transparent 62%)` }}
                    />

                    {/* Legendary+: brief one-shot flare the moment the relic is revealed */}
                    {fx.revealFlare && !shouldReduceMotion && (
                      <div
                        aria-hidden
                        className="absolute -inset-10 pointer-events-none relic-reveal-flare"
                        style={{ background: `radial-gradient(circle at 50% 42%, ${hex}59 0%, transparent 60%)` }}
                      />
                    )}

                    {/* Sparks shaken loose while the card spins open — a one-shot
                        burst that flies outward with the rotation, then is gone */}
                    {!shouldReduceMotion && (
                      <div aria-hidden className="absolute -inset-8 pointer-events-none">
                        {RELIC_SPIN_SPARKS.map((spark, i) => (
                          <span
                            key={i}
                            className="absolute relic-spin-spark"
                            style={{
                              left: spark.left,
                              top: spark.top,
                              width: spark.long ? spark.size * 2.4 : spark.size,
                              height: spark.size,
                              borderRadius: '9999px',
                              background: hex,
                              boxShadow: `0 0 7px ${hex}`,
                              animationDelay: `${spark.delay}s`,
                              '--sx': spark.sx,
                              '--sy': spark.sy,
                              '--sr': spark.sr,
                            } as React.CSSProperties}
                          />
                        ))}
                      </div>
                    )}

                    {/* Epic+: a few slow-drifting motes around the card */}
                    {fx.particles > 0 && !shouldReduceMotion && (
                      <div aria-hidden className="absolute -inset-6 pointer-events-none">
                        {RELIC_DRIFT_MOTES.slice(0, fx.particles).map((mote, i) => (
                          <span
                            key={i}
                            className="absolute rounded-full relic-drift"
                            style={{
                              left: mote.left,
                              top: mote.top,
                              width: mote.size,
                              height: mote.size,
                              background: hex,
                              boxShadow: `0 0 6px ${hex}`,
                              animationDuration: `${mote.duration}s`,
                              animationDelay: `${mote.delay}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <div
                      className="relative bg-[#060607]/95 rounded-[1.5rem] px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 text-center overflow-hidden"
                      style={{
                        border: `1px solid ${hex}45`,
                        boxShadow: `0 0 50px ${hex}26, inset 0 0 70px rgba(0,0,0,0.65)`,
                      }}
                    >
                      {/* Rare+: soft shimmer sweeping across the card edge */}
                      {fx.edgeShimmer && !shouldReduceMotion && (
                        <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.5rem]">
                          <div
                            className="relic-shimmer-band absolute top-0 bottom-0 w-1/3"
                            style={{ background: `linear-gradient(to right, transparent, ${hex}12 42%, ${hex}24 50%, ${hex}12 58%, transparent)` }}
                          />
                        </div>
                      )}
                      {/* Inner hairline frame */}
                      <div aria-hidden className="absolute inset-[5px] rounded-[1.2rem] pointer-events-none" style={{ border: `1px solid ${hex}1c` }} />
                      {/* Top sheen */}
                      <div aria-hidden className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />

                      <div className="relative z-10 flex flex-col items-center">

                        {/* 1. Rarity label */}
                        <div className="flex items-center justify-center gap-2.5 w-full">
                          <div className="h-px w-7" style={{ background: `linear-gradient(to right, transparent, ${hex}66)` }} />
                          <Sparkles size={11} strokeWidth={1.5} style={{ color: hex, filter: `drop-shadow(0 0 5px ${hex})` }} />
                          <span
                            className="text-[10px] uppercase tracking-[0.35em] font-serif whitespace-nowrap"
                            style={{ color: `${hex}d9`, textShadow: `0 0 14px ${hex}66` }}
                          >
                            {rarity ? `${rarity} Relic` : 'Relic'}
                          </span>
                          <Sparkles size={11} strokeWidth={1.5} style={{ color: hex, filter: `drop-shadow(0 0 5px ${hex})` }} />
                          <div className="h-px w-7" style={{ background: `linear-gradient(to left, transparent, ${hex}66)` }} />
                        </div>

                        {/* 2. Ornate relic sigil */}
                        <motion.div
                          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.55, opacity: 0 }}
                          animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25, type: "spring", damping: 18, stiffness: 120 }}
                          className="relative w-36 h-36 sm:w-48 sm:h-48 my-3 sm:my-4 flex items-center justify-center"
                        >
                          {/* Halo behind the sigil */}
                          <div
                            aria-hidden
                            className="absolute inset-4 rounded-full relic-breathe"
                            style={{ background: `radial-gradient(circle, ${hex}21 0%, transparent 68%)` }}
                          />
                          {/* Horizontal flare beam */}
                          <div
                            aria-hidden
                            className="absolute -left-4 -right-4 top-1/2 h-px -translate-y-1/2"
                            style={{ background: `linear-gradient(to right, transparent, ${hex}59 22%, ${hex}59 78%, transparent)` }}
                          />

                          <svg
                            viewBox="0 0 240 240"
                            className="relative w-full h-full"
                            fill="none"
                            stroke="currentColor"
                            style={{ color: hex, filter: fx.brighterSeal ? `drop-shadow(0 0 14px ${hex}b3) brightness(1.18)` : `drop-shadow(0 0 9px ${hex}80)` }}
                            aria-hidden
                          >
                            {/* Slow-spinning outer assembly */}
                            <g className="relic-sigil-spin" opacity="0.6">
                              <circle cx="120" cy="120" r="112" strokeWidth="0.5" strokeDasharray="1 7" />
                              <circle cx="120" cy="120" r="103" strokeWidth="0.7" />
                              <path d="M120 34 L206 120 L120 206 L34 120 Z" strokeWidth="0.8" opacity="0.85" />
                              <circle cx="120" cy="34" r="2" fill="currentColor" stroke="none" />
                              <circle cx="206" cy="120" r="2" fill="currentColor" stroke="none" />
                              <circle cx="120" cy="206" r="2" fill="currentColor" stroke="none" />
                              <circle cx="34" cy="120" r="2" fill="currentColor" stroke="none" />
                            </g>

                            {/* Counter-rotating tick ring */}
                            <g className="relic-sigil-spin-rev" opacity="0.55">
                              <circle cx="120" cy="120" r="92" strokeWidth="0.4" />
                              {RELIC_TICKS}
                            </g>

                            {/* Static core */}
                            <g opacity="0.9">
                              {/* Axis hairlines */}
                              <line x1="120" y1="10" x2="120" y2="58" strokeWidth="0.5" opacity="0.55" />
                              <line x1="120" y1="182" x2="120" y2="230" strokeWidth="0.5" opacity="0.55" />
                              <line x1="10" y1="120" x2="58" y2="120" strokeWidth="0.5" opacity="0.55" />
                              <line x1="182" y1="120" x2="230" y2="120" strokeWidth="0.5" opacity="0.55" />
                              {/* Axis crowns */}
                              <circle cx="120" cy="20" r="3.2" strokeWidth="0.7" />
                              <circle cx="120" cy="220" r="3.2" strokeWidth="0.7" />
                              <circle cx="20" cy="120" r="3.2" strokeWidth="0.7" />
                              <circle cx="220" cy="120" r="3.2" strokeWidth="0.7" />
                              <circle cx="120" cy="20" r="1" fill="currentColor" stroke="none" />
                              <circle cx="120" cy="220" r="1" fill="currentColor" stroke="none" />
                              <circle cx="20" cy="120" r="1" fill="currentColor" stroke="none" />
                              <circle cx="220" cy="120" r="1" fill="currentColor" stroke="none" />
                              {/* Inner rings */}
                              <circle cx="120" cy="120" r="58" strokeWidth="0.8" />
                              <circle cx="120" cy="120" r="51" strokeWidth="0.45" strokeDasharray="3 2.5" opacity="0.7" />
                              {/* Axis beads near the core */}
                              <circle cx="120" cy="66" r="2.6" strokeWidth="0.7" />
                              <circle cx="120" cy="174" r="2.6" strokeWidth="0.7" />
                              <circle cx="66" cy="120" r="2.6" strokeWidth="0.7" />
                              <circle cx="174" cy="120" r="2.6" strokeWidth="0.7" />
                              {/* Eight-point compass star */}
                              <path
                                d="M120 74 L127.5 112.5 L166 120 L127.5 127.5 L120 166 L112.5 127.5 L74 120 L112.5 112.5 Z"
                                strokeWidth="1"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M120 90 L126.6 113.4 L150 120 L126.6 126.6 L120 150 L113.4 126.6 L90 120 L113.4 113.4 Z"
                                strokeWidth="0.5"
                                opacity="0.65"
                                transform="rotate(45 120 120)"
                              />
                            </g>
                          </svg>

                          {/* Relic-type icon at the heart of the star */}
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ color: hex, filter: `drop-shadow(0 0 8px ${hex})` }}
                          >
                            {(() => {
                              const RelicIcon = getRelicIcon(artifact.name);
                              return <RelicIcon size={15} strokeWidth={1} />;
                            })()}
                          </div>

                          {/* Twinkling motes orbiting the sigil */}
                          <Sparkles size={9} className="absolute relic-twinkle" style={{ top: '2%', left: '47%', color: hex }} strokeWidth={1.5} />
                          <Sparkles size={7} className="absolute relic-twinkle" style={{ top: '26%', right: '-2%', color: hex, animationDelay: '0.9s' }} strokeWidth={1.5} />
                          <Sparkles size={8} className="absolute relic-twinkle" style={{ bottom: '8%', left: '-3%', color: hex, animationDelay: '1.6s' }} strokeWidth={1.5} />
                          <Sparkles size={6} className="absolute relic-twinkle" style={{ bottom: '0%', right: '24%', color: hex, animationDelay: '0.4s' }} strokeWidth={1.5} />
                        </motion.div>

                        {/* 3. Title & lore */}
                        <h3
                          className={`font-serif text-[17px] sm:text-[20px] leading-snug tracking-wide font-normal ${titleColor}`}
                          style={{ textShadow: `0 0 24px ${hex}45` }}
                        >
                          {artifact.name}
                        </h3>

                        <div className="flex items-center justify-center gap-2.5 my-3">
                          <div className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${hex}59)` }} />
                          <div className="w-1.5 h-1.5 rotate-45" style={{ border: `1px solid ${hex}a6`, boxShadow: `0 0 7px ${hex}73` }} />
                          <div className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${hex}59)` }} />
                        </div>

                        <p className="text-xs sm:text-[13px] font-serif italic text-neutral-400 leading-relaxed px-2 max-w-[260px] line-clamp-3">
                          {artifact.description || "Records marked by the Library are never truly forgotten."}
                        </p>

                        {/* 4. The Stats Box — compact VALUE | LABEL pairs that won't clip on mobile.
                            The right cell names the artifact type only; the rank already lives
                            in the label up top and is intentionally not repeated here. */}
                        <div
                          className="w-full mt-3 sm:mt-4 rounded-xl bg-black/50 flex items-stretch overflow-hidden"
                          style={{ border: `1px solid ${hex}30`, boxShadow: `inset 0 0 26px rgba(0,0,0,0.65), 0 0 18px ${hex}14` }}
                        >
                          <div className="flex-1 min-w-0 flex items-center justify-center py-2 sm:py-2.5 px-1" style={{ borderRight: `1px solid ${hex}24` }}>
                            <span className="text-[10px] sm:text-[11px] font-serif tracking-[0.12em] uppercase whitespace-nowrap text-neutral-200">
                              +{artifact.rewardValueQi ?? 10}
                              <span className="mx-1.5" style={{ color: `${hex}80` }}>|</span>
                              <span style={{ color: `${hex}d9`, textShadow: `0 0 10px ${hex}55` }}>QI</span>
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-center py-2 sm:py-2.5 px-1">
                            <span
                              className="text-[10px] sm:text-[11px] font-serif tracking-[0.12em] uppercase whitespace-nowrap text-neutral-200"
                            >
                              <span style={{ color: `${hex}d9`, textShadow: `0 0 10px ${hex}55` }}>Relic</span>
                            </span>
                          </div>
                        </div>

                        {/* 5. Claim */}
                        <button
                          type="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                          onClick={() => {
                            onClaim(artifact);
                            vibrate('softTap');
                          }}
                          className="relic-claim-btn w-full relative mt-3 sm:mt-4 py-2.5 rounded-full group overflow-hidden"
                          style={{
                            border: `1px solid ${hex}59`,
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(0,0,0,0.45))',
                            boxShadow: `0 0 20px ${hex}1f`,
                            '--relic-hex-glow': `${hex}66`,
                          } as React.CSSProperties}
                        >
                          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="flex items-center justify-center gap-4 relative z-10">
                            <Sparkles size={12} style={{ color: hex }} className="transition-transform duration-500 group-hover:scale-125" />
                            <span className="font-serif uppercase tracking-[0.28em] text-xs text-neutral-200 group-hover:text-white transition-colors">
                              Claim Relic
                            </span>
                            <Sparkles size={12} style={{ color: hex }} className="transition-transform duration-500 group-hover:scale-125" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
