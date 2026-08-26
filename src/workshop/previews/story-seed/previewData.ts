import type {
  IntakeData,
  StorySeed,
  WorldBlueprint,
} from '../../../components/story-seed/shared/referenceIntake';
import {
  STORY_SEED_SCHEMA_VERSION,
  createEmptyStorySeedInput,
  normalizeWorldBlueprint,
  type StorySeedInput,
  type StorySeedRecord,
} from '@seihouse/sen/story-seed';

export const MOCK_USER_ID = 'mock-user-workshop';

// ─── Locked reference fork fixtures (Phase-1 flat intake) ────────────────────
// Only the `reference/` replica reads these. The development fork's fixtures
// are the canonical Story Seed shapes further below.

export const createEmptyIntake = (): IntakeData => ({
  novelTitle: '',
  mcName: 'Lin Fan',
  genrePath: 'Xianxia',
  corePremise: '',
  proseStyle: '',
  desiredPlotDirection: '',
  storyTags: [],
  worldType: '',
  startingLocation: '',
  societyStructure: '',
  dangerLevel: '',
  generalAtmosphere: '',
  startingIdentity: '',
  personality: '',
  mainFlaw: '',
  secretAdvantage: '',
  startingWeakness: '',
  moralAlignment: '',
  mcBio: '',
  customCharacters: [],
  customFactions: [],
  startingPowerConcept: '',
  powerFlavor: '',
  powerPace: '',
  knownRanks: '',
  uniquePath: '',
  longTermGoal: '',
  firstMajorConflict: '',
  mainAntagonistPressure: '',
  romanceLevel: '',
  faceSlappingLevel: '',
  comedyLevel: '',
  tournamentArcPreference: '',
  haremPreference: '',
  betrayalLevel: '',
  thingsToAvoid: '',
  mustIncludeElements: '',
  fatePressure: 'Balanced',
  makeItWorkInstruction: '',
});

export const createFilledIntake = (): IntakeData => ({
  ...createEmptyIntake(),
  novelTitle: 'Ashes of the Ninth Meridian',
  mcName: 'Ye Chen',
  genrePath: 'Xianxia',
  proseStyle: 'chinese',
  corePremise: 'In seven chapters, the prince will be assassinated. Every timeline says he dies. Can you change fate before it happens?',
  desiredPlotDirection: 'Slow sect building with escalating court intrigue.',
  storyTags: ['death flags', 'foreknowledge', 'sect politics', 'fate bonds'],
  worldType: 'Ancient sect world with a collapsing celestial court',
  startingLocation: 'A sprawling outer sect labor quarry built inside a cavernous volcanic rift.',
  societyStructure: 'Sect-led feudal hierarchy',
  dangerLevel: 'Cutthroat, grimdark, mystical',
  startingIdentity: 'Crippled young master, secretly the reincarnated Ninth Prince',
  personality: 'Ruthless but protective, chaotic neutral',
  secretAdvantage: 'Foreknowledge of seven doomed timelines',
  startingWeakness: 'Destroyed meridians',
  mcBio: 'Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective of the few he trusts.',
  customCharacters: [
    {
      id: 'preview-character-1',
      name: 'Elder Qin',
      aliases: ['The Iron Brush'],
      age: 'Ancient',
      powerType: 'Frost Dao',
      rankLevel: 'Nascent Soul',
      role: 'Sect Elder',
      connectionToMC: 'Secret protector',
      bio: 'A retired enforcer who owes the MC\'s father a life debt.',
    },
  ],
  customFactions: [
    {
      id: 'preview-faction-1',
      name: 'Heavenly Sword Sect',
      aliases: ['Azure Hall'],
      role: 'Ruling Power',
      powerLevel: 'Mid Tier',
      alignment: 'Righteous (in name only)',
      connectionToMC: "MC's starting sect",
      description: 'A once-glorious sect now riddled with internal corruption.',
    },
  ],
  startingPowerConcept: 'Qi Condensation Tier 1',
  powerFlavor: 'Martial arts, Daoist',
  longTermGoal: 'Shatter the fated assassination timeline',
  firstMajorConflict: 'Sect tournament that reveals the first assassination attempt',
  romanceLevel: 'Single Heroine',
  faceSlappingLevel: 'High',
  fatePressure: 'Hardcore',
  hardcoreFateMode: true,
  destinedEnding: 'The prince survives and shatters the celestial court\'s grip on fate.',
  estimatedArcs: 12,
  makeItWorkInstruction: '',
});

export const createMockBlueprint = (): WorldBlueprint => ({
  blueprintVersion: 'v1.0',
  creator: 'Workshop Creator',
  title: 'Ashes of the Ninth Meridian',
  logline: 'A crippled young master races seven doomed timelines to save a prince the heavens have already condemned.',
  worldOverview:
    'A sect-led world built atop the bones of a shattered celestial court, where meridians are currency and fate itself can be read like a ledger.',
  startingLocation: 'The outer sect labor quarry of Heavenly Sword Sect, carved into a volcanic rift.',
  societyStructure: 'Sect-led feudal hierarchy with a decaying celestial court above it.',
  powerSystemOutline:
    'Qi Condensation -> Foundation Establishment -> Core Formation -> Nascent Soul -> Soul Transformation, each tier gated by meridian purity.',
  mcProfile:
    'Ye Chen, outwardly a crippled young master, carries foreknowledge of seven timelines in which the Ninth Prince is assassinated.',
  majorFactions: ['Heavenly Sword Sect', 'Deep Sea Alliance', 'Abyssal Cult'],
  initialCharacters: ['Elder Qin (Protector)', 'Junior Sister Han (Ally)', 'Young Master Ye (Rival)'],
  majorMysteries: ['True origin of the Sovereign Ring', 'Why was the Sect Leader poisoned?'],
  firstArcPromise: 'The sect tournament exposes the first assassination attempt on the prince.',
  tropeRules: 'Face-slapping tied to fate corrections, not petty insults.',
  styleBible: 'Close third-person narration with restrained exposition, concrete sensory detail, and sharp reversals at scene endings.',
  destinedEnding: "The prince survives and shatters the celestial court's grip on fate.",
  estimatedArcs: 12,
  unresolvedPlotThreads: ['Sever the engagement with Chu family', 'Win the Inner Sect tournament'],
});

export const createMockSeed = (overrides: Partial<StorySeed> = {}): StorySeed => {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: 'preview-seed-1',
    userId: MOCK_USER_ID,
    title: 'Ashes of the Ninth Meridian',
    intake: createFilledIntake(),
    blueprint: createMockBlueprint(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createReferenceSavedSeeds = (): StorySeed[] => [
  createMockSeed(),
  createMockSeed({
    id: 'preview-seed-2',
    title: 'The Grimoire That Talks Back',
    blueprint: {
      ...createMockBlueprint(),
      title: 'The Grimoire That Talks Back',
      logline: 'A quiet apprentice librarian finds a forgotten manual that talks back and demands snacks.',
    },
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  }),
];

// ─── Development fork fixtures (canonical Creator / Story / World) ───────────

export const createFilledStorySeedInput = (): StorySeedInput => ({
  ...createEmptyStorySeedInput(),
  creator: {},
  story: {
    required: {
      storyTags: ['death flags', 'foreknowledge', 'sect politics', 'fate bonds'],
      premise: 'In seven chapters, the prince will be assassinated. Every timeline says he dies. Can you change fate before it happens?',
      genre: 'Xianxia',
      style: 'chinese',
    },
    optional: {
      intendedForMatureAudiences: true,
      fateSurvival: { enabled: true, visibility: 'partial', pressure: 'immortal' },
      plotAndTropeSettings: {
        faceSlap: 'high',
        plotArmor: 'low',
        recognition: 'high',
        longTermGoal: 'Shatter the fated assassination timeline',
        firstMajorConflict: 'Sect tournament that reveals the first assassination attempt',
        mainAntagonistPressure: "The celestial court's fate auditors",
      },
      additionalStoryDirection: 'Slow sect building with escalating court intrigue.',
      makeItWorkInstruction: 'The weakest bloodline is secretly the only one heaven fears.',
    },
  },
  world: {
    required: {},
    optional: {
      worldIdentity: {
        title: 'Ashes of the Ninth Meridian',
        worldType: 'Ancient sect world with a collapsing celestial court',
        societyStructure: 'Sect-led feudal hierarchy',
        startingLocation: 'A sprawling outer sect labor quarry built inside a cavernous volcanic rift.',
      },
      worldFoundations: {
        mainCharacter: {
          name: 'Ye Chen',
          startingIdentity: 'Crippled young master, secretly the reincarnated Ninth Prince',
          personality: 'Ruthless but protective, chaotic neutral',
          secretAdvantage: 'Foreknowledge of seven doomed timelines',
          startingWeakness: 'Destroyed meridians',
          bio: 'Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective of the few he trusts.',
        },
        additionalCharacters: [
          {
            id: 'preview-character-1',
            name: 'Elder Qin',
            aliases: ['The Iron Brush'],
            age: 'Ancient',
            powerType: 'Frost Dao',
            rankLevel: 'Nascent Soul',
            role: 'Sect Elder',
            connectionToMC: 'Secret protector',
            bio: "A retired enforcer who owes the MC's father a life debt.",
          },
        ],
        factions: [
          {
            id: 'preview-faction-1',
            name: 'Heavenly Sword Sect',
            aliases: ['Azure Hall'],
            role: 'Ruling Power',
            powerLevel: 'Mid Tier',
            alignment: 'Righteous (in name only)',
            connectionToMC: "MC's starting sect",
            description: 'A once-glorious sect now riddled with internal corruption.',
          },
        ],
        abilities: { startingPowerConcept: 'Qi Condensation Tier 1' },
        powerSystem: { flavor: 'Martial arts, Daoist' },
        destinedEnding: "The prince survives and shatters the celestial court's grip on fate.",
      },
    },
  },
});

export const createMockStorySeedRecord = (overrides: Partial<StorySeedRecord> = {}): StorySeedRecord => {
  const now = new Date().toISOString();
  const seed = createFilledStorySeedInput();
  return {
    schemaVersion: STORY_SEED_SCHEMA_VERSION,
    id: 'preview-seed-1',
    userId: MOCK_USER_ID,
    title: seed.world.optional.worldIdentity.title || 'Ashes of the Ninth Meridian',
    createdAt: now,
    updatedAt: now,
    seed,
    blueprint: normalizeWorldBlueprint(createMockBlueprint(), seed, { creator: 'Workshop Creator', status: 'Reviewed' }),
    ...overrides,
  };
};

export const createStoryBankRecords = (): StorySeedRecord[] => {
  const second = createFilledStorySeedInput();
  return [
    createMockStorySeedRecord(),
    createMockStorySeedRecord({
      id: 'preview-seed-2',
      title: 'The Grimoire That Talks Back',
      seed: {
        ...second,
        world: {
          ...second.world,
          optional: {
            ...second.world.optional,
            worldIdentity: { ...second.world.optional.worldIdentity, title: 'The Grimoire That Talks Back' },
          },
        },
      },
      blueprint: normalizeWorldBlueprint(
        { ...createMockBlueprint(), title: 'The Grimoire That Talks Back' },
        {
          ...second,
          world: {
            ...second.world,
            optional: {
              ...second.world.optional,
              worldIdentity: { ...second.world.optional.worldIdentity, title: 'The Grimoire That Talks Back' },
            },
          },
        },
        { creator: 'Workshop Creator' },
      ),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    }),
  ];
};
