/**
 * Pass 3 data boundary between the disposable five-chapter generator and the
 * existing Reader Chamber. The adapter only derives cloned Reader state; it
 * never mutates, advances, retries, or persists the Pass 2 source batch.
 */

import type {
  BatchChapterRun,
  FiveChapterBatchState,
} from "../../chapter-generation/shared/batch/chapterBatch";
import type { ChapterTokenUsageSummary } from "../../chapter-generation/shared/pipeline/usage";
import { aggregateChapterTokenUsage } from "../../chapter-generation/shared/pipeline/usage";
import type {
  LivingStoryCharacterState,
  LivingStoryCodex,
  LivingStoryState,
  LivingStoryThreads,
} from "../../chapter-generation/shared/packets/livingStoryState";
import type {
  ContextManifest,
  Artifact,
  Character,
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

export interface ReaderCodexSnapshot {
  chapterNumber: number;
  memory: StoryMemory;
  livingStoryState: LivingStoryState;
}

export interface CompletedBatchReaderSession {
  story: StoryWorld;
  chapters: ReaderChapter[];
  arcTitle: string;
  codexSnapshots: ReaderCodexSnapshot[];
  batchUsage: ChapterTokenUsageSummary;
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

  const { finalOutput, chapterPacket, repairApplied } = run.result.run;
  const mission = chapterPacket.chapterMission;
  const blocks = finalOutput.blocks ? clone(finalOutput.blocks) as StoryBlock[] : undefined;
  const generatedContent = finalOutput.generatedContent;

  return {
    number: finalOutput.chapterNumber,
    title: mission.title || `Chapter ${run.chapterNumber}`,
    premise: mission.premise || finalOutput.summary || `Manifested Chapter ${run.chapterNumber}`,
    status: "unread",
    hasContent: Boolean(generatedContent.trim() || blocks?.length),
    generatedContent,
    ...(blocks ? { blocks } : {}),
    ...(finalOutput.summary ? { summary: finalOutput.summary } : {}),
    ...(finalOutput.statsChangeMessage ? { statsChangeMessage: finalOutput.statsChangeMessage } : {}),
    ...(finalOutput.cuePayload
      ? { cuePayload: clone(finalOutput.cuePayload) as StoryCuePayload }
      : {}),
    ...(finalOutput.translations ? { translations: clone(finalOutput.translations) } : {}),
    contextManifest: clone(chapterPacket.contextManifest) as ContextManifest,
    generationPosition: clone(chapterPacket.arcChapterPosition),
    generationUsage: usageForRun(run),
    repairApplied,
  };
}

/** Completed chapters only; partial batches never manufacture missing content. */
export function convertBatchToReaderChapters(batchState: FiveChapterBatchState): ReaderChapter[] {
  return batchState.chapters
    .filter(run => run.status === "completed" && Boolean(run.result))
    .map(convertSingleChapterRunToReader);
}

const namedRecords = <T extends { name: string }>(records: Record<string, unknown>[]): T[] => (
  records
    .filter(record => typeof record.name === "string" && record.name.trim().length > 0)
    .map(record => clone(record) as unknown as T)
);

const memoryFromLivingState = (state: LivingStoryState): StoryMemory => ({
  currentPowerStage: state.characterState.currentPowerStage,
  characters: namedRecords<Character>(state.codex.characters),
  factions: namedRecords<Faction>(state.codex.factions),
  locations: namedRecords<Location>(state.codex.locations),
  artifacts: namedRecords<Artifact>(state.codex.artifacts),
  unresolvedPlotThreads: clone(state.threads.unresolved),
  resolvedPlotThreads: clone(state.threads.resolved),
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
      memory: memoryFromLivingState(latestState),
      livingStoryState: clone(latestState),
    });
  }

  return snapshots;
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
