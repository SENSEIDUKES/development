/**
 * Verbatim port of Light-Novels `src/server/contextManifest.ts` (verified
 * against `main`). Pure — no network/DB — safe to run in the Workshop.
 */
import { ContextManifest, ContextManifestSection, ContextManifestSectionKey } from '@seihouse/sen/generation';
import { estimateTokens } from "./helpers";
import type { SectionOutcome } from "./contextBudgeter";

const SECTION_LABELS: Record<ContextManifestSectionKey, string> = {
  pinnedRules: "Pinned rules",
  premise: "Premise",
  chapterContract: "Chapter contract",
  anchor: "Anchor",
  recentChapters: "Recent chapters",
  entityCards: "Entity cards",
  threads: "Threads",
  rag: "RAG",
  arcSummaries: "Arc summaries",
};

const OUTCOME_SECTION_ORDER: ContextManifestSectionKey[] = [
  "pinnedRules",
  "premise",
  "chapterContract",
  "anchor",
  "recentChapters",
  "entityCards",
  "threads",
  "rag",
  "arcSummaries",
];

export function buildContextManifestFromOutcomes(
  input: {
    route: ContextManifest["route"];
    chapterNumber: number;
    systemInstruction: string;
    finalUserPrompt: string;
    outcomes: SectionOutcome[];
    memoryAndHistoryBudgetTokens?: number;
  },
): ContextManifest {
  const outcomeByKey = new Map(
    input.outcomes.map(outcome => [outcome.key, outcome]),
  );
  const sections = OUTCOME_SECTION_ORDER.map(key => {
    const outcome = outcomeByKey.get(key);
    const includedItems = Array.from(new Set(outcome?.includedItems || []));
    const demotedItems = Array.from(new Set(outcome?.demotedItems || []));
    const omittedItems = Array.from(new Set(outcome?.omittedItems || []));

    return {
      key,
      label: SECTION_LABELS[key],
      estimatedTokens: outcome?.estimatedTokens || 0,
      includedItemCount: includedItems.length,
      availableItemCount: includedItems.length + omittedItems.length,
      includedItems,
      demotedItems,
      omittedItems,
      protectedOverflowTokens: outcome?.protectedOverflowTokens || undefined,
      truncated: demotedItems.length > 0 || omittedItems.length > 0,
      omissionReason: outcome?.omissionReason,
    } satisfies ContextManifestSection;
  });
  const memoryAndHistoryEstimatedTokens = sections.reduce(
    (total, section) => total + section.estimatedTokens,
    0,
  );
  const memoryAndHistoryBudgetTokens = input.memoryAndHistoryBudgetTokens || 24000;
  const providerInputEstimatedTokens =
    estimateTokens(input.systemInstruction) + estimateTokens(input.finalUserPrompt);

  return {
    version: 1,
    engine: "v2",
    route: input.route,
    generatedAt: new Date().toISOString(),
    chapterNumber: input.chapterNumber,
    totalEstimatedTokens: memoryAndHistoryEstimatedTokens,
    providerInputEstimatedTokens,
    memoryAndHistoryBudgetTokens,
    memoryAndHistoryEstimatedTokens,
    memoryAndHistoryBudgetExceeded:
      memoryAndHistoryEstimatedTokens > memoryAndHistoryBudgetTokens,
    providerInputTruncated:
      input.systemInstruction.length > 100000 || input.finalUserPrompt.length > 700000,
    sections,
  };
}

export function contextManifestLogPayload(manifest: ContextManifest) {
  return {
    engine: manifest.engine || "v1",
    route: manifest.route,
    chapterNumber: manifest.chapterNumber,
    totalEstimatedTokens: manifest.totalEstimatedTokens,
    providerInputEstimatedTokens:
      manifest.providerInputEstimatedTokens ?? manifest.totalEstimatedTokens,
    memoryAndHistoryBudgetTokens: manifest.memoryAndHistoryBudgetTokens,
    memoryAndHistoryEstimatedTokens: manifest.memoryAndHistoryEstimatedTokens,
    memoryAndHistoryBudgetExceeded: manifest.memoryAndHistoryBudgetExceeded,
    providerInputTruncated: manifest.providerInputTruncated,
    sections: manifest.sections.map(section => ({
      key: section.key,
      estimatedTokens: section.estimatedTokens,
      includedItemCount: section.includedItemCount,
      availableItemCount: section.availableItemCount,
      truncated: section.truncated,
      protectedOverflowTokens: section.protectedOverflowTokens,
    })),
  };
}
