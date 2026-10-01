import { createInitialArcPlan, normalizeArcLookahead } from '@seihouse/sen/arc-goals';
import {
  describeBlueprintArcPlanProblem,
  getStoryStyleLabel,
  normalizeFunSettings,
  reconcileStorySeedBlueprint,
  resolveStorySeedWorldCanon,
  validateBlueprintArcPlan,
  validateHardPinInputs,
  type StorySeedRecord,
} from '@seihouse/sen/story-seed';
import type { StoryFoundationInput } from '@seihouse/sen/harness-generation';

const labeledLines = (entries: Array<[string, string | undefined]>): string | undefined => {
  const present = entries.filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
  return present.length ? present.map(([label, value]) => `${label}: ${value.trim()}`).join('\n') : undefined;
};

/** An author fact followed, on its own line, by the Blueprint's added detail. */
const withAddedDetail = (fact: string | undefined, detail: string | undefined): string | undefined =>
  detail ? [fact?.trim(), detail].filter(Boolean).join('\n') : fact;

/**
 * The only Story Seed -> Harness translation point. It copies author input
 * into a neutral Foundation and freezes the original artifacts for provenance.
 *
 * Every concept crosses exactly once. Story direction (ending, pins, arc
 * roadmap, arc count, Fun Settings, Fate) has its own Foundation fields; each
 * character and faction travels only as a Foundation identity whose evidence
 * is its single description; world facts carry only what no other field
 * already carries. Where the author wrote a world, society, or opening fact,
 * the Blueprint's compatible added detail travels beside it, once. `resolveStorySeedWorldCanon` decides between the Seed and
 * its reviewed Blueprint, so authored values win and Blueprint copies are
 * never re-sent.
 *
 * A Blueprint hands over Arc 1's reviewed plan, the story's length and the
 * hidden look-ahead; HARNESS plans every later arc when the reader begins it.
 * A Seed without a generated Blueprint hands over only the Seed's Active Arc
 * Goal as Arc 1, and HARNESS plans such a story's later arcs at each boundary.
 * It never throws on a draft or an older Blueprint.
 */
export const createHarnessFoundationFromStorySeed = (record: StorySeedRecord): StoryFoundationInput => {
  // Reconciled first, so every reviewed Blueprint value is read from the Seed.
  const { seed, blueprint } = record.blueprint
    ? reconcileStorySeedBlueprint(record.seed, record.blueprint)
    : { seed: record.seed, blueprint: undefined };
  const required = seed.story.required;
  const optional = seed.story.optional;
  const identity = seed.world.optional.worldIdentity;
  const world = seed.world.optional.worldFoundations;
  // A generated Blueprint's Arc 1 (whose opening goal is the Seed's Active Arc
  // Goal) is preferred over a bare Seed goal.
  const blueprintArcOne = blueprint && !describeBlueprintArcPlanProblem(blueprint) ? validateBlueprintArcPlan(blueprint) : undefined;
  const initialArcPlan = blueprintArcOne
    ?? (optional.activeArcGoal ? createInitialArcPlan(optional.activeArcGoal) : undefined);
  const plannedArcCount = blueprintArcOne ? blueprint!.estimatedArcs : undefined;
  const initialArcLookahead = plannedArcCount ? normalizeArcLookahead(blueprint!.arcLookahead, { afterArc: 1, plannedArcCount }) : [];
  if (initialArcPlan && initialArcPlan.arcNumber !== 1) {
    throw new Error('Story Seed supplies the Arc 1 plan.');
  }
  const canon = resolveStorySeedWorldCanon(seed, blueprint);
  const mainCharacter = canon.mainCharacter;

  return {
    title: identity.title || record.title,
    premise: required.premise,
    destinedEnding: world.destinedEnding,
    fatePressure: optional.fateSurvival.pressure,
    fateSurvival: { enabled: optional.fateSurvival.enabled },
    ...(plannedArcCount ? { plannedArcCount } : {}),
    ...(initialArcLookahead.length ? { initialArcLookahead } : {}),
    ...(initialArcPlan ? { initialArcPlan } : {}),
    initialHardPins: validateHardPinInputs(optional.hardPins ?? []),
    funSettings: normalizeFunSettings(optional.funSettings),
    identities: [
      ...(mainCharacter ? [{ name: mainCharacter.name, kind: 'character' as const, evidence: mainCharacter.description }] : []),
      ...canon.characters.map(entry => ({ name: entry.name, aliases: entry.aliases, kind: 'character' as const, evidence: entry.description })),
      ...canon.factions.map(entry => ({ name: entry.name, aliases: entry.aliases, kind: 'faction' as const, evidence: entry.description })),
    ],
    genre: required.genre,
    toneStyle: labeledLines([
      ['Story tradition', getStoryStyleLabel(required.style)],
      ['Style bible', blueprint?.styleBible],
    ]),
    permanentInstructions: labeledLines([['Make It Work', optional.makeItWorkInstruction]]),
    openingSituation: withAddedDetail(identity.startingLocation, canon.startingLocationDetail),
    declaredCanon: labeledLines([['Story tags', required.storyTags.join(', ')]]),
    cast: mainCharacter ? [{
      name: mainCharacter.name, role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self',
    }] : undefined,
    worldFacts: labeledLines([
      ['World', canon.worldOverview],
      ['World detail', canon.worldOverviewDetail],
      ['Society', canon.societyStructure],
      ['Society detail', canon.societyStructureDetail],
      ['Power system', canon.powerSystem],
      ['Main Opposition', world.mainOpposition],
    ]),
    sourceSnapshot: {
      kind: 'story-seed',
      sourceId: record.id,
      sourceUpdatedAt: record.updatedAt,
      schemaVersion: record.schemaVersion,
      seed: structuredClone(seed),
      ...(blueprint ? { blueprint: structuredClone(blueprint) } : {}),
    },
  };
};
