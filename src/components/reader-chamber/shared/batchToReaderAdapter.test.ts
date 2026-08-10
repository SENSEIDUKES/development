import { describe, expect, it } from "vitest";
import { createCompletedFiveChapterTestBatch } from "../../chapter-generation/shared/batch/chapterBatchTestFixture";
import {
  buildFiveChapterReaderExport,
  convertBatchToReaderChapters,
  createCompletedBatchReaderSession,
  createReaderCodexSnapshots,
  extractBatchStoryState,
} from "./batchToReaderAdapter";

describe("batchToReaderAdapter", () => {
  it("adapts a completed real Pass 2-shaped batch into five Reader chapters without mutating it", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const sourceBefore = structuredClone(batch);
    const resolution = createCompletedBatchReaderSession(batch);

    expect(resolution.ok).toBe(true);
    if (!resolution.ok) throw new Error(resolution.reason);
    expect(resolution.session.chapters).toHaveLength(5);
    expect(resolution.session.chapters.map(chapter => chapter.number)).toEqual([1, 2, 3, 4, 5]);
    expect(resolution.session.chapters.map(chapter => chapter.title)).toEqual([
      "Generated Title 1",
      "Generated Title 2",
      "Generated Title 3",
      "Generated Title 4",
      "Generated Title 5",
    ]);
    expect(batch).toEqual(sourceBefore);
  });

  it("uses repaired final prose and retains supported blocks, system panels, position, and chapter data", () => {
    const chapters = convertBatchToReaderChapters(createCompletedFiveChapterTestBatch());
    const repaired = chapters[2];

    expect(repaired.generatedContent).toBe("Repaired final prose 3.");
    expect(repaired.generatedContent).not.toContain("Original manifested prose");
    expect(repaired.blocks?.[1].system?.title).toBe("System Panel 3");
    expect(repaired.generationPosition?.chapterInArc).toBe(3);
    expect(repaired.summary).toBe("Summary 3");
    expect(repaired.statsChangeMessage).toBe("Change 3");
    expect(repaired.repairApplied).toBe(true);
  });

  it("creates cumulative chapter snapshots without exposing future Codex knowledge", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const snapshots = createReaderCodexSnapshots(batch);

    expect(snapshots).toHaveLength(5);
    expect(snapshots[0].memory.characters?.map(character => character.name)).toEqual([
      "Known by Chapter 1",
    ]);
    expect(snapshots[1].memory.characters?.map(character => character.name)).toEqual([
      "Known by Chapter 1",
      "Known by Chapter 2",
    ]);
    expect(snapshots[0].memory.characters?.some(character => character.name === "Known by Chapter 5")).toBe(false);
    expect(snapshots[4].memory.characters?.some(character => character.name === "Known by Chapter 5")).toBe(true);
    expect(extractBatchStoryState(batch).latestCharacterState?.currentPowerStage).toBe("Stage 5");
  });

  it("keeps selected-chapter and complete batch totals accurate, including repair and retry usage", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const resolution = createCompletedBatchReaderSession(batch);
    if (!resolution.ok) throw new Error(resolution.reason);
    const chapters = resolution.session.chapters;

    expect(chapters[2].generationUsage?.totals).toEqual(batch.chapters[2].attempts[0].usage.totals);
    expect(chapters[2].generationUsage?.repair?.callCount).toBe(2);
    expect(chapters[3].generationUsage?.attemptCount).toBe(2);
    expect(chapters[3].generationUsage?.retry?.attemptCount).toBe(1);
    expect(chapters[3].generationUsage?.totals.totalTokens).toBe(
      batch.chapters[3].attempts.reduce((total, attempt) => total + attempt.usage.totals.totalTokens, 0),
    );
    expect(resolution.session.batchUsage.totals).toEqual(batch.usage.totals);
  });

  it("exports all five numbered chapters, titles, repaired prose, and token information", () => {
    const resolution = createCompletedBatchReaderSession(createCompletedFiveChapterTestBatch());
    if (!resolution.ok) throw new Error(resolution.reason);
    const exported = buildFiveChapterReaderExport(resolution.session);

    for (let chapterNumber = 1; chapterNumber <= 5; chapterNumber += 1) {
      expect(exported).toContain(`Chapter ${chapterNumber}: Generated Title ${chapterNumber}`);
      if (chapterNumber !== 3) expect(exported).toContain(`Final prose ${chapterNumber}.`);
    }
    expect(exported).toContain("Repaired final prose 3.");
    expect(exported).toContain("Input tokens:");
    expect(exported).toContain("Output tokens:");
    expect(exported).toContain("Batch input tokens:");
    expect(exported).toContain("Batch output tokens:");
  });

  it("truthfully refuses failed, paused, and structurally incomplete batches", () => {
    const paused = createCompletedFiveChapterTestBatch();
    paused.status = "paused";
    paused.chapters[4].status = "failed";
    paused.chapters[4].result = undefined;
    const pausedResolution = createCompletedBatchReaderSession(paused);
    expect(pausedResolution.ok).toBe(false);
    if (pausedResolution.ok) throw new Error("Expected paused batch rejection.");
    expect(pausedResolution.completedChapterCount).toBe(4);
    expect(pausedResolution.reason).toContain("paused");

    const incomplete = createCompletedFiveChapterTestBatch();
    incomplete.chapters[4].result = undefined;
    const incompleteResolution = createCompletedBatchReaderSession(incomplete);
    expect(incompleteResolution.ok).toBe(false);
    if (incompleteResolution.ok) throw new Error("Expected incomplete batch rejection.");
    expect(incompleteResolution.reason).toContain("instead of five");
  });
});
