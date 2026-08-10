/**
 * Pass 3 Data Adapter — Batch to Reader Chamber & Codex
 *
 * Non-destructive bridge that maps Pass 2 chapter generation outputs
 * (`FiveChapterBatchState` and `ManifestChapterResponse`) into standard
 * `ReaderChapter` objects and living Codex memory updates for the Reader Chamber.
 */

import type {
  FiveChapterBatchState,
  BatchChapterRun,
} from "../../chapter-generation/shared/batch/chapterBatch";
import type {
  LivingStoryCodex,
  LivingStoryCharacterState,
  LivingStoryThreads,
  LivingStoryState,
} from "../../chapter-generation/shared/packets/livingStoryState";
import type {
  ReaderChapter,
  StoryBlock,
  ContextManifest,
} from "./types";

export interface BatchToReaderResult {
  chapters: ReaderChapter[];
  latestCodex?: LivingStoryCodex;
  latestCharacterState?: LivingStoryCharacterState;
  latestThreads?: LivingStoryThreads;
  latestLivingStoryState?: LivingStoryState;
}

/**
 * Converts a completed or in-progress five-chapter batch state into an array of
 * `ReaderChapter` objects ready for rendering in the Reader Chamber.
 */
export function convertBatchToReaderChapters(
  batchState: FiveChapterBatchState,
): ReaderChapter[] {
  return batchState.chapters
    .filter((run) => run.status === "completed" && run.result)
    .map((run) => convertSingleChapterRunToReader(run));
}

/**
 * Converts a single completed chapter run into a `ReaderChapter`.
 */
export function convertSingleChapterRunToReader(
  run: BatchChapterRun,
): ReaderChapter {
  if (!run.result) {
    throw new Error(`Chapter ${run.chapterNumber} run has no result.`);
  }

  const { result } = run;
  const { manifestedChapter, chapterPacket, processingResult } = result.run;

  const blocks = (manifestedChapter.blocks as unknown as StoryBlock[]) || [];
  const title = `Chapter ${run.chapterNumber}`;
  const summary = manifestedChapter.summary || `Manifested Chapter ${run.chapterNumber}`;

  // Extract stats change message if processing surfaced character or world updates
  const changeNotes = [
    ...processingResult.characterChanges,
    ...processingResult.worldStateChanges,
  ];
  const statsChangeMessage =
    changeNotes.length > 0 ? changeNotes.join(" • ") : undefined;

  return {
    number: run.chapterNumber,
    title,
    premise: summary,
    status: "read",
    hasContent: true,
    blocks: blocks.length > 0 ? blocks : undefined,
    generatedContent: manifestedChapter.generatedContent,
    summary,
    statsChangeMessage,
    contextManifest: chapterPacket.contextManifest as ContextManifest,
  };
}

/**
 * Extracts the latest living Codex state, character state, and threads from
 * the completed runs in a batch for updating reader memory.
 */
export function extractBatchStoryState(
  batchState: FiveChapterBatchState,
): BatchToReaderResult {
  const chapters = convertBatchToReaderChapters(batchState);

  // Find the last completed chapter run with a proposed living story state
  const completedRuns = batchState.chapters.filter(
    (run) => run.status === "completed" && run.result,
  );

  if (completedRuns.length === 0) {
    return { chapters };
  }

  const lastRun = completedRuns[completedRuns.length - 1];
  const proposedState = lastRun.result?.run.processingResult.proposedLivingStoryState;

  if (!proposedState) {
    return { chapters };
  }

  return {
    chapters,
    latestCodex: proposedState.codex,
    latestCharacterState: proposedState.characterState,
    latestThreads: proposedState.threads,
    latestLivingStoryState: proposedState,
  };
}
