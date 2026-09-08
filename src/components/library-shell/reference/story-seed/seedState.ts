/**
 * Form-state helpers for the creation workspace.
 *
 * The workspace edits the canonical `StorySeedInput` directly — there is no
 * separate flat view model any more. Each helper returns an updater so a
 * workspace can write into one branch of the hierarchy without restating it:
 *
 * ```ts
 * updateSeed(patchWorldIdentity({ worldType: value }));
 * ```
 */

import type {
  StorySeedAbilities,
  StorySeedCharacter,
  StorySeedFaction,
  StorySeedFateSurvivalSettings,
  StorySeedInput,
  StorySeedMainCharacter,
  StorySeedPlotAndTropeSettings,
  StorySeedPowerSystem,
  StorySeedStoryRequired,
  StorySeedWorldFoundations,
  StorySeedWorldIdentity,
} from '../../../story-seed/shared/storySeedSchema';

export type SeedUpdate = (seed: StorySeedInput) => StorySeedInput;
export type UpdateSeed = (update: SeedUpdate) => void;

export const patchStoryRequired = (patch: Partial<StorySeedStoryRequired>): SeedUpdate =>
  seed => ({
    ...seed,
    story: { ...seed.story, required: { ...seed.story.required, ...patch } },
  });

/** Story Tags accept a functional update so rapid successive toggles never drop a write. */
export const updateStoryTags = (next: (previous: string[]) => string[]): SeedUpdate =>
  seed => patchStoryRequired({ storyTags: next(seed.story.required.storyTags) })(seed);

export const patchPlotAndTropeSettings = (patch: Partial<StorySeedPlotAndTropeSettings>): SeedUpdate =>
  seed => ({
    ...seed,
    story: {
      ...seed.story,
      optional: {
        ...seed.story.optional,
        plotAndTropeSettings: { ...seed.story.optional.plotAndTropeSettings, ...patch },
      },
    },
  });

export const setAdditionalStoryDirection = (value: string): SeedUpdate =>
  seed => ({
    ...seed,
    story: { ...seed.story, optional: { ...seed.story.optional, additionalStoryDirection: value } },
  });

export const setMakeItWorkInstruction = (value: string): SeedUpdate =>
  seed => ({
    ...seed,
    story: { ...seed.story, optional: { ...seed.story.optional, makeItWorkInstruction: value } },
  });

export const setIntendedForMatureAudiences = (value: boolean): SeedUpdate =>
  seed => ({
    ...seed,
    story: {
      ...seed.story,
      optional: { ...seed.story.optional, intendedForMatureAudiences: value },
    },
  });

export const patchFateSurvival = (patch: Partial<StorySeedFateSurvivalSettings>): SeedUpdate =>
  seed => ({
    ...seed,
    story: {
      ...seed.story,
      optional: {
        ...seed.story.optional,
        fateSurvival: { ...seed.story.optional.fateSurvival, ...patch },
      },
    },
  });

export const patchWorldIdentity = (patch: Partial<StorySeedWorldIdentity>): SeedUpdate =>
  seed => ({
    ...seed,
    world: {
      ...seed.world,
      optional: {
        ...seed.world.optional,
        worldIdentity: { ...seed.world.optional.worldIdentity, ...patch },
      },
    },
  });

export const patchWorldFoundations = (patch: Partial<StorySeedWorldFoundations>): SeedUpdate =>
  seed => ({
    ...seed,
    world: {
      ...seed.world,
      optional: {
        ...seed.world.optional,
        worldFoundations: { ...seed.world.optional.worldFoundations, ...patch },
      },
    },
  });

export const patchMainCharacter = (patch: Partial<StorySeedMainCharacter>): SeedUpdate =>
  seed => patchWorldFoundations({
    mainCharacter: { ...seed.world.optional.worldFoundations.mainCharacter, ...patch },
  })(seed);

export const patchAbilities = (patch: Partial<StorySeedAbilities>): SeedUpdate =>
  seed => patchWorldFoundations({
    abilities: { ...seed.world.optional.worldFoundations.abilities, ...patch },
  })(seed);

export const patchPowerSystem = (patch: Partial<StorySeedPowerSystem>): SeedUpdate =>
  seed => patchWorldFoundations({
    powerSystem: { ...seed.world.optional.worldFoundations.powerSystem, ...patch },
  })(seed);

export const setAdditionalCharacters = (characters: StorySeedCharacter[]): SeedUpdate =>
  patchWorldFoundations({ additionalCharacters: characters });

export const setFactions = (factions: StorySeedFaction[]): SeedUpdate =>
  patchWorldFoundations({ factions });

// Convenience readers so workspaces never repeat the full path.
export const storyRequired = (seed: StorySeedInput): StorySeedStoryRequired => seed.story.required;
export const plotAndTropeSettings = (seed: StorySeedInput): StorySeedPlotAndTropeSettings =>
  seed.story.optional.plotAndTropeSettings;
export const worldIdentity = (seed: StorySeedInput): StorySeedWorldIdentity =>
  seed.world.optional.worldIdentity;
export const worldFoundations = (seed: StorySeedInput): StorySeedWorldFoundations =>
  seed.world.optional.worldFoundations;
