import {
  PLAN_AGES,
  PLAN_COMMITMENT_CHANGES,
  PLAN_EVENT_KINDS,
  PLAN_GENDERS,
  PLAN_GOAL_CHANGES,
  PLAN_HOLDING_CHANGES,
  PLAN_MAIN_CHARACTER,
  PLAN_OUTCOMES,
  PLAN_PRESSURES,
  PLAN_STANCE_MODES,
  PLAN_STANCE_POLARITIES,
  PLAN_STATUS_STATES,
  PLAN_UNNAMED_PREFIX,
  PLAN_VALUE_STANCES,
  type ChapterPlan,
  type PlanCastMember,
  type PlanCheck,
  type PlanEvent,
  type PlanFact,
  type PlanHeld,
  type PlanHoldingChange,
  type PlanPressure,
  type PlanRef,
} from '../../../narrative/chapterPlan';
import { CHARACTER_LOOK_TRAITS, THING_LOOK_TRAITS, type Look, type LookTrait } from '../../../narrative/looks';
import { isChapterFunction } from '../../../narrative/storyDirection';
import type { CodexEntry } from '../../../narrative/holdings';
import type { ChapterPlanCastEntry, CodexSection, CodexSectionEntry, HarnessArcContext, HarnessStoryMode, WriterChapterPlan, WriterPlanEvent } from '../../../narrative/generation';
import { normalizeIdentityLabel } from './canonicalProjection';
import { createCodexEntryResolver, deriveHoldings, holdingTargetKind, HOLDING_VERB_OF_CHANGE, type CodexEntryResolver, type DeclaredCharacter, type HoldingFlagKind } from './holdings';
import { blockedFact, openCommitment, openGoal, PlanRecordBuilder, type RecordChapter } from './planRecord';
import { isMainCharacterTag } from './speakers';

/**
 * The Chapter Plan in the HARNESS (SENSEI, 2026-10-20: the chapter loop).
 * The planner's reply is read leniently into a plan; plain checks, never a
 * model, then drop every fact that cannot be true against the record, in
 * event order, and flag what is worth a second look; the writer is given the
 * plan as the checks left it; and when its chapter commits, every name the
 * plan uses resolves to a Codex entry. A plan is never refused for a bad
 * piece: only a reply that holds no plan at all fails the chapter.
 */

// ─── Reading the planner's reply ───────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim().replace(/\s+/gu, ' ') : undefined;

/** A menu word, letter case, hyphens and underscores aside ("Success at a cost", "success_at_a_cost"). */
const menu = <T extends string>(choices: readonly T[], value: unknown): T | undefined => {
  const word = typeof value === 'string' ? value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ') : '';
  return choices.find(choice => choice.toLowerCase() === word);
};

/** The forms of each holding change a planner may write ("gained" for gains). */
const HOLDING_CHANGE_FORMS = new Map<string, PlanHoldingChange>(PLAN_HOLDING_CHANGES.flatMap(change => {
  const stem = change === 'rank' || change === 'learning' ? change : change.replace(/s$/, '');
  const forms = change === 'rank' || change === 'learning' ? [change]
    : [change, stem, `${stem}ed`, `${stem}d`, change === 'loses' ? 'lost' : undefined, change === 'learns' ? 'learnt' : undefined];
  return forms.filter((form): form is string => Boolean(form)).map(form => [form, change] as const);
}));

const count = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : Number.NaN;
  return Number.isInteger(number) && number > 0 ? number : undefined;
};

/**
 * Someone or something a plan names: `MC` for the main character, `unnamed:
 * a few words` for someone unnamed who matters to one event, or a name.
 */
export function readPlanRef(value: unknown): PlanRef | undefined {
  const written = text(isRecord(value) ? value.name : value);
  if (!written) return undefined;
  const unnamed = written.match(/^unnamed\s*[:：]\s*(.*)$/iu);
  if (unnamed) return { name: unnamed[1].trim() || 'someone', unnamed: true };
  if (/^unnamed$/iu.test(written)) return { name: 'someone', unnamed: true };
  return { name: isMainCharacterTag(written) ? PLAN_MAIN_CHARACTER : written };
}

const readLook = (value: unknown, kind: PlanCastMember['kind']): Look | undefined => {
  const traits: readonly LookTrait[] = kind === 'thing' ? THING_LOOK_TRAITS : CHARACTER_LOOK_TRAITS;
  if (typeof value === 'string') return text(value) ? { summary: text(value)!, traits: {} } : undefined;
  if (!isRecord(value)) return undefined;
  const source = isRecord(value.traits) ? { ...value, ...value.traits } : value;
  const summary = text(value.summary) ?? text(value.line);
  if (!summary) return undefined;
  return { summary, traits: Object.fromEntries(traits.flatMap(trait => (text(source[trait]) ? [[trait, text(source[trait])!]] : []))) };
};

/**
 * Something a cast member already had. A bare name is a thing; a kind off its
 * menu, or none, is read as a thing, and said so.
 */
const readHeld = (value: unknown, holder: string, checks: PlanCheck[]): PlanHeld | undefined => {
  if (typeof value === 'string') return text(value) ? { kind: 'thing', name: text(value)! } : undefined;
  if (!isRecord(value) || !text(value.name)) return undefined;
  const kind = menu(['thing', 'ability'] as const, value.kind);
  if (!kind) {
    checks.push({ message: `‘${holder}’ already has ‘${text(value.name)}’ ${text(value.kind) ? `as ‘${text(value.kind)}’, which is not on the menu` : 'with no kind'}, so it is read as a thing.` });
  }
  return {
    kind: kind ?? 'thing',
    name: text(value.name)!,
    ...(count(value.count) ? { count: count(value.count) } : {}),
    ...(text(value.level) ? { level: text(value.level) } : {}),
  };
};

/**
 * One person or thing on the page. A kind off its menu, or none, is read as a
 * character, as most of a cast is, and said so: setting the member aside
 * would lose a newcomer and every fact about them.
 */
const readCastMember = (value: unknown, checks: PlanCheck[]): PlanCastMember | undefined => {
  if (!isRecord(value)) return undefined;
  const name = readPlanRef(value.name);
  if (!name || name.unnamed) return undefined;
  const menuKind = menu(['character', 'thing'] as const, value.kind);
  if (!menuKind && !isMainCharacterTag(name.name)) {
    checks.push({ message: `‘${name.name}’ is cast ${text(value.kind) ? `as ‘${text(value.kind)}’, which is not on the menu` : 'with no kind'}, so it is read as a character.` });
  }
  const kind = menuKind ?? 'character';
  const gender = menu(PLAN_GENDERS, value.gender);
  const age = menu(PLAN_AGES, value.age);
  const look = readLook(value.look, kind);
  const alreadyHas = Array.isArray(value.alreadyHas) ? value.alreadyHas.map(held => readHeld(held, name.name, checks)).filter((held): held is PlanHeld => Boolean(held)) : [];
  return {
    name: name.name, kind,
    ...(text(value.who) ? { who: text(value.who) } : {}),
    ...(kind === 'character' && gender ? { gender } : {}),
    ...(kind === 'character' && age ? { age } : {}),
    ...(look ? { look } : {}),
    ...(alreadyHas.length ? { alreadyHas } : {}),
  };
};

/** One fact of an event, or why it could not be read. */
const readFact = (value: unknown): PlanFact | string => {
  if (!isRecord(value)) return 'a fact that was not an object';
  const type = menu(['holding', 'status', 'look', 'goal', 'value', 'commitment', 'stance'] as const, value.type);
  const who = readPlanRef(value.who);
  if (!type) return `a fact of unknown type${text(value.type) ? ` ‘${text(value.type)}’` : ''}`;
  if (!who) return `a ${type} fact naming no one`;
  switch (type) {
    case 'holding': {
      const change = HOLDING_CHANGE_FORMS.get(typeof value.change === 'string' ? value.change.trim().toLowerCase() : '');
      const what = readPlanRef(value.what);
      if (!change) return `a holding fact for ${who.name} with no change from the menu`;
      if (!what && change !== 'rank') return `a holding fact for ${who.name} naming nothing`;
      const level = text(value.level);
      if (change === 'rank' && !what && !level) return `a rank fact for ${who.name} with no rank`;
      return {
        type, who, change, what: what ?? { name: level! },
        ...(count(value.count) ? { count: count(value.count) } : {}),
        ...(level && change !== 'rank' ? { level } : {}),
      };
    }
    case 'status': {
      const state = menu(PLAN_STATUS_STATES, value.state ?? value.change);
      if (!state) return `a status fact for ${who.name} with no state from the menu`;
      return { type, who, state, ...(text(value.how) ? { how: text(value.how) } : {}) };
    }
    case 'look': {
      const change = text(value.change) ?? text(value.what);
      return change ? { type, who, change } : `a look fact for ${who.name} that says no change`;
    }
    case 'goal': {
      const change = menu(PLAN_GOAL_CHANGES, value.change);
      const what = text(value.what);
      if (!change || !what) return `a goal fact for ${who.name} without its change or its goal`;
      return { type, who, change, what };
    }
    case 'value': {
      const stance = menu(PLAN_VALUE_STANCES, value.stance ?? value.change);
      const what = text(value.what);
      if (!stance || !what) return `a value fact for ${who.name} without held or rejected, or its value`;
      return { type, who, stance, what };
    }
    case 'commitment': {
      const change = menu(PLAN_COMMITMENT_CHANGES, value.change);
      const toWhom = readPlanRef(value.toWhom);
      const what = text(value.what);
      if (!change || !toWhom || !what) return `a commitment fact for ${who.name} without its change, to whom, or what is owed`;
      return { type, who, toWhom, change, what };
    }
    case 'stance': {
      const towardWhom = readPlanRef(value.towardWhom);
      const mode = menu(PLAN_STANCE_MODES, value.mode);
      const polarity = menu(PLAN_STANCE_POLARITIES, value.polarity);
      if (!towardWhom || !mode || !polarity) return `a stance fact for ${who.name} without toward whom, said or acted, or warm or hostile`;
      return { type, who, towardWhom, mode, polarity };
    }
  }
};

const readPressure = (value: unknown): PlanPressure | undefined => {
  if (!isRecord(value)) return undefined;
  const who = readPlanRef(value.who ?? value.name);
  const level = menu(PLAN_PRESSURES, value.level);
  return who && level ? { who, level } : undefined;
};

/** An event number the plan names (`{ reached: true, event: 3 }`, `{ event: 3 }` or `3`), when it says yes and names one. */
const namedEvent = (value: unknown, yes: 'reached' | 'ends', events: number): number | 'none' | undefined => {
  const said = isRecord(value) ? value[yes] ?? (value.event !== undefined ? true : undefined) : typeof value === 'number' ? true : value;
  if (said !== true) return undefined;
  const event = count(isRecord(value) ? value.event : value);
  return event && event <= events ? event : 'none';
};

const parseReply = (raw: string): Record<string, unknown> | undefined => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  for (const candidate of [trimmed, fenced]) {
    if (!candidate) continue;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Not this candidate.
    }
  }
  return undefined;
};

export type ChapterPlanReading =
  | { ok: true; plan: ChapterPlan; checks: PlanCheck[] }
  | { ok: false; problem: string };

/**
 * Reads the planner's reply into a plan. Every piece is read on its own: a
 * fact or a menu word that cannot be read is set aside with a plain reason,
 * never the plan. Only a reply with no event to narrate holds no plan.
 */
export function readChapterPlan(raw: string): ChapterPlanReading {
  const reply = parseReply(raw);
  if (!reply) return { ok: false, problem: 'The planner\'s reply was not a plan the HARNESS could read.' };
  const checks: PlanCheck[] = [];
  const cast = (Array.isArray(reply.cast) ? reply.cast : []).map(value => readCastMember(value, checks)).filter((member): member is PlanCastMember => Boolean(member));
  // An event that says nothing of what happens (no how, no attempt) is none the writer can narrate: it is set
  // aside with its facts, and the events after it are numbered without it.
  const sources = (Array.isArray(reply.events) ? reply.events : []).filter(isRecord);
  const numbers = new Map<number, number>();
  sources.forEach((source, index) => {
    if (text(source.how) ?? text(source.attempt)) numbers.set(index + 1, numbers.size + 1);
    else checks.push({ message: `The planner's event ${index + 1} says nothing of what happens, so it was set aside with its facts.` });
  });
  const events = sources.filter((_, index) => numbers.has(index + 1)).map((source, index): PlanEvent => {
    const number = index + 1;
    const kind = menu(PLAN_EVENT_KINDS, source.kind);
    if (!kind) checks.push({ event: number, message: `Event ${number}'s kind${text(source.kind) ? ` ‘${text(source.kind)}’` : ''} is not on the menu, so it has none.` });
    const outcome = menu(PLAN_OUTCOMES, source.outcome);
    if (!outcome && text(source.outcome)) checks.push({ event: number, message: `Event ${number}'s outcome ‘${text(source.outcome)}’ is not on the menu, so it has none.` });
    const actor = readPlanRef(source.actor);
    const targets = (Array.isArray(source.targets) ? source.targets : source.targets === undefined ? [] : [source.targets]).map(readPlanRef).filter((ref): ref is PlanRef => Boolean(ref));
    const facts: PlanFact[] = [];
    for (const value of Array.isArray(source.facts) ? source.facts : []) {
      const fact = readFact(value);
      if (typeof fact === 'string') checks.push({ event: number, message: `Event ${number}: ${fact} could not be read and was set aside.` });
      else facts.push(fact);
    }
    const attempt = text(source.attempt);
    const how = text(source.how) ?? attempt ?? '';
    if (!text(source.how)) checks.push({ event: number, message: `Event ${number} says nothing of how it happens.` });
    return {
      ...(kind ? { kind } : {}),
      ...(actor ? { actor } : {}),
      targets,
      ...(attempt ? { attempt } : {}),
      ...(outcome ? { outcome } : {}),
      presses: (Array.isArray(source.presses) ? source.presses : []).map(readPressure).filter((pressure): pressure is PlanPressure => Boolean(pressure)),
      how,
      facts,
    };
  });
  if (!events.length) return { ok: false, problem: 'The planner\'s reply held no event to narrate.' };
  const plan: ChapterPlan = { cast, events };
  // The planner numbers its events as it wrote them; an arc goal or ending in one set aside is not recorded.
  const marked = (value: unknown, yes: 'reached' | 'ends', said: string) => {
    const named = namedEvent(value, yes, sources.length);
    if (named === undefined) return undefined;
    const event = named === 'none' ? undefined : numbers.get(named);
    if (!event) {
      checks.push({ message: named === 'none'
        ? `The plan says ${said} but names no event of this chapter, so it is not recorded.`
        : `The plan says ${said} in its event ${named}, which was set aside, so it is not recorded.` });
    }
    return event;
  };
  const arcGoal = marked(reply.arcGoalReached, 'reached', 'the Active Arc Goal is reached');
  if (arcGoal) plan.arcGoalReached = { event: arcGoal };
  const ending = marked(reply.storyEnds, 'ends', 'the story ends');
  if (ending) plan.storyEnds = { event: ending };
  if (isChapterFunction(reply.chapterFunction)) plan.chapterFunction = reply.chapterFunction;
  else checks.push({ message: 'The plan returned no chapter function from the menu, so the rhythm history skips this chapter.' });
  return { ok: true, plan, checks };
}

// ─── Names and entries ─────────────────────────────────────────────────────

/** The plan with every name as the planner wrote it and no entry resolved: what a reused plan starts from. */
export function unresolvedPlan(plan: ChapterPlan): ChapterPlan {
  const bare = (ref: PlanRef): PlanRef => ({ name: ref.name, ...(ref.unnamed ? { unnamed: true as const } : {}) });
  return {
    ...structuredClone(plan),
    cast: plan.cast.map(({ entryId: _entry, alreadyHas, ...member }) => ({
      ...structuredClone(member),
      ...(alreadyHas ? { alreadyHas: alreadyHas.map(({ entryId: _held, ...held }) => ({ ...held })) } : {}),
    })),
    events: plan.events.map(event => ({
      ...structuredClone(event),
      ...(event.actor ? { actor: bare(event.actor) } : {}),
      targets: event.targets.map(bare),
      presses: event.presses.map(pressure => ({ who: bare(pressure.who), level: pressure.level })),
      facts: event.facts.map(fact => mapFactRefs(fact, bare)),
    })),
  };
}

const mapFactRefs = (fact: PlanFact, map: (ref: PlanRef, role: 'who' | 'what' | 'party') => PlanRef): PlanFact => {
  const who = map(fact.who, 'who');
  switch (fact.type) {
    case 'holding': return { ...fact, who, what: fact.change === 'rank' ? { name: fact.what.name } : map(fact.what, 'what') };
    case 'commitment': return { ...fact, who, toWhom: map(fact.toWhom, 'party') };
    case 'stance': return { ...fact, who, towardWhom: map(fact.towardWhom, 'party') };
    default: return { ...fact, who };
  }
};

/**
 * Resolves every name a plan uses to a Codex entry: each cast member, within
 * its kind (made when new), each fact's subject and whom it points at when the record or
 * the cast knows them, each holding's thing or ability (made when new), and
 * each actor, target and pressed person the record knows. `MC` is the main
 * character. Someone unnamed, and a name nobody knows, resolve to nothing.
 */
export function resolveChapterPlan(plan: ChapterPlan, resolver: CodexEntryResolver): ChapterPlan {
  const cast = plan.cast.map(member => {
    // A thing resolves among things, so one that shares a character's name (a sword and its spirit) keeps its own entry.
    const entry = member.kind === 'thing' && !isMainCharacterTag(member.name) ? resolver.entry('thing', member.name) : resolver.character(member.name);
    return {
      ...structuredClone(member), entryId: entry.id,
      ...(member.alreadyHas ? { alreadyHas: member.alreadyHas.map(held => ({ ...held, entryId: resolver.entry(held.kind, held.name).id })) } : {}),
    };
  });
  // A name the cast holds once is that member, of its own kind (a fact about the sword, not its spirit);
  // a name it holds as both, or not at all, is what the record knows by it, a character first.
  const castEntry = (name: string) => {
    const named = cast.filter(member => normalizeIdentityLabel(member.name) === normalizeIdentityLabel(name));
    return named.length === 1 ? named[0].entryId : undefined;
  };
  const known = (ref: PlanRef): PlanRef => {
    if (ref.unnamed) return { name: ref.name, unnamed: true };
    const entryId = castEntry(ref.name) ?? (resolver.existing(ref.name) ?? (resolver.declared(ref.name) ? resolver.character(ref.name) : undefined))?.id;
    return { name: ref.name, ...(entryId ? { entryId } : {}) };
  };
  return {
    ...structuredClone(plan),
    cast,
    events: plan.events.map(event => ({
      ...structuredClone(event),
      ...(event.actor ? { actor: known(event.actor) } : {}),
      targets: event.targets.map(known),
      presses: event.presses.map(pressure => ({ who: known(pressure.who), level: pressure.level })),
      facts: event.facts.map(fact => mapFactRefs(fact, (ref, role) => {
        if (role !== 'what' || fact.type !== 'holding') return known(ref);
        const kind = holdingTargetKind(HOLDING_VERB_OF_CHANGE[fact.change]);
        return kind ? { name: ref.name, entryId: resolver.entry(kind, ref.name).id } : ref;
      })),
    })),
  };
}

// ─── The checks ────────────────────────────────────────────────────────────

/** Holdings flags that mean a change did not take effect: its fact is dropped. The rest are kept and noted. */
const DROPPED_HOLDINGS: ReadonlySet<HoldingFlagKind> = new Set(['not-held', 'already-held', 'not-learned', 'already-learned', 'sealed-state']);

const subjectOf = (fact: PlanFact) => fact.who;
const capitalized = (words: string) => words.charAt(0).toUpperCase() + words.slice(1);
const describeRef = (ref: PlanRef) => (ref.unnamed ? ref.name : isMainCharacterTag(ref.name) ? 'the main character' : `‘${ref.name}’`);

export interface CheckedChapterPlan {
  /** The plan as the checks left it, with names as the planner wrote them (`MC` for the main character). */
  plan: ChapterPlan;
  checks: PlanCheck[];
}

/**
 * Checks a plan against the record, in event order, before the writer is
 * given it (SENSEI, 2026-10-20). The main character is `MC` everywhere and
 * always in the cast, and whoever an event names as acting, aimed at or
 * pressed joins it. A fact about someone neither the cast nor the record
 * knows is dropped; so is any fact that cannot be true where it stands: about
 * the dead or the destroyed (unless they are revived), a recovery, freeing
 * or repair of what is not wounded, held or damaged, and a holding change
 * the Holdings page's rules refuse (using or losing what is not held, gaining
 * again what is held, learning what is known). What is worth a second look
 * is noted and kept: a goal or commitment settled that the record never
 * opened, an actor the record shows dead, a count or level the record
 * disagrees with. A look for someone who has one, an arc goal reached past a
 * broken route or already reached, and a story ended outside Fate Survival
 * are set aside. In Fate Survival, a plan that leaves the main character dead
 * ends the story at that event, as the planner's rules say it does, and the
 * events after the one that ends the story are set aside: nothing happens in
 * a story after its end. The plan is never refused.
 */
export function checkChapterPlan({ plan: planned, storyId, entries, chapters, declared, mode, arc }: {
  plan: ChapterPlan;
  storyId: string;
  /** The story's Codex entries. */
  entries: readonly CodexEntry[];
  /** The story's committed chapters, before this one. */
  chapters: readonly RecordChapter[];
  declared: readonly DeclaredCharacter[];
  mode: HarnessStoryMode;
  /** The chapter's Active Arc Goal, with where the story stands on its route. */
  arc?: HarnessArcContext;
}): CheckedChapterPlan {
  const checks: PlanCheck[] = [];
  // A dry run of the commit's resolution: new entries get names only this check knows.
  let made = 0;
  const resolver = createCodexEntryResolver({
    storyId, chapter: { id: 'plan-check', chapterNumber: Number.MAX_SAFE_INTEGER }, entries, declared,
    createdAt: '', createId: () => `plan-check:${made += 1}`,
  });
  const mainKey = resolver.character(PLAN_MAIN_CHARACTER).id;
  const asMain = (ref: PlanRef): PlanRef => (!ref.unnamed && resolver.existing(ref.name)?.id === mainKey ? { ...ref, name: PLAN_MAIN_CHARACTER } : ref);

  // The main character is MC everywhere, a character, and always on the page. A thing keeps its own name,
  // so one named like the main character stays a thing. Anyone or anything else is one member per name
  // and kind, so a sword and its spirit stay two.
  const cast: PlanCastMember[] = [];
  for (const source of planned.cast.map((member): PlanCastMember => {
    const name = member.kind === 'thing' && !isMainCharacterTag(member.name) ? member.name : asMain({ name: member.name }).name;
    return { ...member, name, kind: name === PLAN_MAIN_CHARACTER ? 'character' : member.kind };
  })) {
    const same = cast.find(member => member.kind === source.kind && normalizeIdentityLabel(member.name) === normalizeIdentityLabel(source.name));
    if (!same) { cast.push(structuredClone(source)); continue; }
    // Named twice as the same kind: one member, the first word on each field kept.
    for (const [key, value] of Object.entries(source)) if (value !== undefined && same[key as keyof PlanCastMember] === undefined) Object.assign(same, { [key]: structuredClone(value) });
  }
  const mainIndex = cast.findIndex(member => member.name === PLAN_MAIN_CHARACTER);
  if (mainIndex < 0) cast.unshift({ name: PLAN_MAIN_CHARACTER, kind: 'character' });
  else if (mainIndex > 0) cast.unshift(...cast.splice(mainIndex, 1));
  cast[0].kind = 'character';

  const before = [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber);
  const draft: ChapterPlan = {
    ...structuredClone(planned),
    cast,
    events: planned.events.map(event => ({
      ...structuredClone(event),
      ...(event.actor ? { actor: asMain(event.actor) } : {}),
      targets: event.targets.map(asMain),
      presses: event.presses.map(pressure => ({ ...pressure, who: asMain(pressure.who) })),
      facts: event.facts.map(fact => mapFactRefs(fact, (ref, role) => (role === 'what' ? ref : asMain(ref)))),
    })),
  };

  // Whoever an event names as acting, aimed at or pressed is on the page, so in the cast: as the record
  // knows them, or as a character when nothing does and they act or are pressed. A target nothing knows
  // (a place, a skill) stays as the plan names it.
  const participants = resolveChapterPlan(draft, resolver);
  const onPage = new Set(participants.cast.flatMap(member => (member.entryId ? [member.entryId] : [])));
  const newcomers = new Set<string>();
  participants.events.forEach((event, eventIndex) => {
    const named = [...(event.actor ? [event.actor] : []), ...event.presses.map(pressure => pressure.who)].map(ref => ({ ref, person: true }))
      .concat(event.targets.map(ref => ({ ref, person: false })));
    for (const { ref, person } of named) {
      if (ref.unnamed || (ref.entryId && onPage.has(ref.entryId)) || newcomers.has(normalizeIdentityLabel(ref.name))) continue;
      const entry = ref.entryId ? [...entries, ...resolver.created].find(known => known.id === ref.entryId) : undefined;
      if (!entry && !person) continue;
      const member: PlanCastMember = entry ? { name: entry.name, kind: entry.kind === 'thing' ? 'thing' : 'character' } : { name: ref.name, kind: 'character' };
      draft.cast.push(member);
      if (entry) onPage.add(entry.id); else newcomers.add(normalizeIdentityLabel(ref.name));
      checks.push({ event: eventIndex + 1, message: entry
        ? `Event ${eventIndex + 1}: ${describeRef(member)} takes part but is not in the cast, so ${member.kind === 'thing' ? 'it was' : 'they were'} added to it.`
        : `Event ${eventIndex + 1}: ${describeRef(member)} takes part but is in neither the cast nor the Codex, so they were added to the cast as a character.` });
    }
  });

  // A look, only for someone the record has none for: a change to one is a look fact.
  const resolvedCast = resolveChapterPlan({ cast: draft.cast, events: [] }, resolver).cast;
  const tentative = new PlanRecordBuilder([...entries, ...resolver.created]);
  for (const chapter of before) tentative.addChapter(chapter);
  draft.cast.forEach((member, index) => {
    const entity = tentative.entity(resolvedCast[index]);
    if (member.look && entity?.look) {
      delete member.look;
      checks.push({ message: `${describeRef(member)} already has a look, so the plan's new one was set aside; a change to a look is a look fact.` });
    }
  });

  // What someone already had is only what the Codex does not list for them: anything it lists stays as the record has it.
  const heldBefore = new Map(deriveHoldings({ entries: [...entries, ...resolver.created], chapters: before }).characters.map(holder => [holder.entryId, holder]));
  draft.cast.forEach((member, index) => {
    const holder = heldBefore.get(resolvedCast[index].entryId ?? '');
    if (!holder || !member.alreadyHas) return;
    member.alreadyHas = member.alreadyHas.filter((held, heldIndex) => {
      const key = resolvedCast[index].alreadyHas?.[heldIndex]?.entryId;
      const listed = held.kind === 'ability' ? holder.abilities.some(ability => ability.entryId === key) : holder.things.some(thing => thing.entryId === key);
      if (listed) checks.push({ message: `${describeRef(member)} already ${held.kind === 'ability' ? 'knows' : 'has'} ‘${held.name}’, as the record shows, so it was not added again.` });
      return !listed;
    });
    if (!member.alreadyHas.length) delete member.alreadyHas;
  });

  // Facts about someone neither the cast nor the record knows.
  const resolvedEvents = resolveChapterPlan(draft, resolver).events;
  const isKnown = (ref: PlanRef) => ref.unnamed || Boolean(ref.entryId);
  draft.events.forEach((event, eventIndex) => {
    const resolved = resolvedEvents[eventIndex];
    event.facts = event.facts.filter((fact, factIndex) => {
      const target = resolved.facts[factIndex];
      const parties = [target.who, ...(target.type === 'commitment' ? [target.toWhom] : target.type === 'stance' ? [target.towardWhom] : [])];
      const unknown = parties.find(ref => !isKnown(ref));
      if (!unknown) return true;
      checks.push({ event: eventIndex + 1, fact, reason: `${capitalized(describeRef(unknown))} is not in the cast or the Codex.`, message: `Event ${eventIndex + 1}: ${describeRef(unknown)} is not in the cast or the Codex, so this fact was dropped.` });
      return false;
    });
  });

  // Each fact in event order, against the record as the facts before it left it.
  const chapter = { id: 'plan-check', chapterNumber: Number.MAX_SAFE_INTEGER };
  const resolved = resolveChapterPlan(draft, resolver);
  const builder = new PlanRecordBuilder([...entries, ...resolver.created]);
  for (const committed of before) builder.addChapter(committed);
  builder.addCast(chapter, resolved.cast);
  const revivedLater = (eventIndex: number, factIndex: number) => resolved.events.some((later, laterIndex) => laterIndex >= eventIndex
    && later.facts.some((fact, laterFact) => (laterIndex > eventIndex || laterFact > factIndex)
      && fact.type === 'status' && fact.state === 'revived' && fact.who.entryId === mainKey));
  draft.events.forEach((event, eventIndex) => {
    const number = eventIndex + 1;
    const facts = resolved.events[eventIndex].facts;
    const actor = builder.entity(resolved.events[eventIndex].actor);
    if (actor?.condition.end && !facts.some(fact => fact.type === 'status' && fact.state === 'revived' && fact.who.entryId === actor.key)) {
      checks.push({ event: number, message: `Event ${number}: ${actor.name} acts, but the record shows them ${actor.condition.end.state}.` });
    }
    const kept: PlanFact[] = [];
    event.facts.forEach((fact, factIndex) => {
      const target = facts[factIndex];
      const subject = builder.entity(subjectOf(target));
      const blocked = blockedFact(target, subject);
      if (blocked) { checks.push({ event: number, fact, reason: blocked, message: `Event ${number}: ${blocked} The fact was dropped.` }); return; }
      // Outside Fate Survival the story never fails its fate: the main character dies only to come back in this chapter.
      if (mode !== 'survival' && target.type === 'status' && (target.state === 'dead' || target.state === 'destroyed') && target.who.entryId === mainKey && !revivedLater(eventIndex, factIndex)) {
        const reason = 'The main character cannot die outside Fate Survival unless this chapter brings them back.';
        checks.push({ event: number, fact, reason, message: `Event ${number}: ${reason} The fact was dropped.` });
        return;
      }
      if (subject && target.type === 'goal' && target.change !== 'set' && !openGoal(subject, target.what)) {
        checks.push({ event: number, message: `Event ${number}: ${subject.name}'s goal ‘${target.what}’ is ${target.change}, but the record does not show it as their goal.` });
      }
      if (subject && target.type === 'commitment' && target.change !== 'entered' && !openCommitment(subject, target.toWhom.entryId ?? '', target.what)) {
        checks.push({ event: number, message: `Event ${number}: ${subject.name}'s commitment to ${target.toWhom.name}, ‘${target.what}’, is ${target.change}, but the record does not show it open.` });
      }
      builder.applyFact(chapter, number, event.how, target);
      kept.push(fact);
    });
    event.facts = kept;
  });

  // Holdings, by the Holdings page's own rules, over what is left.
  const holdingsChapter = { id: chapter.id, chapterNumber: chapter.chapterNumber, plan: resolveChapterPlan(draft, resolver) };
  const flags = deriveHoldings({ entries: [...entries, ...resolver.created], chapters: [...before, holdingsChapter] }).flags
    .filter(flag => flag.chapterId === chapter.id);
  const dropped = new Map<number, Set<number>>();
  for (const flag of flags) {
    const message = flag.message.replace(/^Chapter \d+: /, '');
    if (flag.event !== undefined && flag.fact !== undefined && DROPPED_HOLDINGS.has(flag.kind)) {
      const fact = draft.events[flag.event - 1].facts[flag.fact];
      checks.push({ event: flag.event, fact, reason: `${message.replace(/\.$/, '')}.`, message: `Event ${flag.event}: ${message.replace(/\.$/, '')}, so the fact was dropped.` });
      dropped.set(flag.event, (dropped.get(flag.event) ?? new Set()).add(flag.fact));
    } else checks.push({ ...(flag.event ? { event: flag.event } : {}), message: flag.event ? `Event ${flag.event}: ${message}` : message });
  }
  draft.events.forEach((event, index) => {
    const gone = dropped.get(index + 1);
    if (gone) event.facts = event.facts.filter((_, factIndex) => !gone.has(factIndex));
  });

  // The arc goal and the end, where they can stand.
  if (draft.arcGoalReached) {
    const reason = arc?.route?.status === 'broken' ? 'the route to the Destined Ending is broken, so no goal is left to reach'
      : arc?.completionConfirmed ? 'the Active Arc Goal was already reached' : !arc ? 'the chapter has no Active Arc Goal' : undefined;
    if (reason) { checks.push({ message: `The plan says event ${draft.arcGoalReached.event} reaches the Active Arc Goal, but ${reason}; it was set aside.` }); delete draft.arcGoalReached; }
  }
  if (draft.storyEnds && mode !== 'survival') {
    checks.push({ message: `The plan says event ${draft.storyEnds.event} ends the story, but only Fate Survival can end in failure; it was set aside.` });
    delete draft.storyEnds;
  }
  // In Fate Survival the main character's death ends the story (the planner's own rule): a plan that leaves
  // them dead without saying so ends at the event that killed them, so no chapter is written after it.
  if (mode === 'survival' && !draft.storyEnds) {
    const end = builder.entity({ name: PLAN_MAIN_CHARACTER, entryId: mainKey })?.condition.end;
    if (end?.passage.chapterId === chapter.id && end.passage.event) {
      draft.storyEnds = { event: end.passage.event };
      checks.push({ event: end.passage.event, message: `Event ${end.passage.event}: the main character is ${end.state}, which ends a Fate Survival story, but the plan did not say so; the story ends there.` });
    }
  }
  // The story ends at that event: nothing after it happens (no revival undoes the ending), so later events are set aside.
  const ending = draft.storyEnds?.event;
  if (ending !== undefined && ending < draft.events.length) {
    const after = draft.events.length - ending;
    draft.events = draft.events.slice(0, ending);
    checks.push({ message: `The story ends in event ${ending}, so the ${after === 1 ? 'event' : `${after} events`} after it ${after === 1 ? 'was' : 'were'} set aside.` });
    if (draft.arcGoalReached && draft.arcGoalReached.event > ending) {
      checks.push({ message: `The plan says event ${draft.arcGoalReached.event} reaches the Active Arc Goal, but the story ends before it; it was set aside.` });
      delete draft.arcGoalReached;
    }
  }
  return { plan: draft, checks };
}

// ─── The writer's view ─────────────────────────────────────────────────────

/**
 * The Chapter Plan as the writer reads it: each cast member as the Codex had
 * them when the chapter began (their look, state and holdings), someone on
 * the page for the first time in full, with what the plan gives them and what
 * they already had, then the plan's events.
 */
export function writerChapterPlan(plan: ChapterPlan, codex: CodexSection, checks: readonly PlanCheck[] = []): WriterChapterPlan {
  const lineOf = (member: PlanCastMember): CodexSectionEntry | undefined => member.name === PLAN_MAIN_CHARACTER
    ? codex.entries.find(entry => entry.mainCharacter)
    : codex.entries.find(entry => !entry.mainCharacter && entry.kind === member.kind && normalizeIdentityLabel(entry.name) === normalizeIdentityLabel(member.name));
  const cast = plan.cast.map((member): ChapterPlanCastEntry => {
    const line = lineOf(member);
    const known = line && !line.fromStorySeed;
    const things = (member.alreadyHas ?? []).filter(held => held.kind === 'thing').map(held => `${held.name}${held.count && held.count > 1 ? ` ×${held.count}` : ''}`);
    const abilities = (member.alreadyHas ?? []).filter(held => held.kind === 'ability').map(held => `${held.name}${held.level ? ` (${held.level})` : ''}`);
    const base: CodexSectionEntry = line ?? { name: member.name, kind: member.kind };
    const { fromStorySeed: _seed, notes: _notes, lastOnPage: _last, goals: _goals, values: _values, owes: _owes, owedBy: _owedBy, stances: _stances, ...record } = base;
    const entry: ChapterPlanCastEntry = {
      ...record,
      name: line?.name ?? member.name,
      kind: line?.kind ?? member.kind,
      ...(member.name === PLAN_MAIN_CHARACTER ? { mainCharacter: true as const } : {}),
      ...(known ? {} : { new: true as const }),
      ...(!record.who && member.who ? { who: member.who } : {}),
      ...(!record.gender && member.gender ? { gender: member.gender } : {}),
      ...(!record.age && member.age ? { age: member.age } : {}),
      ...(!record.look && member.look ? { look: member.look } : {}),
    };
    if (things.length) entry.carries = [...entry.carries ?? [], ...things];
    if (abilities.length) entry.knows = [...entry.knows ?? [], ...abilities];
    return entry;
  });
  // What the checks dropped from an event, with why, so the writer leaves it out even where How tells it.
  const events = structuredClone(plan.events).map((event, index): WriterPlanEvent => {
    const cannotHappen = checks.filter(found => found.event === index + 1 && found.fact && found.reason).map(found => found.reason!);
    return cannotHappen.length ? { ...event, cannotHappen } : event;
  });
  return { cast, events };
}
