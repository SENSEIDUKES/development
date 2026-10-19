import { castVoice } from '../../../audio/voiceCast';
import { fullNameOf } from './voices';
import type { CodexEntry } from '../../../narrative/holdings';
import type { Look } from '../../../narrative/appearances';
import type { HarnessChapter } from '../../../narrative/generation';
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
 * here is stored; it is worked out again from each chapter's current records
 * (appearances and their looks, holding changes and speakers today), so it
 * always matches the chapters and holds only what they recorded. Each kind of
 * information tag adds its own facts here as it is built; the Codex never
 * shows more than the record holds.
 *
 * A character is in the Codex once the record has met them: they stepped onto
 * the page, spoke, or held, used or learned something. Characters the Story
 * Seed declares but the chapters have not reached yet stay out, so the Codex
 * never runs ahead of the story. A thing joins it the same way: it stepped
 * onto the page, or changed hands.
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
  /** The voice they speak in, a SEIHouse voice cast key from their Codex card; absent, their role's voice reads them. */
  cast?: string;
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

export interface CodexCharacter {
  /** Stable for this story: the Codex entry's ID, or the name the record knows them by until one exists. */
  key: string;
  name: string;
  mainCharacter: boolean;
  /** Where the record first meets them. */
  firstSeen: CodexPassage;
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
  firstSeen: CodexPassage;
  /** Its appearance on the page, and its look. */
  appearance?: CodexAppearance;
}

/** A check the record's plain rules flagged (holdings or appearances), with the paragraph it is about when it has one. */
export type CodexCheck = (HoldingFlag | AppearanceFlag) & { blockId?: string };

/** A sect, clan, faction or other body the story has met: by its voice today (a group the writer tagged as speaking). */
export interface CodexFaction {
  key: string;
  name: string;
  firstSeen: CodexPassage;
  voice: CodexVoice;
}

export interface StoryCodexRecord {
  /** The main character first, then everyone else in the order the story met them. Named beasts are characters too. */
  characters: CodexCharacter[];
  /** Sects, clans and other factions, in the order the story met them. */
  factions: CodexFaction[];
  /** Things, in the order the story met them. */
  items: CodexItem[];
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

export function deriveStoryCodex({ entries, chapters, mainCharacterName, declared = [], declaredFactions = [] }: {
  entries: readonly CodexEntry[];
  chapters: readonly StoryCodexChapter[];
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

  for (const held of holdings.characters) {
    const entry = entries.find(candidate => candidate.id === held.entryId);
    add({
      key: held.entryId, name: held.name, mainCharacter: held.mainCharacter,
      ...(held.rank ? { rank: held.rank } : {}),
      things: held.things, abilities: held.abilities, chronicle: held.history,
      firstSeen: held.history[0] && passageOf(held.history[0]),
      names: new Set([held.name, ...(entry?.aliases ?? [])].map(normalizeIdentityLabel)),
    });
  }

  // Who a speaker is: the main character, an entry by any of its names, a declared character
  // by an alias, or someone the record knows only by the name they speak under.
  const main = () => [...characters.values()].find(character => character.mainCharacter);
  const declaredOf = (name: string) => {
    const key = normalizeIdentityLabel(name);
    return declared.find(character => [character.name, ...(character.aliases ?? [])].some(other => normalizeIdentityLabel(other) === key));
  };
  const declaredNames = (name: string) => {
    const match = declaredOf(name);
    return match ? [match.name, ...(match.aliases ?? [])].map(normalizeIdentityLabel) : [normalizeIdentityLabel(name)];
  };
  // Not every speaker has a card (SENSEI, 2026-10-18): a crowd or a passing guard speaks without one.
  const knownNames = [
    ...entries.filter(entry => entry.kind === 'character').flatMap(entry => [entry.name, ...(entry.aliases ?? [])]),
    ...declared.flatMap(character => [character.name, ...(character.aliases ?? [])]),
  ];
  const speakerOf = (written: string, protagonist: boolean): Working | undefined => {
    // A first name alone stands for the one character it belongs to ("Mina", Mina Kisaragi).
    const name = protagonist ? written : fullNameOf(written, knownNames) ?? written;
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
    // A card for the main character, a character the record holds, or one the Story Seed declares; never for a speaker alone.
    if (!entry && !declaredOf(name)) return undefined;
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

  // A faction: one the story declares (by name or alias), or a name whose last word names a body of people.
  const factions = new Map<string, Omit<CodexFaction, 'firstSeen' | 'voice'> & Partial<Pick<CodexFaction, 'firstSeen' | 'voice'>>>();
  const factionOf = (name: string) => {
    const named = factionNamed(name, declaredFactions);
    if (!named) return undefined;
    const id = `faction:${normalizeIdentityLabel(named)}`;
    const faction = factions.get(id) ?? { key: id, name: named };
    factions.set(id, faction);
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
      if (!character) continue;
      const passage: CodexPassage = { chapterNumber: chapter.chapterNumber, blockId: record.anchor.blockId, text: record.anchor.selectedText };
      if (!character.voice) character.voice = { lines: 0, chapters: [], first: passage };
      character.voice.lines += 1;
      if (character.voice.chapters.at(-1) !== chapter.chapterNumber) character.voice.chapters.push(chapter.chapterNumber);
      if (!character.firstSeen || comesBefore(passage, character.firstSeen) < 0) character.firstSeen = passage;
    }
  }

  // Each speaking character's own voice, from their card.
  for (const character of characters.values()) {
    const voice = character.voice && entries.find(entry => entry.id === character.key)?.voice;
    if (voice && castVoice(voice.key)) character.voice!.cast = voice.key;
  }

  const factionList = [...factions.values()]
    .filter((faction): faction is CodexFaction => Boolean(faction.firstSeen && faction.voice))
    .sort((left, right) => comesBefore(left.firstSeen, right.firstSeen));

  const met = [...characters.values()].filter((character): character is Working & { firstSeen: CodexPassage } => Boolean(character.firstSeen));
  const roster: CodexCharacter[] = met
    .sort((left, right) => Number(right.mainCharacter) - Number(left.mainCharacter) || comesBefore(left.firstSeen, right.firstSeen))
    .map(({ names: _names, ...character }) => character);

  // Things: every change the record saw, gathered by the thing, with its holder now.
  const items = new Map<string, CodexItem>();
  for (const character of roster) {
    for (const event of character.chronicle) {
      if (!event.targetId || !event.target || holdingTargetKind(event.verb) !== 'thing') continue;
      const item = items.get(event.targetId) ?? { key: event.targetId, name: event.target, count: 0, equipped: false, events: [], firstSeen: passageOf(event) };
      item.events.push({ ...event, holder: character.name });
      if (comesBefore(passageOf(event), item.firstSeen) < 0) item.firstSeen = passageOf(event);
      items.set(event.targetId, item);
    }
    for (const thing of character.things) {
      const item = items.get(thing.entryId);
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
    const item = items.get(subject.key) ?? { key: subject.key, name: subject.name, count: 0, equipped: false, events: [], firstSeen: first };
    item.appearance = appearanceOf(subject);
    if (comesBefore(first, item.firstSeen) < 0) item.firstSeen = first;
    items.set(subject.key, item);
  }
  const itemList = [...items.values()]
    .map(item => ({ ...item, events: [...item.events].sort((left, right) => comesBefore(passageOf(left), passageOf(right))) }))
    .sort((left, right) => comesBefore(left.firstSeen, right.firstSeen));

  const holdingChecks = holdings.flags.map((flag): CodexCheck => {
    const blockId = flag.recordId
      ? ordered.find(chapter => chapter.id === flag.chapterId)?.holdingChanges?.find(change => change.id === flag.recordId)?.anchor.blockId
      : undefined;
    return blockId ? { ...flag, blockId } : flag;
  });
  // In story order; a check about no one chapter (two names that may be one) comes first.
  const checks = [...holdingChecks, ...appeared.flags].sort((left, right) => (left.chapterNumber ?? 0) - (right.chapterNumber ?? 0));

  return { characters: roster, factions: factionList, items: itemList, checks };
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
