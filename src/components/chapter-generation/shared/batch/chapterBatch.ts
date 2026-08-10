import type {
  ChapterGenerationErrorResponse,
  ManifestChapterRequest,
  ManifestChapterResponse,
} from "../liveChapterGeneration";
import { buildChapterContract } from "../lib/chapterHandoff";
import type { ChapterMission } from "../packets/chapterMission";
import type { ChapterGenerationPacket } from "../packets/assembly";
import type { LivingStoryState } from "../packets/livingStoryState";
import type { ChapterPipelineRun } from "../pipeline/types";
import { hasSeriousFinding } from "../pipeline/runChapterPipeline";
import {
  aggregateChapterTokenUsage,
  type ChapterTokenUsageSummary,
  type ChapterUsageStage,
} from "../pipeline/usage";

export const FIVE_CHAPTER_BATCH_SIZE = 5;

export interface ChapterGenerationContinuation {
  version: 1;
  livingStoryState: LivingStoryState;
  chapterMission: ChapterMission;
}

export type BatchChapterStatus =
  | "queued"
  | "planning"
  | "manifesting"
  | "processing"
  | "repairing"
  | "completed"
  | "paused"
  | "failed";

export interface BatchChapterAttempt {
  usage: ChapterTokenUsageSummary;
  result?: ManifestChapterResponse;
  error?: string;
  seriousIssueRemaining: boolean;
}

export interface BatchChapterRun {
  chapterNumber: number;
  status: BatchChapterStatus;
  checkpoint?: ChapterGenerationContinuation;
  attempts: BatchChapterAttempt[];
  result?: ManifestChapterResponse;
  error?: string;
}

export interface FiveChapterBatchState {
  status: "queued" | "running" | "paused" | "completed";
  chapters: BatchChapterRun[];
  activeChapterNumber?: number;
  usage: ChapterTokenUsageSummary;
}

export interface ChapterBatchManifestFailure extends Error {
  usage?: ChapterTokenUsageSummary;
}

export type ManifestBatchChapter = (
  request: ManifestChapterRequest,
  onStage: (stage: ChapterUsageStage) => void,
) => Promise<ManifestChapterResponse>;

export interface RunFiveChapterBatchInput {
  state: FiveChapterBatchState;
  request: Omit<ManifestChapterRequest, "continuation">;
  manifestChapter: ManifestBatchChapter;
  onUpdate?: (state: FiveChapterBatchState) => void;
}

const emptyUsage = (): ChapterTokenUsageSummary => aggregateChapterTokenUsage([]);

const clone = <T,>(value: T): T => structuredClone(value);

const aggregateBatchUsage = (chapters: BatchChapterRun[]): ChapterTokenUsageSummary =>
  aggregateChapterTokenUsage(
    chapters.flatMap(chapter => chapter.attempts.flatMap(attempt => attempt.usage.calls)),
  );

const publish = (
  state: FiveChapterBatchState,
  onUpdate?: (state: FiveChapterBatchState) => void,
): FiveChapterBatchState => {
  const next = {
    ...state,
    chapters: state.chapters.map(chapter => ({
      ...chapter,
      ...(chapter.checkpoint ? { checkpoint: clone(chapter.checkpoint) } : {}),
      attempts: chapter.attempts.map(attempt => ({ ...attempt })),
    })),
    usage: aggregateBatchUsage(state.chapters),
  };
  onUpdate?.(next);
  return next;
};

const updateChapter = (
  state: FiveChapterBatchState,
  chapterNumber: number,
  update: (chapter: BatchChapterRun) => BatchChapterRun,
): FiveChapterBatchState => ({
  ...state,
  chapters: state.chapters.map(chapter =>
    chapter.chapterNumber === chapterNumber ? update(chapter) : chapter),
});

const statusForStage = (stage: ChapterUsageStage): BatchChapterStatus => {
  if (stage === "Plan Chapter") return "planning";
  if (stage === "Manifest Chapter") return "manifesting";
  if (stage === "Repair Chapter") return "repairing";
  return "processing";
};

export const createFiveChapterBatchState = (): FiveChapterBatchState => ({
  status: "queued",
  chapters: Array.from({ length: FIVE_CHAPTER_BATCH_SIZE }, (_, index) => ({
    chapterNumber: index + 1,
    status: "queued" as const,
    attempts: [],
  })),
  usage: emptyUsage(),
});

export const hasFinalSeriousIssue = (result: ManifestChapterResponse): boolean =>
  hasSeriousFinding([
    ...result.run.processingResult.continuityFindings,
    ...result.run.processingResult.repetitionFindings,
  ]);

const chapterAbsolutePosition = (state: LivingStoryState): number =>
  ((state.position.arcNumber - 1) * state.position.chaptersInArc)
  + state.position.chapterInArc;

export const assertChapterContinuation = (
  continuation: ChapterGenerationContinuation,
): void => {
  if (!continuation || typeof continuation !== "object") {
    throw new Error("Chapter continuation is missing from the completed result.");
  }
  if (continuation.version !== 1) {
    throw new Error("Chapter continuation version is unsupported.");
  }
  const { livingStoryState: state, chapterMission: mission } = continuation;
  if (!state || !mission || !Number.isInteger(mission.number) || mission.number < 2) {
    throw new Error("Chapter continuation is missing a valid next Chapter Mission.");
  }
  if (chapterAbsolutePosition(state) !== mission.number) {
    throw new Error("Chapter continuation position does not match its Chapter Mission.");
  }
  if (state.previousHandoff?.chapterNumber !== mission.number - 1) {
    throw new Error("Chapter continuation does not carry the immediately previous handoff.");
  }
  if (mission.contract?.chapterNumber !== mission.number) {
    throw new Error("Chapter continuation contract does not match its Chapter Mission.");
  }
  if (
    !Array.isArray(state.contextBlocks)
    || !Array.isArray(state.recentFingerprints)
    || !Array.isArray(state.characterState?.abilities)
    || !Array.isArray(state.threads?.unresolved)
    || !Array.isArray(state.threads?.resolved)
    || !Array.isArray(state.codex?.characters)
    || !Array.isArray(state.codex?.factions)
    || !Array.isArray(state.codex?.locations)
    || !Array.isArray(state.codex?.artifacts)
    || !Array.isArray(state.scene?.recentSceneTypes)
    || !Array.isArray(state.carriedChanges)
  ) {
    throw new Error("Chapter continuation Living Story State is incomplete.");
  }
};

export const buildNextChapterContinuation = (input: {
  run: ChapterPipelineRun;
  firstArcPromise: string;
  temporaryInstruction?: string;
}): ChapterGenerationContinuation => {
  const currentNumber = input.run.chapterPacket.chapterMission.number;
  const nextNumber = currentNumber + 1;
  const state = clone(input.run.processingResult.proposedLivingStoryState);
  const handoff = state.previousHandoff;
  if (!handoff || handoff.chapterNumber !== currentNumber) {
    throw new Error("Process Result did not provide the authoritative previous-chapter handoff.");
  }
  const activeTension = handoff.endState.openTension?.trim() ?? "";
  const unresolvedThreads = state.threads.unresolved.map(thread => thread.description.trim()).filter(Boolean);
  const firstArcPromise = input.firstArcPromise.trim();
  const premise = [
    `Continue from Chapter ${currentNumber}'s processed handoff.`,
    handoff.nextImmediateAction ? `Immediate next action: ${handoff.nextImmediateAction}` : "",
    activeTension ? `Active tension: ${activeTension}` : "",
    unresolvedThreads.length > 0 ? `Unresolved threads: ${unresolvedThreads.join(" | ")}` : "",
    firstArcPromise ? `First-arc promise: ${firstArcPromise}` : "",
  ].filter(Boolean).join("\n");
  const contract = buildChapterContract({
    chapterNumber: nextNumber,
    premise,
    previousHandoff: handoff,
    recentFingerprints: state.recentFingerprints,
  });
  if (!contract) throw new Error("The next Chapter Mission could not be built from processed state.");
  contract.completionCriteria = [
    "Continue forward from the processed handoff without replaying completed events.",
    ...(activeTension ? [`Meaningfully advance the active tension: ${activeTension}`] : []),
    ...(firstArcPromise
      ? [`Advance the first-arc promise without resolving the whole arc: ${firstArcPromise}`]
      : []),
  ];
  const continuation: ChapterGenerationContinuation = {
    version: 1,
    livingStoryState: state,
    chapterMission: {
      number: nextNumber,
      title: `Chapter ${nextNumber}`,
      premise,
      fallbackSummary: `Continue directly from Chapter ${currentNumber} using its processed handoff and carried Living Story State.`,
      contract,
      pacingDirective: input.temporaryInstruction?.trim() ?? "",
    },
  };
  assertChapterContinuation(continuation);
  return continuation;
};

/** Reuses canonical Seed-derived contracts while replacing only evolving batch state. */
export const applyChapterContinuation = (
  contracts: ChapterGenerationPacket,
  continuation: ChapterGenerationContinuation,
): ChapterGenerationPacket => {
  assertChapterContinuation(continuation);
  return {
    ...contracts,
    livingStoryState: clone(continuation.livingStoryState),
    chapterMission: {
      ...clone(continuation.chapterMission),
      // The current batch request remains authoritative for this temporary,
      // non-canonical instruction across every chapter-sized request.
      pacingDirective: contracts.chapterMission.pacingDirective,
    },
  };
};

export const runFiveChapterBatch = async ({
  state: initialState,
  request,
  manifestChapter,
  onUpdate,
}: RunFiveChapterBatchInput): Promise<FiveChapterBatchState> => {
  let state = publish({ ...initialState, status: "running" }, onUpdate);
  let continuation = state.chapters
    .find(chapter => chapter.status !== "completed")
    ?.checkpoint;

  for (const chapter of state.chapters) {
    if (chapter.status === "completed") {
      continuation = chapter.result?.nextContinuation;
      continue;
    }
    const chapterNumber = chapter.chapterNumber;
    const checkpoint = continuation ? clone(continuation) : undefined;
    state = publish(updateChapter({ ...state, activeChapterNumber: chapterNumber }, chapterNumber, current => ({
      ...current,
      status: "planning",
      checkpoint,
      error: undefined,
    })), onUpdate);

    try {
      const result = await manifestChapter({
        ...request,
        ...(checkpoint ? { continuation: checkpoint } : {}),
      }, stage => {
        state = publish(updateChapter(state, chapterNumber, current => ({
          ...current,
          status: statusForStage(stage),
        })), onUpdate);
      });
      if (result.run.chapterPacket.chapterMission.number !== chapterNumber) {
        throw errorResponseToBatchFailure({
          error: `Chapter ${chapterNumber} returned a mismatched chapter result.`,
          usage: result.usage,
        });
      }
      try {
        assertChapterContinuation(result.nextContinuation);
        if (result.nextContinuation.chapterMission.number !== chapterNumber + 1) {
          throw new Error("Next Chapter Mission did not advance exactly once.");
        }
      } catch (error) {
        throw errorResponseToBatchFailure({
          error: error instanceof Error ? error.message : "The next chapter continuation is invalid.",
          usage: result.usage,
        });
      }
      const seriousIssueRemaining = hasFinalSeriousIssue(result);
      const attempt: BatchChapterAttempt = {
        usage: result.usage,
        result,
        seriousIssueRemaining,
      };
      if (seriousIssueRemaining) {
        state = publish(updateChapter({ ...state, status: "paused", activeChapterNumber: chapterNumber }, chapterNumber, current => ({
          ...current,
          status: "paused",
          attempts: [...current.attempts, attempt],
          error: "Final processing still reports a serious continuity or repetition issue.",
        })), onUpdate);
        return state;
      }
      state = publish(updateChapter({ ...state, activeChapterNumber: undefined }, chapterNumber, current => ({
        ...current,
        status: "completed",
        attempts: [...current.attempts, attempt],
        result,
        error: undefined,
      })), onUpdate);
      continuation = clone(result.nextContinuation);
    } catch (error) {
      const failure = error as ChapterBatchManifestFailure;
      const usage = failure.usage ?? emptyUsage();
      const message = failure.message || "Chapter generation failed.";
      state = publish(updateChapter({ ...state, status: "paused", activeChapterNumber: chapterNumber }, chapterNumber, current => ({
        ...current,
        status: "failed",
        attempts: [...current.attempts, {
          usage,
          error: message,
          seriousIssueRemaining: false,
        }],
        error: message,
      })), onUpdate);
      return state;
    }
  }

  return publish({ ...state, status: "completed", activeChapterNumber: undefined }, onUpdate);
};

export const errorResponseToBatchFailure = (
  error: ChapterGenerationErrorResponse,
): ChapterBatchManifestFailure => {
  const failure = new Error(error.error) as ChapterBatchManifestFailure;
  failure.usage = error.usage;
  return failure;
};
