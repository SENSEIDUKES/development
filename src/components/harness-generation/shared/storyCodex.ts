import type { CodexEntry } from '../../../narrative/holdings';
import type { Look } from '../../../narrative/appearances';
import type { HarnessChapter } from '../../../narrative/generation';
import {
  worldCardFacts,
  worldCardKey,
  worldCardsOfKind,
  worldIsOpenToTheReader,
  worldRulesCard,
  type WorldCard,
  type WorldRecord,
  type WorldCardSlot,
} from '../../../narrative/worldRecord';
import { isSpeakerOnText, SPEAKER_KIND } from '../../../narrative/speech';
import { harnessParagraphBlockId } from './chapterBody';
import { normalizeIdentityLabel } from './canonicalProjection';
import { factionNamed, type DeclaredFaction } from './factions';
import { deriveAppearances, type AppearanceFlag, type AppearancePassage, type AppearanceSubject } from './appearances';
import { deriveConditions, type ConditionFlag } from './conditions';
import { leftOutTagFlags, type LeftOutTagFlag } from './minorFigures';
import { derivePlaces } from './places';
import { deriveTies, tiesOfEntry } from './ties';
import {
  codexEntryIdsNamedBy,
  deriveHoldings,
  holdingTargetKind,
  isMinorEntry,
  type DeclaredCharacter,
  type HeldThing,
  type HoldingEvent,
  type HoldingFlag,
  type KnownAbility,
} from './holdings';

/**
 * The Codex: what the story's record knows, gathered for the reader. Nothing
 * here is stored; it is worked out again from the world the story opened with
 * and each chapter's current records (appearances and their looks, holding
 * changes and speakers today), so it always matches them and holds only what
 * they recorded. Each kind of information tag adds its own facts here as it is
 * built; the Codex never shows more than the record holds.
 *
 * **The world at Chapter 0** (SENSEI, 2026-10-21) is the record's first layer:
 * what the author filled in the Story Seed and the World Blueprint filled for
 * the blanks, in the Codex's own card kinds. It is complete before Chapter 1,
 * so the record knows the world rather than waiting for a chapter to invent
 * it. A card says plainly that it is the world as it began, and nothing the
 * chapters have not reached carries a passage yet.
 *
 * **The reader meets a card when the story reaches it** (SENSEI, 2026-10-22).
 * A reader of a generated novel is its creator, so a world the model wrote
 * would spoil the story it was written for: a card is held back until a
 * chapter brings it in, exactly as before this world existed, and only then
 * does it arrive with everything the world already knew about it. The record
 * underneath stays whole — a picture, a manga or a game reads the world
 * itself, not this. A world open to its reader (`openToTheReader`, for an
 * author expanding a novel they already wrote) shows every card from the
 * start.
 *
 * A card is reached the way it always was: a character stepped onto the page,
 * spoke, or held, used or learned something; a thing stepped onto the page or
 * changed hands. Whoever and whatever arrives after Chapter 0 is still created
 * by the chapter that brings it in.
 */

/** A place in the story a fact came from: the paragraph, and the words the record sits on. */
export interface CodexPassage {
  chapterNumber: number;
  blockId: string;
  text: string;
}

/** What the record has heard a character say. */
export interface CodexVoice {
  /** Spoken lines the record gives them. */
  lines: number;
  /** The chapters they speak in, in order. */
  chapters: number[];
  /** Their first spoken words in the story. */
  first: CodexPassage;
}

/** A look as the record wrote it down, with the passage it was read from. */
export interface CodexLook extends Look {
  passage: CodexPassage;
  /** Where the passage differs from the look the story's author declared. */
  conflict?: string;
  /** The look is its world card's own, not one read from a passage. */
  fromCard?: true;
}

/**
 * The world card behind a Codex card a reader promoted from a minor figure:
 * it entered the world in the chapter it was promoted in, and its reader may
 * fill its slots (SENSEI, 2026-11-11: "the reader fills, the rest stays blank").
 */
export interface CodexPromotedCard {
  /** The world card's key. */
  key: string;
  kind: 'character' | 'thing' | 'place';
  enteredInChapter: number;
  /** Every slot filled so far, by field name. */
  slots: Record<string, string>;
}

/**
 * A minor figure: someone or something the story uses without tracking it
 * (SENSEI, 2026-11-11). In a story with a world record, whoever and whatever a
 * chapter brings in that has no card is kept this lightly: what the prose
 * calls it, the sentence that introduced it, and the chapters it was in. No
 * look, status, place or ties are shown for it. A reader who cares about one
 * promotes it to a card.
 */
export interface CodexMinor {
  /** Its Codex entry's ID, or its kind and name when no tag ever made it an entry. */
  key: string;
  name: string;
  kind: 'character' | 'thing' | 'place';
  /** The sentence that introduced it. */
  introduced: CodexPassage;
  /** The chapters it was in, in order. */
  chapters: number[];
  /** Whether it can be promoted: it has a Codex entry to become a card. */
  promotable: boolean;
}

/** Where someone or something stepped onto the page, how it looks now, and each change to its look. */
export interface CodexAppearance {
  first: CodexPassage;
  /** The writer's own description when it first stepped onto the page, kept by code: shown until a look is written. */
  description?: string;
  /** The latest look written down; absent until one is. */
  look?: CodexLook;
  /** A tag changed it after that look was written: Manifest writes it again first. */
  lookStale?: true;
  /** Each change to its look the writer tagged, in story order. */
  changes: Array<{ change: string; passage: CodexPassage }>;
}

/**
 * One fact the world opened with. It has no passage: no chapter had happened
 * when the Story Seed and the World Blueprint wrote it down.
 */
export interface CodexWorldFact {
  slot: WorldCardSlot;
  value: string;
}

/**
 * A card the world opened with that holds only the world's own facts: places,
 * the Bestiary's species, the abilities the world already had, and the World
 * rules sheet. A chapter can reach an ability without adding to its card, so
 * it records where the story met it.
 */
export interface CodexWorldCard {
  key: string;
  name: string;
  aliases?: string[];
  /** Where a chapter reached it. Absent while it is only part of the world the story opened with. */
  firstSeen?: CodexPassage;
  /** The facts the world opened with, in its card kind's own order. */
  atChapterZero: CodexWorldFact[];
}

/** A condition a character carries now: its name, how it shows at this point, and the sentence that began it when the page did. */
export interface CodexCondition {
  name: string;
  showing?: string;
  passage?: CodexPassage;
}

export interface CodexCharacter {
  /** Stable for this story: the Codex entry's ID, or the name the record knows them by until one exists. */
  key: string;
  name: string;
  mainCharacter: boolean;
  /** Where the record first meets them. Absent while they are only part of the world the story opened with. */
  firstSeen?: CodexPassage;
  /** What the world already knew about them at Chapter 0. */
  atChapterZero?: CodexWorldFact[];
  /** Their card, when a reader promoted them to one. */
  promoted?: CodexPromotedCard;
  /** Their appearance on the page, and their look. Absent for someone met only by their words or holdings. */
  appearance?: CodexAppearance;
  rank?: { text: string; events: HoldingEvent[] };
  /**
   * What they carry as of the latest chapter: each condition of their card
   * that still stands, with how it shows at the stage its course has reached,
   * and each one the page began and has not ended, with the sentence that
   * began it. Where a course goes next is the story's to tell, so it is not
   * here.
   */
  conditions?: CodexCondition[];
  /** Where they are now, from the latest place tag, with the passage where they arrived. Absent while no tag gave one. */
  place?: { text: string; passage: CodexPassage };
  /** How they stand with others now, from each pair's latest tie tag, with the passage that showed it. Absent while no tag gave one. */
  ties?: Array<{ with: string; text: string; passage: CodexPassage }>;
  /** Things they hold now, in the order they came to hold them. */
  things: HeldThing[];
  /** Abilities they are learning or know. */
  abilities: KnownAbility[];
  voice?: CodexVoice;
  /** Every holding change that took effect for them, in story order. */
  chronicle: HoldingEvent[];
}

/** One change to a thing, with who it happened to. */
export interface CodexItemEvent extends HoldingEvent {
  holder: string;
}

export interface CodexItem {
  key: string;
  name: string;
  /** Who holds it now, if anyone. */
  holder?: { key: string; name: string; mainCharacter: boolean };
  count: number;
  /** In hand, worn or in use. */
  equipped: boolean;
  /** Everything the record saw happen to it, in story order. */
  events: CodexItemEvent[];
  /** Where the record first meets it. Absent while it is only part of the world the story opened with. */
  firstSeen?: CodexPassage;
  /** What the world already knew about it at Chapter 0. */
  atChapterZero?: CodexWorldFact[];
  /** Its card, when a reader promoted it to one. */
  promoted?: CodexPromotedCard;
  /** Its appearance on the page, and its look. */
  appearance?: CodexAppearance;
}

/**
 * A place: one the world opened with, or one a chapter's tags brought in, one
 * card either way, with its look once it stepped onto the page and who the
 * record has there now.
 */
export interface CodexPlace extends CodexWorldCard {
  /** Its card, when a reader promoted it to one. */
  promoted?: CodexPromotedCard;
  /** Its appearance on the page, and its look. */
  appearance?: CodexAppearance;
  /** Who is here now: everyone whose latest place tag names it. */
  here: Array<{ key: string; name: string; mainCharacter: boolean }>;
}

/** A check the record's plain rules flagged (holdings, appearances or conditions), with the paragraph it is about when it has one. */
export type CodexCheck = (HoldingFlag | AppearanceFlag | ConditionFlag | LeftOutTagFlag) & { blockId?: string };

/**
 * A sect, clan, faction or other body the record knows: one the world opened
 * with, or one the story has met by its voice (a group the writer tagged as
 * speaking).
 */
export interface CodexFaction {
  key: string;
  name: string;
  aliases?: string[];
  firstSeen?: CodexPassage;
  /** What the world already knew about it at Chapter 0. */
  atChapterZero?: CodexWorldFact[];
  voice?: CodexVoice;
}

export interface StoryCodexRecord {
  /** The main character first, then everyone the story has met, then the rest of the world it opened with. Named beasts are characters too. */
  characters: CodexCharacter[];
  /** Sects, clans and other factions. */
  factions: CodexFaction[];
  /** Things, in the order the story met them, then the rest of the world it opened with. */
  items: CodexItem[];
  /** The abilities the world opened with that the story has reached. What each character knows is on their own card. */
  abilities: CodexWorldCard[];
  /** The places the world opened with, then every place the story's tags brought in, in the order the story met them. */
  places: CodexPlace[];
  /** The Bestiary: the species natural to this world. */
  species: CodexWorldCard[];
  /** Minor figures: who and what the story used that has no card, in the order the story met them. Empty in a story with no world record. */
  minor: CodexMinor[];
  /** The one World rules sheet every other card refers to, when the world states one. */
  worldRules?: CodexWorldFact[];
  /** What the record's plain rules flagged, for checking a story against its chapters. */
  checks: CodexCheck[];
}

/** What the Codex reads from a chapter. */
export type StoryCodexChapter = Pick<HarnessChapter, 'id' | 'chapterNumber' | 'paragraphs' | 'speakers' | 'holdingChanges' | 'closingHoldings' | 'appearances' | 'looks' | 'statuses' | 'places' | 'ties' | 'tagging'>;

const paragraphOrder = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);
const comesBefore = (left: CodexPassage, right: CodexPassage) =>
  left.chapterNumber - right.chapterNumber || paragraphOrder(left.blockId) - paragraphOrder(right.blockId);
const passageOf = (event: HoldingEvent): CodexPassage => ({
  chapterNumber: event.passage.chapterNumber, blockId: event.passage.blockId, text: event.passage.text,
});
const appearancePassage = (passage: AppearancePassage): CodexPassage => ({
  chapterNumber: passage.chapterNumber, blockId: passage.blockId, text: passage.text,
});
const appearanceOf = (subject: AppearanceSubject): CodexAppearance => ({
  first: appearancePassage(subject.first),
  ...(subject.first.description ? { description: subject.first.description } : {}),
  ...(subject.lookStale ? { lookStale: true as const } : {}),
  ...(subject.look ? { look: {
    summary: subject.look.summary, traits: { ...subject.look.traits }, passage: appearancePassage(subject.look.passage),
    ...(subject.look.conflict ? { conflict: subject.look.conflict } : {}),
    ...(subject.look.fromCard ? { fromCard: true as const } : {}),
  } } : {}),
  changes: subject.changes.map(change => ({ change: change.change, passage: appearancePassage(change.passage) })),
});

export function deriveStoryCodex({ entries, chapters, world, mainCharacterName, declared = [], declaredFactions = [] }: {
  entries: readonly CodexEntry[];
  chapters: readonly StoryCodexChapter[];
  /** The world the story opened with, from its Story Seed and World Blueprint. */
  world?: WorldRecord;
  /** The story's main character, for speech the record gives them before any entry names them. */
  mainCharacterName?: string;
  /** The characters the story declares, whose aliases let a speaker's other names find them. */
  declared?: readonly DeclaredCharacter[];
  /** The factions the story declares, so a group that speaks is never taken for a character. */
  declaredFactions?: readonly DeclaredFaction[];
}): StoryCodexRecord {
  const ordered = [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber);
  // Chapter-derived holdings only, deliberately. The Chapter 0 world reaches a
  // card through its own layer below (`atChapterZero`), and a reader meets a
  // card when the story reaches it — which is read from the events a chapter's
  // tags record. Seeding these from the world makes a tag that only confirms
  // what the world already said record nothing, so the card it named would
  // never open to the reader. A chapter changing what a character started with
  // (improving or sealing a starting ability) is therefore still read as a
  // change to something unlearned here; mending that means teaching this
  // record's visibility that a tag naming a card reaches it whether or not the
  // holding moved, which is its own change to the no-spoiler rule.
  const holdings = deriveHoldings({ entries, chapters: ordered, mainCharacterName });
  // The check list is not about what a reader may see yet: it asks whether a
  // chapter's changes can be true, so it reads the full record, Chapter 0
  // included — the same record the writer and the Holdings fixer read. Read
  // from the chapters alone, a technique the hero opens the story knowing is
  // flagged as unlearned in every chapter that uses it.
  const checked = world ? deriveHoldings({ entries, chapters: ordered, mainCharacterName, worldAtChapterZero: world }) : holdings;
  const appeared = deriveAppearances({ entries, chapters: ordered, declaredFactions, world });

  // A card a reader promoted entered after Chapter 0: it carries its slots so they can fill them.
  const promotedOf = (card: WorldCard): { promoted?: CodexPromotedCard } => (card.enteredInChapter > 0 && (card.kind === 'character' || card.kind === 'thing' || card.kind === 'place')
    ? { promoted: { key: card.key, kind: card.kind, enteredInChapter: card.enteredInChapter, slots: { ...card.slots } } } : {});
  // Minor figures: in a story with a world record, whoever and whatever has no
  // card. Each leaves its kind's list for the Minor one, below.
  const hasWorld = Boolean(world?.cards.length);
  const minorEntryIds = new Set(entries.filter(entry => isMinorEntry(entry, world)).map(entry => entry.id));
  const chaptersNaming = new Map<string, Set<number>>();
  for (const chapter of ordered) {
    for (const id of codexEntryIdsNamedBy(chapter)) chaptersNaming.set(id, (chaptersNaming.get(id) ?? new Set<number>()).add(chapter.chapterNumber));
  }
  const minorOf = (kind: CodexMinor['kind'], card: { key: string; name: string; firstSeen?: CodexPassage }, more: readonly number[] = []): CodexMinor[] => (card.firstSeen ? [{
    key: card.key, name: card.name, kind, introduced: card.firstSeen,
    chapters: [...new Set([card.firstSeen.chapterNumber, ...(chaptersNaming.get(card.key) ?? []), ...more])].sort((left, right) => left - right),
    // Someone only speaker tags name has no Codex entry: the Codex lists them
    // under the name they speak by, and promotion makes their entry with the card.
    promotable: minorEntryIds.has(card.key) || (kind === 'character' && card.key.startsWith('character:')),
  }] : []);

  type Working = Omit<CodexCharacter, 'firstSeen'> & { firstSeen?: CodexPassage; names: Set<string> };
  const characters = new Map<string, Working>();
  const add = (character: Working) => { characters.set(character.key, character); return character; };
  // A card the world opened with takes its Codex entry's ID once one names it,
  // so one person is one card however the story reaches them.
  // The entry made with the card (`cardKey`) is the card's own, so two cards
  // whose names read alike each keep theirs. A card with no entry of its own
  // (a record read without its entries) is found by name, among the entries
  // that are no other card's.
  const entryOfCard = (kind: CodexEntry['kind'], card: { key: string }, names: readonly string[]) =>
    entries.find(candidate => candidate.kind === kind && candidate.cardKey === card.key)
    ?? entries.find(candidate => candidate.kind === kind && !candidate.cardKey
      && [candidate.name, ...(candidate.aliases ?? [])].some(other => names.includes(normalizeIdentityLabel(other))));
  const labelsOf = (card: { name: string; aliases?: string[] }) =>
    [card.name, ...(card.aliases ?? [])].map(normalizeIdentityLabel);

  // The card each character is, by the key the Codex lists them under.
  const cardOfCharacter = new Map<string, string>();
  // The world at Chapter 0 comes first: the Codex opens with the world the
  // story was given, and the chapters add to these same cards.
  for (const card of worldCardsOfKind(world, 'character')) {
    const labels = labelsOf(card);
    const entry = entryOfCard('character', card, labels);
    // Two cards whose names read alike once normalized ("Phoenix (East)" and
    // "Phoenix (West)") are still two people: the second keeps the key the
    // world gave it rather than taking the first's card.
    const named = entry?.id ?? `character:${labels[0]}`;
    const key = characters.has(named) ? card.key : named;
    cardOfCharacter.set(key, card.key);
    add({
      key,
      name: entry?.name ?? card.name,
      mainCharacter: Boolean(card.mainCharacter || entry?.mainCharacter),
      atChapterZero: worldCardFacts(card),
      ...promotedOf(card),
      things: [], abilities: [], chronicle: [],
      names: new Set([...labels, ...(entry ? labelsOf(entry) : [])]),
    });
  }

  for (const held of holdings.characters) {
    const entry = entries.find(candidate => candidate.id === held.entryId);
    const labels = [held.name, ...(entry?.aliases ?? [])].map(normalizeIdentityLabel);
    // Someone the world opened with keeps their card; their holdings join it.
    // Only a Chapter 0 card is matched by name: two entries of the same name
    // stay two cards, as they did before, and the checks flag them.
    const known = characters.get(held.entryId)
      ?? [...characters.values()].find(candidate => candidate.atChapterZero && labels.some(label => candidate.names.has(label)));
    const character = known ?? add({
      key: held.entryId, name: held.name, mainCharacter: held.mainCharacter,
      things: [], abilities: [], chronicle: [], names: new Set(labels),
    });
    if (held.rank) character.rank = held.rank;
    character.things = held.things;
    character.abilities = held.abilities;
    character.chronicle = held.history;
    if (held.mainCharacter) character.mainCharacter = true;
    for (const label of labels) character.names.add(label);
    const first = held.history[0] && passageOf(held.history[0]);
    if (first && (!character.firstSeen || comesBefore(first, character.firstSeen) < 0)) character.firstSeen = first;
  }

  // Who a speaker is: the main character, an entry by any of its names, a declared character
  // by an alias, or someone the record knows only by the name they speak under.
  const main = () => [...characters.values()].find(character => character.mainCharacter);
  const declaredNames = (name: string) => {
    const key = normalizeIdentityLabel(name);
    const match = declared.find(character => [character.name, ...(character.aliases ?? [])].some(other => normalizeIdentityLabel(other) === key));
    return match ? [match.name, ...(match.aliases ?? [])].map(normalizeIdentityLabel) : [key];
  };
  const speakerOf = (name: string, protagonist: boolean): Working => {
    if (protagonist) {
      const existing = main();
      if (existing) return existing;
      const entry = entries.find(candidate => candidate.kind === 'character' && candidate.mainCharacter);
      const named = entry?.name ?? mainCharacterName ?? name;
      return add({ key: entry?.id ?? `character:${normalizeIdentityLabel(named)}`, name: named, mainCharacter: true, things: [], abilities: [], chronicle: [], names: new Set([named, name].map(normalizeIdentityLabel)) });
    }
    const keys = declaredNames(name);
    const existing = [...characters.values()].find(character => keys.some(key => character.names.has(key)));
    if (existing) return existing;
    const entry = entries.find(candidate => candidate.kind === 'character'
      && [candidate.name, ...(candidate.aliases ?? [])].some(other => keys.includes(normalizeIdentityLabel(other))));
    return add({ key: entry?.id ?? `character:${keys[0]}`, name: entry?.name ?? name.trim(), mainCharacter: Boolean(entry?.mainCharacter), things: [], abilities: [], chronicle: [], names: new Set(keys) });
  };

  // Who stepped onto the page: met there, with their look. A group is never a character.
  for (const subject of appeared.subjects) {
    if (subject.entity !== 'character' || factionNamed(subject.name, declaredFactions)) continue;
    const entry = subject.entryId ? entries.find(candidate => candidate.id === subject.entryId) : undefined;
    const names = [subject.name, ...(entry?.aliases ?? [])].map(normalizeIdentityLabel);
    const character = (subject.entryId ? characters.get(subject.entryId) : undefined)
      ?? (subject.mainCharacter ? main() : undefined)
      ?? [...characters.values()].find(candidate => names.some(name => candidate.names.has(name)))
      ?? add({ key: subject.key, name: subject.name, mainCharacter: subject.mainCharacter, things: [], abilities: [], chronicle: [], names: new Set(names) });
    character.appearance = appearanceOf(subject);
    const first = appearancePassage(subject.first);
    if (!character.firstSeen || comesBefore(first, character.firstSeen) < 0) character.firstSeen = first;
  }

  // Someone met only by a status, a place or a tie tag (a guard who falls,
  // never tagged otherwise) is still met there: the tag's sentence is where
  // the record first sees them. A tie names two, and meets both. A group is
  // never a character.
  for (const chapter of ordered) {
    const named = [
      ...[...chapter.statuses ?? [], ...chapter.places ?? []].map(record => ({ record, subject: record.payload.subject })),
      ...(chapter.ties ?? []).flatMap(record => [{ record, subject: record.payload.subject }, { record, subject: record.payload.other }]),
    ];
    for (const { record, subject } of named) {
      const entry = subject.entryId ? entries.find(candidate => candidate.id === subject.entryId) : undefined;
      if ((entry && entry.kind !== 'character') || factionNamed(subject.name, declaredFactions)) continue;
      const names = [entry?.name ?? subject.name, subject.name, ...(entry?.aliases ?? [])].map(normalizeIdentityLabel);
      const character = (subject.entryId ? characters.get(subject.entryId) : undefined)
        ?? (entry?.mainCharacter ? main() : undefined)
        ?? [...characters.values()].find(candidate => names.some(name => candidate.names.has(name)))
        ?? add({
          key: subject.entryId ?? `character:${names[0]}`, name: entry?.name ?? subject.name, mainCharacter: Boolean(entry?.mainCharacter),
          things: [], abilities: [], chronicle: [], names: new Set(names),
        });
      const passage = { chapterNumber: chapter.chapterNumber, blockId: record.anchor.blockId, text: record.anchor.selectedText };
      if (!character.firstSeen || comesBefore(passage, character.firstSeen) < 0) character.firstSeen = passage;
    }
  }

  // A faction: one the world opened with, one the story declares (by name or
  // alias), or a name whose last word names a body of people.
  const factions = new Map<string, CodexFaction>();
  for (const card of worldCardsOfKind(world, 'faction')) {
    const named = `faction:${normalizeIdentityLabel(card.name)}`;
    // As for a character: two bodies whose names normalize alike stay two.
    const key = factions.has(named) ? card.key : named;
    factions.set(key, {
      key, name: card.name,
      ...(card.aliases?.length ? { aliases: [...card.aliases] } : {}),
      atChapterZero: worldCardFacts(card),
    });
  }
  const factionOf = (name: string) => {
    const named = factionNamed(name, declaredFactions);
    if (!named) return undefined;
    const id = `faction:${normalizeIdentityLabel(named)}`;
    const faction = factions.get(id)
      // A name the world knows under another of its names keeps that one card.
      ?? [...factions.values()].find(candidate => labelsOf(candidate as { name: string; aliases?: string[] }).includes(normalizeIdentityLabel(named)))
      ?? { key: id, name: named };
    factions.set(faction.key, faction);
    return faction;
  };

  for (const chapter of ordered) {
    const lines = (chapter.speakers ?? [])
      .filter(record => record.kind === SPEAKER_KIND)
      // Paragraph ids count from 1 (`c{n}-p{i}`).
      .map(record => ({ record, index: Number(record.anchor.blockId.match(/-p(\d+)$/)?.[1] ?? 0) - 1 }))
      .filter(({ record, index }) => index >= 0 && record.anchor.blockId === harnessParagraphBlockId(chapter.chapterNumber, index)
        && isSpeakerOnText(record, record.anchor.blockId, chapter.paragraphs[index] ?? ''))
      .sort((left, right) => left.index - right.index || left.record.anchor.startOffset - right.record.anchor.startOffset);
    for (const { record } of lines) {
      const character = (!record.payload.protagonist && factionOf(record.payload.speaker)) || speakerOf(record.payload.speaker, record.payload.protagonist);
      const passage: CodexPassage = { chapterNumber: chapter.chapterNumber, blockId: record.anchor.blockId, text: record.anchor.selectedText };
      if (!character.voice) character.voice = { lines: 0, chapters: [], first: passage };
      character.voice.lines += 1;
      if (character.voice.chapters.at(-1) !== chapter.chapterNumber) character.voice.chapters.push(chapter.chapterNumber);
      if (!character.firstSeen || comesBefore(passage, character.firstSeen) < 0) character.firstSeen = passage;
    }
  }

  // What the story has met comes first, in its own order; then the rest of the
  // world it opened with, in the order the Seed and Blueprint wrote it.
  const inRecordOrder = <T extends { firstSeen?: CodexPassage }>(left: T, right: T, index: (value: T) => number) =>
    (left.firstSeen ? 0 : 1) - (right.firstSeen ? 0 : 1)
    || (left.firstSeen && right.firstSeen ? comesBefore(left.firstSeen, right.firstSeen) : 0)
    || index(left) - index(right);

  // A card the story has not reached is the reader's spoiler, so it waits
  // (SENSEI, 2026-10-22). The world stays whole underneath: only this reading
  // of it is held back, and a world open to its reader (an author expanding
  // their own novel) shows every card from the start.
  const open = worldIsOpenToTheReader(world);
  const reached = (card: { firstSeen?: CodexPassage }) => open || Boolean(card.firstSeen);

  const factionOrder = [...factions.values()];
  const factionList = factionOrder
    // A card the world opened with belongs to it even when its name is all the
    // world knows, as it does for a character or a thing.
    .filter(faction => ((faction.firstSeen && faction.voice) || faction.atChapterZero) && reached(faction))
    .sort((left, right) => inRecordOrder(left, right, faction => factionOrder.indexOf(faction)));

  // How each is now, and where: the latest status and place tags, by their entry or any name they answer to.
  // What each character carries as of the latest chapter: their card's conditions at the stage the
  // chapter count gives, and the ones the page began, less the ones it ended. By their entry or any name.
  const carried = deriveConditions({ world, entries, chapters: ordered, chapterNumber: ordered.at(-1)?.chapterNumber ?? 1 });
  const conditionsFor = (character: Working): CodexCondition[] => (cardOfCharacter.has(character.key)
    // Someone with a card carries what that card's character carries, and no one else's, however alike two names read.
    ? carried.characters.find(candidate => candidate.cardKey === cardOfCharacter.get(character.key))
    : carried.characters.find(candidate => !candidate.cardKey && candidate.key === character.key)
      ?? carried.characters.find(candidate => !candidate.cardKey && character.names.has(normalizeIdentityLabel(candidate.name))))?.conditions
    .map(({ name, showing, began }) => ({
      name, ...(showing ? { showing } : {}),
      ...(began ? { passage: { chapterNumber: began.chapterNumber, blockId: began.blockId, text: began.text } } : {}),
    })) ?? [];
  const wherever = derivePlaces(ordered, entries);
  const placeFor = (character: Working) => wherever.get(character.key)
    ?? [...character.names].map(name => wherever.get(`character:${name}`)).find(Boolean);
  const tied = deriveTies(ordered, entries);
  const everyone = [...characters.values()].filter(character => (character.firstSeen || character.atChapterZero) && reached(character));
  // Someone with no card, in a world that has cards, is a minor figure.
  const isMinorCharacter = (character: Working) => hasWorld && !character.atChapterZero && !character.mainCharacter;
  const minorCharacters = everyone.filter(isMinorCharacter).flatMap(character => minorOf('character', character, character.voice?.chapters));
  const known = everyone.filter(character => !isMinorCharacter(character));
  const roster: CodexCharacter[] = known
    .sort((left, right) => Number(right.mainCharacter) - Number(left.mainCharacter)
      || inRecordOrder(left, right, character => known.indexOf(character)))
    .map(({ names, ...character }) => {
      const conditions = conditionsFor({ ...character, names });
      const place = placeFor({ ...character, names });
      const ties = tiesOfEntry(tied, { id: character.key, name: character.name, aliases: [...names] });
      const passage = (from: { chapterNumber: number; blockId: string; text: string }) => ({ chapterNumber: from.chapterNumber, blockId: from.blockId, text: from.text });
      return {
        ...character,
        ...(conditions.length ? { conditions } : {}),
        ...(place ? { place: { text: place.place, passage: passage(place.passage) } } : {}),
        ...(ties.length ? { ties: ties.map(tie => ({ with: tie.with, text: tie.tie, passage: passage(tie.passage) })) } : {}),
      };
    });

  // Things: what the world opened with, then every change the record saw,
  // gathered by the thing, with its holder now.
  const items = new Map<string, CodexItem>();
  // Only the things the world opened with are matched by name, so two entries
  // of the same name stay two cards, as they did before.
  const chapterZeroItems = new Map<string, string>();
  const itemOf = (key: string, name: string): CodexItem => {
    const existing = items.get(key) ?? items.get(chapterZeroItems.get(normalizeIdentityLabel(name)) ?? '');
    if (existing) return existing;
    const item: CodexItem = { key, name, count: 0, equipped: false, events: [] };
    items.set(key, item);
    return item;
  };
  for (const card of worldCardsOfKind(world, 'thing')) {
    const labels = labelsOf(card);
    const entry = entryOfCard('thing', card, labels);
    // As for a character: two things whose names normalize alike stay two
    // cards, so the world's own key carries the second.
    const named = entry?.id ?? `thing:${labels[0]}`;
    const key = items.has(named) ? card.key : named;
    const item: CodexItem = { key, name: entry?.name ?? card.name, count: 0, equipped: false, events: [] };
    items.set(key, item);
    // A chapter's events find a Chapter 0 thing by name; the first card of a
    // name keeps it.
    for (const label of labels) if (!chapterZeroItems.has(label)) chapterZeroItems.set(label, key);
    item.atChapterZero = worldCardFacts(card);
    if (promotedOf(card).promoted) item.promoted = promotedOf(card).promoted;
    const count = Number(card.slots.count);
    if (Number.isInteger(count) && count > 0) item.count = count;
  }
  // A minor figure's own things are still things the story showed: they are read from everyone, not only the roster.
  const holders = [...roster, ...everyone.filter(isMinorCharacter)];
  for (const character of holders) {
    for (const event of character.chronicle) {
      if (!event.targetId || !event.target || holdingTargetKind(event.verb) !== 'thing') continue;
      const item = itemOf(event.targetId, event.target);
      item.events.push({ ...event, holder: character.name });
      if (!item.firstSeen || comesBefore(passageOf(event), item.firstSeen) < 0) item.firstSeen = passageOf(event);
    }
    for (const thing of character.things) {
      const item = items.get(thing.entryId) ?? items.get(chapterZeroItems.get(normalizeIdentityLabel(thing.name)) ?? '');
      if (!item) continue;
      item.holder = { key: character.key, name: character.name, mainCharacter: character.mainCharacter };
      item.count = thing.count;
      item.equipped = thing.equipped;
    }
  }
  // Things that stepped onto the page, held or not, with their looks.
  for (const subject of appeared.subjects) {
    if (subject.entity !== 'thing') continue;
    const first = appearancePassage(subject.first);
    const item = itemOf(subject.key, subject.name);
    item.appearance = appearanceOf(subject);
    if (!item.firstSeen || comesBefore(first, item.firstSeen) < 0) item.firstSeen = first;
  }
  const itemOrder = [...items.values()];
  const isMinorItem = (item: CodexItem) => hasWorld && !item.atChapterZero;
  const minorItems = itemOrder.filter(item => reached(item) && isMinorItem(item)).flatMap(item => minorOf('thing', item, item.events.map(event => event.passage.chapterNumber)));
  const itemList = itemOrder
    .filter(item => reached(item) && !isMinorItem(item))
    .map(item => ({ ...item, events: [...item.events].sort((left, right) => comesBefore(passageOf(left), passageOf(right))) }))
    .sort((left, right) => inRecordOrder(left, right, item => itemOrder.findIndex(candidate => candidate.key === item.key)));

  // An ability the world opened with is reached by a holdings tag: `knows`,
  // `learning` or `learned` puts it on a character's card, so the story has
  // met the ability itself and its own card opens with it.
  // What a chapter's words can name: the world's own key for the name as the
  // world writes it, and the looser label the record compares names by, since
  // reading a tag drops a trailing parenthetical (`holdingName`) and a chapter
  // teaching "Phoenix Cry (East)" arrives as "Phoenix Cry". A card is reached
  // by either, so a card the world qualifies is still reachable, while an
  // identity two cards share reaches neither of them (below).
  const abilityNames = (card: { name: string; aliases?: string[] }) => [card.name, ...(card.aliases ?? [])];
  const abilityIdentities = (card: { name: string; aliases?: string[] }) =>
    new Set(abilityNames(card).flatMap(name => [worldCardKey('ability', name), normalizeIdentityLabel(name)]));
  const abilityFirstSeen = new Map<string, CodexPassage>();
  // Whoever learns it reaches it: a minor figure's chapters are the story's too.
  for (const character of everyone) {
    for (const ability of character.abilities) {
      for (const event of ability.events) {
        for (const identity of [worldCardKey('ability', ability.name), normalizeIdentityLabel(ability.name)]) {
          const first = abilityFirstSeen.get(identity);
          if (!first || comesBefore(passageOf(event), first) < 0) abilityFirstSeen.set(identity, passageOf(event));
        }
      }
    }
  }

  // The Bestiary waits for its own tag: until a chapter can name a species,
  // nothing in it reaches one, so a reader meets them only in a world open to
  // them. An ability opens when a chapter reaches it, like every other card
  // the story meets; a place, below, when it steps onto the page or someone
  // arrives in it.
  const worldCards = (kind: 'ability' | 'species'): CodexWorldCard[] => {
    const all = worldCardsOfKind(world, kind);
    // An identity two cards share is a name those words cannot tell apart
    // ("Phoenix Cry (East)" and "Phoenix Cry (West)" are both reached by
    // "Phoenix Cry"), so it names both or neither and reaches neither: the
    // reader is never shown a card the story may not have reached. Each still
    // reads on the card of whoever knows it, and an identity that names one
    // card alone reaches that card.
    const claims = new Map<string, number>();
    if (kind === 'ability') {
      for (const card of all) {
        for (const identity of abilityIdentities(card)) claims.set(identity, (claims.get(identity) ?? 0) + 1);
      }
    }
    const cards = all.map((card): CodexWorldCard => {
      const first = kind === 'ability'
        ? [...abilityIdentities(card)].filter(identity => claims.get(identity) === 1)
          .map(identity => abilityFirstSeen.get(identity))
          .filter((passage): passage is CodexPassage => Boolean(passage))
          .sort(comesBefore)[0]
        : undefined;
      return {
        // The world's own key: nothing else names these cards, and two names
        // that normalize alike would otherwise share one.
        key: card.key,
        name: card.name,
        ...(card.aliases?.length ? { aliases: [...card.aliases] } : {}),
        ...(first ? { firstSeen: first } : {}),
        atChapterZero: worldCardFacts(card),
      };
    });
    return cards.filter(reached).sort((left, right) => inRecordOrder(left, right, card => cards.indexOf(card)));
  };
  // Places: the world's own cards first, then every place a chapter's tags
  // brought in, one card a place, with its look and who is there now. A tag
  // reaches a world card by its name or an alias, so the Blueprint's place is
  // the one the story walks into, never a second card beside it.
  const places = new Map<string, CodexPlace>();
  const placeByLabel = new Map<string, string>();
  // The places that are cards; any other place a tag named is a minor one.
  const cardPlaces = new Set<string>();
  for (const card of worldCardsOfKind(world, 'place')) {
    const labels = labelsOf(card);
    const entry = entryOfCard('place', card, labels);
    const named = entry?.id ?? card.key;
    const key = places.has(named) ? card.key : named;
    places.set(key, {
      key, name: entry?.name ?? card.name, ...(card.aliases?.length ? { aliases: [...card.aliases] } : {}),
      atChapterZero: worldCardFacts(card), ...promotedOf(card), here: [],
    });
    cardPlaces.add(key);
    for (const label of [...labels, ...(entry ? labelsOf(entry) : [])]) if (!placeByLabel.has(label)) placeByLabel.set(label, key);
  }
  const placeOf = (entryId: string | undefined, name: string): CodexPlace => {
    const entry = entryId ? entries.find(candidate => candidate.id === entryId) : undefined;
    const labels = [name, ...(entry ? [entry.name, ...(entry.aliases ?? [])] : [])].map(normalizeIdentityLabel);
    const found = (entryId ? places.get(entryId) : undefined) ?? labels.map(label => places.get(placeByLabel.get(label) ?? '')).find(Boolean);
    if (found) return found;
    const key = entryId ?? `place:${labels[0]}`;
    const place: CodexPlace = { key, name: entry?.name ?? name, atChapterZero: [], here: [] };
    places.set(key, place);
    for (const label of labels) if (!placeByLabel.has(label)) placeByLabel.set(label, key);
    return place;
  };
  const meets = (place: CodexPlace, passage: CodexPassage) => {
    if (!place.firstSeen || comesBefore(passage, place.firstSeen) < 0) place.firstSeen = passage;
  };
  for (const subject of appeared.subjects) {
    if (subject.entity !== 'place') continue;
    const place = placeOf(subject.entryId, subject.name);
    place.appearance = appearanceOf(subject);
    meets(place, appearancePassage(subject.first));
  }
  for (const chapter of ordered) {
    for (const record of chapter.places ?? []) {
      meets(placeOf(record.payload.place.entryId, record.payload.place.name), { chapterNumber: chapter.chapterNumber, blockId: record.anchor.blockId, text: record.anchor.selectedText });
    }
  }
  for (const character of known) {
    const now = placeFor(character);
    if (now) placeOf(now.placeEntryId, now.place).here.push({ key: character.key, name: character.name, mainCharacter: character.mainCharacter });
  }
  const placeOrder = [...places.values()];
  const isMinorPlace = (place: CodexPlace) => hasWorld && !cardPlaces.has(place.key);
  const minorPlaces = placeOrder.filter(place => reached(place) && isMinorPlace(place)).flatMap(place => minorOf('place', place));
  const placeList = placeOrder.filter(place => reached(place) && !isMinorPlace(place)).sort((left, right) => inRecordOrder(left, right, place => placeOrder.indexOf(place)));
  const minor = [...minorCharacters, ...minorItems, ...minorPlaces].sort((left, right) => comesBefore(left.introduced, right.introduced));

  // The World rules are the world's frame, not a card the story reaches: the
  // ladder every rank is read against, and the age the story stands in.
  const rules = worldRulesCard(world);

  const holdingChecks = checked.flags.map((flag): CodexCheck => {
    const blockId = flag.recordId
      ? ordered.find(chapter => chapter.id === flag.chapterId)?.holdingChanges?.find(change => change.id === flag.recordId)?.anchor.blockId
      : undefined;
    return blockId ? { ...flag, blockId } : flag;
  });
  // In story order; a check about no one chapter (two names that may be one) comes first.
  const checks = [...holdingChecks, ...appeared.flags, ...carried.flags, ...leftOutTagFlags(ordered)].sort((left, right) => (left.chapterNumber ?? 0) - (right.chapterNumber ?? 0));

  return {
    characters: roster,
    factions: factionList,
    items: itemList,
    abilities: worldCards('ability'),
    places: placeList,
    species: worldCards('species'),
    minor,
    ...(rules ? { worldRules: worldCardFacts(rules) } : {}),
    checks,
  };
}

/** What a Codex card's picture is made from: who or what it shows, and the look the record wrote down. */
export interface CodexPictureCard {
  /** The card's key: stable for this story. */
  key: string;
  subject: 'character' | 'thing';
  name: string;
  /**
   * The look the picture is made from. A card whose look is not written yet,
   * or is older than its latest change, comes without one: its host writes it
   * first (`describeCodexLook`), then makes the picture.
   */
  look?: Look;
}

/** A card ready to be pictured: with the look its picture is made from. */
export type CodexPictureMade = CodexPictureCard & { look: Look };

/**
 * The host's picture maker for one story: it makes a card's picture from a
 * written look. The Reader writes a card's look first when it has none
 * (`describeCodexLook`), so a host only ever pictures a written look.
 */
export interface CodexPictureMaker {
  pictureOf: (key: string) => string | undefined;
  /** Makes the card's picture from its look and keeps it, replacing any before it. Rejects with a reason the reader can read. */
  manifest: (card: CodexPictureMade) => Promise<void>;
}

/**
 * The host's pictures for one story's Codex cards. SEN shows them and offers
 * Manifest; the host makes each picture and keeps it. Without it, cards show
 * their aura and offer nothing.
 */
export interface CodexPictures {
  /** The card's picture, as an address an `<img>` can show, or undefined. */
  pictureOf: (key: string) => string | undefined;
  /** Makes the card's picture from its look and keeps it, replacing any before it. Rejects with a reason the reader can read. */
  manifest: (card: CodexPictureCard) => Promise<void>;
}
