/**
 * Cultivation rank progression and the Celestial Aura style helpers.
 *
 * Copied from `SENSEIDUKES/Light-Novels` `src/lib/qi.ts`, trimmed to the pure
 * presentation exports the profile page renders. Everything else in that file
 * (`awardQi`, `awardDirectQi`, `claimIdleQiReward`, `flushPendingProfileSync`,
 * `recordLibrarySessionEnd`) writes to Firebase Auth and PostgreSQL and is
 * deliberately excluded.
 *
 * The rank ladder and every rank colour now live in `rankVisuals.ts` as data.
 * This file holds the progression maths and the two helpers that turn a
 * resolved rank visual into React style props, layering the status effects that
 * override a cultivator's aura on top.
 *
 * These are visual values and belong to the fork, not to `shared/`: a redesign
 * that restyles the ranks must be able to change them in `development/` without
 * touching the locked reference.
 */

import type React from 'react';
import type { ActiveStatusEffect } from '../shared/types';
import {
  RANKS,
  rankBackground,
  rankGlowFilter,
  rankGlowShadow,
  rankToken,
  resolveRankVisual,
  type RankVisual,
} from './rankVisuals';

/**
 * The Qi ladder, derived from the canonical ranks so a rank can never carry one
 * threshold here and another one in its colour data.
 */
export const DAO_RANKS = RANKS.map(rank => ({ threshold: rank.unlockedAt, name: rank.name }));

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

/**
 * The stored aura selection to paint with: whatever the cultivator chose, or
 * the rank their Qi has reached. Legacy stored values still resolve, so this
 * accepts anything `displayNameColor` has ever held.
 */
export function getAuraSelection(
  explicitColor: string | undefined,
  xp: number | undefined,
): string {
  const resolved = resolveRankVisual(explicitColor, xp);
  return resolved.source === 'custom' ? resolved.visual.stops[0] : rankToken(resolved.rank);
}

/** Which status effect, if any, is overriding the aura right now. */
function activeAuraOverride(
  activeStatusEffects: ActiveStatusEffect[] | undefined,
): 'silenced' | 'cursed' | null {
  if (!activeStatusEffects?.length) return null;
  const now = new Date().toISOString();
  const isActive = (name: string) =>
    activeStatusEffects.some(e => e.effectDef.name === name && e.expiresAt > now);

  if (isActive('Ghostly Silence')) return 'silenced';
  if (isActive('Curse of the Cursed Tome')) return 'cursed';
  return null;
}

/**
 * How a display name is painted in its rank's colours.
 *
 * A solid rank colours the text directly. A gradient or the Master spectrum
 * clips the same `rankBackground` value through the text, so the data drives
 * both paths and no rank needs a class of its own.
 */
export function getAuraTextStyle(
  selection?: string,
  activeStatusEffects?: ActiveStatusEffect[],
  xp?: number,
): { style?: React.CSSProperties; className?: string } {
  if (!selection) return {};

  const override = activeAuraOverride(activeStatusEffects);
  if (override === 'silenced') {
    return {
      className: 'text-neutral-500 font-normal opacity-60 line-through-none shadow-none filter grayscale'
    };
  }

  const cursedClass = override === 'cursed'
    ? ' animate-pulse text-red-400/90 shadow-[0_0_12px_rgba(139,0,0,0.8)]'
    : '';

  if (override === 'cursed') {
    return {
      style: { color: '#ff3333' },
      className: `drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] font-semibold${cursedClass}`
    };
  }

  const { visual } = resolveRankVisual(selection, xp);

  if (visual.kind === 'solid') {
    return {
      style: { color: visual.stops[0], filter: rankGlowFilter(visual, 5) },
      className: 'font-semibold'
    };
  }

  return {
    style: { backgroundImage: rankBackground(visual), filter: rankGlowFilter(visual, 8) },
    className: `aura-gradient-text ${visual.kind === 'spectrum' ? 'aura-spectrum-text font-black' : 'font-bold'}`
  };
}

/**
 * The ring a portrait or preview orb wears in its rank's colours. Returns both
 * halves so the caller can spread them onto one element.
 */
export function getAuraGlowStyle(
  selection?: string,
  activeStatusEffects?: ActiveStatusEffect[],
  xp?: number,
): { style?: React.CSSProperties; className: string } {
  if (!selection) return { className: '' };

  const override = activeAuraOverride(activeStatusEffects);
  if (override === 'silenced') return { className: 'border-neutral-900 shadow-none' };
  if (override === 'cursed') {
    return { className: 'shadow-[0_0_25px_rgba(139,0,0,0.7)] border-human/40 animate-pulse' };
  }

  const { visual } = resolveRankVisual(selection, xp);
  return {
    style: {
      boxShadow: rankGlowShadow(visual, visual.kind === 'solid' ? 20 : 30),
      borderColor: visual.glow,
    },
    className: 'border'
  };
}

/** The swatch that previews a rank: its flat colour or its full gradient. */
export function getAuraSwatchStyle(visual: RankVisual): React.CSSProperties {
  return { background: rankBackground(visual), boxShadow: rankGlowShadow(visual, 8) };
}

export {
  RANKS,
  MASTER_RANK,
  rankToken,
  rankBackground,
  rankGlowShadow,
  rankGlowFilter,
  resolveRankVisual,
  getRankForQi,
  getRankById,
} from './rankVisuals';
export type { Rank, RankId, RankVisual, ResolvedRankVisual } from './rankVisuals';
