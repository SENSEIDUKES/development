import type { ContextBlock } from "../types";

export type ContextEngine = "v1" | "v2";

export const ACTIVE_CONTEXT_ENGINE: ContextEngine = "v2";

export const CONTEXT_CHAR_LIMITS: Record<ContextEngine, number> = {
  v1: 120000,
  v2: 60000,
};

export const SECOND_RECENT_EPISODIC_SUMMARY_THRESHOLD = 8000;
export const SECOND_RECENT_BLOCK_FRACTION = 0.4;

export const ARC_HISTORY_HEADER = "--- COARSE HISTORY (ARC SUMMARIES) ---";
export const RAG_HISTORY_HEADER = "--- RECOVERED RELEVANT MEMORIES (OLDER CHAPTERS) ---";
export const RECENT_HISTORY_HEADER = "--- SLIDING WINDOW OF RECENT NARRATIVE BLOCKS/DIALOGUE ---";

/**
 * Recreates the historical string payload used by the v1 prompt assembly path.
 * Typed blocks deliberately omit section-marker headers; this adapter restores
 * the old grouping and array shape for legacy callers and queued retries.
 */
export function contextBlocksToLegacyStrings(blocks: ContextBlock[]): string[] {
  const legacyBlocks: string[] = [];
  const arcSummaries = blocks.filter(block => block.kind === "arc-summary");
  const ragBlocks = blocks.filter(block => block.kind === "rag");
  const recentBlocks = blocks.filter(
    block => block.kind === "recent-full" || block.kind === "recent-summary",
  );
  const anchorBlocks = blocks.filter(block => block.kind === "anchor");

  if (arcSummaries.length > 0) {
    legacyBlocks.push(
      `${ARC_HISTORY_HEADER}\n${arcSummaries.map(block => block.text).join("\n")}`,
    );
  }
  if (ragBlocks.length > 0) {
    legacyBlocks.push(RAG_HISTORY_HEADER, ...ragBlocks.map(block => block.text));
  }
  if (recentBlocks.length > 0) {
    legacyBlocks.push(
      RECENT_HISTORY_HEADER,
      ...recentBlocks.map(block => block.text),
    );
  }
  anchorBlocks.forEach(block => {
    const chapterLabel = block.chapterNumber === undefined
      ? ""
      : ` (FINAL MOMENTS OF CHAPTER ${block.chapterNumber})`;
    legacyBlocks.push(
      `--- IMMEDIATE CONTINUATION ANCHOR${chapterLabel} ---\n${block.text}`,
    );
  });

  return legacyBlocks;
}
