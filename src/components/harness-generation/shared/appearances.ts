import { splitSentences } from '../../highlight-engine/shared/manuscript';
import {
  APPEARANCE_KIND,
  appearanceId,
  type AppearanceAttachment,
  type AppearanceEntity,
  type AppearanceFlagKind,
  type AppearancePayload,
  type AppearancesSection,
  type AppearancesSectionEntry,
  type ChapterLooks,
  type Look,
} from '../../../narrative/appearances';
import type { CodexEntry, HoldingChangeAttachment } from '../../../narrative/holdings';
import { isAppearanceTagWord, type WordTag } from '../../../narrative/marks';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { normalizeIdentityLabel } from './canonicalProjection';
import { factionNamed, type DeclaredFaction } from './factions';
import { createCodexEntryResolver, holdingName, pointedSentence, type CodexEntryResolver, type DeclaredCharacter, type HoldingPassage } from './holdings';
import { isMainCharacterTag } from './speakers';
import type { CurrentStatus } from './statuses';

/**
 * Appearances in the HARNESS: the writer's appears and look tags read into
 * appearances on the sentences they point at, resolved to Codex entries when
 * their chapter commits, and worked out again, in story order, into who and
 * what is on the page and how each looks now. Plain rules, never a model,
 * check each tag against what came before; a tag that cannot be true is
 * flagged and left out, never a reason to refuse a chapter. The looks
 * themselves are written down by a small step after commit (`ChapterLooks`).
 */

// ─── Reading tags ───────────────────────────────────────────────────────────

/** The words an appears tag's second part may use for each kind of entry, letter case aside. */
const ENTITY_WORDS: Readonly<Record<AppearanceEntity, readonly string[]>> = {
  character: ['character', 'person', 'creature', 'beast', 'being', 'spirit'],
  thing: ['thing', 'object', 'item', 'weapon', 'artifact', 'artefact', 'treasure'],
};
const entityOf = (written: string | undefined): AppearanceEntity | undefined => {
  const word = written?.trim().toLowerCase();
  return (Object.keys(ENTITY_WORDS) as AppearanceEntity[]).find(entity => ENTITY_WORDS[entity].includes(word ?? ''));
};

/** More words than any change of look a tag should carry. */
const CHANGE_WORD_LIMIT = 16;

export type ReadAppearanceTag =
  | { ok: true; appearance: Omit<AppearancePayload, 'origin'> }
  | { ok: false; problem: string };

/**
 * One word tag read as an appearance: `appears` names who or what and its
 * kind (a character or a thing); `look` names who or what, then what changed.
 * A name keeps no description inside it.
 */
export function readAppearanceTag(tag: WordTag): ReadAppearanceTag {
  if (!isAppearanceTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not an appearance` };
  const [written, second, ...rest] = tag.parts;
  const named = holdingName(written);
  if ('note' in named) return { ok: false, problem: `‘${named.note}’ is a note about the story, not a name, so its ${tag.word} tag was set aside` };
  const subject = { name: named.name };
  if (tag.word === 'appears') {
    const entity = entityOf(second);
    if (entity === 'thing' && isMainCharacterTag(named.name)) return { ok: false, problem: 'an appears tag named the main character as a thing' };
    return entity
      ? { ok: true, appearance: { event: 'appears', subject, entity } }
      : { ok: false, problem: `an appears tag for ${named.name} named ‘${second}’, neither a character nor a thing` };
  }
  const change = [second, ...rest].join('; ').trim();
  if (!change) return { ok: false, problem: `a look tag for ${named.name} said nothing about what changed` };
  if (change.split(/\s+/).length > CHANGE_WORD_LIMIT) return { ok: false, problem: `a look tag for ${named.name} described more than a change of look, so it was set aside` };
  return { ok: true, appearance: { event: 'look', subject, change } };
}

export interface AppearancePlacement {
  /** Each appearance on its sentence. Names are as the writer wrote them; entries are resolved when the chapter commits. */
  appearances: AppearanceAttachment[];
  /** Plain reasons for every tag that could not become an appearance. */
  problems: string[];
}

/** Places one appearance for every readable appears or look tag, on the sentence it points at. */
export function placeAppearances({ paragraphs, locale }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; wordTags: readonly WordTag[] }>;
  locale?: string;
}): AppearancePlacement {
  const appearances: AppearanceAttachment[] = [];
  const problems: string[] = [];
  for (const { blockId, text, wordTags } of paragraphs) {
    const tags = wordTags.filter(tag => isAppearanceTagWord(tag.word));
    if (!tags.length) continue;
    const sentences = splitSentences(text, locale);
    for (const tag of tags) {
      const read = readAppearanceTag(tag);
      if (!read.ok) { problems.push(read.problem); continue; }
      const sentence = pointedSentence(sentences, tag.offset);
      if (!sentence) { problems.push(`a ${tag.word} tag for ${tag.parts[0]} pointed at no sentence`); continue; }
      appearances.push({
        id: appearanceId(blockId, sentence.start, sentence.end, appearances.length),
        kind: APPEARANCE_KIND,
        anchor: { level: 'span', blockId, startOffset: sentence.start, endOffset: sentence.end, selectedText: text.slice(sentence.start, sentence.end) },
        payload: { origin: 'harness', ...read.appearance },
      });
    }
  }
  return { appearances, problems };
}

// ─── Codex entries ──────────────────────────────────────────────────────────

export interface ResolvedAppearances {
  appearances: AppearanceAttachment[];
  /** New Codex entries, in the order the chapter first named them. */
  created: CodexEntry[];
}

/**
 * Resolves every name in a chapter's appearances to a Codex entry when it
 * commits. An appears tag finds or makes its character or thing; a look tag
 * only finds one already in the record (a look for someone who never appeared
 * is flagged by the rules, never made into an entry), and takes its kind from
 * that entry. With a `resolver`, the chapter's holding changes share it.
 */
export function resolveAppearances({ storyId, chapter, appearances, entries, declared, createdAt, createId, resolver: shared }: {
  storyId: string;
  chapter: { id: string; chapterNumber: number };
  appearances: readonly AppearanceAttachment[];
  entries: readonly CodexEntry[];
  declared: readonly DeclaredCharacter[];
  createdAt: string;
  createId: () => string;
  resolver?: CodexEntryResolver;
}): ResolvedAppearances {
  const resolver = shared ?? createCodexEntryResolver({ storyId, chapter, entries, declared, createdAt, createId });
  const resolved = appearances.map((appearance): AppearanceAttachment => {
    const { event, subject, entity } = appearance.payload;
    const entry = event === 'appears'
      ? (entity === 'thing' ? resolver.entry('thing', subject.name) : resolver.character(subject.name))
      : resolver.existing(subject.name);
    if (!entry) return appearance;
    return {
      ...appearance,
      payload: { ...appearance.payload, subject: { name: subject.name, entryId: entry.id }, entity: entry.kind === 'thing' ? 'thing' : 'character' },
    };
  });
  return { appearances: resolved, created: resolver.created };
}

// ─── Working out who is on the page ───────────────────────────────────────

/**
 * Where an appearance happened: its chapter and the sentence it points at,
 * with where that sentence starts in its paragraph, and, for an appears or
 * look tag, the writer's own description: from its sentence to the end of its
 * paragraph, a few sentences at most. It is copied by code, never read by a
 * model: the record a look is written from when something asks for one.
 */
export type AppearancePassage = HoldingPassage & { startOffset: number; description?: string };

/** The most characters of the writer's description an appearance keeps: whole sentences from its tag. */
export const APPEARANCE_DESCRIPTION_CHARACTERS = 480;
/** The most characters of a description the writer reads back in Appeared. */
const APPEARED_LINE_CHARACTERS = 220;

/** Whole sentences of `text` from its start, within `limit` characters. */
const sentencesWithin = (text: string, limit: number, locale?: string) => {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  const fits = splitSentences(trimmed, locale).filter(sentence => sentence.end <= limit).at(-1);
  return fits ? trimmed.slice(0, fits.end).trim() : `${trimmed.slice(0, limit).trimEnd()}…`;
};

/** A look written down, with the passage it was read from. */
export interface RecordedLook extends Look {
  passage: AppearancePassage;
  /** Where the passage contradicts the look the story's author declared. */
  conflict?: string;
}

/** A change of look the writer tagged. */
export interface LookChange {
  change: string;
  passage: AppearancePassage;
}

/** One character or thing on the record's page. */
export interface AppearanceSubject {
  /** Its Codex entry's ID, or its kind and name until one exists. */
  key: string;
  entryId?: string;
  name: string;
  entity: AppearanceEntity;
  mainCharacter: boolean;
  /** Where it first stepped onto the page. */
  first: AppearancePassage;
  /** Every change of look the writer tagged, in story order. */
  changes: LookChange[];
  /** How it looks now: the latest look written down. */
  look?: RecordedLook;
  /** A tag changed it after that look was written: the look is older than the story, and is written again when next asked for. */
  lookStale?: true;
  /** Every look written down, in story order. */
  looks: RecordedLook[];
}

export interface AppearanceFlag {
  kind: AppearanceFlagKind;
  /** Plain words, for the people checking the story. */
  message: string;
  chapterId: string;
  chapterNumber: number;
  recordId?: string;
  /** The paragraph it is about. */
  blockId?: string;
  name?: string;
}

export interface AppearancesState {
  /** In the order they first stepped onto the page. */
  subjects: AppearanceSubject[];
  flags: AppearanceFlag[];
  /** How recently each subject was on the page (its key's last event); higher is more recent. */
  recency: ReadonlyMap<string, number>;
}

/** What a chapter carries for appearances. */
export interface AppearancesChapter {
  id: string;
  chapterNumber: number;
  /** The tagger's appearance tags, present even when empty: a chapter it read was asked for them. */
  appearances?: readonly AppearanceAttachment[];
  looks?: ChapterLooks;
  /** The chapter's paragraphs, so an appearance keeps the writer's own description. */
  paragraphs?: readonly string[];
  speakers?: readonly SpeakerAttachment[];
  holdingChanges?: readonly HoldingChangeAttachment[];
}

const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);
const namesOf = (entry: Pick<CodexEntry, 'name' | 'aliases'>) => [entry.name, ...(entry.aliases ?? [])];

/**
 * Works out who and what is on the page: each committed chapter in order,
 * each appearance, speaker line and holding change in reading order. An
 * appears tag for someone already on the page and a look tag for someone who
 * never appeared are flagged and left out, as their looks are. In a chapter
 * written with the Appearance skill, someone who speaks before any tag shows
 * them appearing is flagged, once a chapter. Nothing here is stored, so it
 * always reflects each chapter's current version.
 */
export function deriveAppearances({ entries, chapters, declaredFactions = [] }: {
  entries: readonly CodexEntry[];
  chapters: readonly AppearancesChapter[];
  /** Factions the story declares: a group that speaks is never a character who should have appeared. */
  declaredFactions?: readonly DeclaredFaction[];
}): AppearancesState {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const subjects = new Map<string, AppearanceSubject>();
  const recency = new Map<string, number>();
  const flags: AppearanceFlag[] = [];
  let sequence = 0;
  const keyOf = (ref: AppearancePayload['subject'], entity: AppearanceEntity) => ref.entryId ?? `${entity}:${normalizeIdentityLabel(ref.name)}`;
  const seen = (key: string) => recency.set(key, ++sequence);
  const mainEntry = entries.find(entry => entry.kind === 'character' && entry.mainCharacter);
  // Who a speaker is, by the record's own names: the main character, or an entry answering to the name.
  const speakerKey = (record: SpeakerAttachment): string | undefined => {
    if (record.payload.protagonist || isMainCharacterTag(record.payload.speaker)) return mainEntry?.id;
    const key = normalizeIdentityLabel(record.payload.speaker);
    return entries.find(entry => entry.kind === 'character' && namesOf(entry).some(name => normalizeIdentityLabel(name) === key))?.id
      ?? `character:${key}`;
  };

  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    type Event =
      | { kind: 'appearance'; record: AppearanceAttachment; order: number }
      | { kind: 'speaker'; record: SpeakerAttachment; order: number }
      | { kind: 'holding'; record: HoldingChangeAttachment; order: number };
    const events: Event[] = [
      ...(chapter.appearances ?? []).filter(record => record.kind === APPEARANCE_KIND).map((record, order) => ({ kind: 'appearance' as const, record, order })),
      ...(chapter.speakers ?? []).filter(record => record.kind === SPEAKER_KIND && !record.anchor.detached).map((record, order) => ({ kind: 'speaker' as const, record, order })),
      ...(chapter.holdingChanges ?? []).map((record, order) => ({ kind: 'holding' as const, record, order })),
    ].sort((left, right) => paragraphIndex(left.record.anchor.blockId) - paragraphIndex(right.record.anchor.blockId)
      || left.record.anchor.startOffset - right.record.anchor.startOffset
      // At one place, an appearance comes before the speech or change it introduces.
      || (left.kind === 'appearance' ? 0 : 1) - (right.kind === 'appearance' ? 0 : 1) || left.order - right.order);
    // A chapter the tagger read carries its appearances, empty included, so an
    // absent list means nothing was ever asked to tag this chapter: its speech
    // is not held against appearances that could not exist.
    const taggedForAppearances = chapter.appearances !== undefined;
    const flaggedUnseen = new Set<string>();
    const accepted = new Map<string, AppearanceSubject>();
    const passageOf = (record: AppearanceAttachment | SpeakerAttachment): AppearancePassage => {
      const paragraph = record.kind === APPEARANCE_KIND ? chapter.paragraphs?.[paragraphIndex(record.anchor.blockId) - 1] : undefined;
      const description = paragraph?.slice(record.anchor.startOffset) && sentencesWithin(paragraph.slice(record.anchor.startOffset), APPEARANCE_DESCRIPTION_CHARACTERS);
      return {
        chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: record.id,
        blockId: record.anchor.blockId, text: record.anchor.selectedText, startOffset: record.anchor.startOffset,
        ...(description ? { description } : {}),
      };
    };
    const flag = (kind: AppearanceFlagKind, message: string, record: AppearanceAttachment | SpeakerAttachment, name?: string) => flags.push({
      kind, message: `Chapter ${chapter.chapterNumber}: ${message}`, chapterId: chapter.id, chapterNumber: chapter.chapterNumber,
      recordId: record.id, blockId: record.anchor.blockId, ...(name ? { name } : {}),
    });

    for (const event of events) {
      if (event.kind === 'holding') {
        const { holder, target } = event.record.payload;
        if (holder.entryId) seen(holder.entryId);
        if (target?.entryId) seen(target.entryId);
        continue;
      }
      if (event.kind === 'speaker') {
        const key = speakerKey(event.record);
        if (!key) continue;
        if (subjects.has(key)) { seen(key); continue; }
        const name = event.record.payload.speaker;
        if (!taggedForAppearances || flaggedUnseen.has(key) || factionNamed(name, declaredFactions)) continue;
        flaggedUnseen.add(key);
        const who = byId.get(key)?.name ?? name;
        flag('speaks-unseen', `‘${who}’ speaks before any tag shows them appearing.`, event.record, who);
        continue;
      }
      const { record } = event;
      const { event: kind, subject, entity, change } = record.payload;
      if (kind === 'appears') {
        if (!entity) { flag('unknown-kind', `the appears tag for ‘${subject.name}’ names no kind of entry.`, record, subject.name); continue; }
        const key = keyOf(subject, entity);
        if (subjects.has(key)) {
          flag('already-appeared', `‘${subjects.get(key)!.name}’ appears again, but is already on the page. It is not counted twice.`, record, subject.name);
          continue;
        }
        const entry = subject.entryId ? byId.get(subject.entryId) : undefined;
        const appeared: AppearanceSubject = {
          key, ...(subject.entryId ? { entryId: subject.entryId } : {}), name: entry?.name ?? subject.name, entity,
          mainCharacter: Boolean(entry?.mainCharacter), first: passageOf(record), changes: [], looks: [],
        };
        subjects.set(key, appeared);
        accepted.set(record.id, appeared);
        seen(key);
        continue;
      }
      const key = subject.entryId ?? [...subjects.values()].find(candidate => normalizeIdentityLabel(candidate.name) === normalizeIdentityLabel(subject.name))?.key;
      const changed = key ? subjects.get(key) : undefined;
      if (!changed) {
        flag('look-unseen', `the look of ‘${subject.name}’ changes, but no tag shows them appearing. The change is left out.`, record, subject.name);
        continue;
      }
      // A look tag in the paragraph that first shows them describes that first look; it is not a change.
      if (changed.first.chapterId === chapter.id && changed.first.blockId === record.anchor.blockId) continue;
      changed.changes.push({ change: change ?? '', passage: passageOf(record) });
      accepted.set(record.id, changed);
      seen(changed.key);
    }

    // The looks written down for this chapter's appearances, in reading order: the last one stands.
    const order = new Map((chapter.appearances ?? []).map((record, index) => [record.id, index]));
    const written = [...(chapter.looks?.status === 'described' ? chapter.looks.looks : [])]
      .sort((left, right) => (order.get(left.appearanceId) ?? 0) - (order.get(right.appearanceId) ?? 0));
    for (const look of written) {
      const owner = accepted.get(look.appearanceId);
      const record = (chapter.appearances ?? []).find(candidate => candidate.id === look.appearanceId);
      if (!owner || !record || !look.summary.trim()) continue;
      const recorded: RecordedLook = {
        summary: look.summary, traits: look.traits, passage: passageOf(record), ...(look.conflict ? { conflict: look.conflict } : {}),
      };
      owner.looks.push(recorded);
      owner.look = recorded;
    }
  }

  // A look written on demand is kept on the Codex entry: it stands for the passages it was written from, and is stale once a tag adds another.
  for (const subject of subjects.values()) {
    const sources = appearanceSources(subject);
    const kept = subject.entryId ? byId.get(subject.entryId)?.look : undefined;
    if (kept?.summary.trim()) {
      // The look stands at the last passage it was written from; a change after it is shown as "since then".
      const passages = [subject.first, ...subject.changes.map(change => change.passage)];
      const latest = passages.filter(passage => kept.from.includes(passage.recordId)).at(-1) ?? subject.first;
      const recorded: RecordedLook = { summary: kept.summary, traits: { ...kept.traits }, passage: latest, ...(kept.conflict ? { conflict: kept.conflict } : {}) };
      subject.looks.push(recorded);
      subject.look = recorded;
      if (kept.from.join('|') !== sources.join('|')) subject.lookStale = true;
    } else if (subject.look && subject.changes.some(change => comesAfter(change.passage, subject.look!.passage))) subject.lookStale = true;
  }

  return { subjects: [...subjects.values()], flags, recency };
}

const comesAfter = (left: AppearancePassage, right: AppearancePassage) =>
  (left.chapterNumber - right.chapterNumber || paragraphIndex(left.blockId) - paragraphIndex(right.blockId) || left.startOffset - right.startOffset) > 0;

/** The appearances a subject's look is written from, in story order: its first, then each change. */
export const appearanceSources = (subject: Pick<AppearanceSubject, 'first' | 'changes'>) =>
  [subject.first.recordId, ...subject.changes.map(change => change.passage.recordId)];

/**
 * The line the writer reads for a subject in Appeared: its look's one line
 * while it is current; otherwise the writer's own description from when it
 * first stepped onto the page, then every change since, so a look is kept
 * from the story's own words with no model.
 */
export function appearedLookLine(subject: AppearanceSubject): string | undefined {
  const since = (subject.look && !subject.lookStale
    ? []
    : subject.changes.filter(change => !subject.look || comesAfter(change.passage, subject.look.passage))).map(change => change.change).filter(Boolean);
  const base = subject.look?.summary ?? sentencesWithin(subject.first.description ?? subject.first.text, APPEARED_LINE_CHARACTERS);
  if (!base && !since.length) return undefined;
  return [base, ...(since.length ? [`since then: ${since.join('; ')}`] : [])].filter(Boolean).join(' · ');
}

/** Holding tags that show a thing on the page: held, taken, in use or put away. */
const SHOWN_BY: ReadonlySet<string> = new Set(['has', 'gained', 'equipped', 'unequipped']);

/**
 * The things a committed chapter shows through its holding tags that have not
 * stepped onto the page yet: each gets its appearance on the sentence of its
 * first such tag, so every held thing has a look without the writer tagging
 * it twice. `chapters` are the story's other chapters; `chapter` carries its
 * resolved appearances and holding changes.
 */
export function thingAppearancesFromHoldings({ chapter, chapters, entries }: {
  chapter: AppearancesChapter;
  chapters: readonly AppearancesChapter[];
  entries: readonly CodexEntry[];
}): AppearanceAttachment[] {
  const state = deriveAppearances({ entries, chapters: [...chapters.filter(other => other.id !== chapter.id), chapter] });
  const appeared = new Set(state.subjects.filter(subject => subject.entity === 'thing').map(subject => subject.entryId ?? subject.key));
  const found: AppearanceAttachment[] = [];
  let index = chapter.appearances?.length ?? 0;
  for (const change of chapter.holdingChanges ?? []) {
    const target = change.payload.target;
    const entry = target?.entryId ? entries.find(candidate => candidate.id === target.entryId) : undefined;
    if (!entry || entry.kind !== 'thing' || !SHOWN_BY.has(change.payload.verb) || appeared.has(entry.id)) continue;
    appeared.add(entry.id);
    const { blockId, startOffset, endOffset } = change.anchor;
    found.push({
      id: appearanceId(blockId, startOffset, endOffset, index++),
      kind: APPEARANCE_KIND,
      anchor: { ...change.anchor },
      payload: { origin: 'harness', event: 'appears', subject: { name: entry.name, entryId: entry.id }, entity: 'thing' },
    });
  }
  return found;
}

/** The appearances a chapter's look step describes: each appears or look tag the rules accept, in reading order. */
export function describableAppearances(state: AppearancesState, chapterId: string): Array<{ appearanceId: string; subject: AppearanceSubject }> {
  const found: Array<{ appearanceId: string; subject: AppearanceSubject }> = [];
  for (const subject of state.subjects) {
    if (subject.first.chapterId === chapterId) found.push({ appearanceId: subject.first.recordId, subject });
    for (const change of subject.changes) if (change.passage.chapterId === chapterId) found.push({ appearanceId: change.passage.recordId, subject });
  }
  const passageOf = ({ appearanceId, subject }: { appearanceId: string; subject: AppearanceSubject }) => (subject.first.recordId === appearanceId
    ? subject.first : subject.changes.find(change => change.passage.recordId === appearanceId)!.passage);
  return found.sort((left, right) => {
    const [a, b] = [passageOf(left), passageOf(right)];
    return paragraphIndex(a.blockId) - paragraphIndex(b.blockId) || a.startOffset - b.startOffset;
  });
}

// ─── The packet section ─────────────────────────────────────────────────────

/** How many characters besides the main character, and how many things, the writer is shown, most recently seen first. */
export const APPEARED_SECTION_CHARACTERS = 20;
export const APPEARED_SECTION_THINGS = 10;

/**
 * The Appeared section the writer reads: the main character first when they
 * have appeared, then the characters and the things on the page, those seen
 * most recently first, each with its look's one line once it is written down.
 * Exact names only; how to use them is the Appearance skill's job.
 */
export function appearancesSection(state: AppearancesState, statuses?: ReadonlyMap<string, CurrentStatus>, entries: readonly CodexEntry[] = []): AppearancesSection {
  const statusOf = (subject: AppearanceSubject) => (subject.entity === 'character' ? statuses?.get(subject.key)?.status : undefined);
  const entryOf = (subject: AppearanceSubject): AppearancesSectionEntry => ({
    name: subject.name,
    entity: subject.entity,
    ...(subject.mainCharacter ? { mainCharacter: true as const } : {}),
    ...(appearedLookLine(subject) ? { look: appearedLookLine(subject)! } : {}),
    ...(statusOf(subject) ? { status: statusOf(subject)! } : {}),
  });
  const recent = (left: AppearanceSubject, right: AppearanceSubject) => (state.recency.get(right.key) ?? 0) - (state.recency.get(left.key) ?? 0);
  const main = state.subjects.find(subject => subject.mainCharacter);
  const characters = state.subjects.filter(subject => subject.entity === 'character' && !subject.mainCharacter).sort(recent).slice(0, APPEARED_SECTION_CHARACTERS);
  const things = state.subjects.filter(subject => subject.entity === 'thing').sort(recent).slice(0, APPEARED_SECTION_THINGS);
  // Someone the story gave a status but never tagged appearing still reaches the writer, with that status,
  // so a death tagged on its own is never forgotten.
  // Measured against who is actually listed, so a character the counts leave out still keeps their status;
  // the most recent statuses first, as many as the characters' own count.
  const listed = new Set([...(main ? [main] : []), ...characters, ...things].map(subject => subject.key));
  const statusOnly = [...statuses ?? []].filter(([key]) => !listed.has(key))
    .sort(([, left], [, right]) => right.passage.chapterNumber - left.passage.chapterNumber)
    .slice(0, APPEARED_SECTION_CHARACTERS)
    .map(([key, current]): AppearancesSectionEntry => {
    const entry = entries.find(candidate => candidate.id === key);
    return { name: entry?.name ?? current.name, entity: 'character', ...(entry?.mainCharacter ? { mainCharacter: true as const } : {}), status: current.status };
  });
  const mainStatusOnly = statusOnly.filter(entry => entry.mainCharacter);
  return { entries: [...(main ? [entryOf(main)] : mainStatusOnly), ...characters.map(entryOf), ...statusOnly.filter(entry => !entry.mainCharacter), ...things.map(entryOf)] };
}
