import { describe, expect, it } from 'vitest';
import { WORLD_CARD_KEY_PREFIX, normalizeWorldRecord, worldCardKey, type WorldRecord } from './worldRecord';

/**
 * The world record holds the world the story opens with and everyone and
 * everything a chapter brings in after it (SENSEI, 2026-10-24: "any new
 * character should just be processed properly in the beginning", the same as
 * the opening cast). Each card carries the chapter it entered in, so the record
 * can tell the opening cast from a later arrival without a second list.
 */

const card = (name: string, enteredInChapter: number, kind: 'character' | 'thing' = 'character') =>
  ({ key: worldCardKey(kind, name), kind, name, enteredInChapter, slots: {} });

const read = (cards: WorldRecord['cards']) => normalizeWorldRecord({ cards });

describe('the chapter a world card entered in', () => {
  it('keeps the opening world at Chapter 0 and a later arrival at its own chapter', () => {
    const world = read([card('Ye Chen', 0), card('Elder Qin', 9)]);
    expect(world?.cards.map(entry => [entry.name, entry.enteredInChapter])).toEqual([['Ye Chen', 0], ['Elder Qin', 9]]);
  });

  it('never invents a chapter: an entry it cannot read is the world the story opened with', () => {
    const cards = [
      { key: 'k1', kind: 'character' as const, name: 'No Entry', slots: {} },
      card('Fractional', 4.5),
      card('Negative', -3),
      { key: 'k4', kind: 'character' as const, name: 'Not A Number', enteredInChapter: '7' as unknown as number, slots: {} },
    ];
    const world = read(cards as WorldRecord['cards']);
    expect(world?.cards.map(entry => entry.enteredInChapter)).toEqual([0, 0, 0, 0]);
  });

  it('reads one card per key, entered in the earliest chapter either copy claims', () => {
    // However the two were ordered: a card is never made to arrive later than
    // the story already had it.
    expect(read([card('Jade Token', 6, 'thing'), card('Jade Token', 2, 'thing')])?.cards)
      .toEqual([expect.objectContaining({ name: 'Jade Token', enteredInChapter: 2 })]);
    expect(read([card('Jade Token', 2, 'thing'), card('Jade Token', 6, 'thing')])?.cards)
      .toEqual([expect.objectContaining({ name: 'Jade Token', enteredInChapter: 2 })]);
  });

  it('keys a card by its kind and its name, never by the chapter it entered in', () => {
    const opening = read([card('Elder Qin', 0)])?.cards[0].key;
    const later = read([card('Elder Qin', 14)])?.cards[0].key;
    expect(later).toBe(opening);
    expect(later).toBe(`${WORLD_CARD_KEY_PREFIX}character:elder-qin`);
  });
});
