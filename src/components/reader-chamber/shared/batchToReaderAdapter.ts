/**
 * Pass 3 data boundary between the disposable five-chapter generator and the
 * existing Reader Chamber. The adapter only derives cloned Reader state; it
 * never mutates, advances, retries, or persists the Pass 2 source batch.
 */

import type {
  BatchChapterRun,
  FiveChapterBatchState,
} from "../../chapter-generation/shared/batch/chapterBatch";
import type { ManifestChapterResponse } from "../../chapter-generation/shared/liveChapterGeneration";
import type { ChapterTokenUsageSummary } from "../../chapter-generation/shared/pipeline/usage";
import { aggregateChapterTokenUsage } from "../../chapter-generation/shared/pipeline/usage";
import type {
  LivingStoryCharacterState,
  LivingStoryCodex,
  LivingStoryState,
  LivingStoryThreads,
} from "../../chapter-generation/shared/packets/livingStoryState";
import type { StoryConstitution } from "../../chapter-generation/shared/packets/storyConstitution";
import {
  canonicalLivingStoryEntityKey,
  mergeLivingStoryRecords,
} from "../../chapter-generation/shared/packets/livingStoryEntityIdentity";
import type {
  Ability,
  ContextManifest,
  Artifact,
  Character,
  CreatureSpecies,
  Faction,
  Location,
  ReaderChapter,
  ReaderChapterGenerationUsage,
  ReaderTokenUsageTotals,
  StoryBlock,
  StoryCuePayload,
  StoryMemory,
  StoryWorld,
} from "./types";

const clone = <T,>(value: T): T => structuredClone(value);

type LivingRecord = Record<string, unknown>;

const textField = (record: LivingRecord, ...fields: string[]): string => {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const stringList = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
  : [];

const aliasesFromRecord = (record: LivingRecord): string[] => {
  const aliases = new Map<string, string>();
  for (const value of [
    ...stringList(record.aliases),
    ...stringList(record.alternateNames),
  ]) {
    const trimmed = value.trim();
    const key = canonicalLivingStoryEntityKey(trimmed);
    if (key && !aliases.has(key)) aliases.set(key, trimmed);
  }
  return [...aliases.values()];
};

const stableReaderId = (kind: string, record: LivingRecord, name: string): string => {
  const existing = textField(record, "id", "persistenceId");
  if (existing) return existing;
  const slug = name.normalize("NFKC").toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `dev-${kind}-${slug || "unnamed"}`;
};

const normalizeAbility = (value: unknown): string | Ability | undefined => {
  if (typeof value === "string") return value.trim() || undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as LivingRecord;
  const name = textField(record, "name", "title", "label");
  if (!name) return undefined;
  return {
    ...clone(record),
    id: stableReaderId("ability", record, name),
    name,
    description: textField(record, "description", "details", "effect"),
  } as Ability;
};

const normalizeAbilities = (values: unknown[]): Array<string | Ability> => values
  .map(normalizeAbility)
  .filter((value): value is string | Ability => value !== undefined);

const characterFromRecord = (record: LivingRecord): Character | undefined => {
  const name = textField(record, "name", "title", "label");
  if (!name) return undefined;
  const { isBeast: legacyIsBeast, beastProfile: legacyCreatureProfile, ...rawCharacter } = clone(record);
  const rawPortraitKind = textField(record, "portraitKind");
  const speciesId = textField(record, "speciesId");
  const rawRole = textField(record, "role");
  const legacyRoleIsBeast = rawRole.toLowerCase() === "beast";
  const portraitKind = rawPortraitKind === "non-human" || legacyIsBeast === true || legacyRoleIsBeast || Boolean(speciesId)
    ? "non-human"
    : "human";
  const rawStatus = textField(record, "status").toLocaleLowerCase();
  const status = rawStatus === "alive" || rawStatus === "deceased"
    || rawStatus === "unknown" || rawStatus === "ascended"
    ? rawStatus
    : rawStatus === "dead" ? "deceased" : "unknown";
  const descriptionParts = [
    textField(record, "description", "bio", "backgroundProfile", "startingIdentity"),
    textField(record, "age") ? `Age: ${textField(record, "age")}` : "",
    textField(record, "personality") ? `Personality: ${textField(record, "personality")}` : "",
    textField(record, "appearance") ? `Appearance: ${textField(record, "appearance")}` : "",
    textField(record, "skinTone") ? `Skin tone: ${textField(record, "skinTone")}` : "",
    textField(record, "eyeColor") ? `Eye color: ${textField(record, "eyeColor")}` : "",
    textField(record, "powerType") ? `Power: ${textField(record, "powerType")}` : "",
    textField(record, "mainFlaw") ? `Flaw: ${textField(record, "mainFlaw")}` : "",
    textField(record, "secretAdvantage") ? `Secret advantage: ${textField(record, "secretAdvantage")}` : "",
    textField(record, "startingWeakness") ? `Starting weakness: ${textField(record, "startingWeakness")}` : "",
    textField(record, "moralAlignment") ? `Moral alignment: ${textField(record, "moralAlignment")}` : "",
  ].filter((value, index, values) => value && values.indexOf(value) === index);
  const rawAbilities = Array.isArray(record.abilities) ? record.abilities : [];
  const aliases = aliasesFromRecord(record);
  return {
    ...rawCharacter,
    id: stableReaderId("character", record, name),
    name,
    role: legacyRoleIsBeast ? "Companion" : rawRole || "Unknown",
    status,
    relationshipToMC: textField(record, "relationshipToMC", "connectionToMC"),
    description: descriptionParts.join(" · "),
    ...(textField(record, "powerLevel", "rankLevel")
      ? { powerLevel: textField(record, "powerLevel", "rankLevel") }
      : {}),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(rawAbilities.length > 0 ? { abilities: normalizeAbilities(rawAbilities) } : {}),
    portraitKind,
    ...(speciesId ? { speciesId } : {}),
    ...(rawCharacter.creatureProfile && typeof rawCharacter.creatureProfile === "object"
      ? { creatureProfile: rawCharacter.creatureProfile }
      : legacyCreatureProfile && typeof legacyCreatureProfile === "object"
        ? { creatureProfile: legacyCreatureProfile }
      : {}),
  } as Character;
};

const positiveChapter = (value: unknown): number | undefined => (
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined
);

const chapterNumbers = (value: unknown): number[] => Array.isArray(value)
  ? [...new Set(value.filter((chapter): chapter is number => positiveChapter(chapter) !== undefined))]
    .sort((left, right) => left - right)
  : [];

const creatureSpeciesFromRecord = (record: LivingRecord): CreatureSpecies | undefined => {
  const name = textField(record, "name", "title", "label");
  if (!name) return undefined;
  const appearanceChapters = chapterNumbers(record.appearanceChapters);
  const firstEncounteredChapter = positiveChapter(record.firstEncounteredChapter)
    ?? positiveChapter(record.firstAppeared)
    ?? appearanceChapters[0]
    ?? 1;
  return {
    ...clone(record),
    id: stableReaderId("creature", record, name),
    name,
    description: textField(record, "description", "details", "summary"),
    classification: textField(record, "classification", "kind", "type") || "Unknown",
    traits: stringList(record.traits ?? record.knownTraits ?? record.abilities),
    threatLevel: textField(record, "threatLevel", "threatTier") || "Unknown",
    ...(textField(record, "signatureSound") ? { signatureSound: textField(record, "signatureSound") } : {}),
    firstEncounteredChapter,
    appearanceChapters: [...new Set([...appearanceChapters, firstEncounteredChapter])]
      .sort((left, right) => left - right),
    notableIndividualIds: stringList(record.notableIndividualIds),
  } as CreatureSpecies;
};

const factionFromRecord = (record: LivingRecord): Faction | undefined => {
  const name = textField(record, "name", "title", "label");
  if (!name) return undefined;
  const description = [
    textField(record, "description", "role"),
    textField(record, "powerLevel") ? `Power: ${textField(record, "powerLevel")}` : "",
    textField(record, "connectionToMC", "relationshipToMC")
      ? `Connection to MC: ${textField(record, "connectionToMC", "relationshipToMC")}`
      : "",
  ].filter(Boolean).join(" · ");
  const aliases = aliasesFromRecord(record);
  return {
    ...clone(record),
    id: stableReaderId("faction", record, name),
    name,
    alignment: textField(record, "alignment"),
    description,
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(textField(record, "status") ? { status: textField(record, "status") } : {}),
  } as Faction;
};

const locationFromRecord = (record: LivingRecord): Location | undefined => {
  const name = textField(record, "name", "title", "label");
  if (!name) return undefined;
  const description = [
    textField(record, "description", "worldOverview"),
    textField(record, "societyStructure")
      ? `Society: ${textField(record, "societyStructure")}`
      : "",
  ].filter(Boolean).join(" · ");
  const aliases = aliasesFromRecord(record);
  return {
    ...clone(record),
    id: stableReaderId("location", record, name),
    name,
    description,
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(textField(record, "realm", "worldType")
      ? { realm: textField(record, "realm", "worldType") }
      : {}),
  } as Location;
};

const artifactFromRecord = (record: LivingRecord): Artifact | undefined => {
  const name = textField(record, "name", "title", "label");
  if (!name) return undefined;
  const aliases = aliasesFromRecord(record);
  return {
    ...clone(record),
    id: stableReaderId("artifact", record, name),
    name,
    description: textField(record, "description", "details", "effect"),
    ...(aliases.length > 0 ? { aliases } : {}),
  } as Artifact;
};

export interface ReaderCodexSnapshot {
  chapterNumber: number;
  memory: StoryMemory;
  livingStoryState: LivingStoryState;
}

export interface CompletedReaderSession {
  story: StoryWorld;
  chapters: ReaderChapter[];
  arcTitle: string;
  codexSnapshots: ReaderCodexSnapshot[];
}

export interface CompletedBatchReaderSession extends CompletedReaderSession {
  batchUsage: ChapterTokenUsageSummary;
}

export interface CompletedSingleChapterReaderSession extends CompletedReaderSession {
  chapterUsage: ChapterTokenUsageSummary;
}

export type BatchReaderSessionResolution =
  | { ok: true; session: CompletedBatchReaderSession }
  | { ok: false; reason: string; completedChapterCount: number };

export interface BatchToReaderResult {
  chapters: ReaderChapter[];
  codexSnapshots: ReaderCodexSnapshot[];
  latestCodex?: LivingStoryCodex;
  latestCharacterState?: LivingStoryCharacterState;
  latestThreads?: LivingStoryThreads;
  latestLivingStoryState?: LivingStoryState;
}

const usageTotals = (usage: ChapterTokenUsageSummary): ReaderTokenUsageTotals => ({
  ...usage.totals,
});

const usageForRun = (run: BatchChapterRun): ReaderChapterGenerationUsage => {
  const allCalls = run.attempts.flatMap(attempt => attempt.usage.calls);
  const repairCalls = allCalls.filter(call => (
    call.stage === "Repair Chapter" || call.stage === "Process Result (repaired chapter)"
  ));
  const retryAttempts = run.status === "completed"
    ? run.attempts.slice(0, -1)
    : run.attempts;
  const retryCalls = retryAttempts.flatMap(attempt => attempt.usage.calls);
  const totals = usageTotals(aggregateChapterTokenUsage(allCalls));
  return {
    totals,
    attemptCount: run.attempts.length,
    ...(repairCalls.length > 0
      ? {
          repair: {
            callCount: repairCalls.length,
            totals: usageTotals(aggregateChapterTokenUsage(repairCalls)),
          },
        }
      : {}),
    ...(retryAttempts.length > 0
      ? {
          retry: {
            attemptCount: retryAttempts.length,
            callCount: retryCalls.length,
            totals: usageTotals(aggregateChapterTokenUsage(retryCalls)),
          },
        }
      : {}),
  };
};

/** Converts a completed run using the accepted final output (including repair). */
export function convertSingleChapterRunToReader(run: BatchChapterRun): ReaderChapter {
  if (run.status !== "completed" || !run.result) {
    throw new Error(`Chapter ${run.chapterNumber} is not a completed Reader source.`);
  }

  const { finalOutput, chapterPacket, processingResult, repairApplied } = run.result.run;
  const mission = chapterPacket.chapterMission;
  const blocks = finalOutput.blocks ? clone(finalOutput.blocks) as StoryBlock[] : undefined;
  const generatedContent = finalOutput.generatedContent;
  const processedSummary = finalOutput.summary
    || processingResult.nextChapterHandoff.completedEvents.join(" ")
    || processingResult.missionCompletion.evidence;
  const processedPowerState = processingResult.characterStateUpdates.currentPowerStage;

  return {
    number: finalOutput.chapterNumber,
    title: mission.title || `Chapter ${run.chapterNumber}`,
    premise: mission.premise || finalOutput.summary || `Manifested Chapter ${run.chapterNumber}`,
    status: "unread",
    hasContent: Boolean(generatedContent.trim() || blocks?.length),
    generatedContent,
    ...(blocks ? { blocks } : {}),
    ...(processedSummary ? { summary: processedSummary } : {}),
    ...(finalOutput.statsChangeMessage
      ? { statsChangeMessage: finalOutput.statsChangeMessage }
      : processedPowerState ? { statsChangeMessage: `Power state: ${processedPowerState}` } : {}),
    ...(finalOutput.cuePayload
      ? { cuePayload: clone(finalOutput.cuePayload) as StoryCuePayload }
      : {}),
    ...(finalOutput.translations ? { translations: clone(finalOutput.translations) } : {}),
    contextManifest: clone(chapterPacket.contextManifest) as ContextManifest,
    generationPosition: clone(chapterPacket.arcChapterPosition),
    generationUsage: usageForRun(run),
    repairApplied,
    ...(processingResult.proposedLivingStoryState.characterState.currentPowerStage.trim()
      ? {
          codexPowerStage:
            processingResult.proposedLivingStoryState.characterState.currentPowerStage,
        }
      : {}),
  };
}

/** Completed chapters only; partial batches never manufacture missing content. */
export function convertBatchToReaderChapters(batchState: FiveChapterBatchState): ReaderChapter[] {
  return batchState.chapters
    .filter(run => run.status === "completed" && Boolean(run.result))
    .map(convertSingleChapterRunToReader);
}

const mapRecords = <T,>(
  records: LivingRecord[],
  mapper: (record: LivingRecord) => T | undefined,
): T[] => mergeLivingStoryRecords(records, [])
  .map(mapper)
  .filter((value): value is T => value !== undefined);

const memoryFromLivingState = (
  state: LivingStoryState,
  constitution: StoryConstitution,
): StoryMemory => ({
  currentPowerStage: state.characterState.currentPowerStage,
  ...(constitution.powerSystem.trim() ? { powerSystem: constitution.powerSystem } : {}),
  characters: mapRecords(state.codex.characters, characterFromRecord),
  bestiary: mapRecords(state.codex.bestiary ?? [], creatureSpeciesFromRecord),
  factions: mapRecords(state.codex.factions, factionFromRecord),
  locations: mapRecords(state.codex.locations, locationFromRecord),
  artifacts: mapRecords(state.codex.artifacts, artifactFromRecord),
  unresolvedPlotThreads: clone(state.threads.unresolved),
  resolvedPlotThreads: clone(state.threads.resolved),
  worldRules: clone(constitution.worldRules),
  abilities: normalizeAbilities(state.characterState.abilities),
});

/**
 * Creates one cumulative, chapter-addressable Codex snapshot after every
 * processed chapter. Each snapshot comes only from that chapter or an earlier
 * one, so later discoveries cannot leak backward.
 */
export function createReaderCodexSnapshots(
  batchState: FiveChapterBatchState,
): ReaderCodexSnapshot[] {
  const snapshots: ReaderCodexSnapshot[] = [];
  let latestState: LivingStoryState | undefined;

  for (const chapter of batchState.chapters) {
    if (chapter.status !== "completed" || !chapter.result) continue;
    const proposed = chapter.result.run.processingResult.proposedLivingStoryState;
    if (proposed) latestState = proposed;
    if (!latestState) continue;
    snapshots.push({
      chapterNumber: chapter.chapterNumber,
      memory: memoryFromLivingState(
        latestState,
        chapter.result.run.chapterPacket.storyConstitution,
      ),
      livingStoryState: clone(latestState),
    });
  }

  return snapshots;
}

/** Story view supplied to the Codex; future Reader chapters stay out of its timeline. */
export function createChapterScopedCodexStory(
  story: StoryWorld,
  memory: StoryMemory,
  chapterNumber: number,
): StoryWorld {
  return {
    ...clone(story),
    memory: clone(memory),
    arcs: story.arcs
      .map(arc => ({
        ...clone(arc),
        chapters: arc.chapters
          .filter(chapter => chapter.number <= chapterNumber)
          .map(chapter => clone(chapter)),
      }))
      .filter(arc => arc.chapters.length > 0),
    currentChapterNumber: chapterNumber,
  };
}

export function extractBatchStoryState(
  batchState: FiveChapterBatchState,
): BatchToReaderResult {
  const chapters = convertBatchToReaderChapters(batchState);
  const codexSnapshots = createReaderCodexSnapshots(batchState);
  const latest = codexSnapshots.at(-1)?.livingStoryState;
  return {
    chapters,
    codexSnapshots,
    ...(latest
      ? {
          latestCodex: clone(latest.codex),
          latestCharacterState: clone(latest.characterState),
          latestThreads: clone(latest.threads),
          latestLivingStoryState: clone(latest),
        }
      : {}),
  };
}

const generatedStoryTitle = (run: BatchChapterRun): string => {
  const constitution = run.result!.run.chapterPacket.storyConstitution;
  const blueprintTitle = constitution.worldBlueprint?.title?.trim();
  const identityTitle = constitution.storySeed?.world.optional.worldIdentity.title?.trim();
  return blueprintTitle || identityTitle || "Generated Five-Chapter Story";
};

/**
 * Adapts one accepted live response into the same Reader/Codex story boundary
 * without manufacturing a five-chapter batch or weakening its completion guard.
 */
export function createCompletedSingleChapterReaderSession(
  response: ManifestChapterResponse,
): CompletedSingleChapterReaderSession {
  const chapterNumber = response.run.finalOutput.chapterNumber;
  const run: BatchChapterRun = {
    chapterNumber,
    status: "completed",
    attempts: [{
      usage: response.usage,
      result: response,
      seriousIssueRemaining: false,
    }],
    result: response,
  };
  const chapter = convertSingleChapterRunToReader(run);
  const constitution = response.run.chapterPacket.storyConstitution;
  const position = response.run.chapterPacket.arcChapterPosition;
  const livingStoryState = response.run.processingResult.proposedLivingStoryState;
  const memory = memoryFromLivingState(livingStoryState, constitution);
  const snapshot: ReaderCodexSnapshot = {
    chapterNumber: chapter.number,
    memory,
    livingStoryState: clone(livingStoryState),
  };
  const blueprintTitle = constitution.worldBlueprint?.title?.trim();
  const identityTitle = constitution.storySeed?.world.optional.worldIdentity.title?.trim();
  const generatedAt = response.run.chapterPacket.contextManifest.generatedAt;
  const story: StoryWorld = {
    id: response.run.finalOutput.storyId || "disposable-one-chapter-run",
    title: blueprintTitle || identityTitle || "Generated Story",
    genre: constitution.genre,
    mcName: constitution.mainCharacterName,
    customPremise: constitution.corePremise,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    memory: clone(memory),
    arcs: [{
      title: `Arc ${position.arcNumber} — Generated Chapter`,
      chapters: [chapter],
      isCompleted: false,
    }],
    currentChapterNumber: chapter.number,
    readerPreferences: {
      fontSize: "lg",
      fontFamily: "serif",
      lineHeight: "relaxed",
      paragraphSpacing: "normal",
      themeOverride: "void",
    },
    bookmarks: [],
    assignedRevealBackdrops: {},
  };

  return {
    story,
    chapters: [chapter],
    arcTitle: story.arcs[0].title,
    codexSnapshots: [snapshot],
    chapterUsage: clone(response.usage),
  };
}

/** Truthful all-or-nothing entry point for opening the generated Reader session. */
export function createCompletedBatchReaderSession(
  batchState: FiveChapterBatchState,
): BatchReaderSessionResolution {
  const completedRuns = batchState.chapters.filter(
    run => run.status === "completed" && Boolean(run.result),
  );
  if (batchState.status !== "completed") {
    return {
      ok: false,
      reason: `The five-chapter batch is ${batchState.status}; only a completed batch can open the Reader Chamber.`,
      completedChapterCount: completedRuns.length,
    };
  }
  if (batchState.chapters.length !== 5 || completedRuns.length !== 5) {
    return {
      ok: false,
      reason: `The batch claims completion but contains ${completedRuns.length} readable chapters instead of five.`,
      completedChapterCount: completedRuns.length,
    };
  }

  const { chapters, codexSnapshots } = extractBatchStoryState(batchState);
  if (codexSnapshots.length !== 5) {
    return {
      ok: false,
      reason: `The completed batch contains ${codexSnapshots.length} processed Codex snapshots instead of five.`,
      completedChapterCount: chapters.length,
    };
  }
  const firstRun = completedRuns[0];
  const constitution = firstRun.result!.run.chapterPacket.storyConstitution;
  const firstPosition = firstRun.result!.run.chapterPacket.arcChapterPosition;
  const generatedAt = firstRun.result!.run.chapterPacket.contextManifest.generatedAt;
  const storyId = firstRun.result!.run.finalOutput.storyId || "disposable-five-chapter-batch";
  const story: StoryWorld = {
    id: storyId,
    title: generatedStoryTitle(firstRun),
    genre: constitution.genre,
    mcName: constitution.mainCharacterName,
    customPremise: constitution.corePremise,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    memory: clone(codexSnapshots[0].memory),
    arcs: [{
      title: `Arc ${firstPosition.arcNumber} — Generated Batch`,
      chapters,
      isCompleted: false,
    }],
    currentChapterNumber: chapters[0].number,
    readerPreferences: {
      fontSize: "lg",
      fontFamily: "serif",
      lineHeight: "relaxed",
      paragraphSpacing: "normal",
      themeOverride: "void",
    },
    bookmarks: [],
    assignedRevealBackdrops: {},
  };

  return {
    ok: true,
    session: {
      story,
      chapters,
      arcTitle: story.arcs[0].title,
      codexSnapshots,
      batchUsage: clone(batchState.usage),
    },
  };
}

const proseForExport = (chapter: ReaderChapter): string => {
  if (chapter.generatedContent?.trim()) return chapter.generatedContent.trim();
  return (chapter.blocks ?? [])
    .map(block => block.text?.trim() || block.system?.title || block.worldCard?.displayTitle || "")
    .filter(Boolean)
    .join("\n\n");
};

/** Plain-text, provider-neutral export for the complete disposable session. */
export function buildFiveChapterReaderExport(session: CompletedBatchReaderSession): string {
  if (session.chapters.length !== 5) {
    throw new Error("A five-chapter Reader export requires exactly five chapters.");
  }
  const chapters = session.chapters.map(chapter => {
    const usage = chapter.generationUsage?.totals;
    return [
      `Chapter ${chapter.number}: ${chapter.title}`,
      `Input tokens: ${usage?.inputTokens ?? 0}`,
      `Output tokens: ${usage?.outputTokens ?? 0}`,
      `Total tokens: ${usage?.totalTokens ?? 0}`,
      "",
      proseForExport(chapter),
    ].join("\n");
  });
  return [
    session.story.title,
    "Five-Chapter Reader Chamber Export",
    `Batch input tokens: ${session.batchUsage.totals.inputTokens}`,
    `Batch output tokens: ${session.batchUsage.totals.outputTokens}`,
    `Batch total tokens: ${session.batchUsage.totals.totalTokens}`,
    "",
    chapters.join("\n\n========================================\n\n"),
    "",
  ].join("\n");
}
