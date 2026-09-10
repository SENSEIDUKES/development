/**
 * Scene Ending Anchors + Scene Rhythm Tracker — first (skeleton)
 * implementation. Deterministic and rule-based on purpose: every choice is
 * explainable from `recentSceneTypes` + `fatePressure` alone, which is what
 * makes it inspectable in the Workshop. Weights and repetition limits are
 * centralized in `SCENE_RHYTHM_CONFIG` so they can be retuned later without
 * touching the selection algorithm.
 *
 * Workshop provider-adapter logic for now — both preview panes use it through
 * the shared Stage 2 planner, while no production code path reads from this
 * file yet. Written to be easy to lift into Light-Novels once approved.
 */
import type { ChapterHandoff } from "../types";

export type SceneType = "worldBuilding" | "conflict" | "progression";

export const SCENE_TYPES: SceneType[] = ["worldBuilding", "conflict", "progression"];

export type FatePressureTier = "Relaxed" | "Balanced" | "Hardcore" | "Dao Master";

/** Three concrete, story-state-specific next-scene candidates. */
export interface SceneAnchors {
  worldBuilding: string;
  conflict: string;
  progression: string;
}

/**
 * The only place tuning happens. First-pass values chosen to satisfy the
 * spec's plain-language rules; adjust freely without touching the selection
 * logic in `selectNextScenePath`.
 */
export const SCENE_RHYTHM_CONFIG = {
  /** How many trailing scenes count toward the "recent rhythm" window. */
  windowSize: 4,
  /** Base selection weight per scene type, by Fate Pressure tier. Higher wins. */
  baseWeights: {
    Relaxed: { worldBuilding: 3, conflict: 1, progression: 3 },
    Balanced: { worldBuilding: 2, conflict: 2, progression: 2 },
    Hardcore: { worldBuilding: 1, conflict: 3, progression: 1 },
    "Dao Master": { worldBuilding: 1, conflict: 3, progression: 1 },
  } as Record<FatePressureTier, Record<SceneType, number>>,
  /** A type is blocked once it has run this many *consecutive* chapters, regardless of tier. */
  maxConsecutiveRepeats: { worldBuilding: 3, conflict: 3, progression: 3 } as Record<SceneType, number>,
  /** A type is blocked once it appears this many times within the trailing window, even if not fully consecutive. */
  maxOccurrencesInWindow: 3,
  /** Deterministic tie-break order when multiple types share the top weight. */
  tieBreakOrder: ["progression", "worldBuilding", "conflict"] as SceneType[],
} as const;

export interface ScenePathSelection {
  type: SceneType;
  anchor: string;
  weights: Record<SceneType, number>;
  blocked: SceneType[];
  reason: string;
}

const trailingRun = (history: SceneType[]): { type: SceneType; count: number } | undefined => {
  if (history.length === 0) return undefined;
  const last = history[history.length - 1];
  let count = 0;
  for (let i = history.length - 1; i >= 0 && history[i] === last; i -= 1) count += 1;
  return { type: last, count };
};

/**
 * Picks one of `anchors` as the concrete directional anchor for the next
 * chapter, weighted by Fate Pressure and constrained by recent-rhythm
 * repetition rules — deliberately favoring "explainable" over "clever":
 * every field in the returned selection can be shown as-is in the Workshop.
 */
export function selectNextScenePath(
  fatePressure: FatePressureTier,
  recentSceneTypes: SceneType[],
  anchors: SceneAnchors,
): ScenePathSelection {
  const { windowSize, baseWeights, maxConsecutiveRepeats, maxOccurrencesInWindow, tieBreakOrder } = SCENE_RHYTHM_CONFIG;
  const weights = { ...baseWeights[fatePressure] };
  const window = recentSceneTypes.slice(-windowSize);
  const run = trailingRun(recentSceneTypes);
  const blocked: SceneType[] = [];

  SCENE_TYPES.forEach(type => {
    const consecutive = run?.type === type ? run.count : 0;
    const windowCount = window.filter(t => t === type).length;
    if (consecutive >= maxConsecutiveRepeats[type] || windowCount >= maxOccurrencesInWindow) {
      weights[type] = 0;
      blocked.push(type);
    }
  });

  // Repetition rules should never leave every option at zero (only possible
  // with a pathological config) — fall back to the tier's base weights so a
  // chapter can always be generated.
  const allBlocked = SCENE_TYPES.every(type => weights[type] === 0);
  const effectiveWeights = allBlocked ? { ...baseWeights[fatePressure] } : weights;

  // Tie-break by staleness first (whichever tied type has gone longest
  // without appearing — a type that has never appeared is treated as
  // maximally stale), THEN by `tieBreakOrder`. Without this, a tier whose
  // base weights tie two types (e.g. Hardcore ties worldBuilding/progression
  // at 1) would let the fixed order silently starve one of them forever —
  // exactly the "stagnation" this tracker exists to prevent.
  const chaptersSinceLastUsed = (type: SceneType) => {
    const indexFromEnd = [...recentSceneTypes].reverse().indexOf(type);
    return indexFromEnd === -1 ? Infinity : indexFromEnd;
  };
  const maxWeight = Math.max(...SCENE_TYPES.map(type => effectiveWeights[type]));
  const tiedAtMax = SCENE_TYPES.filter(type => effectiveWeights[type] === maxWeight);
  const staleness = Math.max(...tiedAtMax.map(chaptersSinceLastUsed));
  const stalestTied = tiedAtMax.filter(type => chaptersSinceLastUsed(type) === staleness);
  const stalestTiedSet = new Set(stalestTied);
  const type = tieBreakOrder.find(candidate => stalestTiedSet.has(candidate))!;

  const reason = allBlocked
    ? `Repetition rules blocked every option — fell back to base ${fatePressure} weights (${tieBreakOrder.map(t => `${t}=${baseWeights[fatePressure][t]}`).join(", ")}).`
    : blocked.length > 0
      ? `${blocked.join(", ")} blocked by repetition limits (≥${maxOccurrencesInWindow} in the last ${windowSize} scenes, or a consecutive run at its cap). Highest remaining weight (${maxWeight}) wins${tiedAtMax.length > 1 ? `; ties (${tiedAtMax.join(", ")}) broken by longest-unused, then ${tieBreakOrder.join(" > ")}` : ""}.`
      : `Highest ${fatePressure} weight (${maxWeight}) wins${tiedAtMax.length > 1 ? `; ties (${tiedAtMax.join(", ")}) broken by longest-unused, then ${tieBreakOrder.join(" > ")}` : ""}.`;

  return { type, anchor: anchors[type], weights: effectiveWeights, blocked, reason };
}

/**
 * Derives three concrete, story-state-specific next-scene anchors from the
 * chapter that just ended. `conflict` and `progression` reuse the real
 * (ported) `ChapterHandoff` fields that Context Engine 2.5 already produces
 * — `openTension` is inherently a conflict-flavored hook, and
 * `nextImmediateAction` is inherently a progression-flavored one — so only
 * the world-building anchor needs a dedicated seed.
 */
export function deriveSceneAnchors(input: {
  handoff: ChapterHandoff;
  worldBuildingSeed: string;
}): SceneAnchors {
  return {
    worldBuilding: input.worldBuildingSeed,
    conflict: input.handoff.endState.openTension
      || "The current threat closes in with no clear resolution yet.",
    progression: input.handoff.nextImmediateAction
      || "The protagonist must act on what this chapter just changed.",
  };
}

export function appendSceneType(history: SceneType[], used: SceneType, maxLength: number = 12): SceneType[] {
  return [...history, used].slice(-maxLength);
}
