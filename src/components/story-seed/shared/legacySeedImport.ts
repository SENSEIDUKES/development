/**
 * Narrow, import-only adapter for Story Seed JSON written before the
 * Creator / Story / World hierarchy existed.
 *
 * Deliberately isolated: nothing else imports it except
 * `storySeedSerialization.ts`'s file-parsing branch, it produces the canonical
 * `StorySeedInput` and nothing else, and it is never used for saving,
 * exporting, or generation. Removing this file would only cost the ability to
 * read old exports.
 *
 * Fields that no longer belong to the Story Seed — Fate Survival controls
 * (`hardcoreFateMode`, `fatePressure`), experience dials (`romanceLevel`,
 * `faceSlappingLevel`, `comedyLevel`, `tournamentArcPreference`,
 * `haremPreference`, `betrayalLevel`, `dangerLevel`, `generalAtmosphere`,
 * `powerPace`) are dropped on the way in rather than carried forward. Generated
 * Blueprint output (`logline`, `firstArcPromise`, `tropeRules`,
 * `unresolvedPlotThreads`, `estimatedArcs`, `majorMysteries`) never enters the
 * Story Seed; `storySeedSerialization.ts` preserves and normalizes it as the
 * separate Blueprint artifact instead.
 */

import {
  normalizeStorySeedInput,
  type StorySeedInput,
} from './storySeedSchema';
import { normalizeStoryStyle } from './storyStyle';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const record = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const first = (...values: unknown[]): string => values.map(text).find(Boolean) || '';

const pick = (source: Record<string, unknown>, fields: readonly string[]): Record<string, string> =>
  Object.fromEntries(fields.flatMap(field => (text(source[field]) ? [[field, text(source[field])]] : [])));

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Accepts the Phase-1 flat intake (`{ novelTitle, corePremise, … }`, with or
 * without an `intake`/`blueprint` wrapper) and the interim nested shape
 * (`story.premise`, `world.optional.title`, …), and returns the canonical seed.
 */
export const importLegacyStorySeed = (value: unknown): StorySeedInput => {
  const source = record(value);
  const intake = record(isRecord(source.intake) ? source.intake : source);
  const blueprint = record(source.blueprint);

  // Interim nested shape (schema version 2): story/world families without the
  // required/optional split.
  const story = record(source.story);
  const storyRequired = isRecord(story.required) ? record(story.required) : story;
  const storyOptional = record(story.optional);
  const world = record(source.world);
  const worldOptional = record(world.optional);
  const worldIdentity = isRecord(worldOptional.worldIdentity)
    ? record(worldOptional.worldIdentity)
    : worldOptional;
  const worldFoundations = isRecord(worldOptional.worldFoundations)
    ? record(worldOptional.worldFoundations)
    : worldOptional;

  const storyTags = [...list(storyRequired.storyTags), ...list(intake.storyTags)]
    .map(text)
    .filter(Boolean);

  const mainCharacter = {
    ...pick(record(worldFoundations.mainCharacter), [
      'name', 'startingIdentity', 'personality', 'mainFlaw',
      'secretAdvantage', 'startingWeakness', 'moralAlignment', 'bio',
    ]),
    ...pick(intake, [
      'startingIdentity', 'personality', 'mainFlaw',
      'secretAdvantage', 'startingWeakness', 'moralAlignment',
    ]),
    ...(text(intake.mcName) ? { name: text(intake.mcName) } : {}),
    ...(text(intake.mcBio) ? { bio: text(intake.mcBio) } : {}),
  };

  const abilities = {
    ...pick(record(worldFoundations.abilities), ['startingPowerConcept', 'uniquePath']),
    ...pick(intake, ['startingPowerConcept', 'uniquePath']),
  };

  const legacyPowerSystem = record(worldFoundations.powerSystem);
  const powerSystem = {
    ...pick(legacyPowerSystem, ['flavor', 'knownRanks']),
    ...(text(intake.powerFlavor) ? { flavor: text(intake.powerFlavor) } : {}),
    ...(text(intake.knownRanks) ? { knownRanks: text(intake.knownRanks) } : {}),
  };

  const additionalCharacters = [
    ...list(worldFoundations.additionalCharacters),
    ...list(intake.customCharacters),
  ];
  const factions = [...list(worldFoundations.factions), ...list(intake.customFactions)];

  return normalizeStorySeedInput({
    creator: {},
    story: {
      required: {
        storyTags,
        premise: first(storyRequired.premise, intake.corePremise),
        genre: first(storyRequired.genre, intake.genrePath),
        style: normalizeStoryStyle(storyRequired.style)
          || normalizeStoryStyle(intake.proseStyle)
          || normalizeStoryStyle(blueprint.styleBible)
          || '',
      },
      optional: {
        makeItWorkInstruction: first(
          storyOptional.makeItWorkInstruction,
          intake.makeItWorkInstruction,
        ),
      },
    },
    world: {
      required: {},
      optional: {
        worldIdentity: {
          title: first(worldIdentity.title, intake.novelTitle, blueprint.title),
          worldType: first(worldIdentity.worldType, intake.worldType),
          societyStructure: first(worldIdentity.societyStructure, intake.societyStructure),
          startingLocation: first(worldIdentity.startingLocation, intake.startingLocation),
        },
        worldFoundations: {
          mainCharacter,
          additionalCharacters,
          factions,
          abilities,
          powerSystem,
          destinedEnding: first(worldFoundations.destinedEnding, intake.destinedEnding),
        },
      },
    },
  });
};

/** Whether a parsed JSON object looks like a pre-hierarchy Story Seed. */
export const isLegacyStorySeedShape = (value: Record<string, unknown>): boolean =>
  isRecord(value.intake)
  || isRecord(value.blueprint)
  || (isRecord(value.story) && !isRecord((value.story as Record<string, unknown>).required))
  || ['novelTitle', 'corePremise', 'genrePath', 'worldType', 'startingPowerConcept', 'startingIdentity']
    .some(field => text(value[field]));
