import type { CodexEntry, CodexEntryKind } from '../../../narrative/holdings';
import type { Look } from '../../../narrative/looks';
import type {
  ChapterPlan,
  PlanAge,
  PlanCommitmentChange,
  PlanFact,
  PlanGender,
  PlanGoalChange,
  PlanRef,
  PlanStancePolarity,
  PlanStatusState,
  PlanValueStance,
} from '../../../narrative/chapterPlan';
import { normalizeIdentityLabel } from './canonicalProjection';
import { namesNearlyMatch } from './holdings';

/**
 * The record a story's plans make (SENSEI, 2026-10-20: the chapter loop): for
 * every Codex entry, who it is, its look and each change to it, its state,
 * its goals, values, commitments and stances, and the chapters it was on the
 * page. Holdings are worked out beside it (`deriveHoldings`). Nothing here is
 * stored: it is worked out again, in story order, from every committed
 * chapter's plan, whose names resolved to Codex entries when it committed, so
 * a rewritten chapter changes the record and nothing counts twice.
 *
 * The same rules decide, before a chapter is written, which of its planned
 * facts cannot be true (`blockedFact`): the dead stay dead, the destroyed stay
 * gone, and only what is wounded recovers.
 */

/** Where a fact of the record came from: its chapter, and its event when it has one. */
export interface RecordPassage {
  chapterId: string;
  chapterNumber: number;
  /** The event of the chapter's plan, from 1. */
  event?: number;
  /** How it happens, as the plan tells it. */
  text: string;
}

export interface RecordedStatus {
  state: PlanStatusState;
  how?: string;
  passage: RecordPassage;
}

/** An entry's state now: an end (dead or destroyed), or the conditions it is in. */
export interface RecordedCondition {
  end?: RecordedStatus;
  wounded?: RecordedStatus;
  captured?: RecordedStatus;
  sealed?: RecordedStatus;
  damaged?: RecordedStatus;
  transformed?: RecordedStatus;
}

export interface RecordedGoal {
  what: string;
  set?: RecordPassage;
  outcome?: Exclude<PlanGoalChange, 'set'>;
  resolved?: RecordPassage;
}

export interface RecordedValue {
  what: string;
  stance: PlanValueStance;
  passage: RecordPassage;
}

/** Someone a fact points at, by the entry it resolved to. */
export interface RecordedParty {
  key: string;
  name: string;
}

export interface RecordedCommitment {
  to: RecordedParty;
  what: string;
  entered?: RecordPassage;
  outcome?: Exclude<PlanCommitmentChange, 'entered'>;
  resolved?: RecordPassage;
}

export interface RecordedStance {
  toward: RecordedParty;
  said?: { polarity: PlanStancePolarity; passage: RecordPassage };
  acted?: { polarity: PlanStancePolarity; passage: RecordPassage };
}

export interface RecordedEntity {
  /** The Codex entry's ID. */
  key: string;
  name: string;
  kind: CodexEntryKind;
  mainCharacter: boolean;
  /** Who they are in the story, in one line, from the plan that first said it. */
  who?: { text: string; passage: RecordPassage };
  gender?: PlanGender;
  age?: PlanAge;
  /** The whole look, from the plan that first gave one. */
  look?: { look: Look; passage: RecordPassage };
  /** Each change to the look since, in story order. */
  lookChanges: Array<{ change: string; passage: RecordPassage }>;
  condition: RecordedCondition;
  /** Every change of state, in story order. */
  statusHistory: RecordedStatus[];
  goals: RecordedGoal[];
  /** The latest stance on each value. */
  values: RecordedValue[];
  /** What this entry owes, open or settled. */
  commitments: RecordedCommitment[];
  stances: RecordedStance[];
  /** The chapters whose cast it was in, in story order. */
  castIn: Array<{ chapterId: string; chapterNumber: number }>;
}

/** What the record reads from a chapter: its plan. */
export interface RecordChapter {
  id: string;
  chapterNumber: number;
  plan: ChapterPlan;
}

const sameWords = (left: string, right: string) =>
  normalizeIdentityLabel(left) === normalizeIdentityLabel(right) || namesNearlyMatch(left, right);

/** The states that end an entry, and those that mend one. */
const ENDS: ReadonlySet<PlanStatusState> = new Set(['dead', 'destroyed']);

/**
 * Why a fact cannot be true of the record as it stands, in plain words, or
 * nothing when it can: the dead and the destroyed change in no way but being
 * revived; only what is dead or destroyed is revived, only the wounded
 * recover, only the captured or sealed are freed, and only what is damaged is
 * repaired. A stance or commitment toward the dead stands.
 */
export function blockedFact(fact: PlanFact, subject: RecordedEntity | undefined): string | undefined {
  if (!subject) return undefined;
  const { condition, name } = subject;
  const end = condition.end;
  if (fact.type === 'status') {
    if (fact.state === 'revived') return end ? undefined : `${name} is revived, but the record does not show them dead or destroyed.`;
    if (end) return `${name} is ${end.state} in the record, so they cannot be ${fact.state}.`;
    if (fact.state === 'recovered' && !condition.wounded) return `${name} recovers, but the record does not show them wounded.`;
    if (fact.state === 'freed' && !condition.captured && !condition.sealed) return `${name} is freed, but the record does not show them captured or sealed.`;
    if (fact.state === 'repaired' && !condition.damaged) return `${name} is repaired, but the record does not show it damaged.`;
    return undefined;
  }
  return end ? `${name} is ${end.state} in the record, so this cannot change for them.` : undefined;
}

/**
 * Builds the record one chapter at a time, in story order. `applyFact` never
 * refuses: it records what it can. The checks ask `blockedFact` first.
 */
export class PlanRecordBuilder {
  private readonly byId: Map<string, CodexEntry>;
  private readonly entities = new Map<string, RecordedEntity>();

  constructor(entries: readonly CodexEntry[]) {
    this.byId = new Map(entries.map(entry => [entry.id, entry]));
  }

  /** The entry a reference resolved to, as the record has it; made on first sight. Unnamed or unresolved references have none. */
  entity(ref: PlanRef | undefined): RecordedEntity | undefined {
    if (!ref?.entryId || ref.unnamed) return undefined;
    const existing = this.entities.get(ref.entryId);
    if (existing) return existing;
    const entry = this.byId.get(ref.entryId);
    if (!entry) return undefined;
    const made: RecordedEntity = {
      key: entry.id, name: entry.name, kind: entry.kind, mainCharacter: Boolean(entry.mainCharacter),
      lookChanges: [], condition: {}, statusHistory: [], goals: [], values: [], commitments: [], stances: [], castIn: [],
    };
    this.entities.set(entry.id, made);
    return made;
  }

  private party(ref: PlanRef): RecordedParty {
    const entity = this.entity(ref);
    return { key: entity?.key ?? `name:${normalizeIdentityLabel(ref.name)}`, name: entity?.name ?? ref.name };
  }

  /** The chapter's cast: who is on the page, and what the plan gives someone whose card has none. */
  addCast(chapter: Pick<RecordChapter, 'id' | 'chapterNumber'>, cast: ChapterPlan['cast'], firstEvent?: string) {
    for (const member of cast) {
      const entity = this.entity(member);
      if (!entity) continue;
      const passage: RecordPassage = { chapterId: chapter.id, chapterNumber: chapter.chapterNumber, text: member.who ?? firstEvent ?? '' };
      if (entity.castIn.at(-1)?.chapterId !== chapter.id) entity.castIn.push({ chapterId: chapter.id, chapterNumber: chapter.chapterNumber });
      // Only when the card has none: the first given stands.
      if (member.who && !entity.who) entity.who = { text: member.who, passage };
      if (member.gender && !entity.gender) entity.gender = member.gender;
      if (member.age && !entity.age) entity.age = member.age;
      if (member.look && !entity.look) entity.look = { look: { summary: member.look.summary, traits: { ...member.look.traits } }, passage };
    }
  }

  /** One fact of one event, in order. */
  applyFact(chapter: Pick<RecordChapter, 'id' | 'chapterNumber'>, eventNumber: number, how: string, fact: PlanFact) {
    const subject = this.entity(fact.who);
    if (!subject) return;
    const passage: RecordPassage = { chapterId: chapter.id, chapterNumber: chapter.chapterNumber, event: eventNumber, text: how };
    switch (fact.type) {
      case 'status': {
        const status: RecordedStatus = { state: fact.state, ...(fact.how ? { how: fact.how } : {}), passage };
        subject.statusHistory.push(status);
        const condition = subject.condition;
        switch (fact.state) {
          case 'dead': case 'destroyed': condition.end = status; break;
          case 'revived': delete condition.end; break;
          case 'wounded': condition.wounded = status; break;
          case 'recovered': delete condition.wounded; break;
          case 'captured': condition.captured = status; break;
          case 'sealed': condition.sealed = status; break;
          case 'freed': delete condition.captured; delete condition.sealed; break;
          case 'damaged': condition.damaged = status; break;
          case 'repaired': delete condition.damaged; break;
          case 'transformed': condition.transformed = status; break;
        }
        return;
      }
      case 'look':
        if (fact.change.trim()) subject.lookChanges.push({ change: fact.change.trim(), passage });
        return;
      case 'goal': {
        if (fact.change === 'set') {
          if (!subject.goals.some(goal => !goal.outcome && sameWords(goal.what, fact.what))) subject.goals.push({ what: fact.what, set: passage });
          return;
        }
        const open = openGoal(subject, fact.what);
        if (open) { open.outcome = fact.change; open.resolved = passage; }
        else subject.goals.push({ what: fact.what, outcome: fact.change, resolved: passage });
        return;
      }
      case 'value': {
        const known = subject.values.findIndex(value => sameWords(value.what, fact.what));
        const value: RecordedValue = { what: fact.what, stance: fact.stance, passage };
        if (known >= 0) subject.values.splice(known, 1);
        subject.values.push(value);
        return;
      }
      case 'commitment': {
        const to = this.party(fact.toWhom);
        if (fact.change === 'entered') { subject.commitments.push({ to, what: fact.what, entered: passage }); return; }
        // Only the open commitment its words name, as with a goal: one never made settles no other.
        const open = openCommitment(subject, to.key, fact.what);
        if (open) { open.outcome = fact.change; open.resolved = passage; }
        else subject.commitments.push({ to, what: fact.what, outcome: fact.change, resolved: passage });
        return;
      }
      case 'stance': {
        const toward = this.party(fact.towardWhom);
        let stance = subject.stances.find(entry => entry.toward.key === toward.key);
        if (!stance) { stance = { toward }; subject.stances.push(stance); }
        stance[fact.mode] = { polarity: fact.polarity, passage };
        return;
      }
      case 'holding':
        // Holdings are worked out by their own rules (`deriveHoldings`).
        return;
    }
  }

  /** A whole committed chapter: its cast, then each event's facts in order. */
  addChapter(chapter: RecordChapter) {
    this.addCast(chapter, chapter.plan.cast, chapter.plan.events[0]?.how);
    chapter.plan.events.forEach((event, index) => {
      for (const fact of event.facts) this.applyFact(chapter, index + 1, event.how, fact);
    });
  }

  /** Every entry the record has met, in the order it met them. */
  all(): RecordedEntity[] {
    return [...this.entities.values()];
  }
}

/** The goal of an entry's that is still open and its words name. */
export const openGoal = (entity: RecordedEntity, what: string) => entity.goals.find(goal => !goal.outcome && sameWords(goal.what, what));

/** The commitment of an entry's to someone that is still open and its words name. */
export const openCommitment = (entity: RecordedEntity, toKey: string, what: string) =>
  entity.commitments.find(commitment => !commitment.outcome && commitment.to.key === toKey && sameWords(commitment.what, what));

/** The record of a story's committed chapters, worked out in story order. */
export function derivePlanRecord({ entries, chapters }: {
  entries: readonly CodexEntry[];
  chapters: readonly RecordChapter[];
}): RecordedEntity[] {
  const builder = new PlanRecordBuilder(entries);
  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) builder.addChapter(chapter);
  return builder.all();
}

/** An entry's state now, in a few words, when it is not its usual one: `wounded (a broken left arm), captured`. */
export function conditionLabel(condition: RecordedCondition): string | undefined {
  const label = (status: RecordedStatus) => `${status.state}${status.how ? ` (${status.how})` : ''}`;
  if (condition.end) return label(condition.end);
  const states = [condition.wounded, condition.captured, condition.sealed, condition.damaged, condition.transformed].filter((status): status is RecordedStatus => Boolean(status));
  return states.length ? states.map(label).join(', ') : undefined;
}
