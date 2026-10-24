import { splitSentences } from '../../highlight-engine/shared/manuscript';
import {
  HOLDING_CHANGE_KIND,
  holdingChangeId,
  type CodexEntry,
  type CodexEntryKind,
  type HoldingChangeAttachment,
  type HoldingChangePayload,
  type HoldingFlagKind,
  type HoldingRef,
  type HoldingVerb,
  type HoldingsSection,
  type HoldingsSectionCharacter,
} from '../../../narrative/holdings';
import { isHoldingTagWord, type WordTag } from '../../../narrative/marks';
import type { CurrentStoryProjection } from '../../../narrative/generation';
import { CHAPTER_ZERO_KEY_PREFIX, worldCardKey, type WorldAtChapterZero, type WorldCardAtChapterZero, type WorldCardKindId } from '../../../narrative/worldRecord';
import { normalizeIdentityLabel } from './canonicalProjection';
import { isMainCharacterTag } from './speakers';

export type { HoldingFlagKind } from '../../../narrative/holdings';

/**
 * Holdings in the HARNESS: the writer's change tags read into holding changes
 * on the sentences they point at, resolved to Codex entries when their chapter
 * commits, and worked out again, in story order, into what every character has
 * now. Plain rules, never a model, check each change against what came before;
 * a change that cannot be true is flagged and left out, never a reason to
 * refuse a chapter.
 */

// ─── Reading tags ───────────────────────────────────────────────────────────

const THING_VERBS: ReadonlySet<HoldingVerb> = new Set(['has', 'gained', 'lost', 'equipped', 'unequipped']);
const ABILITY_VERBS: ReadonlySet<HoldingVerb> = new Set(['knows', 'learning', 'learned', 'improved', 'sealed', 'unsealed']);

/** The kind of entry a verb's second part names. Rank names none. */
export const holdingTargetKind = (verb: HoldingVerb): Exclude<CodexEntryKind, 'character'> | undefined =>
  THING_VERBS.has(verb) ? 'thing' : ABILITY_VERBS.has(verb) ? 'ability' : undefined;

/** A count written as `3`, `x3` or `×3`, in half- or full-width digits. */
const COUNT = /^[x×]?\s*([0-9０-９]{1,6})$/i;
const toNumber = (digits: string) => Number(digits.replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xff10)));

/** A description or count a writer put inside a name: "(nine hundred drones)", " — still cracked". */
const NAME_DESCRIPTION = /\s*(?:[(（][^()（）]*[)）]|\s[—–]\s.*)\s*$/u;
const NAME_COUNT_AFTER = /\s*[x×]\s*([0-9０-９]{1,6})\s*$/i;
/** "3x Spirit Pill", "3 × Spirit Pill": a count before a name, marked as one. */
const NAME_COUNT_BEFORE_MARKED = /^([0-9０-９]{1,6})\s*[x×]\s+/i;
/**
 * "3 Spirit Pills": a bare number before a name. Names begin with numbers too
 * ("1000 Year Ginseng", "9 Suns Art"), so it is a count only when it is one,
 * or when the name after it is plural.
 */
const NAME_COUNT_BEFORE = /^([0-9０-９]{1,6})\s+/;
/** A last word that reads as an English plural ("Pills", "Stones"), not "Moss", "Lotus", "Iris" or "Sun's". */
const PLURAL_NAME = /(?<![sSuUiI'’])s$/u;
/** Punctuation that makes a name read as a note about the story ("banner sighted, three riders"). */
const NOTE_PUNCTUATION = /[,;!?，；！？]|\.\s/u;
/**
 * A span of time in a name ("Caravan in nine days"): a countdown that goes
 * stale, never a holding. Only plural spans count, since names hold singular
 * ones ("1000 Year Ginseng", "Nine Day Sutra").
 */
const NOTE_TIME_SPAN = /\b(?:\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a few|several)\s+(?:days|nights|hours|weeks|months|years)\b/i;
/** More words than any thing or technique name. */
const NAME_WORD_LIMIT = 8;

/**
 * A thing's or ability's one stable name, as a writer wrote it: a description
 * in brackets or after a dash is dropped, and a count written into the name
 * ("Spirit Pill ×3", "3x Spirit Pill", "3 Spirit Pills") is taken out of it,
 * while a number that is part of the name stays ("1000 Year Ginseng"). A name
 * that reads as a note (a sentence, a list, a sighting, a countdown) is no name.
 */
export function holdingName(written: string): { name: string; count?: number } | { note: string } {
  let name = written.trim();
  while (NAME_DESCRIPTION.test(name) && name.replace(NAME_DESCRIPTION, '').trim()) name = name.replace(NAME_DESCRIPTION, '').trim();
  let count: number | undefined;
  const after = name.match(NAME_COUNT_AFTER);
  const marked = after ? null : name.match(NAME_COUNT_BEFORE_MARKED);
  const bare = after || marked ? null : name.match(NAME_COUNT_BEFORE);
  const pattern = after ? NAME_COUNT_AFTER : marked ? NAME_COUNT_BEFORE_MARKED : NAME_COUNT_BEFORE;
  const found = after ?? marked ?? bare;
  if (found) {
    const rest = name.replace(pattern, '').trim();
    const number = toNumber(found[1]);
    // A bare number stays in the name unless it is a count: one, or before a plural.
    const counts = !bare || number === 1 || PLURAL_NAME.test(rest.split(/\s+/).at(-1) ?? '');
    if (rest && counts) { name = rest; count = number || undefined; }
  }
  // A slip of punctuation at its end is no note ("rusted iron sword!").
  const inner = name.replace(/[.!?。！？]+$/u, '');
  if (NOTE_PUNCTUATION.test(inner) || NOTE_TIME_SPAN.test(inner) || inner.split(/\s+/).length > NAME_WORD_LIMIT) return { note: written.trim() };
  return { name, ...(count ? { count } : {}) };
}

export type ReadHoldingTag =
  | { ok: true; change: Omit<HoldingChangePayload, 'origin'> }
  | { ok: false; problem: string };

/**
 * One word tag read as a holding change: who, then what, then a count, a
 * level or a reason. A lost tag written with another spelling ("consumed",
 * "sold") keeps that word as its reason.
 */
export function readHoldingTag(tag: WordTag): ReadHoldingTag {
  if (!isHoldingTagWord(tag.word)) return { ok: false, problem: `a ${tag.word} tag is not a holding change` };
  const [holderName, second, ...rest] = tag.parts;
  const holder: HoldingRef = { name: holderName };
  if (tag.word === 'rank') return { ok: true, change: { verb: 'rank', holder, level: [second, ...rest].join(' ') } };
  // Things and abilities only: a note about the story is never a holding.
  const named = holdingName(second);
  if ('note' in named) return { ok: false, problem: `‘${named.note}’ is a note about the story, not the name of a thing or ability, so its ${tag.word} tag was set aside` };
  const target: HoldingRef = { name: named.name };
  let count: number | undefined;
  const words: string[] = [];
  for (const part of rest) {
    const number = part.match(COUNT);
    if (number && count === undefined && toNumber(number[1]) > 0) count = toNumber(number[1]);
    else words.push(part);
  }
  count ??= named.count;
  const extra = words.join(', ') || undefined;
  switch (tag.word) {
    case 'has':
    case 'gained':
    case 'lost': {
      const reason = extra ?? (tag.word === 'lost' && tag.spelling ? tag.spelling : undefined);
      return { ok: true, change: { verb: tag.word, holder, target, ...(count ? { count } : {}), ...(reason ? { reason } : {}) } };
    }
    case 'knows':
    case 'learned':
      return { ok: true, change: { verb: tag.word, holder, target, ...(extra ? { level: extra } : {}) } };
    case 'improved':
      return extra
        ? { ok: true, change: { verb: 'improved', holder, target, level: extra } }
        : { ok: false, problem: `an improved tag for ${second} gave no new level` };
    default:
      return { ok: true, change: { verb: tag.word, holder, target } };
  }
}

/** The sentence a tag points at: the one it sits in or starts; at a paragraph's end, the last one. */
export const pointedSentence = (sentences: ReadonlyArray<{ start: number; end: number }>, offset: number) =>
  sentences.find(sentence => sentence.start <= offset && (offset < sentence.end || (offset === sentence.end && offset === sentences.at(-1)!.end)))
  // Written right after a sentence's last character, with no space: that sentence.
  ?? sentences.find(sentence => sentence.end === offset)
  ?? sentences.find(sentence => sentence.start > offset)
  ?? sentences.at(-1);

export interface HoldingPlacement {
  /** Each change on its sentence. Names are as the writer wrote them; entries are resolved when the chapter commits. */
  changes: HoldingChangeAttachment[];
  /** Plain reasons for every tag that could not become a change. */
  problems: string[];
}

/** Places one holding change for every readable holding tag, on the sentence it points at. */
export function placeHoldingChanges({ paragraphs, locale }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; wordTags: readonly WordTag[] }>;
  locale?: string;
}): HoldingPlacement {
  const changes: HoldingChangeAttachment[] = [];
  const problems: string[] = [];
  for (const { blockId, text, wordTags } of paragraphs) {
    if (!wordTags.length) continue;
    const sentences = splitSentences(text, locale);
    // Other word-tag kinds (appearances) are read by their own owners.
    for (const tag of wordTags.filter(candidate => isHoldingTagWord(candidate.word))) {
      const read = readHoldingTag(tag);
      if (!read.ok) { problems.push(read.problem); continue; }
      const sentence = pointedSentence(sentences, tag.offset);
      if (!sentence) { problems.push(`a ${tag.word} tag for ${tag.parts[1] ?? tag.parts[0]} pointed at no sentence`); continue; }
      changes.push({
        id: holdingChangeId(blockId, sentence.start, sentence.end, changes.length),
        kind: HOLDING_CHANGE_KIND,
        anchor: { level: 'span', blockId, startOffset: sentence.start, endOffset: sentence.end, selectedText: text.slice(sentence.start, sentence.end) },
        payload: { origin: 'harness', ...read.change },
      });
    }
  }
  return { changes, problems };
}

// ─── Codex entries ──────────────────────────────────────────────────────────

/** A character the frozen Story Information declares, with the names they answer to. */
export interface DeclaredCharacter {
  name: string;
  aliases?: readonly string[];
  mainCharacter?: boolean;
}

/**
 * The characters a chapter's frozen Story Information declares: the cast, with
 * the aliases their declared identities carry. The cast's main character is
 * the one `MC` names.
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
    if (existing) existing.aliases = [...new Set([...(existing.aliases ?? []), ...aliases])];
    else declared.push({ name: identity.name, ...(aliases.length ? { aliases } : {}) });
  }
  return declared;
}

/** Who an `MC` tag is when the Story Information names no main character. */
const UNNAMED_MAIN_CHARACTER = 'Main character';

const namesOf = (entry: Pick<CodexEntry, 'name' | 'aliases'>) => [entry.name, ...(entry.aliases ?? [])];
const answersTo = (names: readonly string[], name: string) => {
  const key = normalizeIdentityLabel(name);
  return Boolean(key) && names.some(candidate => normalizeIdentityLabel(candidate) === key);
};

/**
 * Finds or makes the Codex entry a tag names, for one chapter's commit: an
 * existing entry by its exact name or an alias, a character the Story
 * Information declares, or a new entry with an app-made ID. `MC`, or any name
 * the main character answers to, is the main character. Every kind of tag a
 * chapter carries resolves through one resolver, so a new name named twice
 * in one chapter becomes one entry.
 */
export interface CodexEntryResolver {
  /** The character a name names, made when it is new. */
  character(name: string): CodexEntry;
  /** The thing or ability a name names, made when it is new. */
  entry(kind: Exclude<CodexEntryKind, 'character'>, name: string): CodexEntry;
  /** The entry a name already names, a character before a thing; never made. */
  existing(name: string): CodexEntry | undefined;
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
      origin: extra.origin ?? { source: 'tag', chapterId: chapter.id, chapterNumber: chapter.chapterNumber },
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
  return {
    character(name) {
      if (namesMain(name)) return mainCharacter();
      const existing = existingOfKind('character', name);
      if (existing) return existing;
      const declaredOne = declared.find(candidate => !candidate.mainCharacter && answersTo([candidate.name, ...(candidate.aliases ?? [])], name));
      return declaredOne
        ? make('character', declaredOne.name, { aliases: declaredOne.aliases ? [...declaredOne.aliases] : undefined, origin: { source: 'foundation' } })
        : make('character', name);
    },
    entry: (kind, name) => existingOfKind(kind, name) ?? make(kind, name),
    existing: name => (namesMain(name) ? existingMain() : undefined) ?? existingOfKind('character', name) ?? existingOfKind('thing', name),
    created,
  };
}

export interface ResolvedHoldingChanges {
  changes: HoldingChangeAttachment[];
  /** New Codex entries, in the order the chapter first named them. */
  created: CodexEntry[];
}

/**
 * Resolves every name in a chapter's holding changes to a Codex entry when it
 * commits (`createCodexEntryResolver`). With a `resolver`, the chapter's other
 * tags share it.
 */
export function resolveHoldingChanges({ storyId, chapter, changes, entries, declared, createdAt, createId, resolver: shared }: {
  storyId: string;
  chapter: { id: string; chapterNumber: number };
  changes: readonly HoldingChangeAttachment[];
  /** This story's existing entries. */
  entries: readonly CodexEntry[];
  declared: readonly DeclaredCharacter[];
  createdAt: string;
  createId: () => string;
  resolver?: CodexEntryResolver;
}): ResolvedHoldingChanges {
  const resolver = shared ?? createCodexEntryResolver({ storyId, chapter, entries, declared, createdAt, createId });
  const resolved = changes.map(change => {
    const holder = resolver.character(change.payload.holder.name);
    const kind = holdingTargetKind(change.payload.verb);
    const thing = kind && change.payload.target ? resolver.entry(kind, change.payload.target.name) : undefined;
    return {
      ...change,
      payload: {
        ...change.payload,
        holder: { name: change.payload.holder.name, entryId: holder.id },
        ...(thing && change.payload.target ? { target: { name: change.payload.target.name, entryId: thing.id } } : {}),
      },
    };
  });
  return { changes: resolved, created: resolver.created };
}

// ─── Working out what everyone holds ───────────────────────────────────────

/** Where a change happened: its chapter and the sentence it points at. */
export interface HoldingPassage {
  chapterId: string;
  chapterNumber: number;
  recordId: string;
  blockId: string;
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
  reason?: string;
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
  entryIds?: string[];
  /** The closing-list name it is about. */
  name?: string;
}

export interface HoldingsState {
  characters: CharacterHoldings[];
  flags: HoldingFlag[];
}

/** What a chapter carries for holdings. */
export interface HoldingsChapter {
  id: string;
  chapterNumber: number;
  holdingChanges?: readonly HoldingChangeAttachment[];
  /** The writer's closing list: the main character's things and abilities by name, after the chapter. */
  closingHoldings?: readonly string[];
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

/** A closing-list name without the count or description a writer may add ("Spirit Pill ×3", "Core (cracked)"). */
const listedName = (value: string) => {
  const named = holdingName(value);
  return 'note' in named ? '' : named.name;
};

/**
 * A quantity's grouping separators taken out, so "1,000" is read as a thousand
 * rather than cut at the comma. Only a comma between two digits goes: the one
 * that separates a list stays, and so does a name's own punctuation.
 */
const withoutGrouping = (value: string) => value.replace(/([0-9０-９])[,，]([0-9０-９])/g, '$1$2');

/**
 * A Chapter 0 slot that asks for things or abilities by name, read as the list
 * it asks for: one per comma, semicolon or line. Never split on "and", which
 * joins as often as it separates ("a bow and arrow set"), and never on a
 * count or a note the name carries ("Spirit Pill ×3", "Core (cracked)").
 *
 * A written list says "a rusted sword" where a tag later writes "Rusted
 * Sword", and the key a holding is held under keeps every word, so the article
 * goes: with it, one sword would become two the first time a chapter named it.
 */
const listedSlotHoldings = (value: string | undefined): Array<{ name: string; count: number }> => withoutGrouping(value ?? '')
  .split(/[,;\n]+/)
  .flatMap(part => {
    const named = holdingName(part.trim());
    if ('note' in named) return [];
    const name = named.name.replace(/^(?:the|a|an)\s+/i, '').trim();
    // A count written into the name is the count held, the way a thing card's
    // own count slot is: without it, three pills would be one, and the first
    // chapter to spend one would spend them all.
    return name ? [{ name, count: named.count ?? 1 }] : [];
  });

/** A paragraph's position in its chapter, from its `c{n}-p{i}` id. */
const paragraphIndex = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);

/**
 * Works out what every character holds now: each committed chapter in order,
 * each change in reading order, every change checked against what came before
 * it. A change that cannot be true is flagged and left out. Nothing here is
 * stored, so it always reflects each chapter's current version.
 */
export function deriveHoldings({ entries, chapters, mainCharacterName, worldAtChapterZero }: {
  entries: readonly CodexEntry[];
  chapters: readonly HoldingsChapter[];
  /** For the closing list before any tag named the main character. */
  mainCharacterName?: string;
  /**
   * The world the story opens with. What each character already holds, knows
   * and ranks at before Chapter 1 is the baseline the chapters work on; absent,
   * every character starts with nothing, as a story written before the
   * Chapter 0 world existed does.
   */
  worldAtChapterZero?: WorldAtChapterZero;
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

  const keyOf = (ref: HoldingRef, kind: CodexEntryKind) => ref.entryId ?? `${kind}:${normalizeIdentityLabel(ref.name)}`;
  const nameOf = (ref: HoldingRef) => (ref.entryId ? byId.get(ref.entryId)?.name : undefined) ?? ref.name;
  /**
   * Everything the world gave, by the key it is held under, with every name the
   * world knows it by. Being in here says a holding came from the world, and
   * the names are what a chapter's own words are matched against — so a chapter
   * naming a starting thing by one of its other names reaches the one it means.
   */
  const fromTheWorld = new Map<string, string[]>();

  /**
   * The one thing among these keys that a chapter's word means. The same name
   * wins over a name merely close to it, and two of either are a tie this
   * refuses rather than guesses, so nothing is attributed to the wrong person.
   */
  const onlyWorldMatch = (keys: readonly string[], name: string) => {
    const knownAs = (key: string) => fromTheWorld.get(key) ?? [];
    const exact = keys.filter(key => knownAs(key).some(known => normalizeIdentityLabel(known) === normalizeIdentityLabel(name)));
    const matches = exact.length ? exact : keys.filter(key => knownAs(key).some(known => namesNearlyMatch(known, name)));
    return matches.length === 1 ? matches[0] : undefined;
  };

  /**
   * A chapter's tag resolves its holder to a Codex entry, and the world holds
   * the same character under whichever key their card resolved to. Where those
   * differ the two meet by name, the way the closing list and the duplicate
   * check already read names: without it the character is split in two and
   * everything the world gave them is left behind in the other half.
   */
  const chapterZeroCharacter = (name: string) => {
    const key = onlyWorldMatch([...characters.keys()].filter(candidate => fromTheWorld.has(candidate)), name);
    return key ? characters.get(key) : undefined;
  };
  const characterOf = (ref: HoldingRef): CharacterState => {
    const key = keyOf(ref, 'character');
    let state = characters.get(key) ?? chapterZeroCharacter(nameOf(ref));
    if (!state) {
      state = { entryId: key, name: nameOf(ref), mainCharacter: Boolean(ref.entryId && byId.get(ref.entryId)?.mainCharacter), things: new Map(), abilities: new Map(), history: [], lastChange: 0 };
      characters.set(key, state);
    }
    return state;
  };
  const mainCharacter = () => [...characters.values()].find(state => state.mainCharacter)
    ?? (() => { const entry = entries.find(candidate => candidate.kind === 'character' && candidate.mainCharacter); return entry ? characterOf({ name: entry.name, entryId: entry.id }) : undefined; })();

  /**
   * The key a chapter's change belongs under. A chapter that names something
   * the world already gave its holder may resolve it to a Codex entry the world
   * did not reach, so where the keys differ the two meet by name — by any name
   * the world knows it by. Without this a chapter would lose a sword the record
   * still holds and hold a second one under its own key.
   */
  const chapterZeroKey = (holder: CharacterState, kind: CodexEntryKind, name: string | undefined, key: string) => {
    const held = kind === 'thing' ? holder.things : holder.abilities;
    if (!name || held.has(key)) return key;
    return onlyWorldMatch([...held.keys()].filter(candidate => fromTheWorld.has(candidate)), name) ?? key;
  };

  // ─── The world the story opens with ──────────────────────────────────────
  // What a character already holds, knows and ranks at before a single chapter
  // is written. A Chapter 0 holding was never written in a passage, so it
  // carries no events; the chapters' own changes layer on top of it under the
  // same keys, so a chapter that loses a Chapter 0 sword removes that sword
  // and a chapter that gains it again is flagged.
  if (worldAtChapterZero) {
    const cardsOf = (kind: WorldCardKindId) => worldAtChapterZero.cards.filter(card => card.kind === kind);
    const characterCards = cardsOf('character');
    const thingCards = cardsOf('thing');
    const abilityCards = cardsOf('ability');
    const slot = (card: WorldCardAtChapterZero, id: string) => card.slots[id]?.trim() || undefined;
    /**
     * The one card a written name means, by any name the world knows it by.
     * The same name wins over a name merely close to it, and two of either are
     * a tie this refuses rather than guesses: with a first match, a slot naming
     * "Sword" would take "Iron Sword", and a thing held by "Qin" would go to
     * "Elder Qin". It is the rule the chapter-to-baseline reconciliation above
     * follows, applied where the world is read in.
     */
    const cardNamed = (cards: WorldCardAtChapterZero[], written: string) => {
      const names = (card: WorldCardAtChapterZero) => [card.name, ...(card.aliases ?? [])];
      const only = (matches: WorldCardAtChapterZero[]) => matches.length === 1 ? matches[0] : undefined;
      return only(cards.filter(card => names(card).some(name => normalizeIdentityLabel(name) === normalizeIdentityLabel(written))))
        ?? only(cards.filter(card => names(card).some(name => namesNearlyMatch(name, written))));
    };
    /**
     * The key a Chapter 0 holding is held under: its Codex entry's ID wherever
     * the story already has one for it, so the record, the Codex and the
     * Holdings fixer all name it the same way; its own card's key until then,
     * which the record keeps stable for the whole story. Either way every name
     * the world knows it by is kept, for the chapter reconciliation above.
     */
    const worldKey = (kind: CodexEntryKind, names: string[], fallback: string) => {
      const matching = entries.filter(entry => entry.kind === kind && [entry.name, ...(entry.aliases ?? [])]
        .some(known => names.some(name => normalizeIdentityLabel(name) === normalizeIdentityLabel(known))));
      // Two entries a card could be is no entry: the card keeps its own key
      // rather than being filed under the wrong one.
      const key = matching.length === 1 ? matching[0].id : fallback;
      fromTheWorld.set(key, [...new Set([...(fromTheWorld.get(key) ?? []), ...names])]);
      return key;
    };
    const cardNames = (card: WorldCardAtChapterZero) => [card.name, ...(card.aliases ?? [])];
    const seeded = (card: WorldCardAtChapterZero): CharacterState => {
      const key = worldKey('character', cardNames(card), card.key);
      const existing = characters.get(key);
      if (existing) return existing;
      const state: CharacterState = { entryId: key, name: card.name, mainCharacter: Boolean(card.mainCharacter),
        things: new Map(), abilities: new Map(), history: [], lastChange: 0 };
      characters.set(key, state);
      return state;
    };
    // A thing named both on a character's slot and on its own card is one
    // holding, under the name the story writes it by, counted once; a chapter's
    // own tag meets it by name above.
    const addThing = (state: CharacterState, written: string, count: number) => {
      const card = cardNamed(thingCards, written);
      const name = card?.name ?? written;
      const key = worldKey('thing', card ? cardNames(card) : [written], card?.key ?? worldCardKey('thing', name));
      const held = state.things.get(key);
      if (held) { held.count = Math.max(held.count, count); return; }
      state.things.set(key, { entryId: key, name, count, equipped: false, events: [] });
    };
    const addAbility = (state: CharacterState, written: string) => {
      const card = cardNamed(abilityCards, written);
      const name = card?.name ?? written;
      const key = worldKey('ability', card ? cardNames(card) : [written], card?.key ?? worldCardKey('ability', name));
      if (state.abilities.has(key)) return;
      state.abilities.set(key, { entryId: key, name, stage: 'learned', sealed: false, usable: true, events: [] });
    };

    for (const card of characterCards) {
      const state = seeded(card);
      const rank = slot(card, 'rankLevel');
      if (rank) state.rank = { text: rank, events: [] };
      for (const held of listedSlotHoldings(slot(card, 'holds'))) addThing(state, held.name, held.count);
      for (const known of listedSlotHoldings(slot(card, 'knows'))) addAbility(state, known.name);
    }
    // A thing's own card names who holds it, so that link is read from the
    // record rather than guessed from the holder's written list.
    for (const card of thingCards) {
      const holder = slot(card, 'holder');
      if (!holder) continue;
      const owner = cardNamed(characterCards, holder);
      if (!owner) continue;
      // The whole value is the quantity, so "1,000" is a thousand: reading the
      // first run of digits would make it one, and the first chapter to spend
      // one would spend the lot. A value that is not a quantity is no count.
      const counted = toNumber(withoutGrouping(slot(card, 'count') ?? '').replace(/\s+/g, ''));
      addThing(seeded(owner), card.name, Number.isInteger(counted) && counted > 0 ? counted : 1);
    }
  }

  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    const changes = [...(chapter.holdingChanges ?? [])].filter(change => change.kind === HOLDING_CHANGE_KIND)
      .map((change, order) => ({ change, order }))
      .sort((left, right) => paragraphIndex(left.change.anchor.blockId) - paragraphIndex(right.change.anchor.blockId)
        || left.change.anchor.startOffset - right.change.anchor.startOffset || left.order - right.order)
      .map(item => item.change);
    for (const change of changes) {
      const { payload } = change;
      const holder = characterOf(payload.holder);
      const passage: HoldingPassage = {
        chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: change.id,
        blockId: change.anchor.blockId, text: change.anchor.selectedText,
      };
      const targetName = payload.target ? nameOf(payload.target) : undefined;
      const targetKind = holdingTargetKind(payload.verb);
      const event: HoldingEvent = {
        verb: payload.verb, passage,
        ...(targetName ? { target: targetName } : {}),
        ...(payload.target && targetKind ? { targetId: keyOf(payload.target, targetKind) } : {}),
        ...(payload.count ? { count: payload.count } : {}),
        ...(payload.level ? { level: payload.level } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
      };
      const flag = (kind: HoldingFlagKind, message: string) => flags.push({
        kind, message: `Chapter ${chapter.chapterNumber}: ${message}`, chapterId: chapter.id, chapterNumber: chapter.chapterNumber, recordId: change.id,
        entryIds: [holder.entryId, ...(payload.target?.entryId ? [payload.target.entryId] : [])],
      });
      const took = () => { holder.history.push(event); holder.lastChange = ++sequence; };
      const quoted = `‘${targetName}’`;

      if (payload.verb === 'rank') {
        if (!payload.level) continue;
        holder.rank = { text: payload.level, events: [...(holder.rank?.events ?? []), event] };
        took();
        continue;
      }
      if (!payload.target) continue;
      const kind = holdingTargetKind(payload.verb)!;
      const key = chapterZeroKey(holder, kind, targetName, keyOf(payload.target, kind));

      if (kind === 'thing') {
        const thing = holder.things.get(key);
        switch (payload.verb) {
          case 'has':
            if (!thing) { holder.things.set(key, { entryId: key, name: targetName!, count: payload.count ?? 1, equipped: false, events: [event] }); took(); }
            else if (payload.count && payload.count !== thing.count) flag('count-mismatch', `the story says ${holder.name} has ${payload.count} ${quoted}; the record says ${thing.count}. The record keeps ${thing.count}.`);
            break;
          case 'gained':
            if (!thing) { holder.things.set(key, { entryId: key, name: targetName!, count: payload.count ?? 1, equipped: false, events: [event] }); took(); }
            else if (payload.count) { thing.count += payload.count; thing.events.push(event); took(); }
            else flag('already-held', `${holder.name} gains ${quoted} again, but already holds it. It is not counted twice.`);
            break;
          case 'lost':
            if (!thing) { flag('not-held', `${holder.name} loses ${quoted}, which the record does not show them holding.`); break; }
            if (payload.count && payload.count < thing.count) { thing.count -= payload.count; thing.events.push(event); took(); break; }
            if (payload.count && payload.count > thing.count) flag('count-mismatch', `${holder.name} loses ${payload.count} ${quoted} but the record shows ${thing.count}. All of them are gone.`);
            holder.things.delete(key);
            took();
            break;
          case 'equipped':
          case 'unequipped':
            // Taking a thing in hand, or putting it away, shows the character has it: the first time the story shows it that way, it is recorded as held.
            if (!thing) { holder.things.set(key, { entryId: key, name: targetName!, count: payload.count ?? 1, equipped: payload.verb === 'equipped', events: [event] }); took(); break; }
            if (thing.equipped !== (payload.verb === 'equipped')) { thing.equipped = payload.verb === 'equipped'; thing.events.push(event); took(); }
            break;
        }
        continue;
      }

      const ability = holder.abilities.get(key);
      switch (payload.verb) {
        case 'knows':
          if (!ability || ability.stage === 'learning') {
            holder.abilities.set(key, { entryId: key, name: targetName!, stage: 'learned', ...(payload.level ? { level: payload.level } : ability?.level ? { level: ability.level } : {}), sealed: false, usable: true, events: [...(ability?.events ?? []), event] });
            took();
          } else if (payload.level && !ability.level) {
            ability.level = payload.level; ability.events.push(event); took();
          } else if (payload.level && ability.level && normalizeIdentityLabel(payload.level) !== normalizeIdentityLabel(ability.level)) {
            flag('level-differs', `the story gives ${holder.name}'s ${quoted} as ${payload.level}; the record says ${ability.level}. The record keeps ${ability.level}.`);
          }
          break;
        case 'learning':
          if (!ability) { holder.abilities.set(key, { entryId: key, name: targetName!, stage: 'learning', sealed: false, usable: false, events: [event] }); took(); }
          else if (ability.stage === 'learned') flag('already-learned', `${holder.name} starts learning ${quoted}, which they already know.`);
          break;
        case 'learned':
          if (!ability || ability.stage === 'learning') {
            holder.abilities.set(key, { entryId: key, name: targetName!, stage: 'learned', ...(payload.level ? { level: payload.level } : ability?.level ? { level: ability.level } : {}), sealed: false, usable: true, events: [...(ability?.events ?? []), event] });
            took();
          } else flag('already-learned', `${holder.name} learns ${quoted}, which they already know.`);
          break;
        case 'improved':
          // Moving up a stage while still learning is progress, as cultivation stories tell it: the stage is
          // recorded and the ability stays learning until it is learned.
          if (!ability) flag('not-learned', `${holder.name} improves ${quoted} before learning it.`);
          else if (ability.sealed) flag('sealed-state', `${holder.name} improves ${quoted} while it is sealed.`);
          else { ability.level = payload.level; ability.events.push(event); took(); }
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

    // The writer's closing list, checked against the record after this chapter.
    if (chapter.closingHoldings) {
      const main = mainCharacter();
      const recorded = main ? [...main.things.values(), ...main.abilities.values()] : [];
      const listed = chapter.closingHoldings.map(listedName).filter(Boolean);
      const recordedNames = (item: { entryId: string; name: string }) => {
        const entry = byId.get(item.entryId);
        // Every name the world knows a starting holding by counts here too: a
        // closing list may name it by any of them, and without those a correct
        // chapter reads as having lost one thing and gained another.
        return [...new Set([...(entry ? namesOf(entry) : [item.name]), ...(fromTheWorld.get(item.entryId) ?? [])])];
      };
      const matches = (names: readonly string[], value: string) => answersTo(names, value) || names.some(name => namesNearlyMatch(name, value));
      const who = main?.name ?? mainCharacterName ?? 'the main character';
      for (const item of recorded) {
        if (!listed.some(value => matches(recordedNames(item), value))) {
          flags.push({ kind: 'closing-unlisted', chapterId: chapter.id, chapterNumber: chapter.chapterNumber, entryIds: [item.entryId], name: item.name,
            message: `Chapter ${chapter.chapterNumber}: the writer's closing list for ${who} leaves out ‘${item.name}’. It may have been lost without a tag.` });
        }
      }
      for (const value of listed) {
        if (!recorded.some(item => matches(recordedNames(item), value))) {
          flags.push({ kind: 'closing-untagged', chapterId: chapter.id, chapterNumber: chapter.chapterNumber, name: value,
            message: `Chapter ${chapter.chapterNumber}: the writer's closing list for ${who} includes ‘${value}’, which no tag recorded.` });
        }
      }
    }
  }

  // Names close enough to be one entry, where a tag made at least one of them.
  const tagged = entries.filter(entry => entry.kind !== 'character' && entry.origin.source === 'tag');
  for (const [index, left] of tagged.entries()) {
    for (const right of tagged.slice(index + 1)) {
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

// ─── The packet section ─────────────────────────────────────────────────────

/** How many characters besides the main character the writer is shown, most recently changed first. */
export const HOLDINGS_SECTION_OTHER_CHARACTERS = 6;

const thingLabel = (thing: HeldThing) => `${thing.name}${thing.count > 1 ? ` ×${thing.count}` : ''}`;
const abilityLabel = (ability: KnownAbility) => {
  const notes = [ability.level, ability.sealed ? 'sealed' : undefined].filter(Boolean);
  return `${ability.name}${notes.length ? ` (${notes.join('; ')})` : ''}`;
};

/**
 * The Holdings section the writer reads: the main character first, even with
 * nothing recorded yet, then the characters whose holdings changed most
 * recently. Exact names only; how to use them is the Holdings skill's job.
 */
export function holdingsSection(state: HoldingsState, mainCharacterName?: string): HoldingsSection {
  const sectionOf = (character: Pick<CharacterHoldings, 'name' | 'mainCharacter' | 'rank' | 'things' | 'abilities'>): HoldingsSectionCharacter => {
    const inHand = character.things.filter(thing => thing.equipped).map(thingLabel);
    const carries = character.things.filter(thing => !thing.equipped).map(thingLabel);
    const knows = character.abilities.filter(ability => ability.stage === 'learned').map(abilityLabel);
    const learning = character.abilities.filter(ability => ability.stage === 'learning').map(abilityLabel);
    return {
      name: character.name,
      ...(character.mainCharacter ? { mainCharacter: true as const } : {}),
      ...(character.rank ? { rank: character.rank.text } : {}),
      ...(inHand.length ? { inHand } : {}),
      ...(carries.length ? { carries } : {}),
      ...(knows.length ? { knows } : {}),
      ...(learning.length ? { learning } : {}),
    };
  };
  const main = state.characters.find(character => character.mainCharacter);
  const others = state.characters
    .filter(character => !character.mainCharacter && (character.rank || character.things.length || character.abilities.length))
    .slice(0, HOLDINGS_SECTION_OTHER_CHARACTERS);
  return {
    characters: [
      sectionOf(main ?? { name: mainCharacterName ?? UNNAMED_MAIN_CHARACTER, mainCharacter: true, things: [], abilities: [] }),
      ...others.map(sectionOf),
    ],
  };
}
