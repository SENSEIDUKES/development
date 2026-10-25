import { describe, expect, it } from 'vitest';
import { WORLD_CARD_KINDS, type WorldRecord } from '../../../narrative/worldRecord';
import { createEmptyHarnessWorkspaceState } from './repository';
import { createHarnessStory, reviseStoryFoundation, storyWorldRecord } from './foundation';
import { exportHarnessStory } from './controller';
import { compileStoryInformationPacket } from './context';

/**
 * The world record needs a home a chapter can write to. Until now it lived only
 * on the Foundation, which is the author's record and is revised by them, so the
 * record could describe a card a later chapter brought in and nothing could put
 * one there (PR #430 gave the card its chapter; it gave the record no home).
 */

const world = (cards: WorldRecord['cards']): WorldRecord => ({ cards });

const OPENING = world([
  { key: 'world:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, enteredInChapter: 0, slots: { bio: 'A quarry laborer.' } },
  { key: 'world:thing:jade-token', kind: 'thing', name: 'Jade Token', enteredInChapter: 0, slots: { holder: 'Ye Chen' } },
]);

const start = (over: Partial<Parameters<typeof createHarnessStory>[1]> = {}) =>
  createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A quarry laborer rises.', worldAtChapterZero: OPENING, ...over });

describe('the world record lives on the workspace', () => {
  it('opens a story\'s record from the world its author wrote', () => {
    const created = start();
    expect(created.state.worldCards.map(card => [card.name, card.storyId, card.enteredInChapter]))
      .toEqual([['Ye Chen', created.story.id, 0], ['Jade Token', created.story.id, 0]]);
    expect(storyWorldRecord(created.state, created.story.id)?.cards.map(card => card.name)).toEqual(['Ye Chen', 'Jade Token']);
  });

  it('keeps one story\'s cards out of another\'s record', () => {
    const first = start();
    const second = createHarnessStory(first.state, { premise: 'A second story.', worldAtChapterZero: world([
      { key: 'world:character:lin-feng', kind: 'character', name: 'Lin Feng', enteredInChapter: 0, slots: {} },
    ]) });
    expect(storyWorldRecord(second.state, first.story.id)?.cards.map(card => card.name)).toEqual(['Ye Chen', 'Jade Token']);
    expect(storyWorldRecord(second.state, second.story.id)?.cards.map(card => card.name)).toEqual(['Lin Feng']);
  });

  it('has no record for a story whose author wrote no world', () => {
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'No world yet.' });
    expect(storyWorldRecord(created.state, created.story.id)).toBeUndefined();
  });

  it('replaces the opening cards when the author revises, and keeps what a chapter brought in', () => {
    const created = start();
    // A card a chapter brought in: the thing this whole step exists to allow.
    const withArrival = {
      ...created.state,
      worldCards: [...created.state.worldCards, {
        storyId: created.story.id, key: 'world:character:elder-qin', kind: 'character' as const,
        name: 'Elder Qin', enteredInChapter: 9, slots: { role: 'Sect Elder' },
      }],
    };
    const revised = reviseStoryFoundation(withArrival, created.story.id, {
      premise: 'A quarry laborer rises.',
      worldAtChapterZero: world([
        { key: 'world:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, enteredInChapter: 0, slots: { bio: 'A quarry laborer the sect wrote off.' } },
      ]),
    });
    const cards = storyWorldRecord(revised.state, created.story.id)!.cards;
    // The author owns Chapter 0: Jade Token is gone because they removed it.
    // The chapters own what they added: Elder Qin stays.
    expect(cards.map(card => [card.name, card.enteredInChapter])).toEqual([['Elder Qin', 9], ['Ye Chen', 0]]);
    expect(cards.find(card => card.name === 'Ye Chen')?.slots.bio).toBe('A quarry laborer the sect wrote off.');
  });

  it('carries the living record to the writer, a later arrival included', () => {
    const created = start();
    const withArrival = {
      ...created.state,
      worldCards: [...created.state.worldCards, {
        storyId: created.story.id, key: 'world:character:elder-qin', kind: 'character' as const,
        name: 'Elder Qin', enteredInChapter: 9, slots: { role: 'Sect Elder' },
      }],
    };
    const packet = compileStoryInformationPacket(withArrival, created.story, created.foundation, 'hga_test');
    expect(packet.worldAtChapterZero?.cards.map(card => card.name)).toEqual(['Ye Chen', 'Jade Token', 'Elder Qin']);
  });

  it('carries the record out with the story when it is exported', () => {
    // Export story carries the whole story (HARNESS_PRINCIPLES, inspectability).
    // Adding the record to the workspace without adding it here lost the world
    // on the way out, and an export re-opened came back with no world at all.
    const created = start();
    const withArrival = {
      ...created.state,
      worldCards: [...created.state.worldCards, {
        storyId: created.story.id, key: 'world:character:elder-qin', kind: 'character' as const,
        name: 'Elder Qin', enteredInChapter: 9, slots: {},
      }],
    };
    const exported = exportHarnessStory(withArrival, created.story.id);
    expect(exported.worldCards.map(card => [card.name, card.enteredInChapter]))
      .toEqual([['Ye Chen', 0], ['Jade Token', 0], ['Elder Qin', 9]]);
    // And only this story's.
    const second = createHarnessStory(withArrival, { premise: 'Another story.', worldAtChapterZero: world([
      { key: 'world:character:lin-feng', kind: 'character', name: 'Lin Feng', enteredInChapter: 0, slots: {} },
    ]) });
    expect(exportHarnessStory(second.state, created.story.id).worldCards.every(card => card.storyId === created.story.id)).toBe(true);
  });

  it('keeps every card kind the schema defines readable from the record', () => {
    // The record is kind-agnostic: a place or a faction a chapter brings in has
    // the same home as a character (SENSEI, 2026-10-25: "anything that has a
    // codex item, this should obviously be the method how it works").
    const kinds = WORLD_CARD_KINDS.filter(kind => !kind.single).map(kind => kind.id);
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), {
      premise: 'Every kind.',
      worldAtChapterZero: world(kinds.map(kind => ({
        key: `world:${kind}:one`, kind, name: `One ${kind}`, enteredInChapter: 0, slots: {},
      }))),
    });
    expect(storyWorldRecord(created.state, created.story.id)?.cards.map(card => card.kind)).toEqual(kinds);
  });
});
