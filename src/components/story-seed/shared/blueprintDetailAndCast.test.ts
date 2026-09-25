import { describe, expect, it } from 'vitest';
import {
  createEmptyStorySeedInput,
  createStorySeedExport,
  detailBeyondAuthoredFact,
  finalizeGeneratedWorldBlueprint,
  mirrorSeedIntoBlueprint,
  normalizeWorldBlueprint,
  parseStorySeedJson,
  reconcileStorySeedBlueprint,
  resolveStorySeedWorldCanon,
  reviewWorldFactDetail,
  type StorySeedInput,
  type WorldBlueprint,
} from '@seihouse/sen/story-seed';

const WORLD = 'Ancient sect world with a collapsing celestial court';
const SOCIETY = 'Sect-led feudal hierarchy';
const OPENING = 'A sprawling outer sect labor quarry built inside a volcanic rift.';

const authoredSeed = (): StorySeedInput => {
  const seed = createEmptyStorySeedInput();
  seed.story.required = { premise: 'The prince dies in seven chapters unless fate changes.', genre: 'Xianxia', style: 'chinese', storyTags: ['death flags'] };
  seed.world.optional.worldIdentity = { title: 'Ashes of the Ninth Meridian', worldType: WORLD, societyStructure: SOCIETY, startingLocation: OPENING };
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
  arcPlans: [{ arcNumber: 1, goals: [{ id: 'arc-1-rank', text: 'Reach Foundation rank.', chapters: 100 }] }],
  tropeRules: 'Face-slaps land on ledger abusers.',
  styleBible: 'Close third person.',
  destinedEnding: 'ignored: the author wrote the ending',
  estimatedArcs: 1,
  unresolvedPlotThreads: [],
  ...overrides,
});

describe('World detail beside the author\'s world facts', () => {
  it('keeps the author\'s wording as the fact and the model\'s added detail beside it', () => {
    const blueprint = finalizeGeneratedWorldBlueprint(modelReply(), authoredSeed());
    expect(blueprint).toMatchObject({ worldOverview: WORLD, societyStructure: SOCIETY, startingLocation: OPENING });
    // The restating first sentence is gone; only what the model added remains.
    expect(blueprint.worldOverviewDetail).toBe('Refined qi trades like coin, and every rank is inscribed in a fate ledger.');
    expect(blueprint.societyStructureDetail).toBe('Inner disciples hold the votes; outer disciples dig for pill rations.');
    expect(blueprint.startingLocationDetail).toBe('Sulfur steam floods the lower galleries at dusk.');
    // Each detail is bound to the author's wording it was written for.
    expect(blueprint).toMatchObject({ worldOverviewDetailBasis: WORLD, societyStructureDetailBasis: SOCIETY, startingLocationDetailBasis: OPENING });
  });

  it('uses the model\'s text as the fact where the author left it open, with no separate detail', () => {
    const seed = authoredSeed();
    seed.world.optional.worldIdentity.worldType = '';
    const blueprint = finalizeGeneratedWorldBlueprint(modelReply(), seed);
    expect(blueprint.worldOverview).toBe(modelReply().worldOverview);
    expect(blueprint).not.toHaveProperty('worldOverviewDetail');
    const { seed: promoted } = reconcileStorySeedBlueprint(seed, blueprint);
    expect(promoted.world.optional.worldIdentity.worldType).toBe(modelReply().worldOverview);
  });

  it('derives every detail itself and ignores one the model sends on its own', () => {
    const open = authoredSeed();
    open.world.optional.worldIdentity.worldType = '';
    const stray = {
      worldOverviewDetail: 'A stray detail the model wrote on its own.', worldOverviewDetailBasis: 'A stray basis.',
      societyStructureDetail: 'Another stray detail.', societyStructureDetailBasis: 'Another stray basis.',
    };
    const blueprint = finalizeGeneratedWorldBlueprint(modelReply(stray), open);
    expect(blueprint).not.toHaveProperty('worldOverviewDetail');
    expect(blueprint).not.toHaveProperty('worldOverviewDetailBasis');
    expect(blueprint.societyStructureDetail).toBe('Inner disciples hold the votes; outer disciples dig for pill rations.');
    expect(blueprint.societyStructureDetailBasis).toBe(SOCIETY);
  });

  it('never writes a detail into the Seed and keeps it through review, saving, export, and import', () => {
    const seed = authoredSeed();
    const reviewed = reconcileStorySeedBlueprint(seed, finalizeGeneratedWorldBlueprint(modelReply(), seed));
    expect(reviewed.seed.world.optional.worldIdentity).toEqual(seed.world.optional.worldIdentity);
    expect(reviewed.blueprint.worldOverviewDetail).toBe('Refined qi trades like coin, and every rank is inscribed in a fate ledger.');
    const [imported] = parseStorySeedJson(JSON.stringify(createStorySeedExport(reviewed.seed, reviewed.blueprint, 'en')));
    expect(imported.blueprint).toMatchObject({
      worldOverviewDetail: reviewed.blueprint.worldOverviewDetail,
      societyStructureDetail: reviewed.blueprint.societyStructureDetail,
      startingLocationDetail: reviewed.blueprint.startingLocationDetail,
      worldOverviewDetailBasis: WORLD,
      societyStructureDetailBasis: SOCIETY,
      startingLocationDetailBasis: OPENING,
    });
    // An author clearing a detail is an edit that stays cleared.
    expect(normalizeWorldBlueprint({ ...reviewed.blueprint, worldOverviewDetail: '' }, reviewed.seed).worldOverviewDetail).toBe('');
  });

  it('loads a Blueprint saved before details existed unchanged, with no detail fields', () => {
    const seed = authoredSeed();
    const saved = { ...finalizeGeneratedWorldBlueprint(modelReply(), seed) } as Partial<WorldBlueprint>;
    delete saved.worldOverviewDetail; delete saved.societyStructureDetail; delete saved.startingLocationDetail;
    delete saved.worldOverviewDetailBasis; delete saved.societyStructureDetailBasis; delete saved.startingLocationDetailBasis;
    const loaded = reconcileStorySeedBlueprint(seed, saved).blueprint;
    expect(Object.keys(loaded).filter(key => /Detail(Basis)?$/.test(key))).toEqual([]);
    expect(resolveStorySeedWorldCanon(seed, loaded)).not.toHaveProperty('worldOverviewDetail');
  });

  it('hands each detail to the canon beside its fact and drops restatements an edit reintroduces', () => {
    const seed = authoredSeed();
    const reviewed = reconcileStorySeedBlueprint(seed, finalizeGeneratedWorldBlueprint(modelReply(), seed));
    const canon = resolveStorySeedWorldCanon(reviewed.seed, { ...reviewed.blueprint, societyStructureDetail: `It is a ${SOCIETY.toLowerCase()}.` });
    expect(canon).toMatchObject({ worldOverview: WORLD, worldOverviewDetail: 'Refined qi trades like coin, and every rank is inscribed in a fate ledger.', societyStructure: SOCIETY });
    expect(canon).not.toHaveProperty('societyStructureDetail');
  });

  it('withholds a cleared fact\'s detail while keeping it for when the fact returns', () => {
    const seed = authoredSeed();
    const reviewed = reconcileStorySeedBlueprint(seed, finalizeGeneratedWorldBlueprint(modelReply(), seed));
    const cleared = structuredClone(reviewed.seed);
    cleared.world.optional.worldIdentity.worldType = '   ';
    // As in the review, the Blueprint mirrors the cleared Seed before it is saved.
    const kept = reconcileStorySeedBlueprint(cleared, mirrorSeedIntoBlueprint(reviewed.blueprint, cleared));
    expect(kept.blueprint.worldOverviewDetail).toBe(reviewed.blueprint.worldOverviewDetail);
    expect(resolveStorySeedWorldCanon(kept.seed, kept.blueprint)).not.toHaveProperty('worldOverviewDetail');
    expect(resolveStorySeedWorldCanon(kept.seed, kept.blueprint).societyStructureDetail).toBe(reviewed.blueprint.societyStructureDetail);
    expect(resolveStorySeedWorldCanon(reviewed.seed, kept.blueprint).worldOverviewDetail).toBe(reviewed.blueprint.worldOverviewDetail);
  });

  it('withholds a detail from a rewritten fact until the author keeps or edits it', () => {
    const seed = authoredSeed();
    const reviewed = reconcileStorySeedBlueprint(seed, finalizeGeneratedWorldBlueprint(modelReply(), seed));
    const rewrite = (worldType: string) => {
      const next = structuredClone(reviewed.seed);
      next.world.optional.worldIdentity.worldType = worldType;
      return next;
    };
    // Case, spacing, and punctuation leave the fact as it was.
    const restyled = rewrite(`  ${WORLD.toUpperCase()}.  `);
    expect(resolveStorySeedWorldCanon(restyled, mirrorSeedIntoBlueprint(reviewed.blueprint, restyled)).worldOverviewDetail)
      .toBe(reviewed.blueprint.worldOverviewDetail);
    // A different fact never receives the detail written for the old one, and the Blueprint keeps it.
    const MEGACITY = 'A neon megacity where corporations own every soul';
    const rewritten = reconcileStorySeedBlueprint(rewrite(MEGACITY), mirrorSeedIntoBlueprint(reviewed.blueprint, rewrite(MEGACITY)));
    expect(rewritten.blueprint.worldOverviewDetail).toBe(reviewed.blueprint.worldOverviewDetail);
    expect(resolveStorySeedWorldCanon(rewritten.seed, rewritten.blueprint)).not.toHaveProperty('worldOverviewDetail');
    expect(resolveStorySeedWorldCanon(rewritten.seed, rewritten.blueprint).societyStructureDetail).toBe(reviewed.blueprint.societyStructureDetail);
    // Keeping it as it is, or editing it, reviews it against the new fact.
    const kept = reviewWorldFactDetail(rewritten.blueprint, 'worldOverviewDetail', rewritten.blueprint.worldOverviewDetail!, MEGACITY);
    expect(resolveStorySeedWorldCanon(rewritten.seed, kept).worldOverviewDetail).toBe(reviewed.blueprint.worldOverviewDetail);
    const edited = reviewWorldFactDetail(rewritten.blueprint, 'worldOverviewDetail', 'Neon rain never stops.', MEGACITY);
    expect(resolveStorySeedWorldCanon(rewritten.seed, edited).worldOverviewDetail).toBe('Neon rain never stops.');
    // A detail with no recorded fact is never used.
    const { worldOverviewDetailBasis: _basis, ...unbound } = reviewed.blueprint;
    expect(resolveStorySeedWorldCanon(reviewed.seed, unbound)).not.toHaveProperty('worldOverviewDetail');
  });

  it('removes only sentences that restate the fact', () => {
    // The fact itself, a piece of it in its own words, and the whole fact after a short lead-in.
    expect(detailBeyondAuthoredFact(WORLD, `${WORLD}.`)).toBeUndefined();
    expect(detailBeyondAuthoredFact(WORLD, 'Ancient sect world.')).toBeUndefined();
    // A reworded piece is left to the prompt's "never restate" rule: loosening
    // the guard would also remove real detail such as "Nobody questions the feudal hierarchy."
    expect(detailBeyondAuthoredFact(WORLD, 'An ancient sect world.')).toBe('An ancient sect world.');
    expect(detailBeyondAuthoredFact(SOCIETY, 'Nobody questions the feudal hierarchy.')).toBe('Nobody questions the feudal hierarchy.');
    expect(detailBeyondAuthoredFact(SOCIETY, `The society here is a ${SOCIETY}. Elders sell promotions.`)).toBe('Elders sell promotions.');
    // Sentences that build on the fact are detail, even when they name it.
    expect(detailBeyondAuthoredFact(SOCIETY, `Within the ${SOCIETY}, nobody rises without a patron.`)).toBe(`Within the ${SOCIETY}, nobody rises without a patron.`);
    expect(detailBeyondAuthoredFact('Earth', 'Earth\'s oceans are poisoned.')).toBe('Earth\'s oceans are poisoned.');
    expect(detailBeyondAuthoredFact(undefined, 'Anything the model wrote.')).toBe('Anything the model wrote.');
    expect(detailBeyondAuthoredFact('古代の宗門世界', '古代の宗門世界。霊石が通貨になる。')).toBe('霊石が通貨になる。');
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
