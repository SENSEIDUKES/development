import { splitSentences } from '../../highlight-engine/shared/manuscript';
import {
  CHARACTER_STATES,
  STATUS_CHANGE_KIND,
  THING_STATES,
  statusChangeId,
  type LastingState,
  type StatusChangeAttachment,
  type StatusChangePayload,
  type StatusFlagKind,
  type StatusSection,
  type StatusSectionEntry,
  type StatusState,
} from '../../../narrative/status';
import { APPEARANCE_KIND, type AppearanceAttachment } from '../../../narrative/appearances';
import type { CodexEntry, HoldingChangeAttachment } from '../../../narrative/holdings';
import { isStatusTagWord, type WordTag } from '../../../narrative/marks';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { normalizeIdentityLabel } from './canonicalProjection';
import { factionNamed, type DeclaredFaction } from './factions';
import { holdingName, pointedSentence, type CodexEntryResolver, type HoldingPassage } from './holdings';
import { isMainCharacterTag } from './speakers';

/**
 * Status in the HARNESS: the writer's status tags read into status changes on
 * the sentences they point at, resolved to Codex entries when their chapter
 * commits, and worked out again, in story order, into how everyone and
 * everything now is. Plain rules, never a model, check each change against
 * what came before (a dead character who speaks, a thing destroyed twice); a
 * change that cannot be true is flagged and left out, never a reason to
 * refuse a chapter.
 */

// ─── Reading tags ───────────────────────────────────────────────────────────

/** The words a status tag's second part may use for each state, letter case aside. */
const STATE_WORDS: Readonly<Record<StatusState, readonly string[]>> = {
  wounded: ['wounded', 'injured', 'hurt', 'poisoned', 'crippled', 'bleeding', 'gravely wounded', 'badly hurt'],
  recovered: ['recovered', 'healed', 'cured', 'recovers', 'heals', 'well again'],
  dead: ['dead', 'died', 'dies', 'killed', 'slain', 'deceased', 'perished'],
  revived: ['revived', 'resurrected', 'brought back', 'alive again', 'returned to life'],
  sealed: ['sealed', 'sealed away', 'bound'],
  captured: ['captured', 'imprisoned', 'taken prisoner', 'caught', 'abducted', 'kidnapped'],
  freed: ['freed', 'released', 'unsealed', 'rescued', 'escaped', 'free'],
  transformed: ['transformed', 'mutated', 'evolved'],
  damaged: ['damaged', 'cracked', 'chipped', 'broken', 'dented', 'dulled'],
  repaired: ['repaired', 'restored', 'mended', 'reforged', 'fixed'],
  destroyed: ['destroyed', 'shattered', 'ruined', 'obliterated', 'smashed'],
};
const STATE_SPELLINGS = new Map(Object.entries(STATE_WORDS).flatMap(([state, words]) => words.map(word => [word, state as StatusState])));
const stateOf = (written: string | undefined) => STATE_SPELLINGS.get(written?.trim().toLowerCase().replace(/[\s-]+/g, ' ') ?? '');

/** More words than any "how" a status tag should carry. */
const DETAIL_WORD_LIMIT = 16;

export type ReadStatusTag =
  | { ok: true; change: Omit<StatusChangePayload, 'origin'> }
  | { ok: false; problem: string };

/**
 * One word tag read as a status change: who or what, its new state from the
 * record's short list, and, when given, a few words on how. A name keeps no
 * description inside it.
 */
export function readStatusTag(tag: WordTag): ReadStatusTag {
  if (!isStatusTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not a status change` };
  const [written, second, ...rest] = tag.parts;
  const named = holdingName(written);
  if ('note' in named) return { ok: false, problem: `‘${named.note}’ is a note about the story, not a name, so its status tag was set aside` };
  const state = stateOf(second);
  if (!state) return { ok: false, problem: `a status tag for ${named.name} named ‘${second}’, which is not a state the record keeps` };
  const detail = rest.join('; ').trim();
  if (detail.split(/\s+/).length > DETAIL_WORD_LIMIT) return { ok: false, problem: `a status tag for ${named.name} described more than how, so it was set aside` };
  return { ok: true, change: { subject: { name: named.name }, state, ...(detail ? { detail } : {}) } };
}

export interface StatusPlacement {
  /** Each status change on its sentence. Names are as the writer wrote them; entries are resolved when the chapter commits. */
  changes: StatusChangeAttachment[];
  /** Plain reasons for every tag that could not become a status change. */
  problems: string[];
}

/** Places one status change for every readable status tag, on the sentence it points at. */
export function placeStatusChanges({ paragraphs, locale }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; wordTags: readonly WordTag[] }>;
  locale?: string;
}): StatusPlacement {
  const changes: StatusChangeAttachment[] = [];
  const problems: string[] = [];
  for (const { blockId, text, wordTags } of paragraphs) {
    const tags = wordTags.filter(tag => isStatusTagWord(tag.word));
    if (!tags.length) continue;
    const sentences = splitSentences(text, locale);
    for (const tag of tags) {
      const read = readStatusTag(tag);
      if (!read.ok) { problems.push(read.problem); continue; }
      const sentence = pointedSentence(sentences, tag.offset);
      if (!sentence) { problems.push(`a status tag for ${tag.parts[0]} pointed at no sentence`); continue; }
      changes.push({
        id: statusChangeId(blockId, sentence.start, sentence.end, changes.length),
        kind: STATUS_CHANGE_KIND,
        anchor: { level: 'span', blockId, startOffset: sentence.start, endOffset: sentence.end, selectedText: text.slice(sentence.start, sentence.end) },
        payload: { origin: 'harness', ...read.change },
      });
    }
  }
  return { changes, problems };
}

// ─── Codex entries ──────────────────────────────────────────────────────────

const CHARACTER_ONLY: ReadonlySet<StatusState> = new Set(CHARACTER_STATES.filter(state => !(THING_STATES as readonly string[]).includes(state)));
const THING_ONLY: ReadonlySet<StatusState> = new Set(THING_STATES.filter(state => !(CHARACTER_STATES as readonly string[]).includes(state)));

/**
 * Resolves every name in a chapter's status changes to a Codex entry when it
 * commits, through the chapter's shared resolver: an entry the record already
 * has (a character before a thing), else a new character, or a new thing for a
 * state only a thing can be in. A faction is left unresolved; the rules flag
 * it, since factions get their status with their own tag.
 */
export function resolveStatusChanges({ changes, resolver, declaredFactions = [] }: {
  changes: readonly StatusChangeAttachment[];
  resolver: CodexEntryResolver;
  declaredFactions?: readonly DeclaredFaction[];
}): StatusChangeAttachment[] {
  return changes.map(change => {
    const { subject, state } = change.payload;
    if (!isMainCharacterTag(subject.name) && factionNamed(subject.name, declaredFactions)) return change;
    const entry = resolver.existing(subject.name)
      ?? (THING_ONLY.has(state) ? resolver.entry('thing', subject.name) : resolver.character(subject.name));
    return {
      ...change,
      payload: { ...change.payload, subject: { name: subject.name, entryId: entry.id }, entity: entry.kind === 'thing' ? 'thing' : 'character' },
    };
  });
}

// ─── Working out how everyone is ────────────────────────────────────────────

/** Where a status change happened: its chapter and the sentence it points at. */
export type StatusPassage = HoldingPassage;

/** One status change the rules accepted, in story order. */
export interface StatusEvent {
  state: StatusState;
  detail?: string;
  passage: StatusPassage;
}

/** A lasting state someone or something is in now, since the change that began it. */
export interface StatusCondition {
  state: LastingState;
  detail?: string;
  passage: StatusPassage;
}

/** One character or thing whose status the record has seen change. */
export interface StatusSubject {
  /** Its Codex entry's ID. */
  key: string;
  name: string;
  entity: 'character' | 'thing';
  mainCharacter: boolean;
  /** Every lasting state it is in now, in the order each began. Empty when it is well and whole again. */
  conditions: StatusCondition[];
  /** Every change the rules accepted, in story order. */
  history: StatusEvent[];
}

export interface StatusFlag {
  kind: StatusFlagKind;
  /** Plain words, for the people checking the story. */
  message: string;
  chapterId: string;
  chapterNumber: number;
  recordId?: string;
  /** The paragraph it is about. */
  blockId?: string;
  name?: string;
}

export interface StatusRecord {
  /** In the order their status first changed. */
  subjects: StatusSubject[];
  flags: StatusFlag[];
  /** How recently each subject's status changed (its last accepted change); higher is more recent. */
  recency: ReadonlyMap<string, number>;
}

/** What a chapter carries for status. */
export interface StatusChapter {
  id: string;
  chapterNumber: number;
  /** Written with the Status skill when present, even empty. */
  statusChanges?: readonly StatusChangeAttachment[];
  speakers?: readonly SpeakerAttachment[];
  holdingChanges?: readonly HoldingChangeAttachment[];
  appearances?: readonly AppearanceAttachment[];
}

const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);
const namesOf = (entry: Pick<CodexEntry, 'name' | 'aliases'>) => [entry.name, ...(entry.aliases ?? [])];

/** What each state ends: the lasting states it takes away. */
const ENDS: Partial<Record<StatusState, readonly LastingState[]>> = {
  recovered: ['wounded'],
  revived: ['dead'],
  freed: ['sealed', 'captured'],
  repaired: ['damaged'],
};

/** Holding verbs that show a thing still whole and in someone's hands. */
const USES_THING: ReadonlySet<string> = new Set(['gained', 'equipped', 'unequipped', 'has']);

/**
 * Works out how everyone and everything now is: each committed chapter in
 * order, each status change, speaker line, holding change and change of look
 * in reading order. A change that cannot be true (a state of the wrong kind,
 * one already in place, one ending a state that never began, anything but a
 * revival after death or destruction) is flagged and left out. A dead
 * character who speaks or acts, and a destroyed thing used again, are
 * flagged once a chapter. Nothing here is stored, so it always reflects each
 * chapter's current version.
 */
export function deriveStatus({ entries, chapters }: {
  entries: readonly CodexEntry[];
  chapters: readonly StatusChapter[];
}): StatusRecord {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const subjects = new Map<string, StatusSubject>();
  const recency = new Map<string, number>();
  const flags: StatusFlag[] = [];
  let sequence = 0;
  const mainEntry = entries.find(entry => entry.kind === 'character' && entry.mainCharacter);
  const speakerKey = (record: SpeakerAttachment): string | undefined => {
    if (record.payload.protagonist || isMainCharacterTag(record.payload.speaker)) return mainEntry?.id;
    const key = normalizeIdentityLabel(record.payload.speaker);
    return entries.find(entry => entry.kind === 'character' && namesOf(entry).some(name => normalizeIdentityLabel(name) === key))?.id;
  };
  const isIn = (key: string | undefined, state: LastingState) => Boolean(key && subjects.get(key)?.conditions.some(condition => condition.state === state));

  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    type Event =
      | { kind: 'status'; record: StatusChangeAttachment; order: number }
      | { kind: 'speaker'; record: SpeakerAttachment; order: number }
      | { kind: 'holding'; record: HoldingChangeAttachment; order: number }
      | { kind: 'look'; record: AppearanceAttachment; order: number };
    const events: Event[] = [
      ...(chapter.statusChanges ?? []).filter(record => record.kind === STATUS_CHANGE_KIND).map((record, order) => ({ kind: 'status' as const, record, order })),
      ...(chapter.speakers ?? []).filter(record => record.kind === SPEAKER_KIND && !record.anchor.detached).map((record, order) => ({ kind: 'speaker' as const, record, order })),
      ...(chapter.holdingChanges ?? []).map((record, order) => ({ kind: 'holding' as const, record, order })),
      ...(chapter.appearances ?? []).filter(record => record.kind === APPEARANCE_KIND && record.payload.event === 'look').map((record, order) => ({ kind: 'look' as const, record, order })),
    ].sort((left, right) => paragraphIndex(left.record.anchor.blockId) - paragraphIndex(right.record.anchor.blockId)
      || left.record.anchor.startOffset - right.record.anchor.startOffset
      // At one place, what someone does comes before the change the sentence ends on: a man speaks, then dies.
      || (left.kind === 'status' ? 1 : 0) - (right.kind === 'status' ? 1 : 0) || left.order - right.order);
    const passageOf = (record: StatusChangeAttachment | SpeakerAttachment | HoldingChangeAttachment | AppearanceAttachment): StatusPassage => ({
      chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: record.id, blockId: record.anchor.blockId, text: record.anchor.selectedText,
    });
    const flag = (kind: StatusFlagKind, message: string, record: Event['record'], name?: string) => flags.push({
      kind, message: `Chapter ${chapter.chapterNumber}: ${message}`, chapterId: chapter.id, chapterNumber: chapter.chapterNumber,
      recordId: record.id, blockId: record.anchor.blockId, ...(name ? { name } : {}),
    });
    // A dead character acting or a destroyed thing used is flagged once a chapter, however often it happens.
    const flaggedHere = new Set<string>();
    const afterEnd = (key: string | undefined, record: Event['record'], doing: string) => {
      if (!key || flaggedHere.has(key)) return;
      const name = subjects.get(key)?.name ?? byId.get(key)?.name;
      if (isIn(key, 'dead')) { flaggedHere.add(key); flag('after-death', `‘${name}’ ${doing} after their death, with no revival.`, record, name); }
      else if (isIn(key, 'destroyed')) { flaggedHere.add(key); flag('after-destroyed', `‘${name}’ is ${doing === 'speaks' ? 'heard' : 'used'} after it was destroyed.`, record, name); }
    };

    for (const event of events) {
      if (event.kind === 'speaker') { afterEnd(speakerKey(event.record), event.record, 'speaks'); continue; }
      if (event.kind === 'look') { afterEnd(event.record.payload.subject.entryId, event.record, 'changes'); continue; }
      if (event.kind === 'holding') {
        const { holder, target, verb } = event.record.payload;
        // What is taken from the dead is no act of theirs.
        if (verb !== 'lost') afterEnd(holder.entryId, event.record, 'acts');
        if (USES_THING.has(verb)) afterEnd(target?.entryId, event.record, 'used');
        continue;
      }
      const { record } = event;
      const { subject, state, detail, entity } = record.payload;
      const key = subject.entryId;
      const entry = key ? byId.get(key) : undefined;
      if (!key || !entry || !entity) {
        flag('status-unknown', `the status tag for ‘${subject.name}’ names no character or thing in the record. It is left out.`, record, subject.name);
        continue;
      }
      const name = entry.name;
      if ((entity === 'thing' && CHARACTER_ONLY.has(state)) || (entity === 'character' && THING_ONLY.has(state))) {
        flag('wrong-kind', `‘${name}’ is a ${entity}, which cannot be ${state}. It is left out.`, record, name);
        continue;
      }
      const subjectOf = () => {
        const found = subjects.get(key) ?? { key, name, entity, mainCharacter: Boolean(entry.mainCharacter), conditions: [], history: [] };
        subjects.set(key, found);
        return found;
      };
      if (state !== 'revived' && isIn(key, 'dead')) { flag('after-death', `‘${name}’ is ${state} after their death, with no revival. It is left out.`, record, name); continue; }
      if (isIn(key, 'destroyed')) { flag('after-destroyed', `‘${name}’ is ${state} after it was destroyed. It is left out.`, record, name); continue; }
      const ends = ENDS[state];
      if (ends && !ends.some(ended => isIn(key, ended))) {
        flag('status-without-cause', `‘${name}’ is ${state}, but was never ${ends.join(' or ')}. It is left out.`, record, name);
        continue;
      }
      const lasting = (state === 'wounded' || state === 'transformed' ? undefined : state) as LastingState | undefined;
      if (lasting && isIn(key, lasting)) { flag('status-repeated', `‘${name}’ is ${state} again, but already is. It is not counted twice.`, record, name); continue; }

      const current = subjectOf();
      const passage = passageOf(record);
      current.history.push({ state, ...(detail ? { detail } : {}), passage });
      if (ends) current.conditions = current.conditions.filter(condition => !ends.includes(condition.state));
      else {
        // Death and destruction end every passing state; a new wound or transformation replaces the last.
        if (state === 'dead' || state === 'destroyed') current.conditions = current.conditions.filter(condition => condition.state === 'transformed');
        if (state === 'wounded' || state === 'transformed') current.conditions = current.conditions.filter(condition => condition.state !== state);
        current.conditions.push({ state: state as LastingState, ...(detail ? { detail } : {}), passage });
      }
      recency.set(key, ++sequence);
    }
  }
  return { subjects: [...subjects.values()], flags, recency };
}

// ─── The packet section ─────────────────────────────────────────────────────

/** How many characters and things not as they were the writer is shown, besides the main character; the most recently changed first. */
export const STATUS_SECTION_LIMIT = 30;

/**
 * The Status section the writer reads: the main character first when they are
 * not well and whole, then everyone and everything else not as they were, the
 * most recently changed first, each with every lasting state they are in and
 * since when. Exact names only; how to use them is the Status skill's job.
 */
export function statusSection(record: StatusRecord): StatusSection {
  const entryOf = (subject: StatusSubject): StatusSectionEntry => ({
    name: subject.name,
    entity: subject.entity,
    ...(subject.mainCharacter ? { mainCharacter: true as const } : {}),
    states: subject.conditions.map(condition => ({ state: condition.state, ...(condition.detail ? { detail: condition.detail } : {}), since: condition.passage.chapterNumber })),
  });
  const changed = record.subjects.filter(subject => subject.conditions.length);
  const main = changed.find(subject => subject.mainCharacter);
  const others = changed.filter(subject => !subject.mainCharacter)
    .sort((left, right) => (record.recency.get(right.key) ?? 0) - (record.recency.get(left.key) ?? 0))
    .slice(0, STATUS_SECTION_LIMIT);
  return { entries: [...(main ? [main] : []), ...others].map(entryOf) };
}
