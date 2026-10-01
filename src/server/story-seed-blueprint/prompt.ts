import { ARC_LENGTH, MAX_ARC_GOALS, MAX_ARC_LOOKAHEAD, MAX_ROADMAP_ARCS } from '@seihouse/sen/arc-goals';
import { SEED_CHARACTER_LIMIT, SEED_FACTION_LIMIT, WORLD_FACT_DETAILS, type StorySeedInput } from '@seihouse/sen/story-seed';

export const WORLD_BLUEPRINT_SYSTEM_PROMPT = `You are an elite Eastern fantasy author and world architect. Build a detailed World Blueprint that can serve as the canon bible for serialized chapter generation.

Interpret the Story Seed's genre, tags, and storytelling tradition through that Eastern fantasy frame, as adaptable lenses rather than mandatory tropes. Never fill open creative space with Western fantasy defaults unless the Story Seed asks for them.

The Story Seed contains creator-authored world facts and separate creative intentions. Every non-empty value is authoritative: never contradict, replace, rename, weaken, or silently omit it. Fill blank creative space intelligently and connect the creator's facts into one coherent world. Make It Work is an absolute worldbuilding instruction. Destined Ending is the novel's fixed destination: the whole story travels toward it and its final arc arrives at it. Fun Settings are optional creative flavor, not canon, and subordinate to Destined Ending, Hard Pins, Active Arc Goal, and canon. The genre, style, tags, characters, factions, abilities, and power-system details must materially influence the result.

When a creator supplied a character or faction, integrate it instead of replacing it. You may add supporting characters and factions when the story needs them. Describe minors safely and never sexualize a character under 18.`;

/** How the completion rules name each world fact the creator may have written. */
const WORLD_FACT_PROMPT_LABELS: Record<typeof WORLD_FACT_DETAILS[number]['field'], string> = {
  worldOverview: 'world overview',
  startingLocation: 'opening location',
  societyStructure: 'society',
};

const listPhrase = (items: string[]): string => items.length <= 2
  ? items.join(' and ')
  : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;

/**
 * World facts the creator left open are established in full. Facts the
 * creator wrote stay theirs; the matching Blueprint field carries only
 * compatible detail that adds to the fact, which chapter generation receives
 * beside it.
 */
const worldFactRules = (storySeed: StorySeedInput): string[] => {
  const identity = storySeed.world.optional.worldIdentity;
  const written = WORLD_FACT_DETAILS.filter(entry => identity[entry.fact]?.trim());
  const open = WORLD_FACT_DETAILS.filter(entry => !identity[entry.fact]?.trim());
  const establish = open.length
    ? `the ${listPhrase([...open.map(entry => WORLD_FACT_PROMPT_LABELS[entry.field]), 'a usable power-system outline'])}`
    : 'a usable power-system outline';
  const facts = listPhrase(written.map(entry => `${WORLD_FACT_PROMPT_LABELS[entry.field]} (worldIdentity.${entry.fact})`));
  const fields = listPhrase(written.map(entry => entry.field));
  return [
    `Establish ${establish}.`,
    ...(written.length
      ? [`The creator already wrote the ${facts}; that wording stays the fact. In ${fields}, write only compatible added detail that builds on the matching fact, never restating or contradicting it.`]
      : []),
  ];
};

export const buildWorldBlueprintPrompt = (storySeed: StorySeedInput, arcCount?: number): string => `Create one complete World Blueprint from this finalized canonical Story Seed:

${JSON.stringify(storySeed, null, 2)}

Completion rules:
- Complete every output field. No blank strings. characters and factions must not be empty.
- Generate a strong logline.
${worldFactRules(storySeed).map(rule => `- ${rule}`).join('\n')}
- Fill every Story Seed slot. Where the creator already wrote a slot, repeat their value exactly; only blank slots are yours to fill. Never write aliases or Hard Pins.
- mainCharacter: name, age, appearance, personality, startingIdentity, secretAdvantage, startingWeakness, mainFlaw, moralAlignment, a short bio (who they are now, in two or three sentences), and backgroundProfile (their fuller backstory beyond the bio).
- characters: list every side character the creator wrote first, by their exact name, then add only useful supporting characters, at most ${SEED_CHARACTER_LIMIT} in all; never the main character. Give each its role, age, skinTone, eyeColor, powerType, rankLevel, connectionToMC, and a short bio.
- factions: list every faction the creator wrote first, by its exact name, then add only useful supporting factions, at most ${SEED_FACTION_LIMIT} in all. Give each its role, powerLevel, alignment, connectionToMC, and a description of its hierarchy and beliefs.
- abilities (startingPowerConcept, uniquePath), powerSystem (flavor, knownRanks: the rank ladder in order) and mainOpposition: fill each.
- Keep every slot to one short, concrete fact; the longer prose fields (logline, worldOverview, powerSystemOutline, backgroundProfile, firstArcPromise) add what the slots do not already say, never restating them.
- ${arcCount === undefined
  ? `Establish the Destined Ending first, then a realistic estimatedArcs between 1 and ${MAX_ROADMAP_ARCS}: the story's length.`
  : `Establish the Destined Ending first. The author chose the story's length: estimatedArcs is exactly ${arcCount}.`} Each arc is exactly ${ARC_LENGTH} chapters, and the last arc arrives at the Destined Ending.
- Plan only Arc 1, in arcOne: 1 to ${MAX_ARC_GOALS} sequential one-line goals, each with a positive whole-chapter allocation weighted by what it requires; the allocations sum to exactly ${ARC_LENGTH}. Goals never overlap. When estimatedArcs is 1, Arc 1 is the whole story and its last goal is the story reaching its Destined Ending; otherwise no Arc 1 goal reaches or resolves it. Every later arc is planned when the story reaches it, from where the story is then.
- ${storySeed.story.optional.activeArcGoal
  ? 'Arc 1 must begin with story.optional.activeArcGoal: use its text verbatim as Arc 1\'s first goal and plan the rest of the arc around it.'
  : 'Choose Arc 1\'s first goal as the immediate goal the creator will review.'}
- Write arcLookahead: private direction for the arcs after Arc 1, one line each for at most the next ${MAX_ARC_LOOKAHEAD} arcs (Arc 2 and Arc 3), never beyond estimatedArcs, describing where the route goes toward the Destined Ending; the final arc's line arrives at it. Return an empty arcLookahead when estimatedArcs is 1. Readers never see it; it guides the planning of those arcs.
- Establish the first-arc promise, trope rules, and a practical style bible.
- The style bible must translate genre, style, tags, and maturity metadata into actionable prose, pacing, viewpoint, dialogue, and thematic guidance.
- The trope rules must explicitly account for face-slap, plot-armor, recognition, and Make It Work settings. Keep Fate Survival settings out of trope rules; chapter generation receives them separately. Apply the other settings without exposing app-control language as ordinary narration.

Return the JSON object only.`;
