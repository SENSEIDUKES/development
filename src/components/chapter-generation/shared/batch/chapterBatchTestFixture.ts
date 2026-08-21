import { assembleChapterGenerationDev } from "../assembleGenerationDev";
import type { ManifestChapterResponse } from "../liveChapterGeneration";
import {
  aggregateChapterTokenUsage,
  type ChapterModelCallUsage,
  type ChapterUsageStage,
} from "../pipeline/usage";
import type { FiveChapterBatchState } from "./chapterBatch";

const stages: ChapterUsageStage[] = [
  "Plan Chapter",
  "Manifest Chapter",
  "Process Result",
  "Repair Chapter",
  "Process Result (repaired chapter)",
];

const callsFor = (chapterNumber: number, count: number): ChapterModelCallUsage[] => (
  Array.from({ length: count }, (_, index) => ({
    kind: index === 3 ? "repair" as const : index === 0 ? "plan" as const : index === 1 ? "manifest" as const : "process" as const,
    stage: stages[index],
    provider: "gemini",
    model: "gemini-2.5-flash",
    inputTokens: chapterNumber * 100 + index,
    outputTokens: chapterNumber * 50 + index,
    totalTokens: chapterNumber * 150 + (index * 2),
    generationTimeMs: 100 + index,
    tokenSource: "provider" as const,
  }))
);

/** Rich, deterministic Pass 2-shaped batch used only by focused integration tests. */
export function createCompletedFiveChapterTestBatch(): FiveChapterBatchState {
  const chapters = Array.from({ length: 5 }, (_, index) => {
    const chapterNumber = index + 1;
    const repairApplied = chapterNumber === 3;
    const acceptedCalls = callsFor(chapterNumber, repairApplied ? 5 : 3);
    const base = structuredClone(assembleChapterGenerationDev(
      "established",
      "balanced-pressure",
      "story-default",
    ));
    const title = `Generated Title ${chapterNumber}`;
    const originalProse = `Original manifested prose ${chapterNumber}.`;
    const finalProse = repairApplied ? `Repaired final prose ${chapterNumber}.` : `Final prose ${chapterNumber}.`;
    const knownCharacters = Array.from({ length: chapterNumber }, (_, characterIndex) => ({
      name: `Known by Chapter ${characterIndex + 1}`,
      role: characterIndex === 0 ? "Protagonist" : "Supporting",
      status: "alive",
    }));
    base.chapterPacket.chapterMission.number = chapterNumber;
    base.chapterPacket.chapterMission.title = title;
    base.chapterPacket.chapterMission.premise = `Premise ${chapterNumber}`;
    base.chapterPacket.arcChapterPosition = {
      arcNumber: 1,
      chapterInArc: chapterNumber,
      chaptersInArc: 100,
      display: `Arc 1 — Chapter ${chapterNumber}/100`,
    };
    base.chapterPacket.contextManifest.chapterNumber = chapterNumber;
    base.manifestedChapter = {
      ...base.manifestedChapter,
      chapterNumber,
      generatedContent: originalProse,
      blocks: [{ id: `original-${chapterNumber}`, type: "paragraph", text: originalProse }],
    };
    base.finalOutput = {
      ...base.finalOutput,
      storyId: "generated-test-story",
      chapterNumber,
      generatedContent: finalProse,
      summary: `Summary ${chapterNumber}`,
      statsChangeMessage: `Change ${chapterNumber}`,
      blocks: [
        { id: `paragraph-${chapterNumber}`, type: "paragraph", text: finalProse },
        {
          id: `system-${chapterNumber}`,
          type: "system",
          text: "",
          system: {
            kind: "system_prompt",
            promptType: "codex_update",
            title: `System Panel ${chapterNumber}`,
            rows: [{ label: "Chapter", value: String(chapterNumber) }],
          },
        },
      ],
    };
    base.processingResult.proposedLivingStoryState.position = {
      arcNumber: 1,
      chapterInArc: chapterNumber + 1,
      chaptersInArc: 100,
      display: `Arc 1 — Chapter ${chapterNumber + 1}/100`,
    };
    base.processingResult.proposedLivingStoryState.codex.characters = knownCharacters;
    base.processingResult.proposedLivingStoryState.threads.unresolved = [{
      description: `Thread known by Chapter ${chapterNumber}`,
      originChapter: chapterNumber,
    }];
    base.processingResult.proposedLivingStoryState.characterState.currentPowerStage = `Stage ${chapterNumber}`;
    base.repairApplied = repairApplied;
    const acceptedUsage = aggregateChapterTokenUsage(acceptedCalls);
    const response = {
      provider: "gemini",
      model: "gemini-2.5-flash",
      usage: acceptedUsage,
      mapping: { mapped: [], unresolved: [], chapterMissionSource: "firstArcPromise" },
      nextContinuation: {
        version: 1,
        livingStoryState: base.processingResult.proposedLivingStoryState,
        chapterMission: base.chapterPacket.chapterMission,
        proof: { version: 1, artifactDigest: "fixture", signature: "fixture" },
      },
      run: base,
    } as unknown as ManifestChapterResponse;
    const failedRetryUsage = chapterNumber === 4
      ? aggregateChapterTokenUsage(callsFor(chapterNumber, 1))
      : undefined;
    return {
      chapterNumber,
      status: "completed" as const,
      attempts: [
        ...(failedRetryUsage
          ? [{ usage: failedRetryUsage, error: "Temporary provider failure.", seriousIssueRemaining: false }]
          : []),
        { usage: acceptedUsage, result: response, seriousIssueRemaining: false },
      ],
      result: response,
    };
  });
  return {
    status: "completed",
    chapters,
    usage: aggregateChapterTokenUsage(
      chapters.flatMap(chapter => chapter.attempts.flatMap(attempt => attempt.usage.calls)),
    ),
  };
}
