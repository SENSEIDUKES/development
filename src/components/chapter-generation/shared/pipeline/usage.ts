import type { ChapterModelCallKind } from "./types";

export type ChapterUsageStage =
  | "Plan Chapter"
  | "Manifest Chapter"
  | "Process Result"
  | "Repair Chapter"
  | "Process Result (repaired chapter)";

export interface ChapterModelCallUsage {
  kind: ChapterModelCallKind;
  stage: ChapterUsageStage;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  generationTimeMs: number;
  tokenSource: "provider" | "estimated";
}

export interface ChapterTokenUsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  generationTimeMs: number;
  hasEstimatedUsage: boolean;
}

export interface ChapterTokenUsageSummary {
  calls: ChapterModelCallUsage[];
  totals: ChapterTokenUsageTotals;
}

export function aggregateChapterTokenUsage(
  calls: ChapterModelCallUsage[],
): ChapterTokenUsageSummary {
  const copiedCalls = calls.map(call => ({ ...call }));
  return {
    calls: copiedCalls,
    totals: copiedCalls.reduce<ChapterTokenUsageTotals>((totals, call) => ({
      inputTokens: totals.inputTokens + call.inputTokens,
      outputTokens: totals.outputTokens + call.outputTokens,
      totalTokens: totals.totalTokens + call.totalTokens,
      generationTimeMs: totals.generationTimeMs + call.generationTimeMs,
      hasEstimatedUsage: totals.hasEstimatedUsage || call.tokenSource === "estimated",
    }), {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      generationTimeMs: 0,
      hasEstimatedUsage: false,
    }),
  };
}
