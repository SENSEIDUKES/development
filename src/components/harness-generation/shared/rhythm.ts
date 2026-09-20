import { CHAPTER_FUNCTIONS, type ChapterFunction, type FatePressure } from '../../../narrative/storyDirection';

/**
 * Fate Pressure rhythm: the storyteller-intensity setting evaluates recently
 * saved chapter functions and decides which of the writer's three next-chapter
 * suggestions the HARNESS should favor.
 *
 * Every tuning value lives in `FATE_PRESSURE_RHYTHM_CONFIG`. The selection
 * algorithm below is ported from the Workshop's Scene Rhythm Tracker
 * (`chapter-generation/shared/lib/sceneRhythm.ts`): per-tier base weights,
 * consecutive-streak limits, a trailing-window occurrence cap, and a
 * longest-unused tie-break so a tied function can never starve. The legacy
 * Relaxed / Balanced / Hardcore / Dao Master tiers were replaced by the
 * canonical `mortal` / `immortal` / `heaven` Fate Pressure values.
 */

export interface FatePressureTierProfile {
  label: string;
  summary: string;
  /** Base selection weight per chapter function. Higher wins. */
  weights: Record<ChapterFunction, number>;
  /** A function is blocked once it has run this many consecutive committed chapters. */
  streakLimits: Record<ChapterFunction, number>;
  /** How many trailing saved chapter functions count toward the recent-rhythm window. */
  windowSize: number;
  /** A function is blocked once it appears this many times within the window. */
  maxOccurrencesInWindow: number;
}

export interface FatePressureRhythmConfig {
  /**
   * Development defaults: no approved production tuning exists yet. These
   * values are reported in the PR that introduced them for later review.
   */
  source: 'development-default';
  /** Used when a story carries no Fate Pressure of its own. */
  defaultFatePressure: FatePressure;
  tiers: Record<FatePressure, FatePressureTierProfile>;
  /** Deterministic tie-break order once staleness cannot separate tied functions. */
  tieBreakOrder: readonly ChapterFunction[];
  /** How many recent chapter functions the persisted recommendation records. */
  historyLimit: number;
}

/** The only place Fate Pressure rhythm tuning happens. */
export const FATE_PRESSURE_RHYTHM_CONFIG: FatePressureRhythmConfig = {
  source: 'development-default',
  defaultFatePressure: 'immortal',
  tiers: {
    mortal: {
      label: 'Mortal',
      summary: 'Light pressure. Long world-building stretches are tolerated before conflict is favored.',
      weights: { progression: 2, worldBuilding: 3, conflict: 1 },
      streakLimits: { progression: 3, worldBuilding: 4, conflict: 2 },
      windowSize: 6,
      maxOccurrencesInWindow: 4,
    },
    immortal: {
      label: 'Immortal',
      summary: 'Balanced pressure. Functions rotate evenly and no streak runs past three chapters.',
      weights: { progression: 2, worldBuilding: 2, conflict: 2 },
      streakLimits: { progression: 3, worldBuilding: 3, conflict: 3 },
      windowSize: 5,
      maxOccurrencesInWindow: 3,
    },
    heaven: {
      label: 'Heaven',
      summary: 'Strong pressure. Conflict is favored quickly and quiet stretches end after two chapters.',
      weights: { progression: 1, worldBuilding: 1, conflict: 3 },
      streakLimits: { progression: 2, worldBuilding: 2, conflict: 3 },
      windowSize: 4,
      maxOccurrencesInWindow: 3,
    },
  },
  tieBreakOrder: ['progression', 'worldBuilding', 'conflict'],
  historyLimit: 12,
};

export interface ChapterFunctionRecord {
  chapterNumber: number;
  chapterFunction: ChapterFunction;
}

/** The persisted recommendation for the story's next chapter. */
export interface HarnessRhythmRecommendation {
  fatePressure: FatePressure;
  /** Whether the tier came from the story's own Foundation or the Development default. */
  fatePressureSource: 'story' | 'development-default';
  forChapterNumber: number;
  recommendedFunction: ChapterFunction;
  /** Short, human-readable explanation of the deterministic choice. */
  reason: string;
  /** The recent saved chapter functions the recommendation evaluated, oldest first. */
  recentFunctions: ChapterFunctionRecord[];
  weights: Record<ChapterFunction, number>;
  blocked: ChapterFunction[];
  computedAt: string;
}

const trailingRun = (history: readonly ChapterFunction[]) => {
  const last = history.at(-1);
  if (!last) return undefined;
  let count = 0;
  for (let index = history.length - 1; index >= 0 && history[index] === last; index -= 1) count += 1;
  return { type: last, count };
};

/**
 * Deterministically recommends the next chapter function from saved chapter
 * functions and the centralized tier configuration. Nothing here reads Story
 * Seed labels, interface placement, prose, or a model reply.
 */
export const recommendNextChapterFunction = (
  fatePressure: FatePressure,
  history: readonly ChapterFunction[],
  config: FatePressureRhythmConfig = FATE_PRESSURE_RHYTHM_CONFIG,
): Pick<HarnessRhythmRecommendation, 'recommendedFunction' | 'reason' | 'weights' | 'blocked'> => {
  const tier = config.tiers[fatePressure];
  const weights = { ...tier.weights };
  const window = history.slice(-tier.windowSize);
  const run = trailingRun(history);
  const blocked: ChapterFunction[] = [];

  for (const type of CHAPTER_FUNCTIONS) {
    const consecutive = run?.type === type ? run.count : 0;
    const inWindow = window.filter(entry => entry === type).length;
    if (consecutive >= tier.streakLimits[type] || inWindow >= tier.maxOccurrencesInWindow) {
      weights[type] = 0;
      blocked.push(type);
    }
  }

  // Repetition rules never leave every option at zero: fall back to the tier's
  // base weights so a chapter can always be recommended.
  const allBlocked = CHAPTER_FUNCTIONS.every(type => weights[type] === 0);
  const effective = allBlocked ? { ...tier.weights } : weights;

  // Ties break by staleness first (never-used counts as maximally stale), then
  // by the fixed order, so a tier that ties two functions cannot starve one.
  const chaptersSinceUsed = (type: ChapterFunction) => {
    const fromEnd = [...history].reverse().indexOf(type);
    return fromEnd === -1 ? Infinity : fromEnd;
  };
  const maxWeight = Math.max(...CHAPTER_FUNCTIONS.map(type => effective[type]));
  const tied = CHAPTER_FUNCTIONS.filter(type => effective[type] === maxWeight);
  const staleness = Math.max(...tied.map(chaptersSinceUsed));
  const stalest = new Set(tied.filter(type => chaptersSinceUsed(type) === staleness));
  const recommendedFunction = config.tieBreakOrder.find(candidate => stalest.has(candidate))!;

  const tieNote = tied.length > 1 ? `; ${tied.join(', ')} tied and the longest-unused function wins` : '';
  const reason = allBlocked
    ? `${tier.label} pressure: repetition limits blocked every function, so the base ${tier.label} weights decide${tieNote}.`
    : blocked.length
      ? `${tier.label} pressure: ${blocked.join(', ')} ${blocked.length === 1 ? 'is' : 'are'} blocked by repetition limits (a streak at its cap or ${tier.maxOccurrencesInWindow} of the last ${tier.windowSize} chapters). Highest remaining weight (${maxWeight}) picks ${recommendedFunction}${tieNote}.`
      : history.length
        ? `${tier.label} pressure: no repetition limit is reached, so the highest ${tier.label} weight (${maxWeight}) picks ${recommendedFunction}${tieNote}.`
        : `${tier.label} pressure: no chapter function is saved yet, so the highest ${tier.label} weight (${maxWeight}) picks ${recommendedFunction}${tieNote}.`;

  return { recommendedFunction, reason, weights: effective, blocked };
};

/** Builds the persisted recommendation for a story's next chapter. */
export const buildRhythmRecommendation = (input: {
  fatePressure?: FatePressure;
  forChapterNumber: number;
  history: readonly ChapterFunctionRecord[];
  computedAt: string;
  config?: FatePressureRhythmConfig;
}): HarnessRhythmRecommendation => {
  const config = input.config ?? FATE_PRESSURE_RHYTHM_CONFIG;
  const fatePressure = input.fatePressure ?? config.defaultFatePressure;
  const ordered = [...input.history].sort((left, right) => left.chapterNumber - right.chapterNumber);
  const selection = recommendNextChapterFunction(fatePressure, ordered.map(entry => entry.chapterFunction), config);
  return {
    fatePressure,
    fatePressureSource: input.fatePressure ? 'story' : 'development-default',
    forChapterNumber: input.forChapterNumber,
    ...selection,
    recentFunctions: ordered.slice(-config.historyLimit),
    computedAt: input.computedAt,
  };
};
