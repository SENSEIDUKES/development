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
import { isEffectActive } from './timedEffects';

export const CAVE_AURA_TEXT_SURFACE = '#03060c';
export const MIN_AURA_TEXT_CONTRAST = 4.5;
const GRADIENT_CONTRAST_SAMPLES_PER_SEGMENT = 256;
const GRADIENT_CONTRAST_TARGET = MIN_AURA_TEXT_CONTRAST + 0.02;

type Rgb = readonly [number, number, number];

function parseHexColor(value: string): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split('').map(channel => channel + channel).join('')
    : match[1];
  const valueAsNumber = Number.parseInt(hex, 16);
  return [
    (valueAsNumber >> 16) & 255,
    (valueAsNumber >> 8) & 255,
    valueAsNumber & 255,
  ];
}

function toLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]: Rgb) {
  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

function contrastRatio(foreground: Rgb, background: Rgb) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG contrast for the hex colours the Aura renderer accepts. */
export function auraTextContrastRatio(foreground: string, background = CAVE_AURA_TEXT_SURFACE) {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (!foregroundRgb || !backgroundRgb) return 1;
  return contrastRatio(foregroundRgb, backgroundRgb);
}

function interpolateRgb(start: Rgb, end: Rgb, progress: number): Rgb {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
    start[2] + (end[2] - start[2]) * progress,
  ];
}

/**
 * The minimum contrast of every sampled CSS sRGB gradient segment. Checking
 * stops alone is not sufficient: cyan-to-pink, for example, has a darker
 * purple midpoint than either endpoint.
 */
export function auraGradientTextContrastRatio(
  stops: readonly string[],
  background = CAVE_AURA_TEXT_SURFACE,
) {
  const backgroundRgb = parseHexColor(background);
  const rgbStops = stops.map(parseHexColor);
  if (!backgroundRgb || rgbStops.some((stop): stop is null => stop === null)) return 1;
  const colors = rgbStops as Rgb[];
  if (colors.length === 0) return 1;
  if (colors.length === 1) return contrastRatio(colors[0], backgroundRgb);

  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < colors.length - 1; index += 1) {
    for (let sample = 0; sample <= GRADIENT_CONTRAST_SAMPLES_PER_SEGMENT; sample += 1) {
      minimum = Math.min(
        minimum,
        contrastRatio(
          interpolateRgb(colors[index], colors[index + 1], sample / GRADIENT_CONTRAST_SAMPLES_PER_SEGMENT),
          backgroundRgb,
        ),
      );
    }
  }
  return minimum;
}

function blendTowardWhite([red, green, blue]: Rgb, amount: number): Rgb {
  return [
    Math.round(red + (255 - red) * amount),
    Math.round(green + (255 - green) * amount),
    Math.round(blue + (255 - blue) * amount),
  ];
}

function toHex([red, green, blue]: Rgb) {
  return `#${[red, green, blue].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Keeps the stored rank/spectrum data intact, while ensuring the actual text
 * paint clears AA contrast on the Cave surface. Dark custom Master colours and
 * darker legacy rank stops are only brightened as far as necessary.
 */
export function accessibleAuraTextColor(color: string, background = CAVE_AURA_TEXT_SURFACE) {
  const original = parseHexColor(color);
  if (!original || auraTextContrastRatio(color, background) >= MIN_AURA_TEXT_CONTRAST) return color;

  let lower = 0;
  let upper = 1;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    const candidate = toHex(blendTowardWhite(original, midpoint));
    if (auraTextContrastRatio(candidate, background) >= MIN_AURA_TEXT_CONTRAST) {
      upper = midpoint;
    } else {
      lower = midpoint;
    }
  }

  let result = blendTowardWhite(original, upper);
  while (auraTextContrastRatio(toHex(result), background) < MIN_AURA_TEXT_CONTRAST) {
    result = [
      Math.min(255, result[0] + 1),
      Math.min(255, result[1] + 1),
      Math.min(255, result[2] + 1),
    ];
  }
  return toHex(result);
}

function brightenGradientStops(stops: readonly string[], amount: number) {
  return stops.map(color => {
    const parsed = parseHexColor(color);
    return parsed ? toHex(blendTowardWhite(parsed, amount)) : color;
  });
}

function accessibleAuraGradientStops(stops: readonly string[]): string[] {
  if (auraGradientTextContrastRatio(stops) >= MIN_AURA_TEXT_CONTRAST) return [...stops];
  if (stops.some(stop => !parseHexColor(stop))) return stops.map(color => accessibleAuraTextColor(color));

  // Brighten every stop by the same amount. CSS interpolates in sRGB, so this
  // preserves the visual relationships in a rank's palette while lifting the
  // otherwise-dark midpoint as well as the endpoints.
  let lower = 0;
  let upper = 1;
  for (let iteration = 0; iteration < 14; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    if (auraGradientTextContrastRatio(brightenGradientStops(stops, midpoint)) >= GRADIENT_CONTRAST_TARGET) {
      upper = midpoint;
    } else {
      lower = midpoint;
    }
  }

  let result = brightenGradientStops(stops, upper);
  while (auraGradientTextContrastRatio(result) < MIN_AURA_TEXT_CONTRAST && upper < 1) {
    upper = Math.min(1, upper + 1 / 255);
    result = brightenGradientStops(stops, upper);
  }
  return result;
}

const accessibleGradientVisuals = new Map<string, RankVisual>();

function accessibleAuraTextVisual(visual: RankVisual): RankVisual {
  if (visual.kind === 'solid') {
    return { ...visual, stops: visual.stops.map(color => accessibleAuraTextColor(color)) };
  }

  const cacheKey = `${visual.kind}|${visual.angle}|${visual.positions?.join(',') ?? ''}|${visual.stops.join(',')}`;
  const cached = accessibleGradientVisuals.get(cacheKey);
  if (cached) return cached;

  const textVisual = { ...visual, stops: accessibleAuraGradientStops(visual.stops) };
  accessibleGradientVisuals.set(cacheKey, textVisual);
  return textVisual;
}

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
export function activeAuraOverride(
  activeStatusEffects: ActiveStatusEffect[] | undefined,
): 'silenced' | 'cursed' | null {
  if (!activeStatusEffects?.length) return null;
  const now = Date.now();
  const isActive = (name: string) =>
    activeStatusEffects.some(e => e.effectDef.name === name && isEffectActive(e, now));

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
      className: 'text-neutral-400 font-normal line-through-none shadow-none filter grayscale'
    };
  }

  const cursedClass = override === 'cursed'
    ? ' animate-pulse motion-reduce:animate-none text-red-400/90 shadow-[0_0_12px_rgba(139,0,0,0.8)]'
    : '';

  if (override === 'cursed') {
    return {
      style: { color: '#ff3333' },
      className: `drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] font-semibold${cursedClass}`
    };
  }

  const { visual } = resolveRankVisual(selection, xp);
  const textVisual = accessibleAuraTextVisual(visual);

  if (textVisual.kind === 'solid') {
    return {
      style: { color: textVisual.stops[0], filter: rankGlowFilter(visual, 5) },
      className: 'font-semibold'
    };
  }

  return {
    style: { backgroundImage: rankBackground(textVisual), filter: rankGlowFilter(visual, 8) },
    className: `aura-gradient-text ${textVisual.kind === 'spectrum' ? 'aura-spectrum-text font-black' : 'font-bold'}`
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
    return { className: 'shadow-[0_0_25px_rgba(139,0,0,0.7)] border-human/40 animate-pulse motion-reduce:animate-none' };
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
