/**
 * Cultivation rank and Celestial Aura presentation values.
 *
 * Copied from `SENSEIDUKES/Light-Novels` `src/lib/qi.ts`, trimmed to the pure
 * presentation exports the profile page renders — `DAO_RANKS`,
 * `getDaoRankData`, `AURA_TIERS`, and the three aura style helpers. Everything
 * else in that file (`awardQi`, `awardDirectQi`, `claimIdleQiReward`,
 * `flushPendingProfileSync`, `recordLibrarySessionEnd`) writes to Firebase Auth
 * and PostgreSQL and is deliberately excluded.
 *
 * These are visual values and belong to the fork, not to `shared/`: a redesign
 * that restyles the aura tiers must be able to change them in `development/`
 * without touching the locked reference.
 */

import type React from 'react';
import type { ActiveStatusEffect } from '../shared/types';

export const DAO_RANKS = [
  { threshold: 0, name: 'Mortal Reader' },
  { threshold: 100, name: 'Wandering Disciple' },
  { threshold: 300, name: 'Outer Sect Scribe' },
  { threshold: 750, name: 'Inner Sect Scholar' },
  { threshold: 1500, name: 'Dao Adept' },
  { threshold: 3000, name: 'Spirit Author' },
  { threshold: 6000, name: 'Heavenly Chronicler' },
  { threshold: 12000, name: 'Sage of Branching Paths' },
  { threshold: 25000, name: 'Dao Master' }
];

export function getDaoRankData(qi: number = 0) {
  let currentTitle = DAO_RANKS[0].name;
  let nextThreshold = DAO_RANKS[1].threshold;
  let nextTitle = DAO_RANKS[1].name;
  let previousThreshold = DAO_RANKS[0].threshold;

  for (let i = 0; i < DAO_RANKS.length; i++) {
    if (qi >= DAO_RANKS[i].threshold) {
      currentTitle = DAO_RANKS[i].name;
      previousThreshold = DAO_RANKS[i].threshold;
      if (i + 1 < DAO_RANKS.length) {
        nextThreshold = DAO_RANKS[i+1].threshold;
        nextTitle = DAO_RANKS[i+1].name;
      } else {
        nextThreshold = null as any;
        nextTitle = null as any;
      }
    }
  }

  const progress = nextThreshold ? ((qi - previousThreshold) / (nextThreshold - previousThreshold)) * 100 : 100;

  return {
     rank: currentTitle,
     nextRank: nextTitle,
     progress: Math.min(Math.max(progress, 0), 100),
     maxQi: nextThreshold,
     currentQi: qi
  };
}

export interface AuraTier {
  rank: string;
  name: string;
  colorHex: string;
  rewardFeeling: string;
  unlockedAt: number;
  textColor: string;
  shadowColor: string;
  bgGlow: string;
  effectType?: 'normal' | 'particles' | 'gradient' | 'animated';
}

export const AURA_TIERS: AuraTier[] = [
  {
    rank: 'Mortal Reader',
    name: 'Sect Entrance Aura',
    colorHex: '#E5E7EB',
    rewardFeeling: 'You entered the sect',
    unlockedAt: 0,
    textColor: 'text-gray-300',
    shadowColor: 'rgba(229,231,235,0.2)',
    bgGlow: 'bg-neutral-800/10'
  },
  {
    rank: 'Wandering Disciple',
    name: 'Active Disciple Azure',
    colorHex: '#3B82F6',
    rewardFeeling: 'You are active',
    unlockedAt: 100,
    textColor: 'text-blue-400',
    shadowColor: 'rgba(59,130,246,0.35)',
    bgGlow: 'bg-blue-950/20'
  },
  {
    rank: 'Outer Sect Scribe',
    name: 'Scribe Cyan Resonance',
    colorHex: '#06B6D4',
    rewardFeeling: 'You are recording worlds',
    unlockedAt: 300,
    textColor: 'text-cyan-400',
    shadowColor: 'rgba(6,182,212,0.4)',
    bgGlow: 'bg-cyan-950/20'
  },
  {
    rank: 'Inner Sect Scholar',
    name: 'Scholar Emerald Sight',
    colorHex: '#10B981',
    rewardFeeling: 'You understand systems',
    unlockedAt: 750,
    textColor: 'text-emerald-400',
    shadowColor: 'rgba(16,185,129,0.45)',
    bgGlow: 'bg-emerald-950/20'
  },
  {
    rank: 'Dao Adept',
    name: 'Fate-Shaper Violet Aura',
    colorHex: '#8B5CF6',
    rewardFeeling: 'You can shape fate',
    unlockedAt: 1500,
    textColor: 'text-purple-400',
    shadowColor: 'rgba(139,92,246,0.5)',
    bgGlow: 'bg-purple-950/20'
  },
  {
    rank: 'Spirit Author',
    name: 'Canon Creator Gold',
    colorHex: '#F59E0B',
    rewardFeeling: 'You are creating canon',
    unlockedAt: 3000,
    textColor: 'text-amber-400',
    shadowColor: 'rgba(245,158,11,0.55)',
    bgGlow: 'bg-amber-950/20'
  },
  {
    rank: 'Heavenly Chronicler',
    name: 'Cosmic Gold Particle',
    colorHex: '#FFD700',
    rewardFeeling: 'You preserve worlds',
    unlockedAt: 6000,
    textColor: 'text-yellow-400',
    shadowColor: 'rgba(255,215,0,0.65)',
    bgGlow: 'bg-yellow-950/20',
    effectType: 'particles'
  },
  {
    rank: 'Sage of Branching Paths',
    name: 'Prism Branching Gradient',
    colorHex: 'gradient-violet-gold',
    rewardFeeling: 'You master branches',
    unlockedAt: 12000,
    textColor: 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400',
    shadowColor: 'rgba(168,85,247,0.7)',
    bgGlow: 'bg-gradient-to-r from-purple-950/20 to-yellow-950/20',
    effectType: 'gradient'
  },
  {
    rank: 'Dao Master',
    name: 'Transcendental Master Matrix',
    colorHex: 'animated-custom',
    rewardFeeling: 'You transcend normal UI',
    unlockedAt: 25000,
    textColor: 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-rose-400 to-yellow-400',
    shadowColor: 'rgba(6,182,212,0.85)',
    bgGlow: 'bg-gradient-to-r from-cyan-950/20 via-rose-950/20 to-yellow-950/20',
    effectType: 'animated'
  }
];

export function getAuraColorForXp(
  explicitColor: string | undefined,
  xp: number | undefined,
): string {
  if (explicitColor) return explicitColor;
  const currentXp = Number.isFinite(xp) ? Math.max(0, xp ?? 0) : 0;
  let unlockedColor = AURA_TIERS[0].colorHex;
  for (const tier of AURA_TIERS) {
    if (currentXp < tier.unlockedAt) break;
    unlockedColor = tier.colorHex;
  }
  return unlockedColor;
}

export function getAuraTextStyle(
  colorHexOrAura?: string,
  activeStatusEffects?: ActiveStatusEffect[]
): { style?: React.CSSProperties; className?: string } {
  if (!colorHexOrAura) return {};

  const now = new Date().toISOString();
  const hasGhostlySilence = activeStatusEffects?.some(
    e => e.effectDef.name === "Ghostly Silence" && e.expiresAt > now
  );

  if (hasGhostlySilence) {
    return {
      className: 'text-neutral-500 font-normal opacity-60 line-through-none shadow-none filter grayscale'
    };
  }

  const hasCursedTome = activeStatusEffects?.some(
    e => e.effectDef.name === "Curse of the Cursed Tome" && e.expiresAt > now
  );

  let extraClass = '';
  if (hasCursedTome) {
    extraClass = ' animate-pulse text-red-400/90 shadow-[0_0_12px_rgba(139,0,0,0.8)]';
  }

  if (colorHexOrAura === 'gradient-violet-gold') {
    return {
      className: `aura-gradient-violet-gold font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]${extraClass}`
    };
  }
  if (colorHexOrAura === 'animated-custom') {
    return {
      className: `aura-animated-custom font-black drop-shadow-[0_0_12px_rgba(6,182,212,0.65)]${extraClass}`
    };
  }

  // Normal hex colors
  return {
    style: { color: hasCursedTome ? '#ff3333' : colorHexOrAura },
    className: `drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] font-semibold${extraClass}`
  };
}

export function getAuraGlowStyle(
  colorHexOrAura?: string,
  activeStatusEffects?: ActiveStatusEffect[]
): string {
  if (!colorHexOrAura) return '';

  const now = new Date().toISOString();
  const hasGhostlySilence = activeStatusEffects?.some(
    e => e.effectDef.name === "Ghostly Silence" && e.expiresAt > now
  );

  if (hasGhostlySilence) {
    return 'border-neutral-900 shadow-none';
  }

  const hasCursedTome = activeStatusEffects?.some(
    e => e.effectDef.name === "Curse of the Cursed Tome" && e.expiresAt > now
  );

  if (hasCursedTome) {
    return 'shadow-[0_0_25px_rgba(139,0,0,0.7)] border-human/40 animate-pulse';
  }

  const match = AURA_TIERS.find(t => t.colorHex === colorHexOrAura);
  if (match) {
    if (colorHexOrAura === 'gradient-violet-gold') {
      return 'shadow-[0_0_30px_rgba(139,92,246,0.25)] border-purple-500/30';
    }
    if (colorHexOrAura === 'animated-custom') {
      return 'shadow-[0_0_40px_rgba(6,182,212,0.45)] border-cyan-500/40 animate-pulse';
    }
    return `shadow-[0_0_20px_${match.shadowColor}] border-neutral-800`;
  }
  return '';
}
