/**
 * Story Knowledge: what a story's record knows, written the way a companion
 * looks it up.
 *
 * The Codex already holds the story's world, worked out again from the
 * chapters each time: who the reader has met, what they carry, where they are,
 * the places, factions and the world's rules. A companion beside the reader
 * (the Familiar, or a publisher's own) needs the same facts to answer "who is
 * this?" or "what is this sword?", and must never know more than the Codex
 * shows. So this reads the very record the Codex panel reads and writes it as
 * a docs catalog (`@seihouse/sen/docs-knowledge`): the companion is handed the
 * names, and looks a card up when the reader asks about it, exactly as it does
 * the app's docs. Each chapter's saved recap rides along, so "what happened in
 * Chapter 3?" has an answer too.
 *
 * Nothing here is new knowledge. A card the Codex does not show is not here,
 * and a fact the chapters have not reached is not here.
 */
import type { DocsCatalog, DocsTopic } from '@seihouse/front-desk/docs-knowledge';
import type { HarnessChapter, HarnessWorkspaceState } from '../../../narrative/generation';
import type { HoldingVerb } from '../../../narrative/holdings';
import { storyWorldRecord, findActiveFoundationRevision } from './foundation';
import { declaredCharacters, type HoldingEvent } from './holdings';
import {
  deriveStoryCodex,
  type CodexAppearance, type CodexCharacter, type CodexFaction, type CodexItem, type CodexPassage, type CodexPlace, type CodexWorldCard, type CodexWorldFact, type StoryCodexRecord,
} from './storyCodex';

/** How each change reads, in the Codex and when a companion tells it. */
export const CODEX_VERB_LABELS: Record<HoldingVerb, string> = {
  has: 'already had', gained: 'gained', lost: 'lost', equipped: 'took up', unequipped: 'put away', knows: 'already knew',
  learning: 'began learning', learned: 'learned', improved: 'improved', sealed: 'sealed', unsealed: 'unsealed', rank: 'reached',
};

/**
 * A story's Codex, worked out the one way the Reader's Codex panel works it
 * out: the world as it stands, the story's entries, its chapters, the main
 * character and everyone the Story Seed declares.
 *
 * `reachedOnly` works it out as it stood at the last of `chapters`, for a
 * reader who has not read past it: a look written on demand from a later
 * passage is left off (the chapters' own looks stand in), and so is a world
 * card that entered after. Nothing later is then told as how things are.
 */
export function storyCodexOf(state: HarnessWorkspaceState, storyId: string, chapters: readonly HarnessChapter[], options: { reachedOnly?: boolean } = {}): StoryCodexRecord {
  const foundation = findActiveFoundationRevision(state, storyId)?.input;
  const entries = state.codexEntries.filter(entry => entry.storyId === storyId);
  const world = storyWorldRecord(state, storyId);
  const reachedEntries = () => {
    const shown = new Set(chapters.flatMap(chapter => (chapter.appearances ?? []).map(appearance => appearance.id)));
    return entries.map(entry => {
      if (!entry.look || entry.look.from.every(id => shown.has(id))) return entry;
      const { look: _later, ...rest } = entry;
      return rest;
    });
  };
  const lastChapter = Math.max(0, ...chapters.map(chapter => chapter.chapterNumber));
  return deriveStoryCodex({
    entries: options.reachedOnly ? reachedEntries() : entries,
    chapters,
    // The world as it stands, not the author's opening world: a card a chapter
    // brought in belongs in the Codex as surely as one the Blueprint wrote.
    world: options.reachedOnly && world ? { ...world, cards: world.cards.filter(card => card.enteredInChapter <= lastChapter) } : world,
    mainCharacterName: foundation?.cast?.find(member => member.isMainCharacter)?.name,
    declared: foundation ? declaredCharacters(foundation) : [],
    declaredFactions: foundation?.identities?.filter(identity => identity.kind === 'faction') ?? [],
  });
}

/** The categories a story's knowledge is filed under, so a companion can tell the story's names from the app's docs. */
export const STORY_KNOWLEDGE_CATEGORIES = {
  characters: 'This story: characters',
  factions: 'This story: factions',
  items: 'This story: items',
  places: 'This story: places',
  abilities: 'This story: abilities',
  species: 'This story: species',
  world: 'This story: world',
  chapters: 'This story: chapters',
  spoilers: 'This story: spoilers',
} as const;

/** The most change lines one card reads back, newest last, so an answer stays short enough to speak. */
const RECENT_CHANGES = 4;
/** The longest a card reads back. */
const CARD_TEXT_LIMIT = 1_200;

const sentence = (text: string | undefined) => {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  return /[.!?…"”]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};
const met = (firstSeen: CodexPassage | undefined) =>
  firstSeen ? `First met in Chapter ${firstSeen.chapterNumber}.` : 'Part of the world from the start.';
const facts = (atChapterZero: readonly CodexWorldFact[] | undefined) =>
  (atChapterZero ?? []).map(fact => sentence(`${fact.slot.label}: ${fact.value}`));
/** Whether one passage comes after another in the story: by chapter, then by paragraph. */
const paragraphOf = (blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0);
const passageAfter = (left: CodexPassage, right: CodexPassage) =>
  (left.chapterNumber - right.chapterNumber || paragraphOf(left.blockId) - paragraphOf(right.blockId)) > 0;
/** How it looks as of the chapters given: the written look, or its first description, then every change the story tagged since. */
const looks = (appearance: CodexAppearance | undefined) => {
  if (!appearance) return [];
  const base = appearance.look ? `Looks: ${appearance.look.summary}` : appearance.description ? `Described as: ${appearance.description}` : undefined;
  const since = appearance.look ? appearance.changes.filter(entry => passageAfter(entry.passage, appearance.look!.passage)) : appearance.changes;
  return [
    sentence(base),
    since.length ? sentence(`Since then: ${since.map(entry => `${entry.change} in Chapter ${entry.passage.chapterNumber}`).join('; ')}`) : undefined,
  ];
};
const change = (event: HoldingEvent, holder?: string) => {
  const what = [event.count && event.count > 1 ? `${event.count}` : '', event.target ?? '', event.level ? `(${event.level})` : ''].filter(Boolean).join(' ');
  return `${holder ? `${holder} ` : ''}${CODEX_VERB_LABELS[event.verb]}${what ? ` ${what}` : ''} in Chapter ${event.passage.chapterNumber}`;
};
const recent = (lines: string[]) => lines.length ? sentence(`Lately: ${lines.slice(-RECENT_CHANGES).join('; ')}`) : undefined;
const listed = (label: string, names: string[]) => names.length ? sentence(`${label}: ${names.join(', ')}`) : undefined;
const joined = (parts: readonly (string | undefined)[]) => {
  const text = parts.filter(Boolean).join(' ');
  return text.length > CARD_TEXT_LIMIT ? `${text.slice(0, CARD_TEXT_LIMIT - 1).trimEnd()}…` : text;
};

/** One character card as a companion reads it back. */
export function codexCharacterText(character: CodexCharacter): string {
  return joined([
    character.mainCharacter ? 'The main character.' : undefined,
    met(character.firstSeen),
    ...facts(character.atChapterZero),
    ...looks(character.appearance),
    character.rank ? sentence(`Rank: ${character.rank.text}`) : undefined,
    character.status ? sentence(`Now: ${character.status.text}`) : undefined,
    character.place ? sentence(`Now at: ${character.place.text}`) : undefined,
    listed('Carries', character.things.map(thing => `${thing.count > 1 ? `${thing.count} ` : ''}${thing.name}${thing.equipped ? ' (in hand or worn)' : ''}`)),
    listed('Abilities', character.abilities.map(ability => `${ability.name}${ability.sealed ? ' (sealed)' : ability.stage === 'learning' ? ' (learning)' : ''}${ability.level ? `, ${ability.level}` : ''}`)),
    character.voice ? sentence(`First words: ${character.voice.first.text}`) : undefined,
    recent(character.chronicle.map(event => change(event))),
  ]);
}

/** One item card as a companion reads it back. */
export function codexItemText(item: CodexItem): string {
  return joined([
    met(item.firstSeen),
    ...facts(item.atChapterZero),
    ...looks(item.appearance),
    item.holder ? sentence(`Held by ${item.holder.name}${item.count > 1 ? `, ${item.count} of them` : ''}${item.equipped ? ', in hand or worn' : ''}`) : 'No one holds it now.',
    recent(item.events.map(event => change(event, event.holder))),
  ]);
}

/** One place card as a companion reads it back. */
export function codexPlaceText(place: CodexPlace): string {
  return joined([met(place.firstSeen), ...facts(place.atChapterZero), ...looks(place.appearance), listed('Here now', place.here.map(who => who.name))]);
}

/** A faction, an ability or a species card as a companion reads it back. */
export function codexWorldCardText(card: CodexWorldCard | CodexFaction): string {
  return joined([
    met(card.firstSeen),
    ...facts(card.atChapterZero),
    'voice' in card && card.voice ? sentence(`First words: ${card.voice.first.text}`) : undefined,
  ]);
}

const topic = (prefix: string, index: number, title: string, aliases: readonly string[] | undefined, definition: string): DocsTopic =>
  ({ id: `${prefix}-${index + 1}`, title, aliases: aliases ?? [], definition });

/**
 * A story's knowledge as a docs catalog: one entry for every card the Codex
 * shows, the World rules sheet, and every chapter whose recap was saved. The
 * chapter open now is marked, so "this chapter" finds it. Empty categories are
 * left out.
 */
export function storyKnowledge({ codex, chapters, openChapterNumber }: {
  codex: StoryCodexRecord;
  chapters: readonly Pick<HarnessChapter, 'chapterNumber' | 'title' | 'recap'>[];
  /** The chapter the reader has open, if any. */
  openChapterNumber?: number;
}): DocsCatalog {
  const { characters, factions, items, places, abilities, species, world } = STORY_KNOWLEDGE_CATEGORIES;
  const categories = [
    { id: 'story-characters', title: characters, topics: codex.characters.map((card, at) => topic('story-character', at, card.name, [], codexCharacterText(card))) },
    { id: 'story-factions', title: factions, topics: codex.factions.map((card, at) => topic('story-faction', at, card.name, card.aliases, codexWorldCardText(card))) },
    { id: 'story-items', title: items, topics: codex.items.map((card, at) => topic('story-item', at, card.name, [], codexItemText(card))) },
    { id: 'story-places', title: places, topics: codex.places.map((card, at) => topic('story-place', at, card.name, card.aliases, codexPlaceText(card))) },
    { id: 'story-abilities', title: abilities, topics: codex.abilities.map((card, at) => topic('story-ability', at, card.name, card.aliases, codexWorldCardText(card))) },
    { id: 'story-species', title: species, topics: codex.species.map((card, at) => topic('story-species', at, card.name, card.aliases, codexWorldCardText(card))) },
    { id: 'story-world', title: world, topics: codex.worldRules?.length
      ? [topic('story-world', 0, 'World rules', ['rules of the world', 'how the world works'], joined(facts(codex.worldRules)))] : [] },
    { id: 'story-chapters', title: STORY_KNOWLEDGE_CATEGORIES.chapters, topics: [...chapters]
      .sort((left, right) => left.chapterNumber - right.chapterNumber)
      .filter(chapter => chapter.recap?.text.trim())
      .map(chapter => {
        const open = chapter.chapterNumber === openChapterNumber;
        return {
          id: `story-chapter-${chapter.chapterNumber}`,
          title: `Chapter ${chapter.chapterNumber}${chapter.title ? `: ${chapter.title}` : ''}`,
          // The lookup drops question words ("this", "what"), so the open chapter answers to what is left:
          // "this chapter" and "the chapter" become "chapter", "what just happened" becomes "just happened".
          aliases: [`chapter ${chapter.chapterNumber}`, ...(open ? ['chapter', 'current chapter', 'just happened'] : [])],
          definition: joined([open ? 'The chapter open now.' : undefined, sentence(chapter.recap?.text)]),
        };
      }) },
  ];
  return categories.filter(category => category.topics.length).map(category => ({ ...category, description: category.title }));
}

/**
 * The spoilers: everything the whole story's knowledge says that the
 * knowledge up to the open chapter does not, from cards the reader has not
 * reached to what later chapters changed on ones they have, each marked as
 * coming after the open chapter. Unlisted, so a companion is never handed even
 * their names; it finds them only when the reader asks outright.
 */
export function storySpoilers(reached: DocsCatalog, whole: DocsCatalog, openChapterNumber: number): DocsCatalog {
  const known = new Set(reached.flatMap(category => category.topics.map(entry => `${category.title}\n${entry.title}\n${entry.definition}`)));
  const topics = whole.flatMap(category => category.topics
    .filter(entry => !known.has(`${category.title}\n${entry.title}\n${entry.definition}`))
    .map(entry => ({ ...entry, id: `spoiler-${entry.id}`, definition: `Spoiler, from after Chapter ${openChapterNumber}: ${entry.definition}` })));
  return topics.length
    ? [{ id: 'story-spoilers', title: STORY_KNOWLEDGE_CATEGORIES.spoilers, description: STORY_KNOWLEDGE_CATEGORIES.spoilers, topics, unlisted: true }]
    : [];
}

/**
 * A story's knowledge from the workspace, as the Reader's Codex would show it
 * at the chapter the reader has open: the Codex worked out from the chapters
 * up to that one, so nothing later is told as fact, and what comes after it
 * kept apart as spoilers (`storySpoilers`). With no chapter open, the whole
 * story.
 */
export function storyKnowledgeOf(state: HarnessWorkspaceState, storyId: string, openChapterId?: string): DocsCatalog {
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber);
  const openChapterNumber = chapters.find(chapter => chapter.id === openChapterId)?.chapterNumber;
  const knowledgeOf = (written: readonly HarnessChapter[], reachedOnly = false) =>
    storyKnowledge({ codex: storyCodexOf(state, storyId, written, { reachedOnly }), chapters: written, openChapterNumber });
  if (openChapterNumber === undefined) return knowledgeOf(chapters);
  const reached = chapters.filter(chapter => chapter.chapterNumber <= openChapterNumber);
  const known = knowledgeOf(reached, reached.length < chapters.length);
  return reached.length === chapters.length ? known : [...known, ...storySpoilers(known, knowledgeOf(chapters), openChapterNumber)];
}
