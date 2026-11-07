import { describe, expect, it } from 'vitest';
import { WORLD_CARD_KINDS } from '@seihouse/sen/contracts';
import { SEN_BLUEPRINT_DEFAULT_SKILLS } from '@seihouse/sen/harness-generation';
import { createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import { BLUEPRINT_PERMANENT_RULES, WORLD_BLUEPRINT_SYSTEM_PROMPT, buildWorldBlueprintPrompt, buildWorldBlueprintSystemPrompt } from './prompt';
import { worldBlueprintResponseSchema } from './prompt';

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
      expect(BLUEPRINT_PERMANENT_RULES, kind.label).toContain(`- ${ANSWER_FIELDS[kind.id]}`);
      for (const slot of kind.slots) {
        if (slot.aliases) continue;
        expect(BLUEPRINT_PERMANENT_RULES, `${kind.label}: ${slot.id}`).toContain(`${slot.id}: ${slot.asks}`);
      }
    }
  });

  it('states the two tests a card is measured by, and that the record is medium-neutral', () => {
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('an artist must be able to draw the opening scene');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('a game must be able to load the world exactly as it stands');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('never a panel, a camera, a frame count or an art style');
  });

  it('never asks the model for aliases, which are the author\'s alone and have no place in the answer', () => {
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).not.toContain('aliases');
  });

  it('travels with every Blueprint, whichever skills it reads', () => {
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT.endsWith(BLUEPRINT_PERMANENT_RULES)).toBe(true);
    const western = { id: 'test.western-fantasy', version: '1.0.0', name: 'Western Fantasy', description: 'A test Origin.', slot: 'origin' as const, applications: ['generation' as const], instructions: 'You are writing the world of a Western fantasy novel: knights, keeps and old magic.' };
    // A host that licenses SEN gives its own Origin and its own identity.
    const swapped = buildWorldBlueprintSystemPrompt([western, ...SEN_BLUEPRINT_DEFAULT_SKILLS.filter(skill => skill.slot !== 'origin')],
      'You are a celebrated Western fantasy novelist.');
    expect(swapped.startsWith('# ROLE AND MISSION\n\nYou are a celebrated Western fantasy novelist. Build the Blueprint')).toBe(true);
    expect(swapped).toContain('[Origin] Western Fantasy 1.0.0\nYou are writing the world of a Western fantasy novel');
    expect(swapped).not.toContain('Eastern fantasy');
    expect(swapped).toContain('[World] SEN World Builder 1.2.0');
    expect(swapped.endsWith(BLUEPRINT_PERMANENT_RULES)).toBe(true);
    // The same identity closes the request, in its Mission Reminder.
    const request = buildWorldBlueprintPrompt(createEmptyStorySeedInput(), undefined, 'You are a celebrated Western fantasy novelist.');
    expect(request).toContain('# MISSION REMINDER\n\nYou are a celebrated Western fantasy novelist. Build this novel');
    expect(request).not.toContain('Eastern fantasy');
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
