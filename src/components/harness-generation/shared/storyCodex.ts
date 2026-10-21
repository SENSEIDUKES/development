import { castVoice } from '../../../audio/voiceCast';
import { fullNameOf } from './voices';
import type { CodexEntry } from '../../../narrative/holdings';
import type { Look } from '../../../narrative/looks';
import type { PlanAge, PlanCommitmentChange, PlanGender, PlanGoalChange, PlanStancePolarity, PlanValueStance } from '../../../narrative/chapterPlan';
import type { HarnessChapter } from '../../../narrative/generation';
import { isSpeakerOnText, SPEAKER_KIND } from '../../../narrative/speech';
import { harnessParagraphBlockId } from './chapterBody';
import { normalizeIdentityLabel } from './canonicalProjection';
import { factionNamed, type DeclaredFaction } from './factions';
import {
  deriveHoldings,
  holdingTargetKind,
  type DeclaredCharacter,
  type HeldThing,
  type HoldingEvent,
  type KnownAbility,
} from './holdings';
import { conditionLabel, derivePlanRecord, type RecordPassage, type RecordedEntity, type RecordedStatus } from './planRecord';

/**
 * The Codex: what the story's record knows, gathered for the reader. Nothing
 * here is stored; it is worked out again from each chapter's plan (SENSEI,
 * 2026-10-20: the chapter loop) and its speakers, so it always matches the
 * chapters and holds only what they recorded: who someone is, their look and
 * each change to it, their state, what they hold, their goals, values,
 * commitments and stances, and their voice. Every fact links to the chapter
 * that made it; a voice links to the words it was heard in.
 *
 * A character is in the Codex once the record has met them: on the page in a
 * chapter's cast, speaking, or holding, using or learning something.
 * Characters the Story Seed declares but the chapters have not reached yet
 * stay out, so the Codex never runs ahead of the story. A thing joins it the
 * same way: on the page, or changing hands.
 */

/** A place in the story a fact came from: its chapter, the event of its plan, and the words the record sits on. */
export interface CodexPassage {
  chapterNumber: number;
  /** The paragraph, for what sits on the chapter's words (a voice). A fact of a plan has none: it opens its chapter. */
  blockId?: string;
  /** The event of the chapter's plan, from 1. */
  event?: number;
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

/** A look as the record holds it, with the chapter whose plan gave it. */
export interface CodexLook extends Look {
  passage: CodexPassage;
}

/** Where someone or something first stepped onto the page, how it looks, and each change to its look. */
export interface CodexAppearance {
  first: CodexPassage;
  /** The whole look, once a plan gave one. */
  look?: CodexLook;
  /** Each change to the look since, in story order. */
  changes: Array<{ change: string; passage: CodexPassage }>;
}

/** A state an entry was in: `wounded (a broken left arm)`, with where it began. */
export interface CodexStatus {
  label: string;
  passage: CodexPassage;
}

export interface CodexGoal {
  what: string;
  outcome?: Exclude<PlanGoalChange, 'set'>;
  set?: CodexPassage;
  resolved?: CodexPassage;
}

export interface CodexValue {
  what: string;
  stance: PlanValueStance;
  passage: CodexPassage;
}

/** A commitment, from the side of the one who owes it or the one owed. */
export interface CodexCommitment {
  /** Who owes it, or who is owed it. */
  party: string;
  what: string;
  outcome?: Exclude<PlanCommitmentChange, 'entered'>;
  entered?: CodexPassage;
  resolved?: CodexPassage;
}

export interface CodexStance {
  toward: string;
  said?: { polarity: PlanStancePolarity; passage: CodexPassage };
  acted?: { polarity: PlanStancePolarity; passage: CodexPassage };
}

export interface CodexCharacter {
  /** Stable for this story: the Codex entry's ID, or the name the record knows them by until one exists. */
  key: string;
  name: string;
  mainCharacter: boolean;
  /** Where the record first meets them. */
  firstSeen: CodexPassage;
  /** The latest chapter they were on the page. */
  lastSeen?: number;
  /** Who they are in the story, in one line. */
  who?: string;
  gender?: PlanGender;
  age?: PlanAge;
  /** Their look, from the plans that cast them. Absent for someone met only by their words. */
  appearance?: CodexAppearance;
  /** Their state now, when it is not their usual one. */
  status?: CodexStatus;
  /** Every change of state, in story order. */
  statusHistory: CodexStatus[];
  rank?: { text: string; events: HoldingEvent[] };
  /** Things they hold now, in the order they came to hold them. */
  things: HeldThing[];
  /** Abilities they are learning or know. */
  abilities: KnownAbility[];
  voice?: CodexVoice;
  /** Every holding change that took effect for them, in story order. */
  chronicle: HoldingEvent[];
  goals: CodexGoal[];
  /** The latest stance they took on each value. */
  values: CodexValue[];
  /** What they owe others. */
  owes: CodexCommitment[];
  /** What others owe them. */
  owedBy: CodexCommitment[];
  stances: CodexStance[];
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
  who?: string;
  /** Its look, from the plans that cast it. */
  appearance?: CodexAppearance;
  /** Its state now, when it is not its usual one (damaged, destroyed). */
  status?: CodexStatus;
}

/** Something the record's plain checks found: a fact dropped from a chapter's plan, or worth a second look. */
export interface CodexCheck {
  /** Stable within the Codex. */
  key: string;
  message: string;
  chapterNumber?: number;
  /** The paragraph it is about, when it has one. */
  blockId?: string;
}

/** A sect, clan, faction or other body the story has met: by its voice today (a group the writer named as speaking). */
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
  /** What the record's plain checks found, for checking a story against its chapters. */
  checks: CodexCheck[];
}

/** What the Codex reads from a chapter. */
export type StoryCodexChapter = Pick<HarnessChapter, 'id' | 'chapterNumber' | 'paragraphs' | 'speakers' | 'plan' | 'planChecks'>;

const paragraphOrder = (blockId: string | undefined) => Number(blockId?.match(/-p(\d+)$/)?.[1] ?? 0);
/** Story order: by chapter, then by event (a fact of the plan before the words that tell it), then by paragraph. */
const comesBefore = (left: CodexPassage, right: CodexPassage) =>
  left.chapterNumber - right.chapterNumber || (left.event ?? 0) - (right.event ?? 0) || paragraphOrder(left.blockId) - paragraphOrder(right.blockId);
const passageOf = (passage: RecordPassage | HoldingEvent['passage']): CodexPassage => ({
  chapterNumber: passage.chapterNumber, ...(passage.event ? { event: passage.event } : {}), text: passage.text,
});
const statusOf = (status: RecordedStatus): CodexStatus => ({ label: `${status.state}${status.how ? ` (${status.how})` : ''}`, passage: passageOf(status.passage) });
/** The state an entry is in now, with the passage that began its latest change. */
const currentStatus = (entity: RecordedEntity): CodexStatus | undefined => {
  const label = conditionLabel(entity.condition);
  const latest = entity.statusHistory.at(-1);
  return label && latest ? { label, passage: passageOf(latest.passage) } : undefined;
};
const appearanceOf = (entity: RecordedEntity, first: CodexPassage): CodexAppearance => ({
  first,
  ...(entity.look ? { look: { summary: entity.look.look.summary, traits: { ...entity.look.look.traits }, passage: passageOf(entity.look.passage) } } : {}),
  changes: entity.lookChanges.map(change => ({ change: change.change, passage: passageOf(change.passage) })),
});
/** Where a cast member was first on the page: their chapter, told by who they are, or the chapter's first event. */
const castPassage = (entity: RecordedEntity, chapters: readonly StoryCodexChapter[]): CodexPassage | undefined => {
  const first = entity.castIn[0];
  if (!first) return undefined;
  const chapter = chapters.find(candidate => candidate.id === first.chapterId);
  return { chapterNumber: first.chapterNumber, text: entity.who?.text ?? chapter?.plan.events[0]?.how ?? '' };
};

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
  const holdings = deriveHoldings({ entries, chapters: ordered });
  const record = derivePlanRecord({ entries, chapters: ordered });
  const recorded = new Map(record.map(entity => [entity.key, entity]));

  type Working = Omit<CodexCharacter, 'firstSeen'> & { firstSeen?: CodexPassage; names: Set<string> };
  const characters = new Map<string, Working>();
  const add = (character: Working) => { characters.set(character.key, character); return character; };
  const blank = (key: string, name: string, mainCharacter: boolean, names: readonly string[]): Working => ({
    key, name, mainCharacter, statusHistory: [], things: [], abilities: [], chronicle: [], goals: [], values: [], owes: [], owedBy: [], stances: [],
    names: new Set(names.map(normalizeIdentityLabel)),
  });
  const met = (character: Working, passage: CodexPassage | undefined) => {
    if (passage && (!character.firstSeen || comesBefore(passage, character.firstSeen) < 0)) character.firstSeen = passage;
  };

  // Everyone the plans had on the page, or who held, used or learned something.
  for (const entity of record.filter(candidate => candidate.kind === 'character')) {
    const entry = entries.find(candidate => candidate.id === entity.key);
    const held = holdings.characters.find(candidate => candidate.entryId === entity.key);
    const first = castPassage(entity, ordered);
    if (!first && !held?.history.length) continue;
    const character = add(blank(entity.key, entity.name, entity.mainCharacter, [entity.name, ...(entry?.aliases ?? [])]));
    met(character, first);
    if (entity.castIn.length) character.lastSeen = entity.castIn.at(-1)!.chapterNumber;
    if (entity.who) character.who = entity.who.text;
    if (entity.gender) character.gender = entity.gender;
    if (entity.age) character.age = entity.age;
    if (first) character.appearance = appearanceOf(entity, first);
    const status = currentStatus(entity);
    if (status) character.status = status;
    character.statusHistory = entity.statusHistory.map(statusOf);
    character.goals = entity.goals.map(goal => ({
      what: goal.what, ...(goal.outcome ? { outcome: goal.outcome } : {}),
      ...(goal.set ? { set: passageOf(goal.set) } : {}), ...(goal.resolved ? { resolved: passageOf(goal.resolved) } : {}),
    }));
    character.values = entity.values.map(value => ({ what: value.what, stance: value.stance, passage: passageOf(value.passage) }));
    character.owes = entity.commitments.map(commitment => ({
      party: commitment.to.name, what: commitment.what, ...(commitment.outcome ? { outcome: commitment.outcome } : {}),
      ...(commitment.entered ? { entered: passageOf(commitment.entered) } : {}), ...(commitment.resolved ? { resolved: passageOf(commitment.resolved) } : {}),
    }));
    character.stances = entity.stances.map(stance => ({
      toward: stance.toward.name,
      ...(stance.said ? { said: { polarity: stance.said.polarity, passage: passageOf(stance.said.passage) } } : {}),
      ...(stance.acted ? { acted: { polarity: stance.acted.polarity, passage: passageOf(stance.acted.passage) } } : {}),
    }));
  }
  // What each character is owed, from the side of the one who owes it.
  for (const entity of record) {
    for (const commitment of entity.commitments) {
      const owed = characters.get(commitment.to.key);
      if (owed) owed.owedBy.push({
        party: entity.name, what: commitment.what, ...(commitment.outcome ? { outcome: commitment.outcome } : {}),
        ...(commitment.entered ? { entered: passageOf(commitment.entered) } : {}), ...(commitment.resolved ? { resolved: passageOf(commitment.resolved) } : {}),
      });
    }
  }
  for (const held of holdings.characters) {
    const character = characters.get(held.entryId);
    if (!character) continue;
    if (held.rank) character.rank = held.rank;
    character.things = held.things;
    character.abilities = held.abilities;
    character.chronicle = held.history;
    met(character, held.history[0] && passageOf(held.history[0].passage));
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
      return add(blank(entry?.id ?? `character:${normalizeIdentityLabel(named)}`, named, true, [named, name]));
    }
    const keys = declaredNames(name);
    const existing = [...characters.values()].find(character => keys.some(key => character.names.has(key)));
    if (existing) return existing;
    const entry = entries.find(candidate => candidate.kind === 'character'
      && [candidate.name, ...(candidate.aliases ?? [])].some(other => keys.includes(normalizeIdentityLabel(other))));
    // A card for the main character, a character the record holds, or one the Story Seed declares; never for a speaker alone.
    if (!entry && !declaredOf(name)) return undefined;
    return add(blank(entry?.id ?? `character:${keys[0]}`, entry?.name ?? name.trim(), Boolean(entry?.mainCharacter), keys));
  };

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

  const metCharacters = [...characters.values()].filter((character): character is Working & { firstSeen: CodexPassage } => Boolean(character.firstSeen));
  const roster: CodexCharacter[] = metCharacters
    .sort((left, right) => Number(right.mainCharacter) - Number(left.mainCharacter) || comesBefore(left.firstSeen, right.firstSeen))
    .map(({ names: _names, ...character }) => character);

  // Things: every change the record saw, gathered by the thing, with its holder now.
  const items = new Map<string, CodexItem>();
  for (const character of roster) {
    for (const event of character.chronicle) {
      if (!event.targetId || !event.target || holdingTargetKind(event.verb) !== 'thing') continue;
      const item = items.get(event.targetId) ?? { key: event.targetId, name: event.target, count: 0, equipped: false, events: [], firstSeen: passageOf(event.passage) };
      item.events.push({ ...event, holder: character.name });
      if (comesBefore(passageOf(event.passage), item.firstSeen) < 0) item.firstSeen = passageOf(event.passage);
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
  // Things the plans had on the page, held or not, with their looks and state.
  for (const entity of record.filter(candidate => candidate.kind === 'thing')) {
    const first = castPassage(entity, ordered);
    const item = items.get(entity.key) ?? (first ? { key: entity.key, name: entity.name, count: 0, equipped: false, events: [], firstSeen: first } : undefined);
    if (!item) continue;
    if (first) {
      item.appearance = appearanceOf(entity, first);
      if (comesBefore(first, item.firstSeen) < 0) item.firstSeen = first;
    }
    if (entity.who) item.who = entity.who.text;
    const status = currentStatus(entity);
    if (status) item.status = status;
    items.set(entity.key, item);
  }
  const itemList = [...items.values()]
    .map(item => ({ ...item, events: [...item.events].sort((left, right) => comesBefore(passageOf(left.passage), passageOf(right.passage))) }))
    .sort((left, right) => comesBefore(left.firstSeen, right.firstSeen));

  // What the checks found in each chapter's plan, in story order; a check about no one chapter (two names that may be one) first.
  const checks: CodexCheck[] = [
    ...holdings.flags.map((flag, index): CodexCheck => ({ key: `holdings-${index}`, message: flag.message, ...(flag.chapterNumber !== undefined ? { chapterNumber: flag.chapterNumber } : {}) })),
    ...ordered.flatMap(chapter => (chapter.planChecks ?? []).map((check, index): CodexCheck => ({
      key: `plan-${chapter.id}-${index}`, message: `Chapter ${chapter.chapterNumber}: ${check.message}`, chapterNumber: chapter.chapterNumber,
    }))),
  ].sort((left, right) => (left.chapterNumber ?? 0) - (right.chapterNumber ?? 0));

  return { characters: roster, factions: factionList, items: itemList, checks };
}

/** What a Codex card's picture is made from: who or what it shows, and the look the record holds. */
export interface CodexPictureCard {
  /** The card's key: stable for this story. */
  key: string;
  subject: 'character' | 'thing';
  name: string;
  /** The look the picture is made from: the card's look, with every change since. */
  look: Look;
}

/** A card ready to be pictured: with the look its picture is made from. */
export type CodexPictureMade = CodexPictureCard;

/**
 * The host's picture maker for one story: it makes a card's picture from the
 * look on the card (SENSEI, 2026-10-20: Manifest draws the look the record
 * already holds; it never writes one).
 */
export interface CodexPictureMaker {
  pictureOf: (key: string) => string | undefined;
  /** Makes the card's picture from its look and keeps it, replacing any before it. Rejects with a reason the reader can read. */
  manifest: (card: CodexPictureMade) => Promise<void>;
}

/**
 * The host's pictures for one story's Codex cards. SEN shows them and offers
 * Manifest; the host makes each picture and keeps it. Without them, cards show
 * their aura and offer nothing.
 */
export interface CodexPictures {
  /** The card's picture, as an address an `<img>` can show, or undefined. */
  pictureOf: (key: string) => string | undefined;
  /** Makes the card's picture from its look and keeps it, replacing any before it. Rejects with a reason the reader can read. */
  manifest: (card: CodexPictureCard) => Promise<void>;
}

/** The look a card's picture is made from: its whole look, with each change since folded into its one line. */
export const pictureLook = (appearance: CodexAppearance | undefined): Look | undefined => {
  const look = appearance?.look;
  if (!look) return undefined;
  const changes = appearance.changes.filter(change => comesBefore(look.passage, change.passage) < 0).map(change => change.change);
  return { summary: changes.length ? `${look.summary.replace(/[.。]+$/u, '')}; since then: ${changes.join('; ')}` : look.summary, traits: { ...look.traits } };
};
