import { createInitialArcPlan, validateArcPlan } from '@seihouse/sen/arc-goals';
import { validateHardPinInputs, normalizeFunSettings, resolveStorySeedWorldCanon } from '@seihouse/sen/story-seed';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { IndexedDbHarnessGenerationRepository } from '../../../host/generation/indexedDbRepository';
import { HarnessGenerationHttpClient } from '../../../host/generation/httpClient';
import type { InitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { STORY_SEED_SCHEMA_VERSION } from '@seihouse/sen/story-seed';
import type {
  HarnessStorySeedOption,
  HarnessStorySeedSource,
  StoryFoundationInput,
} from '@seihouse/sen/harness-generation';
import { getStoryStyleLabel, type StorySeedRecord } from '@seihouse/sen/story-seed';
import type { HarnessSkillReference, HarnessSkillSlotId } from '@seihouse/sen/harness-generation';
import { listWorkshopStorySeeds, LOCAL_WORKSHOP_STORY_SEED_OWNER_ID } from '../story-seed/storySeedStorage';
import {
  installOfficialCapaSkills,
  OFFICIAL_CAPA_DEFAULT_REFERENCES,
  OFFICIAL_STYLE_REFERENCES,
} from './officialCapaSkills';

const labeledLines = (entries: Array<[string, string | undefined]>): string | undefined => {
  const present = entries.filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
  return present.length ? present.map(([label, value]) => `${label}: ${value.trim()}`).join('\n') : undefined;
};

/**
 * The only Story Seed -> Harness translation point. It copies author input
 * into a neutral Foundation and freezes the original artifacts for provenance.
 *
 * Every concept crosses exactly once. Story direction (ending, pins, goal,
 * Fun Settings, Fate) has its own Foundation fields; each character and
 * faction travels only as a Foundation identity whose evidence is its single
 * description; world facts carry only what no other field already carries.
 * `resolveStorySeedWorldCanon` decides between the Seed and its reviewed
 * Blueprint, so authored values win and Blueprint copies are never re-sent.
 */
export const createHarnessFoundationFromStorySeed = (record: StorySeedRecord): StoryFoundationInput => {
  const { seed, blueprint } = record;
  const required = seed.story.required;
  const optional = seed.story.optional;
  const identity = seed.world.optional.worldIdentity;
  const world = seed.world.optional.worldFoundations;
  const initialArcPlan = optional.activeArcGoal
    ? createInitialArcPlan(optional.activeArcGoal)
    : blueprint?.arcPlan ? validateArcPlan(blueprint.arcPlan) : undefined;
  if (initialArcPlan && (initialArcPlan.arcNumber !== 1 || initialArcPlan.goals.length !== 1)) {
    throw new Error('Story Seed supplies exactly one initial Active Arc Goal in Arc 1.');
  }
  const canon = resolveStorySeedWorldCanon(seed, blueprint);
  const mainCharacter = canon.mainCharacter;

  return {
    title: identity.title || blueprint?.title || record.title,
    premise: required.premise,
    destinedEnding: world.destinedEnding || blueprint?.destinedEnding,
    fatePressure: optional.fateSurvival.pressure,
    fateSurvival: {
      enabled: optional.fateSurvival.enabled,
      visibility: optional.fateSurvival.visibility,
      majorMysteries: [...(blueprint?.majorMysteries ?? [])],
      unresolvedPlotThreads: [...(blueprint?.unresolvedPlotThreads ?? [])],
    },
    initialArcPlan,
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
    openingSituation: identity.startingLocation || blueprint?.startingLocation,
    declaredCanon: labeledLines([['Story tags', required.storyTags.join(', ')]]),
    cast: mainCharacter ? [{
      name: mainCharacter.name, role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self',
    }] : undefined,
    worldFacts: labeledLines([
      ['World', canon.worldOverview],
      ['Society', canon.societyStructure],
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

type HarnessSkillLoadout = Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>;

/** A deliberate Story Seed style change replaces only the Style slot. */
export const updateOfficialCapaStyle = (
  loadout: HarnessSkillLoadout,
  style: StorySeedRecord['seed']['story']['required']['style'],
): HarnessSkillLoadout => {
  const { style: _previousStyle, ...unchangedSlots } = loadout;
  return {
    ...unchangedSlots,
    ...(style ? { style: OFFICIAL_STYLE_REFERENCES[style] } : {}),
  };
};

/** Official defaults for a newly created story. No unprovided slot is invented. */
export const createOfficialCapaDefaultLoadout = (
  style: StorySeedRecord['seed']['story']['required']['style'],
): HarnessSkillLoadout => updateOfficialCapaStyle(OFFICIAL_CAPA_DEFAULT_REFERENCES, style);

export const createWorkshopStorySeedSource = (): HarnessStorySeedSource => ({
  manageHref: '?preview=story-seed',
  async list(): Promise<HarnessStorySeedOption[]> {
    const records = await listWorkshopStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    return records.map(record => ({
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt,
      hasBlueprint: Boolean(record.blueprint),
      // Each option carries its own seed's language, never the last one opened.
      originalLanguage: record.originalLanguage,
      initialSkillLoadout: createOfficialCapaDefaultLoadout(record.seed.story.required.style),
      foundation: createHarnessFoundationFromStorySeed(record),
    }));
  },
});


export async function startWorkshopHarnessStory(payload: InitialStoryGenerationPayload) {
  const { installed } = await installOfficialCapaSkills(localStorage);
  const controller = new HarnessGenerationController({
    repository: new IndexedDbHarnessGenerationRepository(),
    modelAdapter: new HarnessGenerationHttpClient(),
    installedSkills: installed,
  });
  await controller.hydrate();
  const foundation = createHarnessFoundationFromStorySeed({
    id: payload.administrative.sourceSeedId, userId: payload.administrative.creatorId,
    createdAt: payload.administrative.createdAt, updatedAt: payload.administrative.updatedAt,
    schemaVersion: STORY_SEED_SCHEMA_VERSION, title: payload.blueprint.title,
    originalLanguage: payload.administrative.originalLanguage,
    seed: payload.storySeed, blueprint: payload.blueprint,
  });
  // Original Language is story identity, so it crosses the boundary as its own
  // argument rather than hiding inside the neutral Foundation.
  return controller.createStory(
    foundation,
    payload.administrative.originalLanguage,
    createOfficialCapaDefaultLoadout(payload.storySeed.story.required.style),
  );
}
