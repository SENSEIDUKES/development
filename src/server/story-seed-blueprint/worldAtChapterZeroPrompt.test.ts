import { describe, expect, it } from 'vitest';
import { WORLD_CARD_KINDS, readConditions } from '@seihouse/sen/contracts';
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

  it('asks for a character\'s whole look: a short portrait and each trait an artist draws from (SENSEI, 2026-11-11)', () => {
    for (const slot of [
      '    appearance: a short portrait of two or three sentences: what strikes the eye first, with their nature showing in it',
      '    build: their height and build',
      '    face: their face: its shape and what stands out in it',
      '    hair: their hair: its colour, its length and how it is worn',
      '    clothing: what they wear when the story opens',
      '    marks: scars, marks or anything that sets them apart',
      '    bearing: how their nature shows in the way they stand, move and look at people',
    ]) expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain(slot);
    // The World skill: a Look is the one slot that is not a single fact, and it is this person's alone.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('Keep every slot to one short, concrete fact, except a Look. A Look is a short portrait of two or three sentences.');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('No two people in the cast are described through the same features, and no Look opens the way another does.');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('Write what is seen, never the trait\'s name.');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('Leave Marks blank when they have none.');
    // The Origin skill: how people are described follows the kind of story the Seed's tags, genre and premise show.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('Read the Seed\'s tags, genre and premise for what kind of story this is and who it is written for');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('Where the Seed gives no clear signal, describe men and women with the same care.');
    // It names no feature and no stock phrase: a model repeats whatever it is shown on every character.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).not.toMatch(/\b(brows?|jade|porcelain|chin)\b/i);
  });

  it('builds Arc 1\'s whole pool, as it stands before Chapter 1 (SENSEI, 2026-11-11)', () => {
    // From The Frost-Scaled Companion: a card stated a bond the story only forms in Chapter 6, the cub the premise
    // is about had no card, two looks showed a weapon no card held, and the places pointed at names with no card.
    // The World skill says what to build.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('A card says how things stand before Chapter 1 begins, and nothing after.');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('a bond not yet formed, a rank not yet reached, a thing not yet found is never written as done. Write where each one starts instead.');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('Whoever the premise or an Arc 1 goal is about has a card of their own, person or beast, named or not');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('A species card describes a kind of creature and never stands in for one of them.');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('The places cover the ground Arc 1 stands on: where the story opens, and wherever its Arc 1 goals will take it. When several places sit inside a larger one, the larger one has a card too.');
    // The Blueprint's own rules say how names point at cards, whichever skills it reads.
    for (const rule of [
      '- what a Look or Clothing shows someone carrying (a weapon, a staff, a token) is a thing card they hold, named in their holds; otherwise leave it out. Ordinary clothes need no card;',
      'A slot that names a card is left blank when no card fits. Never fill it with a word such as none, unclaimed or unknown.',
    ]) {
      expect(BLUEPRINT_PERMANENT_RULES).toContain(rule);
      expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain(rule);
    }
    // No example names a creature or a keepsake: a model copies what it is shown into every story.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).not.toMatch(/\b(cub|fox|pendant|kitten)\b/i);
  });

  it('asks for each condition with its whole course, written once at the start (SENSEI, 2026-11-11)', () => {
    // A character's Status slot is their conditions now: each its own line, with the course code will run.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('    status: each lasting condition they are in when the story opens, one per line, written as the Conditions rule says; blank when they are well');
    // A thing's status is still its own one-word condition.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('    status: what condition it is in: whole, damaged, sealed');
    for (const rule of [
      'Conditions\nA condition is one line: its name, its stages in order, how fast it moves, and what ends it, separated by " | ":',
      'Name | first stage > next stage > last stage | a stage every N chapters | ends if this happens; or this',
      'Leave out the stages and the pace for a condition that does not change by itself. End the stages with "gone" when it passes by itself.',
    ]) {
      expect(BLUEPRINT_PERMANENT_RULES).toContain(rule);
      expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain(rule);
    }
    // The World skill says what one is and when to give one.
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('A condition is something lasting that a character carries into the story: a wound, an illness, a curse, a seal.');
    expect(WORLD_BLUEPRINT_SYSTEM_PROMPT).toContain('It then runs by itself as the chapters pass, whatever else happens, until something ends it. A mood is not a condition. Most characters have none.');
    // The rule's own line is a pattern, so it reads back as a condition with a course.
    expect(readConditions('Name | first stage > next stage > last stage | a stage every 3 chapters | ends if this happens; or this')).toEqual([
      { name: 'Name', stages: ['first stage', 'next stage', 'last stage'], pace: 3, passes: false, endsIf: ['this happens', 'this'] },
    ]);
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
    expect(swapped).toContain('[World] SEN World Builder 1.5.0');
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
