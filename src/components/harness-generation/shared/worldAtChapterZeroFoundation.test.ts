import { describe, expect, it } from 'vitest';
import { normalizeWorldAtChapterZero, type WorldAtChapterZero } from '../../../narrative/worldRecord';
import { createEmptyHarnessWorkspaceState } from './repository';
import { createHarnessStory, normalizeStoryFoundationInput } from './foundation';

/**
 * The world the story opens with has to survive the Foundation to be worth
 * building. It did not: `normalizeStoryFoundationInput` rebuilds the Foundation
 * from the fields it knows, and this one was missing from that list, so a
 * Blueprint filled every card and the Foundation dropped the lot at story
 * creation (SENSEI, 2026-10-24: "The Blueprint work we just did is not even in
 * the codex. We just filled in eye colors, voice, and everything else just for
 * the codex to only show a scraped look summary"). Nothing downstream of the
 * Foundation can be tested without this, so it is tested first.
 */

const WORLD: WorldAtChapterZero = {
  cards: [
    {
      key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
      slots: { bio: 'A quarry laborer the sect wrote off.', eyeColor: 'Pale grey', voice: 'an energetic young man' },
    },
    { key: 'chapter-0:thing:jade-token', kind: 'thing', name: 'Jade Token', slots: { holder: 'Ye Chen' } },
  ],
};

describe('the Foundation keeps the world the story opens with', () => {
  it('carries every card through normalization', () => {
    const normalized = normalizeStoryFoundationInput({ premise: 'A quarry laborer rises.', worldAtChapterZero: WORLD });
    expect(normalized.worldAtChapterZero).toEqual(WORLD);
  });

  it('keeps it on the created story\'s first Foundation revision', () => {
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A quarry laborer rises.', worldAtChapterZero: WORLD });
    expect(created.foundation.input.worldAtChapterZero?.cards.map(card => card.name)).toEqual(['Ye Chen', 'Jade Token']);
    // The slots the Blueprint filled are the point: these are the ones SENSEI
    // filled in and never saw again.
    expect(created.foundation.input.worldAtChapterZero?.cards[0].slots).toMatchObject({ eyeColor: 'Pale grey', voice: 'an energetic young man' });
  });

  it('leaves a story with no world exactly as it was', () => {
    const normalized = normalizeStoryFoundationInput({ premise: 'A quarry laborer rises.' });
    expect(normalized).not.toHaveProperty('worldAtChapterZero');
  });
});

describe('reading a world a host supplies', () => {
  it('computes every key from the card\'s own kind and name, whatever arrived', () => {
    const world = normalizeWorldAtChapterZero({ cards: [
      { key: 'whatever-the-host-sent', kind: 'place', name: 'The Rift Quarry', slots: {} },
    ] })!;
    expect(world.cards[0].key).toBe('chapter-0:place:the-rift-quarry');
  });

  it('drops a card with no name or no known kind, and a world left with none', () => {
    expect(normalizeWorldAtChapterZero({ cards: [
      { key: 'a', kind: 'character', name: '   ', slots: {} },
      { key: 'b', kind: 'sidekick' as never, name: 'Mu', slots: {} },
    ] })).toBeUndefined();
    expect(normalizeWorldAtChapterZero(undefined)).toBeUndefined();
    expect(normalizeWorldAtChapterZero({ cards: [] })).toBeUndefined();
  });

  it('drops a slot the card\'s kind does not define, one that only names it, and an empty one', () => {
    const world = normalizeWorldAtChapterZero({ cards: [{
      key: 'x', kind: 'thing', name: 'Jade Token',
      slots: { appearance: 'A green chip.', status: '   ', name: 'Jade Token', aliases: 'the Token', eyeColor: 'Pale grey' },
    }] })!;
    expect(world.cards[0].slots).toEqual({ appearance: 'A green chip.' });
  });

  it('keeps one card for a kind the schema keeps single, and one card per name', () => {
    const world = normalizeWorldAtChapterZero({ cards: [
      { key: 'r1', kind: 'world-rules', name: 'World rules', slots: { flavor: 'Qi.' } },
      { key: 'r2', kind: 'world-rules', name: 'Other rules', slots: { flavor: 'Mana.' } },
      { key: 'p1', kind: 'place', name: 'Azure Hall', slots: { within: 'The sect' } },
      { key: 'p2', kind: 'place', name: 'Azure Hall', slots: { within: 'Somewhere else' } },
    ] })!;
    expect(world.cards.map(card => [card.kind, card.name])).toEqual([['world-rules', 'World rules'], ['place', 'Azure Hall']]);
    expect(world.cards[1].slots).toEqual({ within: 'The sect' });
  });

  it('keeps the aliases that resolve to a card, and never the card\'s own name among them', () => {
    const world = normalizeWorldAtChapterZero({ cards: [{
      key: 'c', kind: 'character', name: 'Elder Qin', aliases: ['The Iron Brush', ' elder qin ', 'The Iron Brush', '  '], slots: {},
    }] })!;
    expect(world.cards[0].aliases).toEqual(['The Iron Brush']);
  });

  it('keeps the main character and a world open to its reader only when each is truly set', () => {
    const marked = normalizeWorldAtChapterZero({ openToTheReader: true, cards: [
      { key: 'c', kind: 'character', name: 'Ye Chen', mainCharacter: true, slots: {} },
    ] })!;
    expect(marked).toMatchObject({ openToTheReader: true, cards: [{ mainCharacter: true }] });
    const plain = normalizeWorldAtChapterZero({ cards: [
      { key: 'c', kind: 'character', name: 'Ye Chen', mainCharacter: false as never, slots: {} },
    ] })!;
    expect(plain).not.toHaveProperty('openToTheReader');
    expect(plain.cards[0]).not.toHaveProperty('mainCharacter');
  });
});
