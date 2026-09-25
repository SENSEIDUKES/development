import { ARC_LENGTH, MAX_ARC_GOALS, type ArcPlan } from '@seihouse/sen/arc-goals';
import { WORLD_FACT_DETAILS, type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';

export const WORLD_BLUEPRINT_SYSTEM_PROMPT = `You are an elite light-novel creative director and world architect. Build a detailed World Blueprint that can serve as the canon bible for serialized chapter generation.

Treat the creator's storytelling tradition and genre as adaptable lenses rather than mandatory tropes.

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

export const buildWorldBlueprintPrompt = (storySeed: StorySeedInput, maxArcs: number, arcCount?: number): string => `Create one complete World Blueprint from this finalized canonical Story Seed:

${JSON.stringify(storySeed, null, 2)}

Completion rules:
- Complete every output field. No blank strings. majorFactions and initialCharacters must not be empty; majorMysteries and unresolvedPlotThreads may be empty.
- Generate a strong logline.
${worldFactRules(storySeed).map(rule => `- ${rule}`).join('\n')}
- Complete the main character's name, age, appearance, personality, and background profile when missing.
- Include the creator's named characters and factions, then add only useful supporting entries. Begin every entry with its name: Name (role) — description.
- ${arcCount === undefined
  ? `Establish the Destined Ending first, then a realistic estimatedArcs between 1 and ${maxArcs}.`
  : `Establish the Destined Ending first. The author chose the story's length: estimatedArcs is exactly ${arcCount}.`} Each arc is exactly ${ARC_LENGTH} chapters.
- Generate arcPlans: exactly estimatedArcs plans, one per arc, in order, with arcNumber 1 through estimatedArcs. Together they are one coherent route from the opening situation to the Destined Ending: each arc builds on the one before it, and the final arc's final goal is the story reaching its Destined Ending.
- Each arc plan has 1 to ${MAX_ARC_GOALS} sequential one-line goals. Every goal has a unique ID prefixed with its arc (for example arc-2-...) and a positive whole-chapter allocation weighted by what it requires; an arc's allocations sum to exactly ${ARC_LENGTH}. Goals never overlap and never repeat across arcs.
- ${storySeed.story.optional.activeArcGoal
  ? 'Arc 1 must begin with story.optional.activeArcGoal: use its text verbatim as Arc 1\'s first goal and plan the rest of the route around it.'
  : 'Choose Arc 1\'s first goal as the immediate goal the creator will review.'}
- Establish the first-arc promise, trope rules, and a practical style bible.
- ${storySeed.story.optional.fateSurvival.enabled
  ? 'Survival is enabled. You may create majorMysteries and unresolvedPlotThreads for the Fate Survival experience. Keep them only in those arrays, as unresolved proposals, never character knowledge or ordinary canonical state.'
  : 'Survival is disabled. Return empty arrays for majorMysteries and unresolvedPlotThreads. Do not invent Fate Survival mysteries or unresolved threads, or embed them in other fields.'}
- The style bible must translate genre, style, tags, and maturity metadata into actionable prose, pacing, viewpoint, dialogue, and thematic guidance.
- The trope rules must explicitly account for face-slap, plot-armor, recognition, and Make It Work settings. Keep Fate Survival settings out of trope rules; chapter generation receives them separately. Apply the other settings without exposing app-control language as ordinary narration.
- mcProfile repeats mainCharacter.backgroundProfile exactly.

Return the JSON object only.`;

export const ARC_ROADMAP_EXTENSION_SYSTEM_PROMPT = `You are an elite light-novel creative director lengthening a novel's saved arc roadmap. The roadmap is the route from the story's opening to its fixed Destined Ending. Its saved arcs are author-reviewed and authoritative: plan only the new arcs the author asked for, and never restate, rewrite, renumber, or contradict a saved arc. Every non-empty Story Seed value is authoritative canon. Describe minors safely and never sexualize a character under 18. Return only the requested JSON object.`;

const presentSavedArc = (plan: ArcPlan, finalArc: boolean): string => [
  `Arc ${plan.arcNumber}${finalArc ? ' (final arc; reaches the Destined Ending)' : ''}:`,
  ...plan.goals.map(goal => `  - [${goal.id}] ${goal.text} (${goal.chapters} chapters)`),
].join('\n');

/**
 * Asks for only the arcs being added. The saved roadmap and the Blueprint's
 * summary are context; the new arcs bridge the arc before the final arc and
 * the final arc, which keeps its goals and its place at the end of the route.
 */
export const buildArcRoadmapExtensionPrompt = (storySeed: StorySeedInput, blueprint: WorldBlueprint, arcCount: number): string => {
  const saved = blueprint.arcPlans ?? [];
  const finalArc = saved[saved.length - 1];
  const bridgeFrom = saved[saved.length - 2];
  const added = arcCount - saved.length;
  const firstNew = saved.length;
  const newArcs = added === 1 ? `Arc ${firstNew}` : `Arcs ${firstNew} through ${arcCount - 1}`;
  const summary = ([
    ['Logline', blueprint.logline],
    ['World overview', blueprint.worldOverview],
    ['Power system', blueprint.powerSystemOutline],
    ['First-arc promise', blueprint.firstArcPromise],
  ] as const).filter(([, value]) => value?.trim()).map(([label, value]) => `- ${label}: ${value.trim()}`);
  const destinedEnding = storySeed.world.optional.worldFoundations.destinedEnding?.trim() || blueprint.destinedEnding?.trim() || '';
  return `The author is lengthening this story from ${saved.length} to ${arcCount} arcs. Plan only the ${added} new ${added === 1 ? 'arc' : 'arcs'}.

The new arcs go between Arc ${bridgeFrom.arcNumber} and the final arc, so the story still reaches its Destined Ending in its last arc. They become ${newArcs}; the current final arc becomes Arc ${arcCount} and keeps its goals unchanged.

Story Seed (canonical; every non-empty value is authoritative):
${JSON.stringify(storySeed, null, 2)}

World Blueprint summary:
${summary.length ? summary.join('\n') : '- (none)'}

Destined Ending (the fixed destination): ${destinedEnding}

Saved arc roadmap (author-reviewed; do not change it):
${saved.map(plan => presentSavedArc(plan, plan === finalArc)).join('\n')}

Rules:
- Return arcPlans with exactly ${added} ${added === 1 ? 'plan' : 'plans'}, ${added === 1 ? `numbered ${firstNew}` : `numbered ${firstNew} through ${arcCount - 1} in order`}.
- The new arcs pick up where Arc ${bridgeFrom.arcNumber} ends and lead into the final arc's first goal, "${finalArc.goals[0].text}". With the saved arcs they form one coherent route: each new arc builds on the one before it and raises the stakes toward the final arc.
- No new arc reaches or resolves the Destined Ending; that stays the final arc's last goal. Never repeat or pre-empt a saved goal.
- Each plan has 1 to ${MAX_ARC_GOALS} sequential one-line goals. Every goal has a unique ID prefixed with its new arc number (for example arc-${firstNew}-...) that no saved goal uses, and a positive whole-chapter allocation weighted by what it requires; an arc's allocations sum to exactly ${ARC_LENGTH}. Goals never overlap.

Return the JSON object only.`;
};
