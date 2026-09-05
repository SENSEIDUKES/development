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

  return {
    title: identity.title || blueprint?.title || record.title,
    premise: required.premise,
    genre: required.genre,
    toneStyle: joinSections([
      ['Story tradition', style],
      ['Blueprint style bible', blueprint?.styleBible],
    ]),
    permanentInstructions: joinSections([
      ['Make it work', optional.makeItWorkInstruction],
      ['Blueprint trope rules', blueprint?.tropeRules],
    ]),
    openingSituation: blueprint?.startingLocation || identity.startingLocation,
    declaredCanon: joinSections([
      ['Story tags', required.storyTags],
      ['Blueprint logline', blueprint?.logline],
      ['World overview', blueprint?.worldOverview],
      ['Major mysteries', blueprint?.majorMysteries],
    ]),
    characters: joinSections([
      ['Main character', world.mainCharacter],
      ['Additional characters', world.additionalCharacters],
      ['Blueprint main character', blueprint?.mainCharacter ?? blueprint?.mcProfile],
      ['Blueprint initial characters', blueprint?.initialCharacters],
    ]),
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
      ['First arc promise', blueprint?.firstArcPromise],
      ['Unresolved plot threads', blueprint?.unresolvedPlotThreads],
      ['Destined ending', blueprint?.destinedEnding ?? world.destinedEnding],
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
