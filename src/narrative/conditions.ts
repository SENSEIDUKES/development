import { CONDITIONS_SLOT, type WorldCard } from './worldRecord';

/**
 * Conditions: what a character lastingly carries (SENSEI, 2026-11-11, from how
 * RimWorld keeps a colonist's health: each condition is its own entry, with
 * its own course, and the rules run it; nobody decides later how it goes).
 *
 * A condition is written once, on the character's card, as one line:
 *
 *   Name | first stage > next stage > last stage | a stage every N chapters | ends if this; or this
 *
 * Its name always; its stages, its pace and what ends it only where it has
 * them. A line with a name alone is a condition that does not change by
 * itself (blind from birth). Stages that end in "gone" pass by themselves.
 * Several lines are several conditions, standing side by side.
 *
 * Nothing here is a model: the card holds the course, and the stage a
 * condition has reached is worked out from the chapter count alone.
 */

export interface Condition {
  name: string;
  /** How it shows at each stage, in order. Empty when it does not change by itself. */
  stages: string[];
  /** How many chapters each stage lasts. Absent: it stays at its first stage until something ends it. */
  pace?: number;
  /** After its last stage it is over ("gone"), rather than staying as it then is. */
  passes: boolean;
  /** What would end it, as the card says it. */
  endsIf: string[];
}

/** A condition as it stands at a chapter. */
export interface ConditionNow {
  name: string;
  /** How it shows now: its stage's words. Absent for a condition with no stages. */
  showing?: string;
  /** Its stage now, counted from 1, and how many it has. */
  stage?: number;
  stages?: number;
  /** Chapters until it moves on, or passes when it is at its last stage. Absent when it will not move again. */
  movesIn?: number;
  /** What happens then: its next stage, or it passes. */
  then?: 'next' | 'passes';
  endsIf: string[];
}

/** The most conditions one character carries, and the most text one part holds. */
export const CONDITION_LIMIT = 6;
const CONDITION_TEXT_CHARACTERS = 160;
const CONDITION_STAGE_LIMIT = 8;

/** A card that says someone is well says they carry nothing. */
const WELL = new Set(['well', 'healthy', 'fine', 'unharmed', 'uninjured', 'normal', 'none', 'no conditions', 'nothing', 'n/a']);
const PACE = /\bevery\s+(\d+)\s+chapters?\b/i;
const ENDS = /^ends?\s+(?:if|when)\s+/i;
const GONE = /^(?:gone|it passes|passes)$/i;

const clip = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, CONDITION_TEXT_CHARACTERS).trim();
const label = (value: string) => clip(value).toLocaleLowerCase();

/** Reads one line of a card's conditions. A line that says they are well is no condition. */
const readCondition = (line: string): Condition | undefined => {
  const [first, ...rest] = line.split('|').map(clip);
  // A leading list mark is how a person writes a list, not part of the name.
  const name = first?.replace(/^[-*•]\s*/, '');
  if (!name || WELL.has(label(name).replace(/[.!]$/, ''))) return undefined;
  const condition: Condition = { name, stages: [], passes: false, endsIf: [] };
  for (const part of rest) {
    if (!part) continue;
    if (ENDS.test(part)) {
      condition.endsIf.push(...part.replace(ENDS, '').split(';').map(way => clip(clip(way).replace(/^or\s+/i, '')).replace(/\.$/, '')).filter(Boolean));
      continue;
    }
    const pace = part.match(PACE);
    if (pace && !part.includes('>')) {
      const chapters = Number(pace[1]);
      if (chapters >= 1) condition.pace = chapters;
      continue;
    }
    if (!condition.stages.length) condition.stages = part.split('>').map(clip).filter(Boolean).slice(0, CONDITION_STAGE_LIMIT);
  }
  if (condition.stages.length && GONE.test(condition.stages.at(-1)!)) {
    condition.stages.pop();
    condition.passes = true;
  }
  // A pace with nothing to move through moves nothing.
  if (!condition.stages.length) { delete condition.pace; condition.passes = false; }
  return condition;
};

/** A card's conditions, one for each line, in the order written; two of one name are one. */
export function readConditions(value: string | undefined): Condition[] {
  const read: Condition[] = [];
  for (const line of (value ?? '').split(/\r?\n/)) {
    const condition = readCondition(line);
    if (!condition || read.some(other => label(other.name) === label(condition.name))) continue;
    read.push(condition);
    if (read.length === CONDITION_LIMIT) break;
  }
  return read;
}

/** The conditions a character card states. Only characters carry them. */
export const worldCardConditions = (card: Pick<WorldCard, 'kind' | 'slots'>): Condition[] =>
  (card.kind === 'character' ? readConditions(card.slots[CONDITIONS_SLOT]) : []);

/**
 * A condition as it stands after `elapsed` chapters of carrying it, or
 * undefined once it has passed. Its first stage lasts its first `pace`
 * chapters, the next the `pace` after, and so on; its last stage stays, unless
 * the condition passes.
 */
export function conditionAfter(condition: Condition, elapsed: number): ConditionNow | undefined {
  const base = { name: condition.name, endsIf: [...condition.endsIf] };
  const count = condition.stages.length;
  if (!count) return base;
  if (!condition.pace) return { ...base, showing: condition.stages[0] };
  const chapters = Math.max(0, Math.floor(elapsed));
  const index = Math.floor(chapters / condition.pace);
  if (index >= count) {
    if (condition.passes) return undefined;
    return { ...base, showing: condition.stages[count - 1], stage: count, stages: count };
  }
  const last = index === count - 1;
  const movesIn = condition.pace - (chapters % condition.pace);
  return {
    ...base, showing: condition.stages[index], stage: index + 1, stages: count,
    ...(last ? (condition.passes ? { movesIn, then: 'passes' as const } : {}) : { movesIn, then: 'next' as const }),
  };
}
