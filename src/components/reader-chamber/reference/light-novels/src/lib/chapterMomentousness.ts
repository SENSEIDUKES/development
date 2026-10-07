/**
 * Momentous-chapter contract.
 *
 * The Reader gives a small number of chapters per arc "momentous" treatment
 * (currently the hero image and its reveal). Deciding which ones used to live
 * inline in `useReaderVisuals`, which read generation-output internals —
 * `cuePayload.powerShift`, block `system.promptType`, block metadata — and
 * carried its own weights and threshold. A field rename or schema change on
 * the generation side silently altered Reader behaviour.
 *
 * This module owns that decision behind one structural, pipeline-agnostic
 * input contract. It imports nothing: callers adapt whatever they hold into
 * `MomentousChapterSignals`, and TypeScript then guards the scoring inputs.
 *
 * The scoring table below is the behaviour extracted verbatim from the hook.
 * See `docs/READER_MOMENTOUS_CHAPTER_CONTRACT.md` before changing any number.
 */

/**
 * Event names that count as momentous. One shared list is matched against two
 * different producers: `cuePayload.beastEvent.type` and block
 * `system.promptType`. The lists only partially overlap with either producer's
 * own union, so several entries are currently unreachable from one side or the
 * other — see the contract doc. Preserved as-is.
 */
export const MOMENTOUS_EVENT_TYPES = [
  'breakthrough',
  'turning-point',
  'evolution',
  'betrayal',
  'ascension',
  'conquest',
  'destruction',
  'calamity',
  'rival_battle',
  'romance',
  'first_kiss',
] as const;

export type MomentousEventType = (typeof MOMENTOUS_EVENT_TYPES)[number];

/** Points contributed per signal. Weighted signals multiply the raw value. */
export const MOMENTOUS_SCORE_WEIGHTS = {
  /** Flat prior for the arc's structural climax. */
  arcFinale: 15,
  cuePowerShift: 2,
  cueDanger: 1.5,
  cueMysticism: 1,
  cueBeastEvent: 10,
  blockSystemPrompt: 8,
  blockDanger: 1,
  blockIntensity: 1,
  blockTension: 1,
} as const;

/** A chapter must reach this score before it can be a momentous peak. */
export const MOMENTOUS_SCORE_THRESHOLD = 15;

/** Short arcs get no structural-climax prior. */
export const MOMENTOUS_ARC_FINALE_MIN_CHAPTERS = 4;

/** At most this many chapters per arc are momentous, highest score first. */
export const MAX_MOMENTOUS_CHAPTERS_PER_ARC = 3;

// ── Input contract ──────────────────────────────────────────────────────────
//
// Deliberately the smallest shape the scorer reads. Every field is optional
// because persisted chapters predate most of these signals.

export interface MomentousBeastEventSignal {
  type?: string;
}

export interface MomentousChapterCue {
  powerShift?: number;
  danger?: number;
  mysticism?: number;
  beastEvent?: MomentousBeastEventSignal | null;
}

export interface MomentousBlockSystem {
  promptType?: string;
}

export interface MomentousBlockMetadata {
  danger?: number;
  intensity?: number;
  tension?: number;
}

export interface MomentousChapterBlock {
  system?: MomentousBlockSystem | null;
  metadata?: MomentousBlockMetadata | null;
}

export interface MomentousChapterSignals {
  /** Identity used to match the assessed chapter against its arc siblings. */
  number?: number;
  chapterCue?: MomentousChapterCue | null;
  blocks?: readonly MomentousChapterBlock[] | null;
}

/**
 * Momentousness is comparative: a chapter is momentous relative to the other
 * chapters of its own arc, so the whole arc is scored together.
 */
export interface MomentousArcSignals {
  chapters?: readonly MomentousChapterSignals[] | null;
}

/** Structural position, supplied by the arc pass rather than read off a chapter. */
export interface MomentousArcPosition {
  isArcFinal: boolean;
  arcChapterCount: number;
}

// ── Result contract ─────────────────────────────────────────────────────────

export type MomentousReasonSignal =
  | 'arc-finale'
  | 'cue-power-shift'
  | 'cue-danger'
  | 'cue-mysticism'
  | 'cue-beast-event'
  | 'block-system-prompt'
  | 'block-danger'
  | 'block-intensity'
  | 'block-tension';

/**
 * One scoring contribution. Reasons exist for debugging and tests: their
 * `points` always sum to `score`, and nothing renders them.
 */
export interface MomentousReason {
  signal: MomentousReasonSignal;
  points: number;
  /** Matched event or prompt name, for the two name-matched signals. */
  detail?: string;
  /** Index within `blocks`, for block-sourced signals. */
  blockIndex?: number;
}

export interface MomentousChapterScore {
  score: number;
  reasons: MomentousReason[];
}

export interface MomentousChapterAssessment extends MomentousChapterScore {
  isMomentous: boolean;
}

// ── Scoring ─────────────────────────────────────────────────────────────────

const isMomentousEventType = (value: unknown): value is MomentousEventType =>
  MOMENTOUS_EVENT_TYPES.includes(value as MomentousEventType);

/**
 * Normalizes one weighted signal into either a contribution or "no contribution".
 *
 * The falsy guard is load-bearing: a `0`, absent or `null` signal contributes
 * nothing rather than zero points, so it never appears as a reason. Numbers and
 * booleans score exactly as the inline implementation scored them.
 *
 * Truthy non-numeric values are the one place this differs from the code it
 * replaces. Cue signals were already multiplied inline, so a non-numeric cue
 * yields `NaN` here exactly as before — it poisons the score and drops the
 * chapter below the threshold, which is preserved deliberately. Block metadata
 * was instead added with a bare `+=`, so a non-numeric value concatenated into
 * the running score (`5 + '2'` became the string `'52'`, which could then
 * outrank a genuinely higher-scoring chapter). Multiplying by the weight of 1
 * normalizes that away. It can only trigger on data that violates the declared
 * NUMBER schema; see the contract doc.
 */
const weightedContribution = (raw: unknown, weight: number): number | null => {
  if (!raw) return null;
  return (raw as number) * weight;
};

const isScorableBlock = (block: unknown): block is MomentousChapterBlock =>
  typeof block === 'object' && block !== null;

/**
 * Scores a single chapter. `position` carries the arc-structural inputs, which
 * a chapter cannot know about on its own.
 */
export const scoreMomentousChapter = (
  chapter: MomentousChapterSignals | null | undefined,
  position: MomentousArcPosition = { isArcFinal: false, arcChapterCount: 0 },
): MomentousChapterScore => {
  const reasons: MomentousReason[] = [];
  let score = 0;

  const contribute = (
    signal: MomentousReasonSignal,
    points: number,
    extra?: Omit<MomentousReason, 'signal' | 'points'>,
  ) => {
    score += points;
    reasons.push({ signal, points, ...extra });
  };

  if (position.isArcFinal && position.arcChapterCount >= MOMENTOUS_ARC_FINALE_MIN_CHAPTERS) {
    contribute('arc-finale', MOMENTOUS_SCORE_WEIGHTS.arcFinale);
  }

  const cue = chapter?.chapterCue;

  const powerShift = weightedContribution(cue?.powerShift, MOMENTOUS_SCORE_WEIGHTS.cuePowerShift);
  if (powerShift !== null) contribute('cue-power-shift', powerShift);

  const danger = weightedContribution(cue?.danger, MOMENTOUS_SCORE_WEIGHTS.cueDanger);
  if (danger !== null) contribute('cue-danger', danger);

  const mysticism = weightedContribution(cue?.mysticism, MOMENTOUS_SCORE_WEIGHTS.cueMysticism);
  if (mysticism !== null) contribute('cue-mysticism', mysticism);

  const beastEventType = cue?.beastEvent?.type;
  if (beastEventType && isMomentousEventType(beastEventType)) {
    contribute('cue-beast-event', MOMENTOUS_SCORE_WEIGHTS.cueBeastEvent, { detail: beastEventType });
  }

  const blocks = chapter?.blocks;
  if (Array.isArray(blocks)) {
    blocks.forEach((block, blockIndex) => {
      // Malformed rows are skipped rather than thrown on. This is the one
      // hardening in the extraction: previously a null block raised inside the
      // Reader's render memo, which was a crash and not a scoring decision.
      if (!isScorableBlock(block)) return;

      const promptType = block.system?.promptType;
      if (promptType && isMomentousEventType(promptType)) {
        contribute('block-system-prompt', MOMENTOUS_SCORE_WEIGHTS.blockSystemPrompt, {
          detail: promptType,
          blockIndex,
        });
      }

      const metadata = block.metadata;
      const blockDanger = weightedContribution(metadata?.danger, MOMENTOUS_SCORE_WEIGHTS.blockDanger);
      if (blockDanger !== null) contribute('block-danger', blockDanger, { blockIndex });

      const blockIntensity = weightedContribution(
        metadata?.intensity,
        MOMENTOUS_SCORE_WEIGHTS.blockIntensity,
      );
      if (blockIntensity !== null) contribute('block-intensity', blockIntensity, { blockIndex });

      const blockTension = weightedContribution(metadata?.tension, MOMENTOUS_SCORE_WEIGHTS.blockTension);
      if (blockTension !== null) contribute('block-tension', blockTension, { blockIndex });
    });
  }

  return { score, reasons };
};

const NOT_MOMENTOUS: MomentousChapterAssessment = { isMomentous: false, score: 0, reasons: [] };

/**
 * Decides whether one chapter of an arc deserves momentous treatment.
 *
 * Every chapter in the arc is scored, those at or above the threshold are
 * ranked highest-first, and the top `MAX_MOMENTOUS_CHAPTERS_PER_ARC` are the
 * arc's peaks. Ties keep arc order. The input is never mutated and the same
 * input always produces the same result.
 */
export const assessMomentousChapter = (
  arc: MomentousArcSignals | null | undefined,
  chapterNumber: number | null | undefined,
): MomentousChapterAssessment => {
  const chapters = arc?.chapters;
  if (!Array.isArray(chapters) || chapters.length === 0 || chapterNumber == null) {
    return { ...NOT_MOMENTOUS };
  }

  // Requiring a real number is load-bearing. If the last chapter is malformed
  // and carries no number, an unguarded identity check matches every other
  // unnumbered chapter, handing each of them the finale prior and letting them
  // crowd a genuinely momentous chapter out of the peak slots.
  const lastChapterNumber = chapters[chapters.length - 1]?.number;
  const finalChapterNumber = typeof lastChapterNumber === 'number' ? lastChapterNumber : null;

  const scored = chapters.map(chapter => ({
    number: chapter?.number,
    ...scoreMomentousChapter(chapter, {
      isArcFinal: finalChapterNumber !== null && chapter?.number === finalChapterNumber,
      arcChapterCount: chapters.length,
    }),
  }));

  const peaks = scored
    .filter(entry => entry.score >= MOMENTOUS_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MOMENTOUS_CHAPTERS_PER_ARC);

  const selected = scored.find(entry => entry.number === chapterNumber);

  return {
    isMomentous: peaks.some(entry => entry.number === chapterNumber),
    score: selected?.score ?? 0,
    reasons: selected?.reasons ?? [],
  };
};

/**
 * Persisted chapter shape this contract can adapt, named structurally so the
 * module stays independent of the generation and persistence types.
 */
export interface MomentousSourceChapter {
  number?: number;
  cuePayload?: MomentousChapterCue | null;
  blocks?: readonly MomentousChapterBlock[] | null;
}

/**
 * The single place that knows how a stored chapter maps onto the contract.
 * Renaming `cuePayload` upstream breaks here, at one typed seam, instead of
 * silently changing what the Reader shows.
 */
export const toMomentousChapterSignals = (
  chapter: MomentousSourceChapter | null | undefined,
): MomentousChapterSignals => ({
  number: chapter?.number,
  chapterCue: chapter?.cuePayload,
  blocks: chapter?.blocks,
});
