import type {
  BatchChapterRun,
  BatchChapterStatus,
  FiveChapterBatchState,
} from "./batch/chapterBatch";
import type {
  ManifestChapterRequest,
  ManifestChapterResponse,
  SafeChapterGenerationFailure,
} from "./liveChapterGeneration";
import {
  aggregateChapterTokenUsage,
  type ChapterTokenUsageSummary,
} from "./pipeline/usage";

const json = (value: unknown) => JSON.stringify(value, null, 2);

const markdownJson = (value: unknown) => `\`\`\`json\n${json(value)}\n\`\`\``;

const formatDuration = (milliseconds: number) => milliseconds >= 1_000
  ? `${(milliseconds / 1_000).toFixed(1)}s`
  : `${milliseconds}ms`;

const markdownCell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

const finalProse = (response: ManifestChapterResponse): string => {
  const output = response.run.finalOutput;
  if (output.generatedContent?.trim()) return output.generatedContent.trim();
  return (output.blocks ?? [])
    .map(block => block.text?.trim() || block.system?.title || block.worldCard?.displayTitle || "")
    .filter(Boolean)
    .join("\n\n");
};

const BREAKDOWN_LABELS = {
  storySeedConstitution: "Story Seed / Constitution",
  blueprint: "Blueprint",
  livingStoryState: "Living Story State",
  chapterMission: "Chapter Mission",
  generationRules: "Generation Rules",
  userInstruction: "User instruction",
  systemPrompts: "System prompts",
} as const;

const usageMarkdown = (usage: ChapterTokenUsageSummary): string => {
  const stageRows = usage.calls.map(call => [
    markdownCell(call.stage),
    call.inputTokens.toLocaleString(),
    call.outputTokens.toLocaleString(),
    call.totalTokens.toLocaleString(),
    formatDuration(call.generationTimeMs),
    call.tokenSource === "provider" ? "Provider reported" : "Estimated",
  ].join(" | "));
  const breakdownSections = usage.calls.flatMap((call, index) => {
    const breakdown = call.estimatedInputBreakdown;
    if (!breakdown) return [];
    const rows = Object.entries(BREAKDOWN_LABELS).map(([key, label]) =>
      `| ${label} | ${breakdown[key as keyof typeof BREAKDOWN_LABELS].toLocaleString()} |`);
    return [
      `### ${call.stage}${usage.calls.filter(candidate => candidate.stage === call.stage).length > 1 ? ` call ${index + 1}` : ""}`,
      "",
      "Estimated component sizes, not provider-reported token counts. The tracked subtotal may differ from provider input because stage artifacts and JSON framing are outside these seven source categories.",
      "",
      "| Input component | Estimated tokens |",
      "| --- | ---: |",
      ...rows,
      `| **Tracked subtotal** | **${breakdown.total.toLocaleString()}** |`,
      "",
    ];
  });
  return [
    "| Stage | Input | Output | Total | Time | Token source |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...stageRows.map(row => `| ${row} |`),
    "",
    `- Input tokens: ${usage.totals.inputTokens.toLocaleString()}`,
    `- Output tokens: ${usage.totals.outputTokens.toLocaleString()}`,
    `- Total tokens: ${usage.totals.totalTokens.toLocaleString()}`,
    `- Generation time: ${formatDuration(usage.totals.generationTimeMs)}`,
    `- Provider usage includes estimates: ${usage.totals.hasEstimatedUsage ? "yes" : "no"}`,
    "",
    ...(breakdownSections.length > 0
      ? ["## Estimated input-token breakdown", "", ...breakdownSections]
      : []),
  ].join("\n");
};

export interface ChapterReviewExportInput {
  response: ManifestChapterResponse;
  status: BatchChapterStatus | "completed";
  usage?: ChapterTokenUsageSummary;
  attemptCount?: number;
}

export function buildChapterReviewMarkdown(input: ChapterReviewExportInput): string {
  const { response } = input;
  const chapterNumber = response.run.chapterPacket.chapterMission.number;
  const usage = input.usage ?? response.usage;
  return [
    `# Chapter ${chapterNumber} Review Export`,
    "",
    `- Status: ${input.status}`,
    `- Provider: ${response.provider}`,
    `- Model: ${response.model}`,
    `- Attempts represented: ${input.attemptCount ?? 1}`,
    `- Repair applied: ${response.run.repairApplied ? "yes" : "no"}`,
    "",
    "## Final prose",
    "",
    finalProse(response),
    "",
    "## Chapter plan",
    "",
    markdownJson(response.run.chapterPlan),
    "",
    "## Processed result",
    "",
    markdownJson(response.run.processingResult),
    "",
    "## Story state before this chapter",
    "",
    markdownJson(response.run.chapterPacket.livingStoryState),
    "",
    "## Story state after processing",
    "",
    markdownJson(response.run.processingResult.proposedLivingStoryState),
    "",
    "## Stage token usage, timing, and totals",
    "",
    usageMarkdown(usage),
    "",
  ].join("\n");
}

const resultForRun = (run: BatchChapterRun): ManifestChapterResponse | undefined =>
  run.result ?? [...run.attempts].reverse().find(attempt => attempt.result)?.result;

const completedRuns = (batch: FiveChapterBatchState) => batch.chapters
  .filter(run => run.status === "completed" && Boolean(resultForRun(run)));

export const stoppedChapterNumber = (batch: FiveChapterBatchState): number | undefined =>
  batch.status === "completed"
    ? undefined
    : batch.activeChapterNumber ?? batch.chapters.find(chapter => chapter.status !== "completed")?.chapterNumber;

export function buildBatchReviewMarkdown(batch: FiveChapterBatchState): string {
  const completed = completedRuns(batch);
  const stoppedAt = stoppedChapterNumber(batch);
  const statusRows = batch.chapters.map(chapter => {
    const usage = aggregateChapterTokenUsage(chapter.attempts.flatMap(attempt => attempt.usage.calls));
    return `| ${chapter.chapterNumber} | ${chapter.status} | ${chapter.attempts.length} | ${usage.totals.inputTokens.toLocaleString()} | ${usage.totals.outputTokens.toLocaleString()} | ${usage.totals.totalTokens.toLocaleString()} | ${formatDuration(usage.totals.generationTimeMs)} |`;
  });
  const stopNote = stoppedAt
    ? `This incomplete batch stopped at Chapter ${stoppedAt}. Chapters ${completed.map(run => run.chapterNumber).join(", ") || "none"} completed before the pause and remain available in this temporary session.`
    : "The five-chapter batch completed.";
  const chapters = completed.flatMap(run => {
    const response = resultForRun(run)!;
    const usage = aggregateChapterTokenUsage(run.attempts.flatMap(attempt => attempt.usage.calls));
    return [
      "---",
      "",
      buildChapterReviewMarkdown({
        response,
        status: run.status,
        usage,
        attemptCount: run.attempts.length,
      }),
    ];
  });
  return [
    "# Chapter Generation Batch Review Export",
    "",
    `- Batch status: ${batch.status}`,
    `- Completed chapters: ${completed.length} / ${batch.chapters.length}`,
    `- Batch input tokens: ${batch.usage.totals.inputTokens.toLocaleString()}`,
    `- Batch output tokens: ${batch.usage.totals.outputTokens.toLocaleString()}`,
    `- Batch total tokens: ${batch.usage.totals.totalTokens.toLocaleString()}`,
    `- Batch generation time: ${formatDuration(batch.usage.totals.generationTimeMs)}`,
    "",
    `> ${stopNote}`,
    "",
    "## Chapter status and usage",
    "",
    "| Chapter | Status | Attempts | Input | Output | Total | Time |",
    "| ---: | --- | ---: | ---: | ---: | ---: | ---: |",
    ...statusRows,
    "",
    ...chapters,
    "",
    ...(stoppedAt ? ["---", "", `> Incomplete batch stop: Chapter ${stoppedAt}.`, ""] : []),
  ].join("\n");
}

const safeFailureForExport = (
  failure?: SafeChapterGenerationFailure,
): SafeChapterGenerationFailure | undefined => failure ? structuredClone(failure) : undefined;

const chapterRunData = (run: BatchChapterRun) => {
  const response = resultForRun(run);
  const usage = aggregateChapterTokenUsage(run.attempts.flatMap(attempt => attempt.usage.calls));
  return {
    chapterNumber: run.chapterNumber,
    status: run.status,
    attemptCount: run.attempts.length,
    failure: safeFailureForExport(run.failure ?? run.attempts.at(-1)?.failure),
    usage,
    timing: { generationTimeMs: usage.totals.generationTimeMs },
    attempts: run.attempts.map((attempt, index) => ({
      attempt: index + 1,
      usage: attempt.usage,
      seriousIssueRemaining: attempt.seriousIssueRemaining,
      failure: safeFailureForExport(attempt.failure),
    })),
    ...(response
      ? {
          packet: response.run.chapterPacket,
          plan: response.run.chapterPlan,
          finalProse: finalProse(response),
          finalOutput: response.run.finalOutput,
          manifestedChapter: response.run.manifestedChapter,
          processedResult: response.run.processingResult,
          chapterStateSnapshots: {
            before: response.run.chapterPacket.livingStoryState,
            after: response.run.processingResult.proposedLivingStoryState,
          },
          diagnostics: {
            provider: response.provider,
            model: response.model,
            mapping: response.mapping,
            stages: response.run.stages,
            modelCalls: response.run.modelCalls,
            repairApplied: response.run.repairApplied,
          },
        }
      : {}),
  };
};

export interface RunDataExportInput {
  artifact: ManifestChapterRequest["artifact"];
  batch?: FiveChapterBatchState | null;
  singleResult?: ManifestChapterResponse | null;
  singleFailure?: SafeChapterGenerationFailure | null;
  singleFailureUsage?: ChapterTokenUsageSummary | null;
}

export function buildRunDataExport(input: RunDataExportInput): string {
  const stoppedAt = input.batch ? stoppedChapterNumber(input.batch) : undefined;
  const singleChapter = input.singleResult
    ? {
        chapterNumber: input.singleResult.run.chapterPacket.chapterMission.number,
        status: "completed",
        usage: input.singleResult.usage,
        timing: { generationTimeMs: input.singleResult.usage.totals.generationTimeMs },
        packet: input.singleResult.run.chapterPacket,
        plan: input.singleResult.run.chapterPlan,
        finalProse: finalProse(input.singleResult),
        finalOutput: input.singleResult.run.finalOutput,
        manifestedChapter: input.singleResult.run.manifestedChapter,
        processedResult: input.singleResult.run.processingResult,
        chapterStateSnapshots: {
          before: input.singleResult.run.chapterPacket.livingStoryState,
          after: input.singleResult.run.processingResult.proposedLivingStoryState,
        },
        diagnostics: {
          provider: input.singleResult.provider,
          model: input.singleResult.model,
          mapping: input.singleResult.mapping,
          stages: input.singleResult.run.stages,
          modelCalls: input.singleResult.run.modelCalls,
          repairApplied: input.singleResult.run.repairApplied,
        },
      }
    : undefined;
  return json({
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    source: {
      storySeed: input.artifact.seed,
      blueprint: input.artifact.blueprint,
    },
    run: input.batch
      ? {
          kind: "five-chapter-batch",
          status: input.batch.status,
          stoppedAtChapter: stoppedAt,
          incompleteNote: stoppedAt
            ? `The batch stopped at Chapter ${stoppedAt}; completed chapters remain available only in this temporary session.`
            : undefined,
          tokens: input.batch.usage,
          timing: { generationTimeMs: input.batch.usage.totals.generationTimeMs },
          chapters: input.batch.chapters.map(chapterRunData),
        }
      : {
          kind: "single-chapter",
          status: singleChapter ? "completed" : "failed",
          failure: safeFailureForExport(input.singleFailure ?? undefined),
          tokens: input.singleFailureUsage ?? input.singleResult?.usage,
          chapter: singleChapter,
        },
  });
}

export function downloadReviewFile(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const reviewExportFilename = (title: string, suffix: string, extension: "md" | "json") => {
  const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chapter-generation";
  return `${safeTitle}-${suffix}.${extension}`;
};

export const usageForChapterRun = (run: BatchChapterRun): ChapterTokenUsageSummary =>
  aggregateChapterTokenUsage(run.attempts.flatMap(attempt => attempt.usage.calls));
