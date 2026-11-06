import { describe, expect, it } from 'vitest';
import {
  createEmptyStorySeedInput,
  createStorySeedExport,
  finalizeGeneratedWorldBlueprint,
  mirrorSeedIntoBlueprint,
  normalizeWorldBlueprint,
  parseStorySeedJson,
  reconcileStorySeedBlueprint,
  resolveStorySeedWorldCanon,
  type StorySeedInput,
  type WorldBlueprint,
} from '@seihouse/sen/story-seed';

const WORLD = 'Ancient sect world with a collapsing celestial court';
const SOCIETY = 'Sect-led feudal hierarchy';
const OPENING = 'A sprawling outer sect labor quarry built inside a volcanic rift.';

const authoredSeed = (): StorySeedInput => {
  const seed = createEmptyStorySeedInput();
  seed.story.required = { premise: 'The prince dies in seven chapters unless fate changes.', genre: 'Xianxia', style: 'chinese', storyTags: ['death flags'] };
  seed.world.optional.worldIdentity = { title: 'Ashes of the Ninth Meridian' };
  seed.world.optional.worldFoundations = {
    mainCharacter: { name: 'Ye Chen', personality: 'Ruthless but protective' },
    additionalCharacters: [{ id: 'char-qin', name: 'Elder Qin', aliases: ['The Iron Brush'], role: 'Sect Elder', bio: 'Owes the MC a life debt.' }],
    factions: [{ id: 'faction-sword', name: 'Heavenly Sword Sect', aliases: ['Azure Hall'], role: 'Ruling Power', description: 'Riddled with corruption.' }],
    destinedEnding: 'The prince survives and shatters the court\'s grip on fate.',
  };
  return seed;
};

/** A model reply shaped by the cleaned-up prompt: detail in the fields whose fact the author wrote. */
const modelReply = (overrides: Record<string, unknown> = {}) => ({
  title: 'Ashes of the Ninth Meridian',
  logline: 'A crippled young master has seven chapters to keep a prince alive.',
  worldOverview: `This is an ancient sect world with a collapsing celestial court. Refined qi trades like coin, and every rank is inscribed in a fate ledger.`,
  startingLocation: 'Sulfur steam floods the lower galleries at dusk.',
  societyStructure: 'Inner disciples hold the votes; outer disciples dig for pill rations.',
  powerSystemOutline: 'Each breakthrough must be witnessed by the fate ledger.',
  mainCharacter: { name: 'Ye Chen', age: 'Seventeen', personality: 'x', appearance: 'Ash-grey robes.', backgroundProfile: 'He has lived the assassination seven times.' },
  mcProfile: 'He has lived the assassination seven times.',
  majorFactions: [
    'Heavenly Sword Sect — the model\'s retelling of the author\'s sect',
    'Fate Auditors (Enforcers) — ledger-keepers who erase inconvenient fates',
    'Azure Hall Loyalists (Splinter) — a splinter of the Heavenly Sword Sect sworn to its founding oath',
  ],
  initialCharacters: [
    'Elder Qin — the model\'s retelling of the author\'s elder',
    'The Iron Brush — Elder Qin again, under his enforcer name',
    'Junior Sister Han (Ally) — Elder Qin\'s last disciple, who hides a fate bond with Ye Chen',
    'Regent Zhao (Antagonist) — architect of the assassination',
    'Regent Zhao (Antagonist) — a second copy of the regent',
    'Ye Chen (Protagonist) — the main character listed as a side character',
  ],
  majorMysteries: [],
  firstArcPromise: 'The tournament exposes the first assassin.',
  arcPlans: [{ arcNumber: 1, goals: [{ id: 'arc-1-rank', text: 'Reach Foundation rank.', chapters: 30 }] }],
  tropeRules: 'Face-slaps land on ledger abusers.',
  styleBible: 'Close third person.',
  destinedEnding: 'ignored: the author wrote the ending',
  estimatedArcs: 1,
  unresolvedPlotThreads: [],
  ...overrides,
});

describe('The world lives on its one World card (SENSEI, 2026-11-06)', () => {
  it('carries a Seed saved before then onto the card when it is read, and forgets where it opened', () => {
    const old = authoredSeed();
    Object.assign(old.world.optional.worldIdentity, { worldType: WORLD, societyStructure: SOCIETY, startingLocation: OPENING });
    const read = parseStorySeedJson(JSON.stringify(createStorySeedExport(old)))[0].seed;
    expect(read.world.optional.worldFoundations.powerSystem).toMatchObject({ kindOfWorld: WORLD, whoRules: SOCIETY });
    expect(read.world.optional.worldIdentity).toEqual({ title: 'Ashes of the Ninth Meridian' });
    expect(JSON.stringify(read)).not.toContain(OPENING);
  });

  it('never lets old text replace a card slot the creator already filled', () => {
    const seed = authoredSeed();
    seed.world.optional.worldFoundations.powerSystem = { kindOfWorld: 'A floating archipelago' };
    Object.assign(seed.world.optional.worldIdentity, { worldType: WORLD });
    const read = parseStorySeedJson(JSON.stringify(createStorySeedExport(seed)))[0].seed;
    expect(read.world.optional.worldFoundations.powerSystem).toMatchObject({ kindOfWorld: 'A floating archipelago' });
  });

  it('fills a blank card from a Blueprint saved before then', () => {
    const seed = authoredSeed();
    const blueprint = { ...normalizeWorldBlueprint({}, seed), worldOverview: WORLD, societyStructure: SOCIETY } as WorldBlueprint;
    const { seed: reconciled } = reconcileStorySeedBlueprint(seed, blueprint);
    expect(reconciled.world.optional.worldFoundations.powerSystem).toMatchObject({ kindOfWorld: WORLD, whoRules: SOCIETY });
  });

  it('keeps no world text or detail of its own in a Blueprint, and hands the card\'s world to the canon', () => {
    const seed = authoredSeed();
    seed.world.optional.worldFoundations.powerSystem = { kindOfWorld: WORLD, whoRules: SOCIETY };
    const generated = finalizeGeneratedWorldBlueprint(modelReply({ worldOverviewDetail: 'stale', societyStructureDetailBasis: 'stale' }), seed);
    for (const retired of ['worldOverview', 'startingLocation', 'societyStructure', 'worldOverviewDetail', 'societyStructureDetailBasis']) {
      expect(generated).not.toHaveProperty(retired);
      expect(mirrorSeedIntoBlueprint(generated, seed)).not.toHaveProperty(retired);
    }
    expect(resolveStorySeedWorldCanon(seed, generated)).toMatchObject({ worldOverview: WORLD, societyStructure: SOCIETY });
  });
});

describe('Generated supporting characters and factions beside the author\'s', () => {
  it('keeps additions that mention an author entity and drops only repeats of an identity', () => {
    const blueprint = finalizeGeneratedWorldBlueprint(modelReply(), authoredSeed());
    expect(blueprint.initialCharacters).toEqual([
      'Elder Qin — aliases: The Iron Brush; role: Sect Elder; profile: Owes the MC a life debt.',
      'Junior Sister Han (Ally) — Elder Qin\'s last disciple, who hides a fate bond with Ye Chen',
      'Regent Zhao (Antagonist) — architect of the assassination',
    ]);
    expect(blueprint.majorFactions).toEqual([
      'Heavenly Sword Sect — aliases: Azure Hall; role: Ruling Power; profile: Riddled with corruption.',
      'Fate Auditors (Enforcers) — ledger-keepers who erase inconvenient fates',
      'Azure Hall Loyalists (Splinter) — a splinter of the Heavenly Sword Sect sworn to its founding oath',
    ]);
  });

  it('adds related entities to the Seed once, leaving the author\'s entries as written', () => {
    const seed = authoredSeed();
    const reviewed = reconcileStorySeedBlueprint(seed, finalizeGeneratedWorldBlueprint(modelReply(), seed));
    const characters = reviewed.seed.world.optional.worldFoundations.additionalCharacters!;
    const factions = reviewed.seed.world.optional.worldFoundations.factions!;
    expect(characters[0]).toEqual(seed.world.optional.worldFoundations.additionalCharacters![0]);
    expect(characters.map(entry => [entry.name, entry.role])).toEqual([
      ['Elder Qin', 'Sect Elder'], ['Junior Sister Han', 'Ally'], ['Regent Zhao', 'Antagonist'],
    ]);
    expect(characters[1].bio).toBe('Elder Qin\'s last disciple, who hides a fate bond with Ye Chen');
    expect(factions.map(entry => entry.name)).toEqual(['Heavenly Sword Sect', 'Fate Auditors', 'Azure Hall Loyalists']);
    // Saving and reloading the pair adds nothing more.
    expect(reconcileStorySeedBlueprint(reviewed.seed, reviewed.blueprint).seed).toEqual(reviewed.seed);
  });

  it('matches identities by name, alias, or a title before a multi-word name, never by description', () => {
    const seed = authoredSeed();
    seed.world.optional.worldFoundations.additionalCharacters = [
      { id: 'char-sui', name: 'Minister Sui', aliases: ['The Rain Witness'] },
      { id: 'char-mono', name: 'Qin' },
    ];
    const blueprint = finalizeGeneratedWorldBlueprint(modelReply({ initialCharacters: [
      'The witness Minister Sui (Rain Witness) — a titled retelling of the author\'s minister',
      'Rain Witness — the minister under a shortened alias',
      'Lady Qin (Healer) — a different woman who shares a one-word name',
      'Sui Lan (Scribe) — records Minister Sui\'s testimony',
    ] }), seed);
    expect(blueprint.initialCharacters.slice(2)).toEqual([
      'Lady Qin (Healer) — a different woman who shares a one-word name',
      'Sui Lan (Scribe) — records Minister Sui\'s testimony',
    ]);
  });
});
