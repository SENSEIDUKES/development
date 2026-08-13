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
import {
  canonicalLivingStoryEntityKey,
  ensureStableLivingStoryEntityIds,
  livingStoryRecordFromDescriptiveLabel,
  reconcileLivingStoryRecords,
  splitDescriptiveLivingStoryEntityLabel,
  type LivingStoryIdentityWarning,
} from "./livingStoryEntityIdentity";
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

const uniqueStrings = (values: string[]): string[] => {
  const unique = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.trim();
    const key = canonicalLivingStoryEntityKey(trimmed);
    if (key && !unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()];
};

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
  entityKind: string,
  primary: Record<string, unknown>[],
  additionalNames: string[],
  source: string,
): { records: Record<string, unknown>[]; warnings: LivingStoryIdentityWarning[] } =>
  reconcileLivingStoryRecords({
    entityKind,
    current: primary,
    updates: uniqueStrings(additionalNames)
      .map(name => livingStoryRecordFromDescriptiveLabel(name, source)),
    chapterNumber: 0,
    createdBy: "story-seed-blueprint",
  });

const buildStartingLivingStoryState = (
  seed: StorySeedInput,
  blueprint: WorldBlueprint,
  sourceBlueprint: WorldBlueprint,
): { state: LivingStoryState; identityWarnings: LivingStoryIdentityWarning[] } => {
  const foundations = seed.world.optional.worldFoundations;
  const identity = seed.world.optional.worldIdentity;
  const mainCharacter = foundations.mainCharacter;
  const blueprintMainCharacter = sourceBlueprint.mainCharacter?.name
    ? splitDescriptiveLivingStoryEntityLabel(sourceBlueprint.mainCharacter.name)
    : undefined;
  const mainCharacterName = nonEmpty(mainCharacter?.name, blueprintMainCharacter?.name);
  const mainCharacterDescriptionMatches = Boolean(
    blueprintMainCharacter?.name
    && canonicalLivingStoryEntityKey(blueprintMainCharacter.name)
      === canonicalLivingStoryEntityKey(mainCharacterName),
  );
  const currentPowerStage = foundations.abilities?.startingPowerConcept?.trim() ?? "";
  const startingAbilityName = nonEmpty(
    foundations.abilities?.uniquePath,
    foundations.abilities?.startingPowerConcept,
  );
  const abilities = foundations.abilities && startingAbilityName
    ? ensureStableLivingStoryEntityIds("ability", [{
        name: startingAbilityName,
        description: foundations.abilities.startingPowerConcept,
        source: "StorySeedInput.world.optional.worldFoundations.abilities",
        authorContextNote: foundations.abilities.uniquePath,
      }])
    : [];

  const mainCharacterRecord = mainCharacterName
    ? [{
        name: mainCharacterName,
        ...(mainCharacterDescriptionMatches && blueprintMainCharacter?.originalLabel
          ? { aliases: [blueprintMainCharacter.originalLabel] }
          : {}),
        ...(mainCharacterDescriptionMatches && blueprintMainCharacter?.descriptiveInformation
          ? { blueprintDescription: blueprintMainCharacter.descriptiveInformation }
          : {}),
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
    "character",
    [
      ...mainCharacterRecord,
      ...(foundations.additionalCharacters ?? []).map(characterRecord),
    ],
    [...blueprint.initialCharacters, ...sourceBlueprint.initialCharacters],
    "WorldBlueprint.initialCharacters",
  );
  const factions = mergeNamedRecords(
    "faction",
    (foundations.factions ?? []).map(factionRecord),
    [...blueprint.majorFactions, ...sourceBlueprint.majorFactions],
    "WorldBlueprint.majorFactions",
  );
  const authoredLocation = identity.startingLocation?.trim();
  const blueprintLocations = uniqueStrings([
    blueprint.startingLocation,
    sourceBlueprint.startingLocation,
  ]);
  const locationUpdates = blueprintLocations.map(blueprintLocation => ({
        ...livingStoryRecordFromDescriptiveLabel(
          blueprintLocation,
          "World Blueprint startingLocation",
          { location: true },
        ),
        description: blueprint.worldOverview,
        societyStructure: nonEmpty(blueprint.societyStructure, identity.societyStructure),
        worldType: identity.worldType,
      }));
  const locations = reconcileLivingStoryRecords({
    entityKind: "location",
    current: authoredLocation
      ? [{
          name: authoredLocation,
          societyStructure: identity.societyStructure,
          worldType: identity.worldType,
          source: "StorySeedInput.world.optional.worldIdentity.startingLocation",
        }]
      : [],
    updates: locationUpdates,
    chapterNumber: 0,
    createdBy: "story-seed-blueprint",
  });

  return {
    state: {
      position: createArcChapterPosition(1),
      contextBlocks: [],
      recentFingerprints: [],
      characterState: {
        currentPowerStage,
        abilities,
      },
      threads: {
        unresolved: uniqueStrings([
          ...blueprint.majorMysteries,
          ...blueprint.unresolvedPlotThreads,
        ]).map(description => ({
          description,
          originChapter: 0,
        })),
        resolved: [],
      },
      codex: {
        characters: characters.records,
        factions: factions.records,
        locations: locations.records,
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
    },
    identityWarnings: [
      ...characters.warnings,
      ...factions.warnings,
      ...locations.warnings,
    ],
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
    seed.world.optional.worldFoundations.mainCharacter?.name,
    blueprint.mainCharacter?.name
      ? splitDescriptiveLivingStoryEntityLabel(blueprint.mainCharacter.name).name
      : undefined,
  );
  const startingLocation = nonEmpty(
    seed.world.optional.worldIdentity.startingLocation,
    blueprint.startingLocation
      ? splitDescriptiveLivingStoryEntityLabel(blueprint.startingLocation).name
      : undefined,
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

const buildMappingReport = (
  chapterMissionSource: string,
  identityWarnings: LivingStoryIdentityWarning[],
): StorySeedChapterMappingReport => ({
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
      source: "World foundations + Blueprint characters, factions, location, major mysteries, and unresolved threads",
      target: "Starting Living Story State",
      message: "Chapter 1 begins with no previous chapters, handoff, fingerprints, or carried anchors.",
    },
    {
      id: "code-owned-entity-identity",
      source: "Story Seed records + descriptive World Blueprint labels",
      target: "Living Story State Codex identity",
      message: "Code separates canonical names from descriptive Blueprint text, preserves aliases, and assigns stable IDs before generation state begins.",
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
    ...identityWarnings.map((warning, index) => ({
      id: `entity-identity-ambiguity-${index + 1}`,
      source: "Story Seed + World Blueprint entity labels",
      target: `Starting Living Story State ${warning.entityKind} identity`,
      message: warning.message,
    })),
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
  const { state: livingStoryState, identityWarnings } = buildStartingLivingStoryState(
    seed,
    blueprint,
    input.blueprint,
  );
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
    mapping: buildMappingReport(chapterMissionSource, identityWarnings),
  };
}
