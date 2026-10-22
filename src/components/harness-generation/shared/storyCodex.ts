import type { CodexEntry } from '../../../narrative/holdings';
import type { Look } from '../../../narrative/appearances';
import type { HarnessChapter } from '../../../narrative/generation';
import {
  worldCardFacts,
  worldCardsOfKind,
  worldIsOpenToTheReader,
  worldRulesCard,
  type WorldAtChapterZero,
  type WorldCardSlot,
} from '../../../narrative/worldRecord';
import { isSpeakerOnText, SPEAKER_KIND } from '../../../narrative/speech';
import { harnessParagraphBlockId } from './chapterBody';
import { normalizeIdentityLabel } from './canonicalProjection';
import { factionNamed, type DeclaredFaction } from './factions';
import { deriveAppearances, type AppearanceFlag, type AppearancePassage, type AppearanceSubject } from './appearances';
import {
  deriveHoldings,
  holdingTargetKind,
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

export interface CodexCharacter {
  /** Stable for this story: the Codex entry's ID, or the name the record knows them by until one exists. */
  key: string;
  name: string;
  mainCharacter: boolean;
  /** Where the record first meets them. Absent while they are only part of the world the story opened with. */
  firstSeen?: CodexPassage;
  /** What the world already knew about them at Chapter 0. */
  atChapterZero?: CodexWorldFact[];
  /** Their appearance on the page, and their look. Absent for someone met only by their words or holdings. */
  appearance?: CodexAppearance;
  rank?: { text: string; events: HoldingEvent[] };
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
  /** Its appearance on the page, and its look. */
  appearance?: CodexAppearance;
}

/** A check the record's plain rules flagged (holdings or appearances), with the paragraph it is about when it has one. */
export type CodexCheck = (HoldingFlag | AppearanceFlag) & { blockId?: string };

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
  /** The places the world opened with. */
  places: CodexWorldCard[];
  /** The Bestiary: the species natural to this world. */
  species: CodexWorldCard[];
  /** The one World rules sheet every other card refers to, when the world states one. */
  worldRules?: CodexWorldFact[];
  /** What the record's plain rules flagged, for checking a story against its chapters. */
  checks: CodexCheck[];
}

/** What the Codex reads from a chapter. */
export type StoryCodexChapter = Pick<HarnessChapter, 'id' | 'chapterNumber' | 'paragraphs' | 'speakers' | 'holdingChanges' | 'closingHoldings' | 'appearances' | 'looks'>;

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
  } } : {}),
  changes: subject.changes.map(change => ({ change: change.change, passage: appearancePassage(change.passage) })),
});

export function deriveStoryCodex({ entries, chapters, world, mainCharacterName, declared = [], declaredFactions = [] }: {
  entries: readonly CodexEntry[];
  chapters: readonly StoryCodexChapter[];
  /** The world the story opened with, from its Story Seed and World Blueprint. */
  world?: WorldAtChapterZero;
  /** The story's main character, for speech the record gives them before any entry names them. */
  mainCharacterName?: string;
  /** The characters the story declares, whose aliases let a speaker's other names find them. */
  declared?: readonly DeclaredCharacter[];
  /** The factions the story declares, so a group that speaks is never taken for a character. */
  declaredFactions?: readonly DeclaredFaction[];
}): StoryCodexRecord {
  const ordered = [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber);
  const holdings = deriveHoldings({ entries, chapters: ordered, mainCharacterName });
  const appeared = deriveAppearances({ entries, chapters: ordered, declaredFactions });

  type Working = Omit<CodexCharacter, 'firstSeen'> & { firstSeen?: CodexPassage; names: Set<string> };
  const characters = new Map<string, Working>();
  const add = (character: Working) => { characters.set(character.key, character); return character; };
  // A card the world opened with takes its Codex entry's ID once one names it,
  // so one person is one card however the story reaches them.
  const entryNamed = (kind: CodexEntry['kind'], names: readonly string[]) => entries.find(candidate =>
    candidate.kind === kind && [candidate.name, ...(candidate.aliases ?? [])].some(other => names.includes(normalizeIdentityLabel(other))));
  const labelsOf = (card: { name: string; aliases?: string[] }) =>
    [card.name, ...(card.aliases ?? [])].map(normalizeIdentityLabel);

  // The world at Chapter 0 comes first: the Codex opens with the world the
  // story was given, and the chapters add to these same cards.
  for (const card of worldCardsOfKind(world, 'character')) {
    const labels = labelsOf(card);
    const entry = entryNamed('character', labels);
    add({
      key: entry?.id ?? `character:${labels[0]}`,
      name: entry?.name ?? card.name,
      mainCharacter: Boolean(card.mainCharacter || entry?.mainCharacter),
      atChapterZero: worldCardFacts(card),
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

  // A faction: one the world opened with, one the story declares (by name or
  // alias), or a name whose last word names a body of people.
  const factions = new Map<string, CodexFaction>();
  for (const card of worldCardsOfKind(world, 'faction')) {
    const key = `faction:${normalizeIdentityLabel(card.name)}`;
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

  const known = [...characters.values()].filter(character => (character.firstSeen || character.atChapterZero) && reached(character));
  const roster: CodexCharacter[] = known
    .sort((left, right) => Number(right.mainCharacter) - Number(left.mainCharacter)
      || inRecordOrder(left, right, character => known.indexOf(character)))
    .map(({ names: _names, ...character }) => character);

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
    const entry = entryNamed('thing', labels);
    const item = itemOf(entry?.id ?? `thing:${labels[0]}`, entry?.name ?? card.name);
    for (const label of labels) chapterZeroItems.set(label, item.key);
    item.atChapterZero = worldCardFacts(card);
    const count = Number(card.slots.count);
    if (Number.isInteger(count) && count > 0) item.count = count;
  }
  for (const character of roster) {
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
  const itemList = itemOrder
    .filter(reached)
    .map(item => ({ ...item, events: [...item.events].sort((left, right) => comesBefore(passageOf(left), passageOf(right))) }))
    .sort((left, right) => inRecordOrder(left, right, item => itemOrder.findIndex(candidate => candidate.key === item.key)));

  // An ability the world opened with is reached by a holdings tag: `knows`,
  // `learning` or `learned` puts it on a character's card, so the story has
  // met the ability itself and its own card opens with it.
  const abilityFirstSeen = new Map<string, CodexPassage>();
  for (const character of roster) {
    for (const ability of character.abilities) {
      for (const event of ability.events) {
        const label = normalizeIdentityLabel(ability.name);
        const first = abilityFirstSeen.get(label);
        if (!first || comesBefore(passageOf(event), first) < 0) abilityFirstSeen.set(label, passageOf(event));
      }
    }
  }

  // Places and the Bestiary wait for their own tags: until a chapter can name
  // one, nothing in it reaches them, so a reader meets them only in a world
  // open to them. An ability opens when a chapter reaches it, like every
  // other card the story meets.
  const worldCards = (kind: 'ability' | 'place' | 'species'): CodexWorldCard[] => {
    const cards = worldCardsOfKind(world, kind).map((card): CodexWorldCard => {
      const first = kind === 'ability'
        ? labelsOf(card).map(label => abilityFirstSeen.get(label)).filter((passage): passage is CodexPassage => Boolean(passage))
          .sort(comesBefore)[0]
        : undefined;
      return {
        key: `${kind}:${normalizeIdentityLabel(card.name)}`,
        name: card.name,
        ...(card.aliases?.length ? { aliases: [...card.aliases] } : {}),
        ...(first ? { firstSeen: first } : {}),
        atChapterZero: worldCardFacts(card),
      };
    });
    return cards.filter(reached).sort((left, right) => inRecordOrder(left, right, card => cards.indexOf(card)));
  };
  // The World rules are the world's frame, not a card the story reaches: the
  // ladder every rank is read against, and the age the story stands in.
  const rules = worldRulesCard(world);

  const holdingChecks = holdings.flags.map((flag): CodexCheck => {
    const blockId = flag.recordId
      ? ordered.find(chapter => chapter.id === flag.chapterId)?.holdingChanges?.find(change => change.id === flag.recordId)?.anchor.blockId
      : undefined;
    return blockId ? { ...flag, blockId } : flag;
  });
  // In story order; a check about no one chapter (two names that may be one) comes first.
  const checks = [...holdingChecks, ...appeared.flags].sort((left, right) => (left.chapterNumber ?? 0) - (right.chapterNumber ?? 0));

  return {
    characters: roster,
    factions: factionList,
    items: itemList,
    abilities: worldCards('ability'),
    places: worldCards('place'),
    species: worldCards('species'),
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
