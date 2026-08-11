import { describe, expect, it } from "vitest";
import type { StorySeedArtifact } from "../../story-seed/shared/storySeedRepository";
import { createCompletedFiveChapterTestBatch } from "./batch/chapterBatchTestFixture";
import { aggregateChapterTokenUsage } from "./pipeline/usage";
import {
  buildBatchReviewMarkdown,
  buildChapterReviewMarkdown,
  buildRunDataExport,
  usageForChapterRun,
} from "./reviewExports";

const artifact = (): StorySeedArtifact => ({
  seed: {
    creator: {},
    story: {
      required: {
        premise: "A witness challenges the court.",
        genre: "Fantasy",
        style: "chinese",
        storyTags: ["mystery"],
      },
      optional: {
        intendedForMatureAudiences: false,
        fateSurvival: { enabled: false, visibility: "partial", pressure: "mortal" },
        plotAndTropeSettings: { faceSlap: "low", plotArmor: "low", recognition: "low" },
      },
    },
    world: { required: {}, optional: { worldIdentity: {}, worldFoundations: {} } },
  },
  blueprint: {
    blueprintVersion: "v1.0",
    title: "Review Story",
    logline: "A witness challenges the court.",
    worldOverview: "A rain-bound court.",
    startingLocation: "Rain Court",
    societyStructure: "Oath houses",
    powerSystemOutline: "Witness marks",
    mcProfile: "A disgraced witness.",
    majorFactions: ["Ninth House"],
    initialCharacters: ["Rin"],
    majorMysteries: ["The remembering rain"],
    firstArcPromise: "Expose one false oath.",
    tropeRules: "Evidence first.",
    styleBible: "Quiet pressure.",
    estimatedArcs: 4,
    unresolvedPlotThreads: ["Who changed the oath?"],
  },
});

const breakdown = {
  source: "estimated" as const,
  storySeedConstitution: 100,
  blueprint: 80,
  livingStoryState: 60,
  chapterMission: 40,
  generationRules: 120,
  userInstruction: 10,
  systemPrompts: 50,
  total: 460,
};

describe("Chapter Generation review exports", () => {
  it("exports a selected chapter with prose, plan, processed state, usage, timing, and estimates", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const run = batch.chapters[0];
    run.attempts[0].usage.calls[0].estimatedInputBreakdown = breakdown;
    run.result!.usage.calls[0].estimatedInputBreakdown = breakdown;

    const markdown = buildChapterReviewMarkdown({
      response: run.result!,
      status: run.status,
      usage: usageForChapterRun(run),
      attemptCount: run.attempts.length,
    });

    expect(markdown).toContain("# Chapter 1 Review Export");
    expect(markdown).toContain("Final prose 1.");
    expect(markdown).toContain("## Chapter plan");
    expect(markdown).toContain("## Processed result");
    expect(markdown).toContain("## Story state before this chapter");
    expect(markdown).toContain("## Story state after processing");
    expect(markdown).toContain("Stage token usage, timing, and totals");
    expect(markdown).toContain("Story Seed / Constitution");
    expect(markdown).toContain("Estimated component sizes, not provider-reported");
  });

  it("exports completed chapters from a partial batch and names the stop point", () => {
    const batch = createCompletedFiveChapterTestBatch();
    batch.status = "paused";
    batch.activeChapterNumber = 3;
    batch.chapters[2] = {
      chapterNumber: 3,
      status: "failed",
      attempts: [{
        usage: batch.chapters[2].attempts[0].usage,
        error: "Chapter 3 failed during Plan Chapter.",
        failure: {
          chapterNumber: 3,
          stage: "Plan Chapter",
          reason: "Plan validation failed.",
          validationIssues: [{
            field: "chapterNumber",
            reason: "does not match the requested chapter",
            expected: "3",
            received: "1",
          }],
        },
        seriousIssueRemaining: false,
      }],
      error: "Chapter 3 failed during Plan Chapter.",
    };
    batch.chapters[3] = { chapterNumber: 4, status: "queued", attempts: [] };
    batch.chapters[4] = { chapterNumber: 5, status: "queued", attempts: [] };
    batch.usage = aggregateChapterTokenUsage(
      batch.chapters.flatMap(chapter => chapter.attempts.flatMap(attempt => attempt.usage.calls)),
    );

    const markdown = buildBatchReviewMarkdown(batch);
    expect(markdown).toContain("Completed chapters: 2 / 5");
    expect(markdown).toContain("stopped at Chapter 3");
    expect(markdown).toContain("Chapter 1 Review Export");
    expect(markdown).toContain("Chapter 2 Review Export");
    expect(markdown).not.toContain("Chapter 3 Review Export");

    const runDataText = buildRunDataExport({ artifact: artifact(), batch });
    const runData = JSON.parse(runDataText);
    expect(runData.source.storySeed.story.required.premise).toBe("A witness challenges the court.");
    expect(runData.source.blueprint.title).toBe("Review Story");
    expect(runData.run.stoppedAtChapter).toBe(3);
    expect(runData.run.chapters[0]).toMatchObject({
      chapterNumber: 1,
      status: "completed",
      finalProse: "Final prose 1.",
    });
    expect(runData.run.chapters[0].packet).toBeTruthy();
    expect(runData.run.chapters[0].plan).toBeTruthy();
    expect(runData.run.chapters[0].processedResult).toBeTruthy();
    expect(runData.run.chapters[0].chapterStateSnapshots.after).toBeTruthy();
    expect(runData.run.chapters[2].failure.validationIssues[0]).toMatchObject({
      field: "chapterNumber",
      expected: "3",
      received: "1",
    });
    expect(runDataText).not.toContain("test-signature");
    expect(runDataText).not.toContain('"proof"');
    expect(runDataText).not.toContain("accessToken");
    expect(runDataText).not.toContain('"stack"');
  });
});
