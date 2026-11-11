import type { HarnessWorkspaceState, StoryWorldCard } from '../../../narrative/generation';
import { worldCardFactSlots, worldCardKey } from '../../../narrative/worldRecord';
import { findStory, storyWorldRecord } from './foundation';
import { isMinorEntry } from './holdings';
import { cloneHarnessValue } from './ids';

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

/** The workspace with a minor figure promoted to a card, and the card. Throws a reason a reader can read. */
export function promoteMinorFigure(state: HarnessWorkspaceState, storyId: string, entryId: string): { state: HarnessWorkspaceState; card: StoryWorldCard } {
  const story = findStory(state, storyId);
  if (!story) throw new Error('This story is no longer available.');
  const entry = state.codexEntries.find(candidate => candidate.id === entryId && candidate.storyId === storyId);
  if (!entry || !isMinorEntry(entry, storyWorldRecord(state, storyId))) throw new Error('Only a minor figure of this story can be promoted to a card.');
  const key = worldCardKey(entry.kind, entry.name);
  if (state.worldCards.some(card => card.storyId === storyId && card.key === key)) throw new Error(`This world already has a card named ${entry.name}.`);
  const card: StoryWorldCard = {
    key, kind: entry.kind, name: entry.name,
    ...(entry.aliases?.length ? { aliases: [...entry.aliases] } : {}),
    // As of the latest chapter: the story had already met them when the reader chose them.
    enteredInChapter: Math.max(1, story.head.nextChapterNumber - 1),
    slots: {},
    storyId,
  };
  const next = cloneHarnessValue(state);
  next.worldCards.push(card);
  next.codexEntries.find(candidate => candidate.id === entryId)!.cardKey = key;
  return { state: next, card: cloneHarnessValue(card) };
}

/**
 * The workspace with a promoted card's slots filled: only the slots its kind
 * defines, each on one line and within its limit; an empty one is cleared. A
 * card the world opened with is the author's and is not changed here.
 */
export function fillPromotedCard(state: HarnessWorkspaceState, storyId: string, cardKey: string, slots: Readonly<Record<string, string>>): { state: HarnessWorkspaceState; card: StoryWorldCard } {
  const saved = state.worldCards.find(card => card.storyId === storyId && card.key === cardKey);
  if (!saved || saved.enteredInChapter < 1) throw new Error('Only a card you promoted can be filled in here.');
  const next = cloneHarnessValue(state);
  const card = next.worldCards.find(entry => entry.storyId === storyId && entry.key === cardKey)!;
  for (const slot of worldCardFactSlots(card.kind)) {
    if (!(slot.id in slots)) continue;
    const value = String(slots[slot.id] ?? '').replace(/\s+/g, ' ').trim().slice(0, PROMOTED_CARD_SLOT_CHARACTERS);
    if (value) card.slots[slot.id] = value;
    else delete card.slots[slot.id];
  }
  return { state: next, card: cloneHarnessValue(card) };
}
