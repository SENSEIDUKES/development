import type { CodexEntry } from '../../../narrative/holdings';
import type { HarnessChapter } from '../../../narrative/generation';
import { isSpeakerOnText, SPEAKER_KIND } from '../../../narrative/speech';
import { harnessParagraphBlockId } from './chapterBody';
import { normalizeIdentityLabel } from './canonicalProjection';
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
 * (holding changes and speakers today), so it always matches the chapters and
 * holds only what they recorded. Each kind of information tag adds its own
 * facts here as it is built; the Codex never shows more than the record holds.
 *
 * A character is in the Codex once the record has met them: they spoke, or
 * held, used or learned something. Characters the Story Seed declares but the
 * chapters have not reached yet stay out, so the Codex never runs ahead of
 * the story.
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

export interface CodexCharacter {
  /** Stable for this story: the Codex entry's ID, or the name the record knows them by until one exists. */
  key: string;
  name: string;
  mainCharacter: boolean;
  /** Where the record first meets them. */
  firstSeen: CodexPassage;
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
}

/** A check the record's plain rules flagged, with the paragraph it is about when it has one. */
export interface CodexCheck extends HoldingFlag {
  blockId?: string;
}

export interface StoryCodexRecord {
  /** The main character first, then everyone else in the order the story met them. */
  characters: CodexCharacter[];
  /** Things, in the order the story met them. */
  items: CodexItem[];
  /** What the record's plain rules flagged, for checking a story against its chapters. */
  checks: CodexCheck[];
}

/** What the Codex reads from a chapter. */
export type StoryCodexChapter = Pick<HarnessChapter, 'id' | 'chapterNumber' | 'paragraphs' | 'speakers' | 'holdingChanges' | 'closingHoldings'>;

const paragraphOrder = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);
const comesBefore = (left: CodexPassage, right: CodexPassage) =>
  left.chapterNumber - right.chapterNumber || paragraphOrder(left.blockId) - paragraphOrder(right.blockId);
const passageOf = (event: HoldingEvent): CodexPassage => ({
  chapterNumber: event.passage.chapterNumber, blockId: event.passage.blockId, text: event.passage.text,
});

export function deriveStoryCodex({ entries, chapters, mainCharacterName, declared = [] }: {
  entries: readonly CodexEntry[];
  chapters: readonly StoryCodexChapter[];
  /** The story's main character, for speech the record gives them before any entry names them. */
  mainCharacterName?: string;
  /** The characters the story declares, whose aliases let a speaker's other names find them. */
  declared?: readonly DeclaredCharacter[];
}): StoryCodexRecord {
  const ordered = [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber);
  const holdings = deriveHoldings({ entries, chapters: ordered, mainCharacterName });

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

  for (const chapter of ordered) {
    const lines = (chapter.speakers ?? [])
      .filter(record => record.kind === SPEAKER_KIND)
      // Paragraph ids count from 1 (`c{n}-p{i}`).
      .map(record => ({ record, index: Number(record.anchor.blockId.match(/-p(\d+)$/)?.[1] ?? 0) - 1 }))
      .filter(({ record, index }) => index >= 0 && record.anchor.blockId === harnessParagraphBlockId(chapter.chapterNumber, index)
        && isSpeakerOnText(record, record.anchor.blockId, chapter.paragraphs[index] ?? ''))
      .sort((left, right) => left.index - right.index || left.record.anchor.startOffset - right.record.anchor.startOffset);
    for (const { record } of lines) {
      const character = speakerOf(record.payload.speaker, record.payload.protagonist);
      const passage: CodexPassage = { chapterNumber: chapter.chapterNumber, blockId: record.anchor.blockId, text: record.anchor.selectedText };
      if (!character.voice) character.voice = { lines: 0, chapters: [], first: passage };
      character.voice.lines += 1;
      if (character.voice.chapters.at(-1) !== chapter.chapterNumber) character.voice.chapters.push(chapter.chapterNumber);
      if (!character.firstSeen || comesBefore(passage, character.firstSeen) < 0) character.firstSeen = passage;
    }
  }

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
  const itemList = [...items.values()]
    .map(item => ({ ...item, events: [...item.events].sort((left, right) => comesBefore(passageOf(left), passageOf(right))) }))
    .sort((left, right) => comesBefore(left.firstSeen, right.firstSeen));

  const checks = holdings.flags.map((flag): CodexCheck => {
    const blockId = flag.recordId
      ? ordered.find(chapter => chapter.id === flag.chapterId)?.holdingChanges?.find(change => change.id === flag.recordId)?.anchor.blockId
      : undefined;
    return blockId ? { ...flag, blockId } : flag;
  });

  return { characters: roster, items: itemList, checks };
}
