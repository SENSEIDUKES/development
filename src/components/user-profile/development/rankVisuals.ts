/**
 * The canonical rank colour system.
 *
 * One ladder, one colour identity per rank, one set of renderers. Everything
 * that paints a rank — the profile display name, the aura preview orb, the
 * portrait glow, and the Settings rank list — reads from `RANKS` through the
 * renderers below, so a colour only ever has to change here.
 *
 * Colours come from the rank reference sheet. Where the reference shows two
 * adjacent swatches that is **one gradient identity**, not two alternatives:
 * both swatches are dominant stops and the value in between is a restrained
 * support stop that keeps the blend smooth. `positions` weights those support
 * stops so the dominant colours keep the majority of the ramp.
 *
 * Nothing here imports React, Tailwind, or a status effect. The style helpers
 * that layer status effects on top live in `qi.ts`.
 */

export type RankId =
  | 'reader'
  | 'disciple'
  | 'scribe'
  | 'scholar'
  | 'author'
  | 'adept'
  | 'elder'
  | 'leader'
  | 'sage'
  | 'master';

/**
 * A rank's colour identity as data.
 *
 * - `solid` — a single dominant colour; `stops` has one entry.
 * - `gradient` — a fixed multi-stop identity; `stops[0]` and the last stop are
 *   the dominant colours from the reference, anything between them is support.
 * - `spectrum` — the animated, user-tunable endgame treatment (Master).
 */
export interface RankVisual {
  kind: 'solid' | 'gradient' | 'spectrum';
  /** Two or more stops for `gradient` and `spectrum`, exactly one for `solid`. */
  stops: string[];
  /** Gradient direction in degrees. Ignored when `kind` is `solid`. */
  angle: number;
  /** Optional 0–1 position per stop. Even spacing when omitted. */
  positions?: number[];
  /** The `rgba()` this rank glows with — orb ring, portrait ring, text shadow. */
  glow: string;
}

export interface Rank {
  id: RankId;
  /** The rank name, exactly as it is shown. */
  name: string;
  /** Heavenly Qi required to reach this rank. */
  unlockedAt: number;
  visual: RankVisual;
  /** Whether the portrait carries the ambient mote layer at this rank. */
  motes: boolean;
}

/**
 * The reference sheet's colour vocabulary, named once so a rank composes from
 * it instead of repeating hexes.
 *
 * `YELLOW` (🟡, Author and Adept) and `TROPHY_GOLD` (🏆, Leader and Sage) are
 * deliberately separate: yellow is the brighter, more luminous of the two, gold
 * the deeper and richer. They are close in hue — every convincing yellow is —
 * so what really separates them is what each is paired with.
 */
const WHITE = '#E5E7EB'; //       ⚪
const GREEN = '#22C55E'; //       🟢
const BLUE = '#2563EB'; //        🔵
const LIGHT_BLUE = '#7DD3FC'; //  💙
const YELLOW = '#FFE02E'; //      🟡
const ORANGE = '#F97316'; //      🟠
const RED = '#DC2626'; //         🔴
const TROPHY_GOLD = '#FFD700'; // 🏆
const VIOLET = '#A855F7'; //      🟣

/**
 * The ten ranks, ascending. This is the single source for both the Qi ladder
 * and the colour system; `DAO_RANKS` in `qi.ts` is derived from it.
 */
export const RANKS: Rank[] = [
  {
    id: 'reader',
    name: 'Reader',
    unlockedAt: 0,
    motes: false,
    visual: { kind: 'solid', stops: [WHITE], angle: 90, glow: 'rgba(229,231,235,0.35)' },
  },
  {
    id: 'disciple',
    name: 'Disciple',
    unlockedAt: 100,
    motes: false,
    visual: { kind: 'solid', stops: [GREEN], angle: 90, glow: 'rgba(34,197,94,0.40)' },
  },
  {
    id: 'scribe',
    name: 'Scribe',
    unlockedAt: 300,
    motes: false,
    visual: { kind: 'solid', stops: [BLUE], angle: 90, glow: 'rgba(37,99,235,0.45)' },
  },
  {
    // 🔵 → 💙 blue into light blue, through a mid azure.
    id: 'scholar',
    name: 'Scholar',
    unlockedAt: 750,
    motes: false,
    visual: {
      kind: 'gradient',
      stops: [BLUE, '#3B82F6', LIGHT_BLUE],
      positions: [0, 0.5, 1],
      angle: 90,
      glow: 'rgba(59,130,246,0.50)',
    },
  },
  {
    // 💙 → 🟡 light blue into yellow. A pale seafoam keeps the crossing from
    // going muddy on the way through.
    id: 'author',
    name: 'Author',
    unlockedAt: 1500,
    motes: false,
    visual: {
      kind: 'gradient',
      stops: [LIGHT_BLUE, '#CFE7E2', YELLOW],
      positions: [0, 0.48, 1],
      angle: 90,
      glow: 'rgba(255,224,46,0.50)',
    },
  },
  {
    // 🟡 → 🟠 yellow into orange, through a warm amber.
    id: 'adept',
    name: 'Adept',
    unlockedAt: 3000,
    motes: false,
    visual: {
      kind: 'gradient',
      stops: [YELLOW, '#F9AE22', ORANGE],
      positions: [0, 0.5, 1],
      angle: 90,
      glow: 'rgba(249,115,22,0.55)',
    },
  },
  {
    // 🟠 → 🔴 orange into red, through a scorched vermilion.
    id: 'elder',
    name: 'Elder',
    unlockedAt: 6000,
    motes: true,
    visual: {
      kind: 'gradient',
      stops: [ORANGE, '#F04E2E', RED],
      positions: [0, 0.52, 1],
      angle: 90,
      glow: 'rgba(220,38,38,0.55)',
    },
  },
  {
    // 🔴 → 🏆 red into trophy gold. The restrained orange middle carries the
    // heat over.
    id: 'leader',
    name: 'Leader',
    unlockedAt: 12000,
    motes: true,
    visual: {
      kind: 'gradient',
      stops: [RED, '#F2762A', TROPHY_GOLD],
      positions: [0, 0.52, 1],
      angle: 90,
      glow: 'rgba(255,215,0,0.60)',
    },
  },
  {
    // 🏆 → 🟣 trophy gold into violet, through a rose that keeps the crossing
    // luminous.
    id: 'sage',
    name: 'Sage',
    unlockedAt: 25000,
    motes: true,
    visual: {
      kind: 'gradient',
      stops: [TROPHY_GOLD, '#F472B6', VIOLET],
      positions: [0, 0.5, 1],
      angle: 90,
      glow: 'rgba(168,85,247,0.65)',
    },
  },
  {
    // The user-controlled endgame. `stops` is the default spectrum shown until
    // the cultivator sets their own colour.
    id: 'master',
    name: 'Master',
    unlockedAt: 50000,
    motes: true,
    visual: {
      kind: 'spectrum',
      stops: ['#00FFFF', '#FF007F', TROPHY_GOLD, '#00FFFF'],
      angle: 90,
      glow: 'rgba(6,182,212,0.75)',
    },
  },
];

export const MASTER_RANK = RANKS[RANKS.length - 1];

/** The persisted value that selects a rank's treatment. */
export function rankToken(rank: Rank | RankId): string {
  return `rank:${typeof rank === 'string' ? rank : rank.id}`;
}

export function getRankById(id: RankId): Rank {
  return RANKS.find(rank => rank.id === id) ?? RANKS[0];
}

/** The highest rank the given Qi total has reached. */
export function getRankForQi(qi: number | undefined): Rank {
  const total = Number.isFinite(qi) ? Math.max(0, qi ?? 0) : 0;
  let reached = RANKS[0];
  for (const rank of RANKS) {
    if (total < rank.unlockedAt) break;
    reached = rank;
  }
  return reached;
}

/**
 * Values `displayNameColor` held before the ten-rank ladder, mapped by the Qi
 * threshold they were unlocked at, so an existing cultivator keeps a treatment
 * they had actually earned rather than being promoted or demoted.
 */
const LEGACY_AURA_VALUES: Record<string, RankId> = {
  '#E5E7EB': 'reader', //           0 Mortal Reader
  '#3B82F6': 'disciple', //       100 Wandering Disciple
  '#06B6D4': 'scribe', //         300 Outer Sect Scribe
  '#10B981': 'scholar', //        750 Inner Sect Scholar
  '#8B5CF6': 'author', //       1,500 Dao Adept
  '#F59E0B': 'adept', //        3,000 Spirit Author
  '#FFD700': 'elder', //        6,000 Heavenly Chronicler
  'gradient-violet-gold': 'leader', // 12,000 Sage of Branching Paths
  'animated-custom': 'sage', // 25,000 Dao Master
};

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * What a stored `displayNameColor` should paint, together with what produced
 * it. `source` is `'custom'` when the cultivator picked their own colour with
 * the Master spectrum, `'rank'` when it resolves to a rank on the ladder.
 */
export interface ResolvedRankVisual {
  visual: RankVisual;
  rank: Rank;
  source: 'rank' | 'custom';
}

/**
 * Resolve the treatment to paint. An explicit selection wins; otherwise the
 * rank the cultivator's Qi has reached is used.
 *
 * A raw hex is the Master custom spectrum and is honoured whenever it is
 * stored — the Settings picker is what gates *setting* one on reaching Master.
 */
export function resolveRankVisual(
  selected: string | undefined | null,
  qi: number | undefined,
): ResolvedRankVisual {
  const earned = getRankForQi(qi);
  const value = selected?.trim();

  if (value) {
    if (value.startsWith('rank:')) {
      const id = value.slice('rank:'.length) as RankId;
      const rank = RANKS.find(candidate => candidate.id === id);
      if (rank) return { visual: rank.visual, rank, source: 'rank' };
    }

    const legacy = LEGACY_AURA_VALUES[value];
    if (legacy) {
      const rank = getRankById(legacy);
      return { visual: rank.visual, rank, source: 'rank' };
    }

    if (HEX_PATTERN.test(value)) {
      return {
        visual: { kind: 'solid', stops: [value], angle: 90, glow: hexToGlow(value, 0.6) },
        rank: MASTER_RANK,
        source: 'custom',
      };
    }
  }

  return { visual: earned.visual, rank: earned, source: 'rank' };
}

/**
 * A visual as a CSS `background` value: a flat colour for `solid`, a
 * `linear-gradient` for the rest. This is the one place a stop list becomes CSS.
 */
export function rankBackground(visual: RankVisual): string {
  if (visual.kind === 'solid') return visual.stops[0];

  const stops = visual.stops.map((color, index) => {
    const position = visual.positions?.[index];
    return position === undefined ? color : `${color} ${Math.round(position * 100)}%`;
  });
  return `linear-gradient(${visual.angle}deg, ${stops.join(', ')})`;
}

/** The `box-shadow` a rank's orb, chip, or portrait ring glows with. */
export function rankGlowShadow(visual: RankVisual, radius = 12): string {
  return `0 0 ${radius}px ${visual.glow}`;
}

/** The `filter` a rank's text glows with. Gradient text cannot use a text-shadow. */
export function rankGlowFilter(visual: RankVisual, radius = 8): string {
  return `drop-shadow(0 0 ${radius}px ${visual.glow})`;
}

/** `#rgb` / `#rrggbb` to an `rgba()` at the given alpha. */
function hexToGlow(hex: string, alpha: number): string {
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
