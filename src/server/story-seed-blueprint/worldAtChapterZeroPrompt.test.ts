import { describe, expect, it } from 'vitest';
import { WORLD_CARD_KINDS } from '@seihouse/sen/contracts';
import { createFilledStorySeedInput } from '../../workshop/previews/story-seed/previewData';
import { WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS, buildWorldBlueprintPrompt } from './prompt';
import { worldBlueprintResponseSchema } from './generate';

/**
 * The Codex decides the slots. These checks fail if the words the Blueprint
 * model reads, or the answer it may give, ever stop covering a card kind the
 * Codex holds — the drift that left the Story Seed and the Codex apart.
 */

/** Where each card kind's cards arrive in the answer. */
const ANSWER_FIELDS: Record<string, string> = {
  character: 'characters',
  thing: 'things',
  ability: 'startingAbilities',
  place: 'places',
  faction: 'factions',
  species: 'species',
  'world-rules': 'powerSystem',
};

describe('The world builder asks for every Codex card kind', () => {
  it('names every card kind and every slot of it', () => {
    for (const kind of WORLD_CARD_KINDS) {
      expect(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS, kind.label).toContain(`- ${ANSWER_FIELDS[kind.id]}`);
      for (const slot of kind.slots) {
        if (slot.aliases) continue;
        expect(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS, `${kind.label}: ${slot.id}`).toContain(`${slot.id}: ${slot.asks}`);
      }
    }
  });

  it('states the two tests a card is measured by, and that the record is medium-neutral', () => {
    expect(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS).toContain('an artist must be able to draw the opening scene');
    expect(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS).toContain('a game must be able to load the world exactly as it stands');
    expect(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS).toContain('never a panel, a camera, a frame count or an art style');
  });

  it('never asks the model to write aliases, which are the author\'s alone', () => {
    expect(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS).toContain('Never write aliases');
    expect(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS).not.toContain('aliases:');
  });

  it('travels with every Blueprint request', () => {
    expect(buildWorldBlueprintPrompt(createFilledStorySeedInput())).toContain(WORLD_AT_CHAPTER_ZERO_INSTRUCTIONS);
  });

  it('has a place in the answer for every slot of every card kind', () => {
    const schema = worldBlueprintResponseSchema() as unknown as {
      properties: Record<string, { items?: { properties: Record<string, unknown> }; properties?: Record<string, unknown> }>;
    };
    for (const kind of WORLD_CARD_KINDS) {
      const field = schema.properties[ANSWER_FIELDS[kind.id]];
      const slots = field?.items?.properties ?? field?.properties ?? {};
      for (const slot of kind.slots) {
        if (slot.aliases) continue;
        if (kind.single && slot.id === 'name') continue;
        expect(Object.keys(slots), `${kind.label}: ${slot.id}`).toContain(slot.id);
      }
    }
  });

  it('has a place for the main character\'s own card, beside the slots only they have', () => {
    const schema = worldBlueprintResponseSchema() as unknown as {
      properties: { mainCharacter: { properties: Record<string, unknown> } };
    };
    const slots = Object.keys(schema.properties.mainCharacter.properties);
    const character = WORLD_CARD_KINDS.find(kind => kind.id === 'character')!;
    for (const slot of character.slots) {
      // The main character is the main character: they have no role beside the
      // story and no tie to themselves. Aliases are the author's alone.
      if (slot.aliases || slot.id === 'role' || slot.id === 'connectionToMC') continue;
      expect(slots, `main character: ${slot.id}`).toContain(slot.id);
    }
    expect(slots).toContain('backgroundProfile');
  });
});
