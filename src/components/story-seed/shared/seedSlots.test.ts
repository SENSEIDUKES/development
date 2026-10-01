import { describe, expect, it } from 'vitest';
import {
  SEED_CHARACTER_LIMIT, SEED_FACTION_LIMIT, createEmptyStorySeedInput, fillBlankSeedSlots, finalizeGeneratedWorldBlueprint,
  normalizeWorldBlueprint, readGeneratedSeedSlots, reconcileStorySeedBlueprint, resolveStorySeedWorldCanon, type StorySeedInput,
} from '@seihouse/sen/story-seed';
import { createFilledStorySeedInput, createMockBlueprint, createMockSeedSlotAnswer } from '../../../workshop/previews/story-seed/previewData';

const answer = createMockSeedSlotAnswer();

describe('The Blueprint fills every Story Seed slot the creator left blank', () => {
  it('fills the main character\'s blank slots and never changes what the creator wrote', () => {
    const seed = createFilledStorySeedInput();
    const filled = fillBlankSeedSlots(seed, readGeneratedSeedSlots(answer)).world.optional.worldFoundations;
    expect(filled.mainCharacter).toEqual({
      ...seed.world.optional.worldFoundations.mainCharacter,
      // Blank before; the creator's identity, personality, advantage, weakness and bio stay theirs.
      mainFlaw: 'Cannot trust anyone who has not died beside him',
      moralAlignment: 'Pragmatic protector',
    });
  });

  it('fills the blanks on the creator\'s own cards, matched by name or alias, adds new ones, and never writes aliases', () => {
    const seed = createFilledStorySeedInput();
    const slots = readGeneratedSeedSlots({ ...answer, characters: [{ ...answer.characters[0], name: 'The Iron Brush', aliases: ['Model alias'] }, answer.characters[1]] });
    const filled = fillBlankSeedSlots(seed, slots).world.optional.worldFoundations;
    const [qin, han] = filled.additionalCharacters!;
    expect(qin).toEqual({ ...seed.world.optional.worldFoundations.additionalCharacters![0], skinTone: 'Weathered bronze', eyeColor: 'Frost grey' });
    expect(qin.aliases).toEqual(['The Iron Brush']);
    expect(han).toMatchObject({ name: 'Junior Sister Han', role: 'Ally', age: 'Seventeen', connectionToMC: 'Fellow quarry laborer' });
    expect(han).not.toHaveProperty('aliases');
    const [sect, alliance] = filled.factions!;
    expect(sect).toEqual(seed.world.optional.worldFoundations.factions![0]);
    expect(alliance).toMatchObject({ name: 'Deep Sea Alliance', powerLevel: 'High Tier', alignment: 'Neutral' });
  });

  it('fills abilities, the power system and the main opposition only where they were blank', () => {
    const seed = createFilledStorySeedInput();
    delete seed.world.optional.worldFoundations.mainOpposition;
    const filled = fillBlankSeedSlots(seed, readGeneratedSeedSlots(answer)).world.optional.worldFoundations;
    expect(filled.abilities).toEqual({ startingPowerConcept: 'Qi Condensation Tier 1', uniquePath: 'Rebuilds his meridians from the scars of failed timelines' });
    expect(filled.powerSystem).toEqual({ flavor: 'Martial arts, Daoist', knownRanks: 'Qi Condensation → Foundation Establishment → Core Formation → Nascent Soul' });
    expect(filled.mainOpposition).toBe("The celestial court's fate auditors");
  });

  it('adds cards only up to the Seed\'s limits, never trims the creator\'s, and never adds the main character as a side character', () => {
    const seed: StorySeedInput = createEmptyStorySeedInput();
    seed.world.optional.worldFoundations.mainCharacter = { name: 'Ye Chen' };
    seed.world.optional.worldFoundations.additionalCharacters = Array.from({ length: 9 }, (_, index) => ({ id: `c${index}`, name: `Creator ${index}` }));
    const many = (count: number) => Array.from({ length: count }, (_, index) => ({ name: `New ${index}`, role: 'Extra' }));
    const filled = fillBlankSeedSlots(seed, readGeneratedSeedSlots({ characters: [{ name: 'Ye Chen', role: 'Hero' }, ...many(3)], factions: many(9) })).world.optional.worldFoundations;
    expect(filled.additionalCharacters).toHaveLength(9);
    expect(filled.additionalCharacters!.map(card => card.name)).not.toContain('Ye Chen');
    expect(filled.factions).toHaveLength(SEED_FACTION_LIMIT);
    const fresh = fillBlankSeedSlots(createEmptyStorySeedInput(), readGeneratedSeedSlots({ characters: many(12) })).world.optional.worldFoundations;
    expect(fresh.additionalCharacters).toHaveLength(SEED_CHARACTER_LIMIT);
  });

  it('travels only with the reply: a stored Blueprint never keeps it, and a cleared value is not filled again on reload', () => {
    const seed = createFilledStorySeedInput();
    const generated = finalizeGeneratedWorldBlueprint({ ...createMockBlueprint(), ...answer }, seed);
    expect(generated.generatedSeedSlots?.mainCharacter?.mainFlaw).toBe('Cannot trust anyone who has not died beside him');
    expect(normalizeWorldBlueprint(generated, seed)).not.toHaveProperty('generatedSeedSlots');
    const created = reconcileStorySeedBlueprint(fillBlankSeedSlots(seed, generated.generatedSeedSlots), generated);
    expect(created.blueprint).not.toHaveProperty('generatedSeedSlots');
    expect(created.seed.world.optional.worldFoundations.mainCharacter?.mainFlaw).toBe('Cannot trust anyone who has not died beside him');
    // The creator clears the flaw; reloading the saved pair never refills it.
    const cleared = structuredClone(created.seed);
    delete cleared.world.optional.worldFoundations.mainCharacter!.mainFlaw;
    expect(reconcileStorySeedBlueprint(cleared, created.blueprint).seed.world.optional.worldFoundations.mainCharacter).not.toHaveProperty('mainFlaw');
  });

  it('labels the main character\'s biography as a biography, whoever wrote it', () => {
    const canon = resolveStorySeedWorldCanon(createFilledStorySeedInput());
    expect(canon.mainCharacter?.description).toContain('Biography: Born as the son of a fallen patriarch');
    expect(canon.mainCharacter?.description).not.toContain('Creator profile');
  });
});
