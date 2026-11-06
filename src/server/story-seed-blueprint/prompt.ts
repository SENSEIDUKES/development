import { ARC_LOOKAHEAD_SCHEMA, ARC_PLAN_DRAFT_SCHEMA, STORY_LENGTH_ARCS } from '@seihouse/sen/arc-goals';
import {
  SEED_ABILITY_LIMIT,
  SEED_ABILITY_SLOT_FIELDS,
  SEED_CHARACTER_LIMIT,
  SEED_CHARACTER_SLOT_FIELDS,
  SEED_FACTION_LIMIT,
  SEED_FACTION_SLOT_FIELDS,
  SEED_MAIN_CHARACTER_SLOT_FIELDS,
  SEED_PLACE_LIMIT,
  SEED_PLACE_SLOT_FIELDS,
  SEED_SPECIES_LIMIT,
  SEED_SPECIES_SLOT_FIELDS,
  SEED_THING_LIMIT,
  SEED_THING_SLOT_FIELDS,
  SEED_WORLD_RULES_FIELDS,
  WORLD_FACT_DETAILS,
  type StorySeedInput,
} from '@seihouse/sen/story-seed';
import { WORLD_CARD_KINDS, type WorldCardKindId } from '@seihouse/sen/contracts';
import { SEN_BLUEPRINT_DEFAULT_SKILLS, assembleBlueprintSkills, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';

/** How the request names each world fact the creator may have written. */
const WORLD_FACT_PROMPT_LABELS: Record<typeof WORLD_FACT_DETAILS[number]['field'], string> = {
  worldOverview: 'world overview',
  startingLocation: 'opening location',
  societyStructure: 'society',
};

const listPhrase = (items: string[]): string => items.length <= 2
  ? items.join(' and ')
  : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;

/** Where each card kind's cards go in the answer, and how many it may hold, in the order the answer writes them. */
const CARD_ANSWERS: Array<{ kind: WorldCardKindId; field: string; limit?: number; lead: string }> = [
  { kind: 'world-rules', field: 'powerSystem', lead: 'Write it once, for the whole story.' },
  { kind: 'place', field: 'places', limit: SEED_PLACE_LIMIT, lead: 'List the place the story opens in first, then the others it opens among.' },
  { kind: 'faction', field: 'factions', limit: SEED_FACTION_LIMIT, lead: "List the creator's own factions first, by their exact name, then only the supporting ones the story needs." },
  { kind: 'species', field: 'species', limit: SEED_SPECIES_LIMIT, lead: 'List the creatures this world has, not individuals.' },
  { kind: 'ability', field: 'startingAbilities', limit: SEED_ABILITY_LIMIT, lead: 'List the abilities anyone already knows; the character cards name them exactly as they are written here.' },
  { kind: 'thing', field: 'things', limit: SEED_THING_LIMIT, lead: 'List what the cast already holds, and what waits somewhere to be found.' },
  { kind: 'character', field: 'characters', limit: SEED_CHARACTER_LIMIT, lead: "List the creator's own characters first, by their exact name, then only the supporting ones the story needs. Never the main character." },
];

const cardSlotLines = (kind: WorldCardKindId): string => WORLD_CARD_KINDS
  .find(candidate => candidate.id === kind)!.slots
  .filter(slot => !slot.aliases)
  .map(slot => `    ${slot.id}: ${slot.asks}`)
  .join('\n');

/**
 * The World Blueprint's permanent rules: what every Blueprint holds to,
 * whichever Origin, World and Arc skills it reads, so no replaced skill can
 * break the Codex or the creator's authority (SENSEI, 2026-11-05; words
 * approved before they were written here). Never a skill. Every card kind and
 * slot is written from the Codex's own definition (`WORLD_CARD_KINDS`), so
 * these rules can never ask for a slot the Story Seed cannot hold or the Codex
 * cannot show.
 */
export const BLUEPRINT_PERMANENT_RULES = `The creator's words
The Story Seed is the creator's. Every value they wrote is a fact: never contradict, replace, rename, weaken or leave it out. Where the creator already wrote a card slot, repeat their value exactly; only blank slots are yours to fill. Build the creator's own characters and factions into the world under their exact names, listed first, before any you add.
- Make It Work (story.optional.makeItWorkInstruction): an instruction about the world that must hold, whatever else has to bend.
- Hard Pins (story.optional.hardPins): truths the creator fixed for the whole story. Build a world where every one can hold.
- Active Arc Goal (story.optional.activeArcGoal): where the creator wants the story to begin.

One name for one thing
Every name a card points to is the exact name on that thing's own card:
- a character's location names a place card, their holds names thing cards, their knows names ability cards, their belongsTo names faction cards;
- a thing's holder names a character;
- a place's heldBy names a faction card, and a place's within names another place card;
- a faction's seat names a place card and its leader a character card;
- ties name character or faction cards;
- every rank, level and strength comes from powerSystem.knownRanks.

Write the answer in the order it is asked for, so each card is written before the cards that point to it.

Lists
Where a slot holds more than one name (holds, knows, ties, belongsTo, habitat), separate them with commas, and never put a comma inside a name. A count goes before its name: "3 Spirit Pills". knownRanks lists the ranks from lowest to highest, separated by commas. laws writes one law per line.

The cards, in the order to write them, and what each slot holds:

${CARD_ANSWERS.map(({ kind, field, limit, lead }) => {
  const definition = WORLD_CARD_KINDS.find(candidate => candidate.id === kind)!;
  const count = limit ? ` (at most ${limit})` : '';
  return `- ${field}${count}: ${definition.purpose} ${lead}\n${cardSlotLines(kind)}`;
}).join('\n')}

Describe minors safely and never sexualize a character under 18.

Return the JSON object only.`;

/**
 * The World Blueprint's instructions: its Origin, World and Arc skills, in
 * CAPA Schema order, then its permanent rules. `skills` defaults to SEN's own;
 * a host that licenses SEN may give its own (for example another Origin).
 */
export const buildWorldBlueprintSystemPrompt = (
  skills: readonly HarnessSkillManifest[] = SEN_BLUEPRINT_DEFAULT_SKILLS,
): string => `${assembleBlueprintSkills(skills)}\n\n${BLUEPRINT_PERMANENT_RULES}`;

/** The World Blueprint's instructions with SEN's own skills. */
export const WORLD_BLUEPRINT_SYSTEM_PROMPT = buildWorldBlueprintSystemPrompt();

/**
 * The lines of the request that depend on this Seed: world facts the creator
 * already wrote (their wording stays the fact; the matching Blueprint field
 * carries only compatible detail, which chapter generation receives beside
 * it), a Story Length the creator chose, and an Active Arc Goal.
 */
const seedRules = (storySeed: StorySeedInput, arcCount: number | undefined): string[] => {
  const identity = storySeed.world.optional.worldIdentity;
  const written = WORLD_FACT_DETAILS.filter(entry => identity[entry.fact]?.trim());
  return [
    ...(written.length
      ? [`The creator already wrote the ${listPhrase(written.map(entry => `${WORLD_FACT_PROMPT_LABELS[entry.field]} (worldIdentity.${entry.fact})`))}; that wording stays the fact. In ${listPhrase(written.map(entry => entry.field))}, add only compatible detail.`]
      : []),
    ...(arcCount === undefined ? [] : [`The creator chose the story's length: estimatedArcs is exactly ${arcCount}.`]),
    ...(storySeed.story.optional.activeArcGoal
      ? ['Arc 1 begins with the Active Arc Goal: use its text word for word as Arc 1\'s first goal.']
      : []),
  ];
};

/** The request: the Story Seed, then only the lines that depend on it. */
export const buildWorldBlueprintPrompt = (storySeed: StorySeedInput, arcCount = storySeed.story.optional.arcCount): string => {
  const rules = seedRules(storySeed, arcCount);
  return `Build the World Blueprint for this Story Seed:

${JSON.stringify(storySeed, null, 2)}${rules.length ? `\n\n${rules.map(rule => `- ${rule}`).join('\n')}` : ''}`;
};

const textSlots = (fields: readonly string[]) => Object.fromEntries(fields.map(field => [field, { type: "string" }]));

/** One Chapter 0 card kind's list: a name and every slot the Codex card holds. */
const cardList = (fields: readonly string[], limit: number, minItems = 0) => ({
  type: "array", minItems, maxItems: limit, items: {
    type: "object", additionalProperties: false, required: ["name", ...fields],
    properties: { name: { type: "string", minLength: 1 }, ...textSlots(fields) },
  },
});

/**
 * The Blueprint response schema. It has a place for every Story Seed slot
 * (filled only where the creator left one blank) and it plans Arc 1 only (`arcOne`: wording and
 * chapters; the identities are assigned on the server) and a hidden look-ahead
 * for the next arcs. `exactArcs` is the Seed's Story Length, when the creator
 * chose one; without it the model picks a realistic length.
 */
export const worldBlueprintResponseSchema = (exactArcs?: number) => ({
  type: "object",
  additionalProperties: false,
  // The order the model writes its answer in: each part comes before the
  // parts that point to it, so a name is set on its own card before another
  // card uses it, and the Destined Ending before the arcs that travel to it.
  required: [
    "title",
    "logline",
    "destinedEnding",
    "estimatedArcs",
    "powerSystem",
    "powerSystemOutline",
    "worldOverview",
    "societyStructure",
    // The world at Chapter 0: a card kind left out of the answer would leave
    // the world short of it, so every one is asked for.
    "places",
    "startingLocation",
    "factions",
    "species",
    "startingAbilities",
    "things",
    "mainCharacter",
    "abilities",
    "characters",
    "mainOpposition",
    "firstArcPromise",
    "arcOne",
    "arcLookahead",
    "tropeRules",
    "styleBible",
  ],
  properties: {
    title: { type: "string", minLength: 1 },
    logline: { type: "string", minLength: 1 },
    destinedEnding: { type: "string", minLength: 1 },
    estimatedArcs: { type: "integer", minimum: exactArcs ?? STORY_LENGTH_ARCS.min, maximum: exactArcs ?? STORY_LENGTH_ARCS.max },
    // The World rules sheet, which the Seed keeps in its power-system family.
    powerSystem: { type: "object", additionalProperties: false, required: SEED_WORLD_RULES_FIELDS, properties: textSlots(SEED_WORLD_RULES_FIELDS) },
    powerSystemOutline: { type: "string", minLength: 1 },
    worldOverview: { type: "string", minLength: 1 },
    societyStructure: { type: "string", minLength: 1 },
    places: cardList(SEED_PLACE_SLOT_FIELDS, SEED_PLACE_LIMIT, 1),
    startingLocation: { type: "string", minLength: 1 },
    factions: cardList(SEED_FACTION_SLOT_FIELDS, SEED_FACTION_LIMIT, 1),
    species: cardList(SEED_SPECIES_SLOT_FIELDS, SEED_SPECIES_LIMIT),
    startingAbilities: cardList(SEED_ABILITY_SLOT_FIELDS, SEED_ABILITY_LIMIT),
    things: cardList(SEED_THING_SLOT_FIELDS, SEED_THING_LIMIT),
    mainCharacter: {
      type: "object",
      additionalProperties: false,
      required: ["name", "age", "personality", "appearance", "backgroundProfile", ...SEED_MAIN_CHARACTER_SLOT_FIELDS],
      properties: {
        name: { type: "string", minLength: 1 },
        age: { type: "string", minLength: 1 },
        personality: { type: "string", minLength: 1 },
        appearance: { type: "string", minLength: 1 },
        backgroundProfile: { type: "string", minLength: 1 },
        ...textSlots(SEED_MAIN_CHARACTER_SLOT_FIELDS),
      },
    },
    abilities: { type: "object", additionalProperties: false, required: ["startingPowerConcept", "uniquePath"], properties: textSlots(["startingPowerConcept", "uniquePath"]) },
    // The supporting cast, written last of the cards: the creator's own by name first, then supporting ones.
    characters: cardList(SEED_CHARACTER_SLOT_FIELDS, SEED_CHARACTER_LIMIT, 1),
    mainOpposition: { type: "string" },
    firstArcPromise: { type: "string", minLength: 1 },
    arcOne: ARC_PLAN_DRAFT_SCHEMA,
    arcLookahead: ARC_LOOKAHEAD_SCHEMA,
    tropeRules: { type: "string", minLength: 1 },
    styleBible: { type: "string", minLength: 1 },
  },
}) as const;

export const WORLD_BLUEPRINT_RESPONSE_SCHEMA = worldBlueprintResponseSchema();
