import type { CodexEntry, CodexEntryKind, HoldingFlagKind, HoldingVerb } from '../../../narrative/holdings';
import type { ChapterPlan, PlanHoldingChange, PlanRef } from '../../../narrative/chapterPlan';
import type { CurrentStoryProjection } from '../../../narrative/generation';
import { normalizeIdentityLabel } from './canonicalProjection';
import { isMainCharacterTag } from './speakers';

export type { HoldingFlagKind } from '../../../narrative/holdings';

/**
 * Holdings in the HARNESS: each chapter's plan says what changes (a holding
 * fact of one of its events, or what someone new already had), its names
 * resolve to Codex entries when the chapter commits, and what every character
 * has now is worked out again, in story order, from every chapter's plan.
 * Plain rules, never a model, check each change against what came before; a
 * change that cannot be true is flagged and left out, never a reason to
 * refuse a chapter.
 */

const THING_VERBS: ReadonlySet<HoldingVerb> = new Set(['has', 'gained', 'lost', 'equipped', 'unequipped']);
const ABILITY_VERBS: ReadonlySet<HoldingVerb> = new Set(['knows', 'learning', 'learned', 'improved', 'sealed', 'unsealed']);

/** The kind of entry a verb names. Rank names none. */
export const holdingTargetKind = (verb: HoldingVerb): Exclude<CodexEntryKind, 'character'> | undefined =>
  THING_VERBS.has(verb) ? 'thing' : ABILITY_VERBS.has(verb) ? 'ability' : undefined;

/** How the record keeps each of a plan's holding changes. */
export const HOLDING_VERB_OF_CHANGE: Readonly<Record<PlanHoldingChange, HoldingVerb>> = {
  gains: 'gained', loses: 'lost', equips: 'equipped', unequips: 'unequipped', learning: 'learning',
  learns: 'learned', improves: 'improved', seals: 'sealed', unseals: 'unsealed', rank: 'rank',
};

// ─── Codex entries ──────────────────────────────────────────────────────────

/** A character the frozen Story Information declares, with the names they answer to. */
export interface DeclaredCharacter {
  name: string;
  aliases?: readonly string[];
  mainCharacter?: boolean;
  /** The author's notes on them, from the Story Seed. */
  notes?: string;
}

/**
 * The characters a chapter's frozen Story Information declares: the cast, with
 * the aliases and notes their declared identities carry. The cast's main
 * character is the one `MC` names.
 */
export function declaredCharacters(story: Pick<CurrentStoryProjection, 'cast' | 'identities'>): DeclaredCharacter[] {
  const declared: DeclaredCharacter[] = [];
  const find = (name: string) => declared.find(character => normalizeIdentityLabel(character.name) === normalizeIdentityLabel(name));
  for (const member of story.cast ?? []) {
    const existing = find(member.name);
    if (existing) { if (member.isMainCharacter) existing.mainCharacter = true; continue; }
    declared.push({ name: member.name, ...(member.isMainCharacter ? { mainCharacter: true } : {}) });
  }
  for (const identity of (story.identities ?? []).filter(candidate => candidate.kind === 'character')) {
    const existing = find(identity.name);
    const aliases = identity.aliases?.filter(alias => alias.trim()) ?? [];
    const notes = identity.evidence?.trim();
    if (existing) {
      existing.aliases = [...new Set([...(existing.aliases ?? []), ...aliases])];
      if (notes && !existing.notes) existing.notes = notes;
    } else declared.push({ name: identity.name, ...(aliases.length ? { aliases } : {}), ...(notes ? { notes } : {}) });
  }
  return declared;
}

/** Who `MC` is when the Story Information names no main character. */
export const UNNAMED_MAIN_CHARACTER = 'Main character';

const namesOf = (entry: Pick<CodexEntry, 'name' | 'aliases'>) => [entry.name, ...(entry.aliases ?? [])];
const answersTo = (names: readonly string[], name: string) => {
  const key = normalizeIdentityLabel(name);
  return Boolean(key) && names.some(candidate => normalizeIdentityLabel(candidate) === key);
};

/**
 * Finds or makes the Codex entry a plan names, for one chapter's commit: an
 * existing entry by its exact name or an alias, a character the Story
 * Information declares, or a new entry with an app-made ID. `MC`, or any name
 * the main character answers to, is the main character. Every name a chapter's
 * plan uses resolves through one resolver, so a new name named twice in one
 * chapter becomes one entry.
 */
export interface CodexEntryResolver {
  /** The character a name names, made when it is new. */
  character(name: string): CodexEntry;
  /** The thing or ability a name names, made when it is new. */
  entry(kind: Exclude<CodexEntryKind, 'character'>, name: string): CodexEntry;
  /** The entry a name already names, a character before a thing; never made. */
  existing(name: string): CodexEntry | undefined;
  /** Whether a name is the main character's, or a character the Story Information declares. */
  declared(name: string): boolean;
  /** New entries, in the order the chapter first named them. */
  readonly created: CodexEntry[];
}

export function createCodexEntryResolver({ storyId, chapter, entries, declared, createdAt, createId }: {
  storyId: string;
  chapter: { id: string; chapterNumber: number };
  /** This story's existing entries. */
  entries: readonly CodexEntry[];
  declared: readonly DeclaredCharacter[];
  createdAt: string;
  createId: () => string;
}): CodexEntryResolver {
  const known = entries.filter(entry => entry.storyId === storyId);
  const created: CodexEntry[] = [];
  const all = () => [...known, ...created];
  const make = (kind: CodexEntryKind, name: string, extra: Partial<Pick<CodexEntry, 'aliases' | 'mainCharacter' | 'origin'>> = {}): CodexEntry => {
    const entry: CodexEntry = {
      id: createId(), storyId, kind, name: name.trim(),
      ...(extra.aliases?.length ? { aliases: [...extra.aliases] } : {}),
      ...(extra.mainCharacter ? { mainCharacter: true as const } : {}),
      origin: extra.origin ?? { source: 'plan', chapterId: chapter.id, chapterNumber: chapter.chapterNumber },
      createdAt,
    };
    created.push(entry);
    return entry;
  };
  const main = declared.find(character => character.mainCharacter);
  const mainNames = main ? [main.name, ...(main.aliases ?? [])] : [];
  const namesMain = (name: string) => isMainCharacterTag(name) || answersTo(mainNames, name);
  const existingMain = () => all().find(entry => entry.kind === 'character' && entry.mainCharacter);
  const mainCharacter = () => existingMain()
    ?? make('character', main?.name ?? UNNAMED_MAIN_CHARACTER, { aliases: main?.aliases ? [...main.aliases] : undefined, mainCharacter: true, origin: { source: 'foundation' } });
  const existingOfKind = (kind: CodexEntryKind, name: string) => all().find(entry => entry.kind === kind && answersTo(namesOf(entry), name));
  const declaredOne = (name: string) => declared.find(candidate => !candidate.mainCharacter && answersTo([candidate.name, ...(candidate.aliases ?? [])], name));
  return {
    character(name) {
      if (namesMain(name)) return mainCharacter();
      const existing = existingOfKind('character', name);
      if (existing) return existing;
      const story = declaredOne(name);
      return story
        ? make('character', story.name, { aliases: story.aliases ? [...story.aliases] : undefined, origin: { source: 'foundation' } })
        : make('character', name);
    },
    entry: (kind, name) => existingOfKind(kind, name) ?? make(kind, name),
    existing: name => (namesMain(name) ? existingMain() : undefined) ?? existingOfKind('character', name) ?? existingOfKind('thing', name),
    declared: name => namesMain(name) || Boolean(declaredOne(name)),
    created,
  };
}

// ─── Working out what everyone holds ───────────────────────────────────────

/** Where a change happened: its chapter, and its event when it has one. */
export interface HoldingPassage {
  chapterId: string;
  chapterNumber: number;
  recordId: string;
  /** The event of the chapter's plan, from 1; absent for what someone already had when the chapter began. */
  event?: number;
  /** How it happens, as the plan tells it. */
  text: string;
}

/** One change that took effect, in story order. */
export interface HoldingEvent {
  verb: HoldingVerb;
  target?: string;
  /** The thing or ability it names, by the key the record holds it under (its Codex entry's ID once resolved). */
  targetId?: string;
  count?: number;
  level?: string;
  passage: HoldingPassage;
}

export interface HeldThing {
  entryId: string;
  name: string;
  count: number;
  /** In use: in hand, worn, active. */
  equipped: boolean;
  events: HoldingEvent[];
}

export interface KnownAbility {
  entryId: string;
  name: string;
  stage: 'learning' | 'learned';
  level?: string;
  sealed: boolean;
  /** Learned and not sealed. */
  usable: boolean;
  events: HoldingEvent[];
}

export interface CharacterHoldings {
  entryId: string;
  name: string;
  mainCharacter: boolean;
  rank?: { text: string; events: HoldingEvent[] };
  /** In the order they were first held. */
  things: HeldThing[];
  abilities: KnownAbility[];
  /** Every change that took effect for this character, in story order. */
  history: HoldingEvent[];
}

export interface HoldingFlag {
  kind: HoldingFlagKind;
  /** Plain words, for the people checking the story. */
  message: string;
  chapterId?: string;
  chapterNumber?: number;
  recordId?: string;
  /** The event of the chapter's plan it is about, from 1. */
  event?: number;
  /** The fact of that event it is about, from 0. */
  fact?: number;
  entryIds?: string[];
}

export interface HoldingsState {
  characters: CharacterHoldings[];
  flags: HoldingFlag[];
}

/** What a chapter carries for holdings: its plan. */
export interface HoldingsChapter {
  id: string;
  chapterNumber: number;
  plan: Pick<ChapterPlan, 'cast' | 'events'>;
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of']);
const nameTokens = (name: string) => normalizeIdentityLabel(name).split(' ').filter(token => token && !STOP_WORDS.has(token));
/** Two words match exactly, or as forms of one word ("rusty" and "rusted", "step" and "steps"). */
const tokensMatch = (left: string, right: string) => {
  if (left === right) return true;
  if (Math.min(left.length, right.length) < 4 || Math.abs(left.length - right.length) > 3) return false;
  let prefix = 0;
  while (prefix < left.length && left[prefix] === right[prefix]) prefix += 1;
  return prefix >= 4;
};

/** Whether two names likely mean one entry: every word of the shorter matches a word of the longer. */
export const namesNearlyMatch = (left: string, right: string) => {
  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  if (!leftTokens.length || !rightTokens.length) return false;
  const [short, long] = leftTokens.length <= rightTokens.length ? [leftTokens, rightTokens] : [rightTokens, leftTokens];
  return short.every(token => long.some(other => tokensMatch(token, other)));
};

/** A holding change's id: its chapter, its event and its place among the event's facts. */
export const holdingRecordId = (chapterNumber: number, event: number, fact: number) => `holding:c${chapterNumber}-e${event}-f${fact}`;
/** What a cast member already had: its chapter, its place in the cast and among what they had. */
const alreadyHadRecordId = (chapterNumber: number, member: number, held: number) => `holding:c${chapterNumber}-cast${member}-h${held}`;

/** One change, in the order the chapter makes them: what the cast already had first, then each event's facts. */
interface PlannedChange {
  verb: HoldingVerb;
  holder: PlanRef;
  target?: PlanRef;
  count?: number;
  level?: string;
  recordId: string;
  event?: number;
  fact?: number;
  text: string;
}

const plannedChanges = (chapter: HoldingsChapter): PlannedChange[] => [
  ...chapter.plan.cast.flatMap((member, memberIndex) => (member.alreadyHas ?? []).map((held, heldIndex): PlannedChange => ({
    verb: held.kind === 'ability' ? 'knows' : 'has',
    holder: { name: member.name, ...(member.entryId ? { entryId: member.entryId } : {}) },
    target: { name: held.name, ...(held.entryId ? { entryId: held.entryId } : {}) },
    ...(held.count ? { count: held.count } : {}),
    ...(held.level ? { level: held.level } : {}),
    recordId: alreadyHadRecordId(chapter.chapterNumber, memberIndex + 1, heldIndex + 1),
    text: `Already theirs when Chapter ${chapter.chapterNumber} began.`,
  }))),
  ...chapter.plan.events.flatMap((event, eventIndex) => event.facts.flatMap((fact, factIndex): PlannedChange[] => {
    if (fact.type !== 'holding' || fact.who.unnamed) return [];
    const verb = HOLDING_VERB_OF_CHANGE[fact.change];
    const rank = verb === 'rank';
    return [{
      verb, holder: fact.who,
      ...(rank ? { level: fact.what.name || fact.level } : { target: fact.what, ...(fact.level ? { level: fact.level } : {}) }),
      ...(fact.count ? { count: fact.count } : {}),
      recordId: holdingRecordId(chapter.chapterNumber, eventIndex + 1, factIndex),
      event: eventIndex + 1, fact: factIndex,
      text: event.how,
    }];
  })),
];

/**
 * Works out what every character holds now: each committed chapter in order,
 * what its cast already had, then each event's changes in order, every change
 * checked against what came before it. A change that cannot be true is
 * flagged and left out. Nothing here is stored, so it always reflects each
 * chapter's current plan.
 */
export function deriveHoldings({ entries, chapters }: {
  entries: readonly CodexEntry[];
  chapters: readonly HoldingsChapter[];
}): HoldingsState {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  type CharacterState = Omit<CharacterHoldings, 'things' | 'abilities'> & {
    things: Map<string, HeldThing>;
    abilities: Map<string, KnownAbility>;
    lastChange: number;
  };
  const characters = new Map<string, CharacterState>();
  const flags: HoldingFlag[] = [];
  let sequence = 0;

  const keyOf = (ref: PlanRef, kind: CodexEntryKind) => ref.entryId ?? `${kind}:${isMainCharacterTag(ref.name) && kind === 'character' ? 'mc' : normalizeIdentityLabel(ref.name)}`;
  const nameOf = (ref: PlanRef) => (ref.entryId ? byId.get(ref.entryId)?.name : undefined) ?? ref.name;
  const characterOf = (ref: PlanRef): CharacterState => {
    const key = keyOf(ref, 'character');
    let state = characters.get(key);
    if (!state) {
      const mainCharacter = ref.entryId ? Boolean(byId.get(ref.entryId)?.mainCharacter) : isMainCharacterTag(ref.name);
      state = { entryId: key, name: nameOf(ref), mainCharacter, things: new Map(), abilities: new Map(), history: [], lastChange: 0 };
      characters.set(key, state);
    }
    return state;
  };

  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    for (const change of plannedChanges(chapter)) {
      const holder = characterOf(change.holder);
      const passage: HoldingPassage = {
        chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: change.recordId,
        ...(change.event ? { event: change.event } : {}), text: change.text,
      };
      const targetName = change.target ? nameOf(change.target) : undefined;
      const targetKind = holdingTargetKind(change.verb);
      const event: HoldingEvent = {
        verb: change.verb, passage,
        ...(targetName ? { target: targetName } : {}),
        ...(change.target && targetKind ? { targetId: keyOf(change.target, targetKind) } : {}),
        ...(change.count ? { count: change.count } : {}),
        ...(change.level ? { level: change.level } : {}),
      };
      const flag = (kind: HoldingFlagKind, message: string) => flags.push({
        kind, message: `Chapter ${chapter.chapterNumber}: ${message}`, chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: change.recordId,
        ...(change.event ? { event: change.event } : {}), ...(change.fact !== undefined ? { fact: change.fact } : {}),
        entryIds: [holder.entryId, ...(change.target?.entryId ? [change.target.entryId] : [])],
      });
      const took = () => { holder.history.push(event); holder.lastChange = ++sequence; };
      const quoted = `‘${targetName}’`;

      if (change.verb === 'rank') {
        if (!change.level) continue;
        holder.rank = { text: change.level, events: [...(holder.rank?.events ?? []), event] };
        took();
        continue;
      }
      if (!change.target || !targetKind) continue;
      const key = keyOf(change.target, targetKind);

      if (targetKind === 'thing') {
        const thing = holder.things.get(key);
        switch (change.verb) {
          case 'has':
            if (!thing) { holder.things.set(key, { entryId: key, name: targetName!, count: change.count ?? 1, equipped: false, events: [event] }); took(); }
            else if (change.count && change.count !== thing.count) flag('count-mismatch', `the plan says ${holder.name} already had ${change.count} ${quoted}; the record says ${thing.count}. The record keeps ${thing.count}.`);
            break;
          case 'gained':
            if (!thing) { holder.things.set(key, { entryId: key, name: targetName!, count: change.count ?? 1, equipped: false, events: [event] }); took(); }
            else if (change.count) { thing.count += change.count; thing.events.push(event); took(); }
            else flag('already-held', `${holder.name} gains ${quoted} again, but already holds it. It is not counted twice.`);
            break;
          case 'lost':
            if (!thing) { flag('not-held', `${holder.name} loses ${quoted}, which the record does not show them holding.`); break; }
            if (change.count && change.count < thing.count) { thing.count -= change.count; thing.events.push(event); took(); break; }
            if (change.count && change.count > thing.count) flag('count-mismatch', `${holder.name} loses ${change.count} ${quoted} but the record shows ${thing.count}. All of them are gone.`);
            holder.things.delete(key);
            took();
            break;
          case 'equipped':
          case 'unequipped':
            if (!thing) { flag('not-held', `${holder.name} ${change.verb === 'equipped' ? 'takes up' : 'puts away'} ${quoted}, which the record does not show them holding.`); break; }
            if (thing.equipped !== (change.verb === 'equipped')) { thing.equipped = change.verb === 'equipped'; thing.events.push(event); took(); }
            break;
        }
        continue;
      }

      const ability = holder.abilities.get(key);
      switch (change.verb) {
        case 'knows':
          if (!ability || ability.stage === 'learning') {
            holder.abilities.set(key, { entryId: key, name: targetName!, stage: 'learned', ...(change.level ? { level: change.level } : ability?.level ? { level: ability.level } : {}), sealed: false, usable: true, events: [...(ability?.events ?? []), event] });
            took();
          } else if (change.level && !ability.level) {
            ability.level = change.level; ability.events.push(event); took();
          } else if (change.level && ability.level && normalizeIdentityLabel(change.level) !== normalizeIdentityLabel(ability.level)) {
            flag('level-differs', `the plan gives ${holder.name}'s ${quoted} as ${change.level}; the record says ${ability.level}. The record keeps ${ability.level}.`);
          }
          break;
        case 'learning':
          if (!ability) { holder.abilities.set(key, { entryId: key, name: targetName!, stage: 'learning', sealed: false, usable: false, events: [event] }); took(); }
          else if (ability.stage === 'learned') flag('already-learned', `${holder.name} starts learning ${quoted}, which they already know.`);
          break;
        case 'learned':
          if (!ability || ability.stage === 'learning') {
            holder.abilities.set(key, { entryId: key, name: targetName!, stage: 'learned', ...(change.level ? { level: change.level } : ability?.level ? { level: ability.level } : {}), sealed: false, usable: true, events: [...(ability?.events ?? []), event] });
            took();
          } else flag('already-learned', `${holder.name} learns ${quoted}, which they already know.`);
          break;
        case 'improved':
          // Moving up a stage while still learning is progress, as cultivation stories tell it: the stage is
          // recorded and the ability stays learning until it is learned.
          if (!ability) flag('not-learned', `${holder.name} improves ${quoted} before learning it.`);
          else if (ability.sealed) flag('sealed-state', `${holder.name} improves ${quoted} while it is sealed.`);
          else { if (change.level) ability.level = change.level; ability.events.push(event); took(); }
          break;
        case 'sealed':
          if (!ability || ability.stage === 'learning') flag('not-learned', `${holder.name}'s ${quoted} is sealed before they learned it.`);
          else if (!ability.sealed) { ability.sealed = true; ability.usable = false; ability.events.push(event); took(); }
          break;
        case 'unsealed':
          if (!ability?.sealed) flag('sealed-state', `${holder.name}'s ${quoted} is unsealed, but the record does not show it sealed.`);
          else { ability.sealed = false; ability.usable = true; ability.events.push(event); took(); }
          break;
      }
    }
  }

  // Names close enough to be one entry, where a plan made at least one of them.
  const planned = entries.filter(entry => entry.kind !== 'character' && entry.origin.source === 'plan');
  for (const [index, left] of planned.entries()) {
    for (const right of planned.slice(index + 1)) {
      if (left.kind === right.kind && namesNearlyMatch(left.name, right.name)) {
        flags.push({ kind: 'possible-duplicate', entryIds: [left.id, right.id], message: `‘${left.name}’ and ‘${right.name}’ may be the same ${left.kind}.` });
      }
    }
  }

  const ordered = [...characters.values()].sort((left, right) => Number(right.mainCharacter) - Number(left.mainCharacter) || right.lastChange - left.lastChange);
  return {
    characters: ordered.map(character => ({
      entryId: character.entryId,
      name: character.name,
      mainCharacter: character.mainCharacter,
      ...(character.rank ? { rank: character.rank } : {}),
      things: [...character.things.values()],
      abilities: [...character.abilities.values()],
      history: character.history,
    })),
    flags,
  };
}

/** A thing's label in a list: its name, with its count when more than one. */
export const thingLabel = (thing: HeldThing) => `${thing.name}${thing.count > 1 ? ` ×${thing.count}` : ''}`;
/** An ability's label in a list: its name, with its level and whether it is sealed. */
export const abilityLabel = (ability: KnownAbility) => {
  const notes = [ability.level, ability.sealed ? 'sealed' : undefined].filter(Boolean);
  return `${ability.name}${notes.length ? ` (${notes.join('; ')})` : ''}`;
};
