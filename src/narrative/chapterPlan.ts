import type { ChapterFunction } from './storyDirection';
import type { Look } from './looks';

/**
 * The Chapter Plan (SENSEI, 2026-10-20; `docs/chapter-loop.md`): what happens
 * in a chapter, decided before it is written by the planner, which is Fate.
 * The writer narrates it and never changes it; the Codex is updated from it.
 * It has one shape for everything: who is on the page (the cast), and the
 * chapter's beats in order (its events), each with the facts it changes. The
 * writer narrates the events, the Codex records them, and later CTE runs them
 * and its probes count them.
 *
 * Every field a model fills is a choice from a fixed menu, or a few words
 * where words are needed; every number is the HARNESS's.
 */

export const PLAN_EVENT_KINDS = ['confrontation', 'discovery', 'revelation', 'gain', 'loss', 'bond', 'betrayal', 'training', 'journey', 'decision'] as const;
export type PlanEventKind = (typeof PLAN_EVENT_KINDS)[number];

export const PLAN_OUTCOMES = ['clean success', 'success at a cost', 'partial', 'failure', 'disaster'] as const;
export type PlanOutcome = (typeof PLAN_OUTCOMES)[number];

/** How hard an event presses on someone. Fate Pressure later sizes each into CTE's pressure load. */
export const PLAN_PRESSURES = ['light', 'heavy', 'crushing'] as const;
export type PlanPressureLevel = (typeof PLAN_PRESSURES)[number];

export const PLAN_GENDERS = ['male', 'female', 'other'] as const;
export type PlanGender = (typeof PLAN_GENDERS)[number];

export const PLAN_AGES = ['young', 'adult', 'elder', 'ageless'] as const;
export type PlanAge = (typeof PLAN_AGES)[number];

/** A change to what someone has or knows. What they already had before the chapter is the cast's `alreadyHas`, never a change. */
export const PLAN_HOLDING_CHANGES = ['gains', 'loses', 'equips', 'unequips', 'learning', 'learns', 'improves', 'seals', 'unseals', 'rank'] as const;
export type PlanHoldingChange = (typeof PLAN_HOLDING_CHANGES)[number];

export const PLAN_STATUS_STATES = ['wounded', 'recovered', 'dead', 'revived', 'sealed', 'captured', 'freed', 'transformed', 'damaged', 'repaired', 'destroyed'] as const;
export type PlanStatusState = (typeof PLAN_STATUS_STATES)[number];

export const PLAN_GOAL_CHANGES = ['set', 'achieved', 'abandoned', 'failed'] as const;
export type PlanGoalChange = (typeof PLAN_GOAL_CHANGES)[number];

export const PLAN_VALUE_STANCES = ['held', 'rejected'] as const;
export type PlanValueStance = (typeof PLAN_VALUE_STANCES)[number];

export const PLAN_COMMITMENT_CHANGES = ['entered', 'kept', 'broken', 'released'] as const;
export type PlanCommitmentChange = (typeof PLAN_COMMITMENT_CHANGES)[number];

/** A stance is said (what someone says about another) or acted (what they do to them); the two can differ. */
export const PLAN_STANCE_MODES = ['said', 'acted'] as const;
export type PlanStanceMode = (typeof PLAN_STANCE_MODES)[number];

export const PLAN_STANCE_POLARITIES = ['warm', 'hostile'] as const;
export type PlanStancePolarity = (typeof PLAN_STANCE_POLARITIES)[number];

/** The main character, in every plan, by this one name. */
export const PLAN_MAIN_CHARACTER = 'MC' as const;

/**
 * Someone or something a plan names: as the planner wrote it, and the Codex
 * entry it resolved to when its chapter committed. Someone unnamed who matters
 * to one event ("a guard") is named in it as unnamed, never given a card.
 */
export interface PlanRef {
  name: string;
  entryId?: string;
  unnamed?: true;
}

/** Something a cast member already had before the chapter, which the Codex did not list yet. */
export interface PlanHeld {
  kind: 'thing' | 'ability';
  name: string;
  /** The Codex entry it resolved to when the chapter committed. */
  entryId?: string;
  count?: number;
  level?: string;
}

/** One person or thing on the page in this chapter. */
export interface PlanCastMember {
  /** The exact Codex name; `MC` for the main character; a full name for someone new. */
  name: string;
  /** The Codex entry it resolved to when the chapter committed. */
  entryId?: string;
  kind: 'character' | 'thing';
  /** Someone new only: who they are in the story, in one line. */
  who?: string;
  /** Only when the card has none. */
  gender?: PlanGender;
  /** Only when the card has none. */
  age?: PlanAge;
  /** Only when the card has none: the whole look, one line and the traits of its kind. */
  look?: Look;
  alreadyHas?: PlanHeld[];
}

export type PlanFact =
  | { type: 'holding'; who: PlanRef; change: PlanHoldingChange; what: PlanRef; count?: number; level?: string }
  | { type: 'status'; who: PlanRef; state: PlanStatusState; how?: string }
  | { type: 'look'; who: PlanRef; change: string }
  | { type: 'goal'; who: PlanRef; change: PlanGoalChange; what: string }
  | { type: 'value'; who: PlanRef; stance: PlanValueStance; what: string }
  | { type: 'commitment'; who: PlanRef; toWhom: PlanRef; change: PlanCommitmentChange; what: string }
  | { type: 'stance'; who: PlanRef; towardWhom: PlanRef; mode: PlanStanceMode; polarity: PlanStancePolarity };

export type PlanFactType = PlanFact['type'];

export interface PlanPressure {
  who: PlanRef;
  level: PlanPressureLevel;
}

/** One beat of the chapter: something happens, it presses on someone, and it changes the record. */
export interface PlanEvent {
  /** What sort of beat it is; absent when the planner gave one off its menu. */
  kind?: PlanEventKind;
  /** Who acts; absent when something befalls people. */
  actor?: PlanRef;
  targets: PlanRef[];
  /** What the actor tries, in a few words; absent when nothing is attempted. */
  attempt?: string;
  /** How the attempt turns out; absent when nothing is attempted. */
  outcome?: PlanOutcome;
  presses: PlanPressure[];
  /** What happens, including what produces its outcome and each fact, in a sentence or two. */
  how: string;
  facts: PlanFact[];
}

export interface ChapterPlan {
  cast: PlanCastMember[];
  events: PlanEvent[];
  /** Present when an event of this chapter achieves the Active Arc Goal: that event's number, from 1. */
  arcGoalReached?: { event: number };
  /** Fate Survival only: present when an event of this chapter ends the story; that event's number, from 1. */
  storyEnds?: { event: number };
  /** The chapter's primary function, which Rhythm's history keeps. */
  chapterFunction?: ChapterFunction;
}

/**
 * What the plain checks found in a plan: a fact that cannot be true, dropped
 * (and kept here, so a reader can see what and why), or something set aside
 * or worth a second look, kept in the plan.
 */
export interface PlanCheck {
  message: string;
  /** The event it is about, from 1. */
  event?: number;
  /** The fact the checks dropped from that event. */
  fact?: PlanFact;
  /** Why that fact cannot happen, in a sentence the writer is shown under its event. */
  reason?: string;
}

/** How a plan names someone unnamed who matters to one event: `unnamed: a guard`. */
export const PLAN_UNNAMED_PREFIX = 'unnamed:' as const;
