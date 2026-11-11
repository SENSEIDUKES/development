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
      // The look slots a character card gained on 2026-11-11, blank in the creator's Seed.
      build: 'Lean and wiry, a little under average height', face: 'Narrow and sharp, hollow under the cheekbones',
      hair: 'Black, tied back with a strip of cloth', clothing: "A quarry laborer's grey hemp, worn through at the knees",
      marks: 'A burn scar across one palm', bearing: 'Watchful, keeping a wall at his back',
    });
  });

  it('fills the blanks on the creator\'s own cards, matched by name or alias, adds new ones, and never writes aliases', () => {
    const seed = createFilledStorySeedInput();
    const slots = readGeneratedSeedSlots({ ...answer, characters: [{ ...answer.characters[0], name: 'The Iron Brush', aliases: ['Model alias'] }, answer.characters[1]] });
    const filled = fillBlankSeedSlots(seed, slots).world.optional.worldFoundations;
    const [qin, han] = filled.additionalCharacters!;
    // The creator's own values stay exactly theirs; every blank slot of the card is filled.
    expect(qin).toMatchObject({ ...seed.world.optional.worldFoundations.additionalCharacters![0], skinTone: 'Weathered bronze', eyeColor: 'Frost grey' });
    expect(qin).toMatchObject({ location: 'Azure Hall', status: 'Well, one arm lost', holds: 'Iron Brush', belongsTo: 'Heavenly Sword Sect' });
    expect(qin.aliases).toEqual(['The Iron Brush']);
    expect(han).toMatchObject({ name: 'Junior Sister Han', role: 'Ally', age: 'Seventeen', connectionToMC: 'Fellow quarry laborer' });
    expect(han).not.toHaveProperty('aliases');
    const [sect, alliance] = filled.factions!;
    expect(sect).toMatchObject({ ...seed.world.optional.worldFoundations.factions![0], factionKind: 'Sect', seat: 'Azure Hall', standing: 'Falling' });
    expect(alliance).toMatchObject({ name: 'Deep Sea Alliance', powerLevel: 'High Tier', alignment: 'Neutral' });
  });

  it('fills the world\'s own card lists: things, abilities, places and the Bestiary', () => {
    const seed = createFilledStorySeedInput();
    const filled = fillBlankSeedSlots(seed, readGeneratedSeedSlots(answer)).world.optional.worldFoundations;
    expect(filled.things?.map(thing => thing.name)).toEqual(['Iron Brush', "Ninth Prince's Jade Token"]);
    expect(filled.things?.[0]).toMatchObject({ holder: 'Elder Qin', status: 'Whole' });
    expect(filled.startingAbilities?.map(ability => ability.name)).toEqual(['Frostbrush Edict', 'Lesser Binding Script']);
    expect(filled.places?.[0]).toMatchObject({ name: 'Rift Quarry', within: 'Heavenly Sword Sect', condition: 'Working' });
    expect(filled.species?.[0]).toMatchObject({ name: 'Cinder Serpent', habitat: 'Rift Quarry' });
  });

  it('leaves a place\'s Inside and Held by blank when the Blueprint names no card there, and never touches the creator\'s', () => {
    // The Frost-Scaled Companion: three places sat inside "Cloudpeak Mountains", which had no card, and one was held by "Unclaimed".
    const seed: StorySeedInput = createEmptyStorySeedInput();
    seed.world.optional.worldFoundations.mainCharacter = { name: 'Lin Qingshan' };
    seed.world.optional.worldFoundations.places = [{ id: 'place-1', name: 'Old Shrine', within: 'The Northern Wastes', heldBy: 'No one living' }];
    const filled = fillBlankSeedSlots(seed, readGeneratedSeedSlots({
      factions: [{ name: 'Frost Sect Alliance' }],
      characters: [{ name: 'Elder Bai Wuxin' }],
      places: [
        { name: 'Cloudpeak Mountains', within: 'Cloudpeak Mountains', heldBy: 'Unclaimed' },
        { name: 'Cloudpeak Village', within: 'Cloudpeak Mountains', heldBy: 'Frost Sect Alliance' },
        { name: 'Hidden Frost Cavern', within: 'The Frozen North', heldBy: 'Lin Qingshan' },
        { name: 'Hermit Hut', within: 'Frost Sect Alliance', heldBy: 'Elder Bai Wuxin' },
        { name: 'Old Shrine', within: 'Cloudpeak Mountains', heldBy: 'Unclaimed' },
      ],
    })).world.optional.worldFoundations.places!;
    const pointers = Object.fromEntries(filled.map(place => [place.name, [place.within, place.heldBy]]));
    expect(pointers).toEqual({
      // The creator's own words stay, card or no card.
      'Old Shrine': ['The Northern Wastes', 'No one living'],
      // A place is never inside itself, and "Unclaimed" is no card.
      'Cloudpeak Mountains': [undefined, undefined],
      'Cloudpeak Village': ['Cloudpeak Mountains', 'Frost Sect Alliance'],
      // A region with no card is cleared; the main character is a card.
      'Hidden Frost Cavern': [undefined, 'Lin Qingshan'],
      // A sect's own grounds and a character who holds a place both name cards.
      'Hermit Hut': ['Frost Sect Alliance', 'Elder Bai Wuxin'],
    });
  });

  it('keeps a place held by the hero when the creator left the hero unnamed and the Blueprint named them', () => {
    const filled = fillBlankSeedSlots(createEmptyStorySeedInput(), readGeneratedSeedSlots({
      mainCharacter: { name: 'Lin Qingshan', mainFlaw: 'Too trusting' },
      places: [{ name: "Hunter's Hut", heldBy: 'Lin Qingshan' }, { name: 'Old Well', heldBy: 'Unclaimed' }],
    })).world.optional.worldFoundations;
    expect(filled.places?.map(place => place.heldBy)).toEqual(['Lin Qingshan', undefined]);
    // The name only recognises the pointer: it is still the Blueprint's to carry, never written into the Seed here.
    expect(filled.mainCharacter?.name).toBeUndefined();
  });

  it('fills abilities, the World rules sheet and the main opposition only where they were blank', () => {
    const seed = createFilledStorySeedInput();
    delete seed.world.optional.worldFoundations.mainOpposition;
    const filled = fillBlankSeedSlots(seed, readGeneratedSeedSlots(answer)).world.optional.worldFoundations;
    expect(filled.abilities).toEqual({ startingPowerConcept: 'Qi Condensation Tier 1', uniquePath: 'Rebuilds his meridians from the scars of failed timelines' });
    expect(filled.powerSystem).toMatchObject({
      flavor: 'Martial arts, Daoist',
      knownRanks: 'Qi Condensation → Foundation Establishment → Core Formation → Nascent Soul',
    });
    // The laws and the age the story stands in are part of the same sheet.
    expect(filled.powerSystem?.laws).toContain('No killing inside the sect gates');
    expect(filled.powerSystem?.era).toContain('celestial court');
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
