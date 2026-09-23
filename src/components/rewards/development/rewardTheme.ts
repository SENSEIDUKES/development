import type { RewardRarity } from '../../../library/rewards/contracts';

/**
 * The reward reveal's rarity ladder, lifted from the Relic Reveal so Mystery
 * Scrolls and Fate Survival Relics share one look. The card layout is the same
 * for every rarity; only the accent colour and the ambient effects scale.
 */
export interface RewardRarityTheme {
  /** Raw accent hex used for sigil strokes, auras, and glow. */
  hex: string;
  titleColor: string;
}

export const NEUTRAL_REWARD_THEME: RewardRarityTheme = { hex: '#e5e7eb', titleColor: 'text-neutral-200' };

export const REWARD_RARITY_THEMES: Record<RewardRarity, RewardRarityTheme> = {
  Transcendent: { hex: '#22d3ee', titleColor: 'text-cyan-100' },
  Mythic: { hex: '#ef4444', titleColor: 'text-red-100' },
  Legendary: { hex: '#f59e0b', titleColor: 'text-amber-100' },
  Epic: { hex: '#a855f7', titleColor: 'text-purple-100' },
  Rare: { hex: '#10b981', titleColor: 'text-emerald-100' },
  Common: { hex: '#9ca3af', titleColor: 'text-neutral-200' },
};

/**
 * Per-rarity atmosphere. Every flag renders as a pointer-events-none overlay,
 * and all of them are disabled under prefers-reduced-motion.
 */
export interface RewardRarityEffects {
  /** Subtle coloured halo behind the card. */
  halo: boolean;
  /** Soft shimmer sweeping across the card edge. */
  edgeShimmer: boolean;
  /** Slow pulse on the halo. */
  pulse: boolean;
  /** Number of slow-drifting motes floating around the card. */
  particles: number;
  /** Warm glow washing the space behind the full card. */
  warmGlow: boolean;
  /** Slightly brighter central seal. */
  brighterSeal: boolean;
  /** Brief one-shot flare the moment the reward is revealed. */
  revealFlare: boolean;
}

const QUIET: RewardRarityEffects = {
  halo: false, edgeShimmer: false, pulse: false, particles: 0,
  warmGlow: false, brighterSeal: false, revealFlare: false,
};

export const REWARD_RARITY_EFFECTS: Record<RewardRarity, RewardRarityEffects> = {
  Common: { ...QUIET },
  Rare: { ...QUIET, halo: true, edgeShimmer: true },
  Epic: { ...QUIET, halo: true, pulse: true, particles: 3 },
  Legendary: { ...QUIET, halo: true, pulse: true, particles: 5, warmGlow: true, brighterSeal: true, revealFlare: true },
  Mythic: { ...QUIET, halo: true, pulse: true, particles: 6, warmGlow: true, brighterSeal: true, revealFlare: true },
  Transcendent: { ...QUIET, halo: true, pulse: true, particles: 6, warmGlow: true, brighterSeal: true, revealFlare: true },
};

export const rewardTheme = (rarity: RewardRarity | null | undefined): RewardRarityTheme =>
  (rarity && REWARD_RARITY_THEMES[rarity]) || NEUTRAL_REWARD_THEME;

export const rewardEffects = (rarity: RewardRarity | null | undefined): RewardRarityEffects =>
  (rarity && REWARD_RARITY_EFFECTS[rarity]) || QUIET;

// Vibration patterns copied verbatim from Light-Novels `src/lib/vibration.ts`.
const VIBRATION_PATTERNS = { softTap: [15], heavyTap: [50] } as const;

/** Best-effort haptics; never blocks a reveal. */
export function rewardVibrate(pattern: keyof typeof VIBRATION_PATTERNS) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate([...VIBRATION_PATTERNS[pattern]]);
  } catch {
    // Vibration is best-effort.
  }
}
