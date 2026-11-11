import type { HarnessWorkspaceState, StoryWorldCard } from '../../../narrative/generation';
import { SPEAKER_KIND } from '../../../narrative/speech';
import { worldCardFactSlots, worldCardKey, type WorldCardKindId, type WorldCardSlot } from '../../../narrative/worldRecord';
import { normalizeIdentityLabel } from './canonicalProjection';
import { findStory, storyWorldRecord } from './foundation';
import { isMinorEntry } from './holdings';
import { cloneHarnessValue, stableHarnessId } from './ids';

/**
 * Promote: a minor figure becomes a world card (SENSEI, 2026-11-11).
 *
 * In a story with a world record, whoever and whatever a chapter brings in
 * that has no card is a minor figure: the story uses it without tracking it.
 * A reader who comes to care about one promotes it. This is the one way a card
 * is made after the story begins without the Blueprint or an arc, and nothing
 * else makes one: a tag never does.
 *
 * The card starts with its name and nothing else ("the reader fills, the rest
 * stays blank"), so no model is called. It enters the world in the latest
 * chapter, the point the reader chose it at. Its Codex entry keeps its ID, so
 * every tag that named it still points at it.
 */

/** The most characters one slot of a promoted card keeps: room for a Look's two or three sentences. */
export const PROMOTED_CARD_SLOT_CHARACTERS = 600;

/**
 * What a promoted card's slots are: its kind's facts, without the ones the
 * story's own tags already record. What a character holds, knows and ranks at,
 * and who holds a thing and how many, are worked out from the chapters; a
 * second statement of them on a card made mid-story would be counted on top.
 */
const RECORDED_BY_TAGS: Partial<Record<WorldCardKindId, readonly string[]>> = {
  character: ['rankLevel', 'holds', 'knows'],
  thing: ['holder', 'count'],
};
export const promotedCardSlots = (kind: WorldCardKindId): WorldCardSlot[] =>
  worldCardFactSlots(kind).filter(slot => !RECORDED_BY_TAGS[kind]?.includes(slot.id));

/** The key the Codex lists someone under whom only speaker tags name: they have no Codex entry yet. */
const SPOKEN_ONLY = 'character:';
/** The name such a figure speaks under, as the story first writes it. */
const spokenName = (state: HarnessWorkspaceState, storyId: string, label: string): string | undefined => {
  const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber);
  for (const chapter of chapters) {
    const line = (chapter.speakers ?? []).find(record => record.kind === SPEAKER_KIND && !record.payload.protagonist
      && normalizeIdentityLabel(record.payload.speaker) === label);
    if (line) return line.payload.speaker.trim();
  }
  return undefined;
};

/**
 * The workspace with a minor figure promoted to a card, and the card. Throws a
 * reason a reader can read. `figure` is the key the Codex lists them under:
 * their Codex entry's ID, or, for someone only speaker tags name, the
 * `character:` key of the name they speak under; their entry is then made with
 * the card, as every card's is.
 */
export function promoteMinorFigure(state: HarnessWorkspaceState, storyId: string, figure: string, createdAt = new Date().toISOString()): { state: HarnessWorkspaceState; card: StoryWorldCard } {
  const story = findStory(state, storyId);
  if (!story) throw new Error('This story is no longer available.');
  const world = storyWorldRecord(state, storyId);
  const mine = state.codexEntries.filter(candidate => candidate.storyId === storyId);
  const entry = mine.find(candidate => candidate.id === figure);
  const label = !entry && world?.cards.length && figure.startsWith(SPOKEN_ONLY) ? figure.slice(SPOKEN_ONLY.length) : undefined;
  // Someone an entry already answers for is promoted through that entry, never a second time by name.
  const spoken = label && !mine.some(candidate => candidate.kind === 'character'
    && [candidate.name, ...(candidate.aliases ?? [])].some(name => normalizeIdentityLabel(name) === label))
    ? spokenName(state, storyId, label) : undefined;
  if (!(entry ? isMinorEntry(entry, world) : spoken)) throw new Error('Only a minor figure of this story can be promoted to a card.');
  const kind = entry?.kind ?? 'character';
  const name = entry?.name ?? spoken!;
  const key = worldCardKey(kind, name);
  if (state.worldCards.some(card => card.storyId === storyId && card.key === key)) throw new Error(`This world already has a card named ${name}.`);
  const card: StoryWorldCard = {
    key, kind, name,
    ...(entry?.aliases?.length ? { aliases: [...entry.aliases] } : {}),
    // As of the latest chapter: the story had already met them when the reader chose them.
    enteredInChapter: Math.max(1, story.head.nextChapterNumber - 1),
    slots: {},
    storyId,
  };
  const next = cloneHarnessValue(state);
  next.worldCards.push(card);
  const saved = next.codexEntries.find(candidate => candidate.id === figure && candidate.storyId === storyId);
  if (saved) saved.cardKey = key;
  else next.codexEntries.push({ id: stableHarnessId('hcx', storyId, key), storyId, kind, name, origin: { source: 'world' }, cardKey: key, createdAt });
  return { state: next, card: cloneHarnessValue(card) };
}

/**
 * The workspace with a promoted card's slots filled: only the slots a promoted
 * card of its kind has (`promotedCardSlots`), each on one line and within its
 * limit; an empty one is cleared. A card the world opened with is the author's
 * and is not changed here.
 */
export function fillPromotedCard(state: HarnessWorkspaceState, storyId: string, cardKey: string, slots: Readonly<Record<string, string>>): { state: HarnessWorkspaceState; card: StoryWorldCard } {
  const saved = state.worldCards.find(card => card.storyId === storyId && card.key === cardKey);
  if (!saved || saved.enteredInChapter < 1) throw new Error('Only a card you promoted can be filled in here.');
  const next = cloneHarnessValue(state);
  const card = next.worldCards.find(entry => entry.storyId === storyId && entry.key === cardKey)!;
  for (const slot of promotedCardSlots(card.kind)) {
    if (!(slot.id in slots)) continue;
    const value = String(slots[slot.id] ?? '').replace(/\s+/g, ' ').trim().slice(0, PROMOTED_CARD_SLOT_CHARACTERS);
    if (value) card.slots[slot.id] = value;
    else delete card.slots[slot.id];
  }
  return { state: next, card: cloneHarnessValue(card) };
}
