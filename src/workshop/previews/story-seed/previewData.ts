import {
  STORY_SEED_SCHEMA_VERSION,
  createEmptyStorySeedInput,
  normalizeWorldBlueprint,
  type StorySeedInput,
  type WorldBlueprint,
  type StorySeedRecord,
} from '@seihouse/sen/story-seed';
import type { ArcLookaheadEntry, ArcPlan } from '@seihouse/sen/arc-goals';

export const MOCK_USER_ID = 'mock-user-workshop';

const MOCK_ROUTE = [
  ['Survive the outer sect tournament', 'Expose the first assassin', 'Earn the prince\'s trust'],
  ['Reach the inner sect', 'Break the Abyssal Cult\'s hold on the elders', 'Recover the Sovereign Ring'],
  ['Defy the celestial court\'s decree', 'Unite the sects behind the prince', 'Shatter the court\'s grip on fate'],
] as const;

/**
 * A mock Arc 1, the only arc a Blueprint plans. It opens with the creator's
 * Active Arc Goal when one is supplied; in a one-arc story its last goal is
 * the Destined Ending.
 */
export const createMockArcOne = (openingGoal?: { id: string; text: string }, arcCount = 10): ArcPlan => {
  const texts: string[] = [...MOCK_ROUTE[0]];
  if (arcCount === 1) texts[texts.length - 1] = 'The prince survives and the court\'s grip on fate is broken';
  const goals = texts.map((text, goalIndex) => ({ id: `arc-1-goal-${goalIndex + 1}`, text, chapters: goalIndex === 1 ? 12 : 9 }));
  if (openingGoal) goals[0] = { ...goals[0], id: openingGoal.id, text: openingGoal.text };
  return { arcNumber: 1, goals };
};

/** A mock hidden look-ahead: where Arcs 2 and 3 head, within the story's length. */
export const createMockArcLookahead = (arcCount = 10): ArcLookaheadEntry[] =>
  [2, 3].filter(arcNumber => arcNumber <= arcCount).map(arcNumber => ({
    arcNumber,
    direction: arcNumber === arcCount ? 'The prince survives and the court\'s grip on fate is broken.' : MOCK_ROUTE[arcNumber - 1].join('; then ') + '.',
  }));

/**
 * The Story Seed slot values a Blueprint answer proposes, in the model's answer
 * shape: the creator's own cards by name, then supporting ones, every slot
 * filled. Only the creator's blanks take them.
 */
export const createMockSeedSlotAnswer = () => ({
  mainCharacter: {
    name: 'Ye Chen', age: 'Nineteen', personality: 'Ruthless but protective, chaotic neutral',
    appearance: 'Lean and wiry, with sharp, weary eyes and a burn scar across one palm.',
    backgroundProfile: 'Ye Chen remembers dying seven times beside the Ninth Prince; each timeline taught him one more name to fear.',
    startingIdentity: 'Crippled young master, secretly the reincarnated Ninth Prince',
    secretAdvantage: 'Foreknowledge of seven doomed timelines',
    startingWeakness: 'Destroyed meridians',
    mainFlaw: 'Cannot trust anyone who has not died beside him',
    moralAlignment: 'Pragmatic protector',
    bio: 'A laborer in the outer quarry whom the sect has written off.',
  },
  characters: [
    {
      name: 'Elder Qin', role: 'Sect Elder', age: 'Ancient', gender: 'Man', skinTone: 'Weathered bronze', eyeColor: 'Frost grey',
      appearance: 'A tall old man in frost-rimed grey robes, his left sleeve pinned empty, a brush case at his belt.',
      powerType: 'Frost Dao', rankLevel: 'Nascent Soul', connectionToMC: 'Secret protector', bio: 'A retired enforcer.',
      location: 'Azure Hall', status: 'Well, one arm lost', holds: 'Iron Brush', knows: 'Frostbrush Edict',
      goals: "Repay a life debt to Ye Chen's father", ties: 'Sworn brother to the dead patriarch', belongsTo: 'Heavenly Sword Sect',
      voice: 'Few words, each one final.',
    },
    {
      name: 'Junior Sister Han', role: 'Ally', age: 'Seventeen', gender: 'Woman', skinTone: 'Pale', eyeColor: 'Amber',
      appearance: 'A slight girl in a patched outer-sect robe, ink on her fingers, talisman paper tucked in her sash.',
      powerType: 'Talisman craft', rankLevel: 'Qi Condensation 6', connectionToMC: 'Fellow quarry laborer',
      bio: 'A talisman prodigy hiding her talent from the inner sect.',
      location: 'Rift Quarry', status: 'Well', holds: 'Half-finished talisman roll', knows: 'Lesser Binding Script',
      goals: 'Buy her brother out of the quarry', ties: 'Younger brother in the same quarry', belongsTo: 'Heavenly Sword Sect',
      voice: 'Quick, wry, dropping her voice when elders pass.',
    },
  ],
  factions: [
    {
      name: 'Heavenly Sword Sect', role: 'Ruling Power', powerLevel: 'Mid Tier', alignment: 'Righteous (in name only)',
      connectionToMC: "MC's starting sect", description: 'A corrupted sect.', factionKind: 'Sect', standing: 'Falling',
      appearance: 'Azure robes with a silver sword sigil at the collar; elders wear cloud-pattern sashes.',
      seat: 'Azure Hall', leader: 'Sect Master Ye Ruhai', ties: 'At war with the Abyssal Cult; vassal to the celestial court',
    },
    {
      name: 'Deep Sea Alliance', role: 'Rival power', powerLevel: 'High Tier', alignment: 'Neutral',
      connectionToMC: 'Hunts the prince for the court', description: 'Merchant clans bound by tide oaths, ruled by a council of three.',
      factionKind: 'Alliance of clans', standing: 'Rising', appearance: 'Salt-stained blue-green coats, tide-oath rings on every thumb.',
      seat: 'Tidehold', leader: 'Councillor Mu Lan', ties: "Paid by the celestial court; rivals of the Heavenly Sword Sect",
    },
  ],
  things: [
    { name: 'Iron Brush', appearance: 'A black-iron calligraphy brush, its bristles frozen into a needle.', holder: 'Elder Qin', status: 'Whole' },
    { name: "Ninth Prince's Jade Token", appearance: 'A palm-sized jade token carved with a nine-petal seal, cracked across one corner.', location: 'Rift Quarry', status: 'Cracked' },
  ],
  startingAbilities: [
    { name: 'Frostbrush Edict', appearance: 'Strokes of white frost hang in the air where the brush passes, then fall as blades.', ladder: 'Qi Condensation → Nascent Soul' },
    { name: 'Lesser Binding Script', appearance: 'A talisman flares amber and ropes of light close on the target.', ladder: 'Qi Condensation' },
  ],
  places: [
    { name: 'Rift Quarry', appearance: 'A volcanic rift floored with black glass, lit red from below, lined with labor scaffolds.', within: 'Heavenly Sword Sect', heldBy: 'Heavenly Sword Sect', condition: 'Working' },
    { name: 'Azure Hall', appearance: 'A cloud-terraced hall of blue stone above the rift, its pillars carved with sword sigils.', within: 'Heavenly Sword Sect', heldBy: 'Heavenly Sword Sect', condition: 'Whole' },
  ],
  species: [
    { name: 'Cinder Serpent', appearance: 'A coal-scaled serpent the length of two men, embers showing between its scales.', habitat: 'Rift Quarry', strength: 'Qi Condensation 5 to 7', mind: 'Beast; no speech' },
  ],
  abilities: { startingPowerConcept: 'Qi Condensation Tier 1', uniquePath: 'Rebuilds his meridians from the scars of failed timelines' },
  powerSystem: {
    flavor: 'Martial arts, Daoist',
    knownRanks: 'Qi Condensation → Foundation Establishment → Core Formation → Nascent Soul',
    laws: 'No killing inside the sect gates. Outer-sect laborers may not carry a sword. A fate auditor\'s decree cannot be refused aloud.',
    era: "The ninth century of a collapsing celestial court; famine in the outer provinces and spirit-stone scarcity in the sects.",
  },
  mainOpposition: "The celestial court's fate auditors",
});

export const createMockBlueprint = (): WorldBlueprint => ({
  arcPlans: [createMockArcOne()],
  arcLookahead: createMockArcLookahead(10),
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
  firstArcPromise: 'The sect tournament exposes the first assassination attempt on the prince.',
  tropeRules: 'Face-slapping tied to fate corrections, not petty insults.',
  styleBible: 'Close third-person narration with restrained exposition, concrete sensory detail, and sharp reversals at scene endings.',
  destinedEnding: "The prince survives and shatters the celestial court's grip on fate.",
  estimatedArcs: 10,
});

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
      fateSurvival: { enabled: true, pressure: 'immortal' },
      funSettings: {
        faceSlap: 'high',
        plotArmor: 'low',
        recognition: 'high',
      },
      activeArcGoal: { id: 'arc-1-rank', text: 'Reach Foundation rank.', chapters: 30 },
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
        mainOpposition: "The celestial court's fate auditors",
        mainCharacter: {
          name: 'Ye Chen',
          startingIdentity: 'Crippled young master, secretly the reincarnated Ninth Prince',
          personality: 'Ruthless but protective, chaotic neutral',
          secretAdvantage: 'Foreknowledge of seven doomed timelines',
          startingWeakness: 'Destroyed meridians',
          bio: 'Born as the son of a fallen patriarch, carrying the blood of a Primordial dragon, extremely lazy but protective of the few he trusts.',
          // The world at Chapter 0: what the author wrote about where he stands.
          location: 'Rift Quarry',
          status: 'Meridians destroyed; able to walk',
          holds: "Ninth Prince's Jade Token",
          belongsTo: 'Heavenly Sword Sect',
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
    originalLanguage: 'en',
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
