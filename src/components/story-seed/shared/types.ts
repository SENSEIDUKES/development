/**
 * Types genuinely shared by both Story Seed forks.
 *
 * The Story Seed contract itself is **not** here — it lives in
 * `storySeedSchema.ts`. The frozen Phase-1 flat intake contract that the
 * locked `reference/` replica still speaks lives in `referenceIntake.ts`.
 */

/** The creator-authored Origin values captured with a generated Blueprint. */
export interface WorldBlueprintOriginSnapshot {
  premise: string;
  genre: string;
  /** Stable Story Style key (`chinese`, `korean`, or `japanese`). */
  style: string;
  storyTags: string[];
}

/** Structured main-character fields used by the editable Blueprint review. */
export interface WorldBlueprintMainCharacter {
  name: string;
  age: string;
  personality: string;
  appearance: string;
  backgroundProfile: string;
}

/** Generated blueprint output. Produced from a Story Seed; never stored inside one. */
export interface WorldBlueprint {
  hardPins?: import('../../../narrative/storyDirection').HardPinInput[];
  funSettings?: import('../../../narrative/storyDirection').FunSettings;
  /**
   * Arc 1's goal plan, the only arc a Blueprint plans and the only one the
   * reader sees: every later arc is planned when the reader begins it. Arc 1's
   * first goal is the Seed's Active Arc Goal when the creator wrote one.
   * Blueprints that planned every arc keep their Arc 1 here and their next arcs
   * as the look-ahead (`normalizeWorldBlueprint`).
   */
  arcPlans?: import('../../arc-goals/shared/arcGoals').ArcPlan[];
  /**
   * The hidden look-ahead: at most two one-line directions for the arcs after
   * Arc 1. Only the arc planner reads it; no reader surface or copy shows it.
   * It travels with the Blueprint (and its exports) as part of the novel.
   */
  arcLookahead?: import('../../arc-goals/shared/arcGoals').ArcLookaheadEntry[];
  /** Additive artifact metadata. Older Blueprints safely default to `v1.0`. */
  blueprintVersion?: string;
  creator?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Provenance copied from the canonical Story Seed at the generation boundary.
   * The Story Seed remains the editable source of truth while the review is open.
   */
  originSnapshot?: WorldBlueprintOriginSnapshot;
  title: string;
  logline: string;
  worldOverview: string;
  startingLocation: string;
  societyStructure: string;
  /**
   * Generated detail that builds on an author-supplied world, opening-location,
   * or society fact. The author's wording stays the fact (in the Seed and the
   * field above); this Blueprint-owned prose only adds to it and never repeats
   * it. Absent when the author left the fact to the model, whose text is then
   * the fact itself. Older Blueprints have none.
   */
  worldOverviewDetail?: string;
  startingLocationDetail?: string;
  societyStructureDetail?: string;
  /**
   * The author's fact as it read when each detail above was generated or last
   * reviewed. A detail is used only while its fact still reads the same, so
   * one written for an earlier or different fact never travels beside it.
   */
  worldOverviewDetailBasis?: string;
  startingLocationDetailBasis?: string;
  societyStructureDetailBasis?: string;
  powerSystemOutline: string;
  /** Structured fields added without removing the legacy combined profile. */
  mainCharacter?: WorldBlueprintMainCharacter;
  mcProfile: string;
  majorFactions: string[];
  initialCharacters: string[];
  firstArcPromise: string;
  tropeRules: string;
  styleBible: string;
  destinedEnding?: string;
  /**
   * The story's length in arcs of 100 chapters; its last arc arrives at the
   * Destined Ending. The Seed's Story Length (`story.optional.arcCount`), when
   * the creator set one, is this length; otherwise the Blueprint keeps its own.
   */
  estimatedArcs: number;
  /**
   * What Arc 1 was planned as: the whole story (a one-arc story, whose Arc 1
   * reaches the Destined Ending) or the opening of a longer one. A length that
   * crosses that line needs Arc 1 planned again, by regenerating the Blueprint.
   * Older Blueprints take it from their saved length.
   */
  arcOneScope?: 'whole-story' | 'opening';
}

/**
 * Minimal alias-bearing entry shape for `codexContext.ts`'s collision helper.
 * Production's `NamedCodexEntry` extends the full `BaseCodexEntry` (Codex
 * system, excluded from this replica) — only `aliases`/`id`/`name` are used
 * by the seed forms, so the Workshop shape is intentionally narrower.
 */
export interface NamedCodexEntry {
  id?: string;
  name?: string;
  aliases?: string[];
}
