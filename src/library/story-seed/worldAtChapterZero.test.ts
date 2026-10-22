import { describe, expect, it } from 'vitest';
import { WORLD_CARD_KINDS, worldCardsOfKind, worldRulesCard } from '@seihouse/sen/contracts';
import {
  createEmptyStorySeedInput,
  fillBlankSeedSlots,
  readGeneratedSeedSlots,
  reconcileStorySeedBlueprint,
} from '@seihouse/sen/story-seed';
import {
  createFilledStorySeedInput,
  createMockBlueprint,
  createMockSeedSlotAnswer,
  createMockStorySeedRecord,
} from '../../workshop/previews/story-seed/previewData';
import { createHarnessFoundationFromStorySeed } from './harnessFoundation';
import { worldAtChapterZeroFromStorySeed } from './worldAtChapterZero';

describe('The world at Chapter 0', () => {
  it('is empty when the Seed holds no world', () => {
    expect(worldAtChapterZeroFromStorySeed(createEmptyStorySeedInput()).cards).toEqual([]);
  });

  it('reads every card kind the author filled, the main character first', () => {
    const world = worldAtChapterZeroFromStorySeed(
      fillBlankSeedSlots(createFilledStorySeedInput(), readGeneratedSeedSlots(createMockSeedSlotAnswer())),
    );
    expect(world.cards[0]).toMatchObject({ name: 'Ye Chen', kind: 'character', mainCharacter: true });
    for (const kind of WORLD_CARD_KINDS) {
      expect(worldCardsOfKind(world, kind.id).length, `${kind.plural} at Chapter 0`).toBeGreaterThan(0);
    }
  });

  it('keeps each card to the slots its Codex card kind defines, and leaves blanks out', () => {
    const world = worldAtChapterZeroFromStorySeed(
      fillBlankSeedSlots(createFilledStorySeedInput(), readGeneratedSeedSlots(createMockSeedSlotAnswer())),
    );
    for (const card of world.cards) {
      const slots = WORLD_CARD_KINDS.find(kind => kind.id === card.kind)!.slots.map(slot => slot.id);
      for (const [slot, value] of Object.entries(card.slots)) {
        expect(slots, `${card.name}: ${slot}`).toContain(slot);
        expect(value.trim()).not.toBe('');
      }
    }
  });

  it('carries what the author wrote and what the Blueprint filled for the blanks', () => {
    const seed = fillBlankSeedSlots(createFilledStorySeedInput(), readGeneratedSeedSlots(createMockSeedSlotAnswer()));
    const world = worldAtChapterZeroFromStorySeed(seed);
    const main = worldCardsOfKind(world, 'character').find(card => card.mainCharacter)!;
    // The author's own value for where he stands.
    expect(main.slots.location).toBe('Rift Quarry');
    // A slot the author left blank, filled before Chapter 1.
    expect(main.slots.gender).toBeUndefined();
    const qin = worldCardsOfKind(world, 'character').find(card => card.name === 'Elder Qin')!;
    expect(qin.aliases).toEqual(['The Iron Brush']);
    expect(qin.slots).toMatchObject({ location: 'Azure Hall', holds: 'Iron Brush', belongsTo: 'Heavenly Sword Sect' });
    const rules = worldRulesCard(world)!;
    expect(rules.slots.knownRanks).toContain('Qi Condensation');
    expect(rules.slots.laws).toContain('No killing inside the sect gates');
  });

  it('travels to the story on its Foundation, from the reconciled Seed', () => {
    const record = createMockStorySeedRecord();
    const seed = fillBlankSeedSlots(record.seed, readGeneratedSeedSlots(createMockSeedSlotAnswer()));
    const { seed: reconciled } = reconcileStorySeedBlueprint(seed, createMockBlueprint());
    const foundation = createHarnessFoundationFromStorySeed({ ...record, seed: reconciled });
    const world = foundation.worldAtChapterZero!;
    expect(world.cards.map(card => card.name)).toContain('Rift Quarry');
    expect(worldCardsOfKind(world, 'thing').map(card => card.name)).toContain('Iron Brush');
  });

  it('gives every card a key of its own, stable for the story', () => {
    const world = worldAtChapterZeroFromStorySeed(
      fillBlankSeedSlots(createFilledStorySeedInput(), readGeneratedSeedSlots(createMockSeedSlotAnswer())),
    );
    const keys = world.cards.map(card => card.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every(key => key.startsWith('chapter-0:'))).toBe(true);
  });
});
