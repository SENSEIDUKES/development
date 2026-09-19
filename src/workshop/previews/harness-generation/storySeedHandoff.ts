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

const joinSections = (sections: Array<[string, unknown]>): string | undefined => {
  const present = sections.filter(([, value]) => {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  });
  if (!present.length) return undefined;
  return present.map(([label, value]) => `${label}\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}`).join('\n\n');
};

/**
 * The only Story Seed -> Harness translation point. It copies author input
 * into a neutral Foundation and freezes the original artifacts for provenance.
 */
export const createHarnessFoundationFromStorySeed = (record: StorySeedRecord): StoryFoundationInput => {
  const { seed, blueprint } = record;
  const required = seed.story.required;
  const optional = seed.story.optional;
  const identity = seed.world.optional.worldIdentity;
  const world = seed.world.optional.worldFoundations;
  const style = getStoryStyleLabel(required.style);
  const blueprintCharacters = (blueprint?.initialCharacters ?? []).map(entry => {
    // Blueprint's named-list convention separates a name from its parenthesized role.
    const annotated = entry.match(/^([^()]+?)\s+\((.+)\)$/);
    return { name: (annotated?.[1] ?? entry).trim(), aliases: annotated ? [entry] : [],
      kind: 'character' as const, evidence: entry };
  });

  return {
    title: identity.title || blueprint?.title || record.title,
    premise: required.premise,
    destinedEnding: world.destinedEnding || blueprint?.destinedEnding,
    initialArcPlan: optional.arcPlan || blueprint?.arcPlan,
    identities: [
      ...((world.mainCharacter?.name || blueprint?.mainCharacter?.name) ? [{
        name: world.mainCharacter?.name || blueprint!.mainCharacter!.name,
        kind: 'character' as const,
        evidence: JSON.stringify(world.mainCharacter?.name ? world.mainCharacter : blueprint?.mainCharacter),
      }] : []),
      ...(world.additionalCharacters ?? []).filter(character => character.name.trim()).map(character => ({
        name: character.name, aliases: character.aliases, kind: 'character' as const, evidence: JSON.stringify(character),
      })),
      ...blueprintCharacters.filter(character => character.name),
      ...(world.factions ?? []).filter(faction => faction.name.trim()).map(faction => ({
        name: faction.name, aliases: faction.aliases, kind: 'faction' as const, evidence: JSON.stringify(faction),
      })),
    ],
    genre: required.genre,
    toneStyle: joinSections([
      ['Story tradition', style],
      ['Blueprint style bible', blueprint?.styleBible],
    ]),
    permanentInstructions: joinSections([
      ['Make it work', optional.makeItWorkInstruction],
      ['Blueprint trope rules', blueprint?.tropeRules],
    ]),
    openingSituation: identity.startingLocation || blueprint?.startingLocation,
    declaredCanon: joinSections([
      ['Story tags', required.storyTags],
      ['World overview', blueprint?.worldOverview],
    ]),
    characters: joinSections([
      ['Main character', world.mainCharacter],
      ['Additional characters', world.additionalCharacters],
      ['Blueprint main character', blueprint?.mainCharacter],
      ['Blueprint character profile', blueprint?.mcProfile],
      ['Blueprint initial characters', blueprint?.initialCharacters],
    ]),
    cast: (world.mainCharacter?.name || blueprint?.mainCharacter?.name) ? [{
      name: world.mainCharacter?.name || blueprint!.mainCharacter!.name!,
      role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self',
    }] : undefined,
    worldFacts: joinSections([
      ['World identity', identity],
      ['Factions', world.factions],
      ['Abilities', world.abilities],
      ['Power system', world.powerSystem],
      ['Blueprint society', blueprint?.societyStructure],
      ['Blueprint power system', blueprint?.powerSystemOutline],
      ['Blueprint factions', blueprint?.majorFactions],
    ]),
    intendedDirection: joinSections([
      ['Additional story direction', optional.additionalStoryDirection],
      ['Plot and trope settings', optional.plotAndTropeSettings],
      ['Fate and survival settings', optional.fateSurvival],
      ['Blueprint logline', blueprint?.logline],
      ['Major mysteries (unresolved; not character knowledge)', blueprint?.majorMysteries],
      ['First arc promise', blueprint?.firstArcPromise],
      ['Estimated arcs (pacing guide, not a chapter deadline)', blueprint?.estimatedArcs],
      ['Unresolved plot threads', blueprint?.unresolvedPlotThreads],
      ['Destined ending', world.destinedEnding || blueprint?.destinedEnding],
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
