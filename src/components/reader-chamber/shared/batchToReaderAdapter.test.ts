import { describe, it, expect } from "vitest";
import type { FiveChapterBatchState } from "../../chapter-generation/shared/batch/chapterBatch";
import {
  convertBatchToReaderChapters,
  extractBatchStoryState,
} from "./batchToReaderAdapter";

describe("batchToReaderAdapter", () => {
  it("converts completed chapter runs into ReaderChapter objects", () => {
    const mockBatchState: FiveChapterBatchState = {
      status: "completed",
      chapters: [
        {
          chapterNumber: 1,
          status: "completed",
          attempts: [],
          result: {
            provider: "gemini",
            model: "gemini-2.5-flash",
            usage: {
              calls: [],
              totals: {
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
                generationTimeMs: 500,
                hasEstimatedUsage: false,
              },
            },
            mapping: {
              mapped: [],
              unresolved: [],
              chapterMissionSource: "firstArcPromise",
            },
            nextContinuation: {
              version: 1,
              livingStoryState: {} as any,
              chapterMission: {} as any,
              proof: {
                version: 1,
                artifactDigest: "abc",
                signature: "sig",
              },
            },
            run: {
              stages: [],
              finalOutput: {
                storyId: "s1",
                chapterNumber: 1,
                generatedContent: "The morning fog rolled across the mountain peaks.",
                summary: "Wen Shu discovers the ancient seal.",
                blocks: [
                  {
                    id: "b1",
                    type: "paragraph",
                    text: "The morning fog rolled across the mountain peaks.",
                  },
                ],
              },
              chapterPacket: {
                contextManifest: {
                  version: 1,
                  route: "generate-chapter",
                  generatedAt: "2026-08-10",
                  chapterNumber: 1,
                  totalEstimatedTokens: 500,
                  memoryAndHistoryBudgetTokens: 1000,
                  memoryAndHistoryEstimatedTokens: 400,
                  memoryAndHistoryBudgetExceeded: false,
                  providerInputTruncated: false,
                  sections: [],
                },
              } as any,
              chapterPlan: {} as any,
              manifestedChapter: {
                storyId: "s1",
                chapterNumber: 1,
                generatedContent: "The morning fog rolled across the mountain peaks.",
                summary: "Wen Shu discovers the ancient seal.",
                blocks: [
                  {
                    id: "b1",
                    type: "paragraph",
                    text: "The morning fog rolled across the mountain peaks.",
                  },
                ],
              },
              processingResult: {
                version: 1,
                characterChanges: ["Wen Shu acquired Azure Ring"],
                worldStateChanges: [],
                characterStateUpdates: { abilities: [] },
                codexUpdates: {
                  characters: [{ name: "Wen Shu", role: "Protagonist" }],
                  factions: [],
                  locations: [],
                  artifacts: [],
                },
                threads: {
                  completed: [],
                  changed: [],
                  unresolved: [{ description: "Secrets of Azure Ring", originChapter: 1 }],
                },
                missionCompletion: { completed: true, evidence: "Found ring" },
                continuityFindings: [],
                repetitionFindings: [],
                nextChapterHandoff: {} as any,
                proposedLivingStoryState: {
                  position: { arcNumber: 1, chapterInArc: 1, chaptersInArc: 100, display: "Arc 1 — Ch 1" },
                  contextBlocks: [],
                  recentFingerprints: [],
                  characterState: { currentPowerStage: "Qi Refining 3rd Layer", abilities: [] },
                  threads: {
                    unresolved: [{ description: "Secrets of Azure Ring", originChapter: 1 }],
                    resolved: [],
                  },
                  codex: {
                    characters: [{ name: "Wen Shu", role: "Protagonist" }],
                    factions: [],
                    locations: [],
                    artifacts: [],
                  },
                  scene: { worldBuildingSeed: "seed", recentSceneTypes: [] },
                  carriedChanges: [],
                },
                repairRecommended: false,
              },
              modelCalls: ["plan", "manifest", "process"],
              repairApplied: false,
            },
          },
        },
      ],
      usage: {
        calls: [],
        totals: {
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
          generationTimeMs: 500,
          hasEstimatedUsage: false,
        },
      },
    };

    const chapters = convertBatchToReaderChapters(mockBatchState);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].number).toBe(1);
    expect(chapters[0].title).toBe("Chapter 1");
    expect(chapters[0].blocks).toHaveLength(1);
    expect(chapters[0].statsChangeMessage).toBe("Wen Shu acquired Azure Ring");

    const storyState = extractBatchStoryState(mockBatchState);
    expect(storyState.latestCharacterState?.currentPowerStage).toBe("Qi Refining 3rd Layer");
    expect(storyState.latestCodex?.characters).toHaveLength(1);
    expect(storyState.latestCodex?.characters[0].name).toBe("Wen Shu");
  });
});
