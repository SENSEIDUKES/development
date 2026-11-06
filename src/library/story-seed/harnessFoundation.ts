import { normalizeArcLookahead } from '@seihouse/sen/arc-goals';
import {
  arcOnePlanFromSeedGoals,
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
import { hasWorldRecord } from '@seihouse/sen/contracts';
import { worldAtChapterZeroFromStorySeed } from './worldAtChapterZero';

const labeledLines = (entries: Array<[string, string | undefined]>): string | undefined => {
  const present = entries.filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
  return present.length ? present.map(([label, value]) => `${label}: ${value.trim()}`).join('\n') : undefined;
};

/**
 * The only Story Seed -> Harness translation point. It copies author input
 * into a neutral Foundation and freezes the original artifacts for provenance.
 *
 * Every concept crosses exactly once. Story direction (ending, pins, arc
 * roadmap, arc count, Fun Settings, Fate) has its own Foundation fields; each
 * character and faction travels only as a Foundation identity whose evidence
 * is its single description; world facts carry only what no other field
 * already carries. What kind of world it is and who rules it travel on the
 * World rules card, and where the story opens is its first Place and Arc 1's
 * first goal (SENSEI, 2026-11-06). `resolveStorySeedWorldCanon` decides between the Seed and
 * its reviewed Blueprint, so authored values win and Blueprint copies are
 * never re-sent.
 *
 * A Blueprint hands over Arc 1's reviewed plan, the story's length and the
 * hidden look-ahead; HARNESS plans every later arc when the reader begins it.
 * A Seed without a generated Blueprint hands over the Seed's own Arc 1 goals
 * as Arc 1 and its directions for Arcs 2 and 3, and HARNESS plans such a
 * story's later arcs at each boundary.
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
  // A generated Blueprint's Arc 1 (which keeps the Seed's own Arc 1 goals) is
  // preferred over the bare Seed goals.
  const blueprintArcOne = blueprint && !describeBlueprintArcPlanProblem(blueprint) ? validateBlueprintArcPlan(blueprint) : undefined;
  const initialArcPlan = blueprintArcOne
    ?? arcOnePlanFromSeedGoals(optional.arcOneGoals);
  const plannedArcCount = blueprintArcOne ? blueprint!.estimatedArcs : undefined;
  // Without a Blueprint, the creator's own directions for Arc 2 and Arc 3 travel.
  const initialArcLookahead = plannedArcCount
    ? normalizeArcLookahead(blueprint!.arcLookahead, { afterArc: 1, plannedArcCount })
    : initialArcPlan ? normalizeArcLookahead(optional.arcLookahead ?? [], { afterArc: 1, plannedArcCount: optional.arcCount }) : [];
  if (initialArcPlan && initialArcPlan.arcNumber !== 1) {
    throw new Error('Story Seed supplies the Arc 1 plan.');
  }
  const canon = resolveStorySeedWorldCanon(seed, blueprint);
  const mainCharacter = canon.mainCharacter;
  const worldAtChapterZero = worldAtChapterZeroFromStorySeed(seed);
  const carriesWorld = hasWorldRecord(worldAtChapterZero);

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
    // A declared identity gives the names that resolve to someone. Its evidence
    // is their description, and every fact in that description is now a slot on
    // their Chapter 0 card: sending both would put the same fact in two
    // sections of the writer's packet, which its own instructions forbid. So
    // where the world carries the card, the identity keeps only what no card
    // slot holds — the main character's reviewed background, the one part of a
    // description the Blueprint owns rather than the Seed.
    identities: [
      ...(mainCharacter ? [{ name: mainCharacter.name, kind: 'character' as const,
        evidence: carriesWorld ? canon.mainCharacterBeyondItsCard ?? mainCharacter.name : mainCharacter.description }] : []),
      ...canon.characters.map(entry => ({ name: entry.name, aliases: entry.aliases, kind: 'character' as const,
        evidence: carriesWorld ? entry.name : entry.description })),
      ...canon.factions.map(entry => ({ name: entry.name, aliases: entry.aliases, kind: 'faction' as const,
        evidence: carriesWorld ? entry.name : entry.description })),
    ],
    // The world the story opens with, in the Codex's own card kinds. It is read
    // from the reconciled Seed, so it already carries what the Blueprint filled.
    worldAtChapterZero,
    genre: required.genre,
    toneStyle: labeledLines([
      // How the prose reads is the Style skill's job, never a Blueprint paragraph (SENSEI, 2026-11-06).
      ['Story tradition', getStoryStyleLabel(required.style)],
    ]),
    permanentInstructions: labeledLines([['Make It Work', optional.makeItWorkInstruction]]),
    // Tags are the experience the creator asked for, not canon facts (SENSEI, 2026-10-25).
    storyTags: [...required.storyTags],
    cast: mainCharacter ? [{
      name: mainCharacter.name, role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self',
    }] : undefined,
    worldFacts: labeledLines([
      // The World rules card carries what kind of world it is and who rules it;
      // only a story with no card at all needs them here.
      ['World', carriesWorld ? undefined : canon.worldOverview],
      ['Society', carriesWorld ? undefined : canon.societyStructure],
      // The World rules sheet carries the ladder and how power works; what is
      // left is what the creator wrote about power that no card slot holds.
      ['Power system', carriesWorld ? canon.powerSystemBeyondItsCard : canon.powerSystem],
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
