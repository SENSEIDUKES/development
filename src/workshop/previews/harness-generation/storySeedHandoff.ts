import type {
  HarnessStorySeedOption,
  HarnessStorySeedSource,
  StoryFoundationInput,
} from '@seihouse/sen/harness-generation';
import {
  getStoryStyleLabel,
  listWorkshopStorySeeds,
  LOCAL_WORKSHOP_STORY_SEED_OWNER_ID,
  type StorySeedRecord,
} from '@seihouse/sen/story-seed';

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

export const createWorkshopStorySeedSource = (): HarnessStorySeedSource => ({
  manageHref: '?preview=story-seed',
  async list(): Promise<HarnessStorySeedOption[]> {
    const records = await listWorkshopStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    return records.map(record => ({
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt,
      hasBlueprint: Boolean(record.blueprint),
      foundation: createHarnessFoundationFromStorySeed(record),
    }));
  },
});
