import {
  applyInferredStoryTags,
  assertValidStorySeedInput,
  normalizeStorySeedInput,
  normalizeWorldBlueprint,
  type StorySeedCharacter,
  type StorySeedFaction,
  type StorySeedInput,
} from "../../../story-seed/shared/storySeedSchema";
import type { WorldBlueprint } from "../../../story-seed/shared/types";
import { buildChapterContract } from "../lib/chapterHandoff";
import type { SceneType } from "../lib/sceneRhythm";
import { FIRST_CHAPTER_FALLBACK_SUMMARY, type ChapterMission } from "./chapterMission";
import {
  CHAPTER_GENERATION_PACKAGE_FLAGS,
  CHAPTER_GENERATION_PACKAGE_TRACE,
  type ChapterGenerationPacket,
} from "./assembly";
import { buildGenerationRules } from "./generationRules";
import {
  createArcChapterPosition,
  type LivingStoryState,
} from "./livingStoryState";
import { storyConstitutionFromSeed } from "./storyConstitution";

const TEMPORARY_INSTRUCTION_LIMIT = 2_000;

const REQUIRED_BLUEPRINT_STRING_FIELDS = [
  "blueprintVersion",
  "title",
  "logline",
  "worldOverview",
  "startingLocation",
  "societyStructure",
  "powerSystemOutline",
  "mcProfile",
  "firstArcPromise",
  "tropeRules",
  "styleBible",
] as const;

const REQUIRED_BLUEPRINT_ARRAY_FIELDS = [
  "majorFactions",
  "initialCharacters",
  "majorMysteries",
  "unresolvedPlotThreads",
] as const;

export interface StorySeedChapterMappingNote {
  id: string;
  source: string;
  target: string;
  message: string;
}

export interface StorySeedChapterMappingReport {
  mapped: StorySeedChapterMappingNote[];
  unresolved: StorySeedChapterMappingNote[];
  chapterMissionSource: string;
}

export interface StorySeedChapterAdapterInput {
  seed: StorySeedInput;
  blueprint: unknown;
  temporaryInstruction?: string;
}

export interface StorySeedChapterAdapterResult {
  seed: StorySeedInput;
  blueprint: WorldBlueprint;
  contracts: ChapterGenerationPacket;
  mapping: StorySeedChapterMappingReport;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const nonEmpty = (...values: Array<string | undefined>): string =>
  values.map(value => value?.trim()).find(Boolean) ?? "";

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

function assertFinalizedBlueprint(value: unknown): asserts value is WorldBlueprint {
  if (!isRecord(value)) {
    throw new Error(
      "A finalized World Blueprint is required. No Workshop fixture data was substituted.",
    );
  }

  const missing = [
    ...REQUIRED_BLUEPRINT_STRING_FIELDS.filter(field =>
      typeof value[field] !== "string" || !value[field].trim()),
    ...REQUIRED_BLUEPRINT_ARRAY_FIELDS.filter(field =>
      !Array.isArray(value[field])
      || value[field].some(item => typeof item !== "string" || !item.trim())),
    ...(Number.isInteger(value.estimatedArcs) && Number(value.estimatedArcs) > 0
      ? []
      : ["estimatedArcs"]),
  ];
  if (missing.length > 0) {
    throw new Error(
      `The selected Story Seed does not contain a finalized World Blueprint. Missing Blueprint fields: ${missing.join(", ")}. No Workshop fixture data was substituted.`,
    );
  }
}

const normalizeTemporaryInstruction = (value?: string): string => {
  const instruction = value?.trim() ?? "";
  if (instruction.length > TEMPORARY_INSTRUCTION_LIMIT) {
    throw new Error(
      `The temporary testing instruction cannot exceed ${TEMPORARY_INSTRUCTION_LIMIT.toLocaleString()} characters.`,
    );
  }
  return instruction;
};

const characterRecord = (character: StorySeedCharacter): Record<string, unknown> => ({
  ...character,
  source: "StorySeedInput.world.optional.worldFoundations.additionalCharacters",
});

const factionRecord = (faction: StorySeedFaction): Record<string, unknown> => ({
  ...faction,
  source: "StorySeedInput.world.optional.worldFoundations.factions",
});

const mergeNamedRecords = (
  primary: Record<string, unknown>[],
  additionalNames: string[],
  source: string,
): Record<string, unknown>[] => {
  const seen = new Set(
    primary
      .map(record => typeof record.name === "string" ? record.name.trim().toLowerCase() : "")
      .filter(Boolean),
  );
  const merged = [...primary];
  for (const name of uniqueStrings(additionalNames)) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ name, source });
  }
  return merged;
};

const buildStartingLivingStoryState = (
  seed: StorySeedInput,
  blueprint: WorldBlueprint,
): LivingStoryState => {
  const foundations = seed.world.optional.worldFoundations;
  const identity = seed.world.optional.worldIdentity;
  const mainCharacter = foundations.mainCharacter;
  const mainCharacterName = nonEmpty(blueprint.mainCharacter?.name, mainCharacter?.name);
  const currentPowerStage = foundations.abilities?.startingPowerConcept?.trim() ?? "";
  const startingAbilityName = nonEmpty(
    foundations.abilities?.uniquePath,
    foundations.abilities?.startingPowerConcept,
  );
  const abilities = foundations.abilities && startingAbilityName
    ? [{
        name: startingAbilityName,
        description: foundations.abilities.startingPowerConcept,
        source: "StorySeedInput.world.optional.worldFoundations.abilities",
        authorContextNote: foundations.abilities.uniquePath,
      }]
    : [];

  const mainCharacterRecord = mainCharacterName
    ? [{
        name: mainCharacterName,
        role: "main_character",
        startingIdentity: mainCharacter?.startingIdentity,
        personality: blueprint.mainCharacter?.personality || mainCharacter?.personality,
        mainFlaw: mainCharacter?.mainFlaw,
        secretAdvantage: mainCharacter?.secretAdvantage,
        startingWeakness: mainCharacter?.startingWeakness,
        moralAlignment: mainCharacter?.moralAlignment,
        age: blueprint.mainCharacter?.age,
        appearance: blueprint.mainCharacter?.appearance,
        description: blueprint.mainCharacter?.backgroundProfile || mainCharacter?.bio,
        source: "Story Seed main character + World Blueprint mainCharacter",
      }]
    : [];
  const characters = mergeNamedRecords(
    [
      ...mainCharacterRecord,
      ...(foundations.additionalCharacters ?? []).map(characterRecord),
    ],
    blueprint.initialCharacters,
    "WorldBlueprint.initialCharacters",
  );
  const factions = mergeNamedRecords(
    (foundations.factions ?? []).map(factionRecord),
    blueprint.majorFactions,
    "WorldBlueprint.majorFactions",
  );
  const startingLocation = nonEmpty(blueprint.startingLocation, identity.startingLocation);
  const locations = startingLocation
    ? [{
        name: startingLocation,
        description: blueprint.worldOverview,
        societyStructure: nonEmpty(blueprint.societyStructure, identity.societyStructure),
        worldType: identity.worldType,
        source: "Story Seed world identity + World Blueprint",
      }]
    : [];

  return {
    position: createArcChapterPosition(1),
    contextBlocks: [],
    recentFingerprints: [],
    characterState: {
      currentPowerStage,
      abilities,
    },
    threads: {
      unresolved: uniqueStrings(blueprint.unresolvedPlotThreads).map(description => ({
        description,
        originChapter: 1,
      })),
      resolved: [],
    },
    codex: {
      characters,
      factions,
      locations,
      artifacts: [],
    },
    scene: {
      worldBuildingSeed: nonEmpty(
        blueprint.majorMysteries[0],
        blueprint.unresolvedPlotThreads[0],
        blueprint.worldOverview,
        blueprint.firstArcPromise,
      ),
      recentSceneTypes: [] as SceneType[],
    },
    carriedChanges: [],
  };
};

const buildChapterMissionFromSeed = (
  seed: StorySeedInput,
  blueprint: WorldBlueprint,
  temporaryInstruction: string,
): { mission: ChapterMission; source: string } => {
  const plot = seed.story.optional.plotAndTropeSettings;
  const missionCandidates = [
    ["WorldBlueprint.firstArcPromise", blueprint.firstArcPromise],
    ["StorySeedInput.story.optional.plotAndTropeSettings.firstMajorConflict", plot.firstMajorConflict],
    ["WorldBlueprint.logline", blueprint.logline],
    ["StorySeedInput.story.required.premise", seed.story.required.premise],
  ] as const;
  const selected = missionCandidates.find(([, value]) => value?.trim());
  const premise = selected?.[1]?.trim() ?? seed.story.required.premise;
  const source = selected?.[0] ?? "StorySeedInput.story.required.premise";
  const mainCharacterName = nonEmpty(
    blueprint.mainCharacter?.name,
    seed.world.optional.worldFoundations.mainCharacter?.name,
  );
  const startingLocation = nonEmpty(
    blueprint.startingLocation,
    seed.world.optional.worldIdentity.startingLocation,
  );
  const mcCondition = [
    seed.world.optional.worldFoundations.mainCharacter?.startingIdentity,
    seed.world.optional.worldFoundations.mainCharacter?.startingWeakness,
  ].map(value => value?.trim()).filter(Boolean).join(" | ");
  const openTension = nonEmpty(
    plot.firstMajorConflict,
    plot.mainAntagonistPressure,
    blueprint.firstArcPromise,
  );
  const contract = buildChapterContract({ chapterNumber: 1, premise });

  if (contract) {
    const startingState = {
      ...(startingLocation ? { location: startingLocation } : {}),
      ...(mainCharacterName ? { charactersPresent: [mainCharacterName] } : {}),
      ...(mcCondition ? { mcCondition } : {}),
      ...(openTension ? { openTension } : {}),
    };
    if (Object.keys(startingState).length > 0) contract.startingState = startingState;
    if (blueprint.firstArcPromise.trim()) {
      contract.completionCriteria = [
        `Advance the opening promise without resolving the whole arc: ${blueprint.firstArcPromise.trim()}`,
      ];
    }
  }

  return {
    mission: {
      number: 1,
      // Neither canonical artifact owns chapter titles yet. The story title is
      // an explicit display bridge and is reported below as unresolved.
      title: blueprint.title.trim() || seed.world.optional.worldIdentity.title || "Chapter 1",
      premise,
      fallbackSummary: FIRST_CHAPTER_FALLBACK_SUMMARY,
      contract,
      pacingDirective: temporaryInstruction,
    },
    source,
  };
};

const buildMappingReport = (chapterMissionSource: string): StorySeedChapterMappingReport => ({
  chapterMissionSource,
  mapped: [
    {
      id: "story-constitution",
      source: "StorySeedInput + WorldBlueprint",
      target: "Story Constitution",
      message: "The complete normalized Story Seed and reviewed Blueprint are retained in their exact canonical structures, alongside the existing constitution projections.",
    },
    {
      id: "starting-state",
      source: "World foundations + Blueprint characters, factions, location, and unresolved threads",
      target: "Starting Living Story State",
      message: "Chapter 1 begins with no previous chapters, handoff, fingerprints, or carried anchors.",
    },
    {
      id: "chapter-mission",
      source: chapterMissionSource,
      target: "Chapter Mission objective",
      message: "The first available canonical opening promise becomes the one-chapter mission.",
    },
    {
      id: "temporary-instruction",
      source: "Development test form only",
      target: "Chapter Mission pacingDirective",
      message: "The optional instruction exists for this run only and never mutates the Story Seed or Blueprint.",
    },
  ],
  unresolved: [
    {
      id: "blueprint-finalization-status",
      source: "WorldBlueprint.status",
      target: "Finalized artifact eligibility",
      message: "There is no canonical finalized-status enum; Pass 1 requires every current Blueprint field to be present and valid instead of guessing from the optional status label.",
    },
    {
      id: "chapter-title",
      source: "StorySeedInput / WorldBlueprint",
      target: "Chapter Mission title",
      message: "No canonical Chapter 1 title exists yet; the story title is used only as the readable chapter label.",
    },
    {
      id: "chapters-in-arc",
      source: "StorySeedInput / WorldBlueprint",
      target: "Living Story State position",
      message: "No chapters-per-arc field exists; the engine's existing 100-chapter arc default remains explicit.",
    },
    {
      id: "world-rules",
      source: "StorySeedInput / WorldBlueprint",
      target: "Story Constitution worldRules",
      message: "There is no canonical worldRules array, so none is inferred from prose fields.",
    },
    {
      id: "glossary",
      source: "StorySeedInput / WorldBlueprint",
      target: "Story Constitution glossaryEntries",
      message: "Glossary retrieval is not owned by either artifact, so the starting glossary is empty.",
    },
    {
      id: "story-style-cultural-prose",
      source: "StorySeedInput.story.required.style",
      target: "Cultural Prose style",
      message: "No approved mapping exists from the three Story Styles to a Cultural Prose leaf style.",
    },
    {
      id: "accessibility-style",
      source: "StorySeedInput / WorldBlueprint",
      target: "Accessibility prose style",
      message: "Neither canonical artifact owns this setting; the engine's existing default remains explicit.",
    },
    {
      id: "fate-pressure-tier",
      source: "StorySeedInput.story.optional.fateSurvival.pressure",
      target: "Legacy generation FatePressureTier",
      message: "The canonical Fate Survival values reach planning directly; no legacy pressure tier is invented.",
    },
  ],
});

/**
 * Clean Chapter Generation 1.0 adapter. It accepts only the finalized canonical
 * Story Seed plus its sibling Blueprint and has no fixture fallback path.
 */
export function adaptFinalizedStorySeedToChapterContracts(
  input: StorySeedChapterAdapterInput,
): StorySeedChapterAdapterResult {
  assertFinalizedBlueprint(input.blueprint);
  const seed = applyInferredStoryTags(normalizeStorySeedInput(input.seed));
  assertValidStorySeedInput(seed);
  const blueprint = normalizeWorldBlueprint(input.blueprint, seed);
  const temporaryInstruction = normalizeTemporaryInstruction(input.temporaryInstruction);
  const livingStoryState = buildStartingLivingStoryState(seed, blueprint);
  const { mission: chapterMission, source: chapterMissionSource } =
    buildChapterMissionFromSeed(seed, blueprint, temporaryInstruction);

  return {
    seed,
    blueprint,
    contracts: {
      storyConstitution: storyConstitutionFromSeed(seed, blueprint),
      livingStoryState,
      chapterMission,
      generationRules: buildGenerationRules(),
      trace: CHAPTER_GENERATION_PACKAGE_TRACE,
      flags: CHAPTER_GENERATION_PACKAGE_FLAGS,
    },
    mapping: buildMappingReport(chapterMissionSource),
  };
}
