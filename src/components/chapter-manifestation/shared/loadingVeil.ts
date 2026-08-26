/**
 * The shared loading-veil contract.
 *
 * The veil's props are the production contract both the locked `reference/`
 * replica and the Development veil implement, so they live in `shared/` where
 * the published entry can reach them. A published surface must never import
 * from a `reference/` replica: those are Workshop-only snapshots, verified out
 * of the package by `scripts/checkPackageBoundaries.mjs`.
 */
export interface AILoadingVeilProps {
  isGenerating: boolean;
  generationPhase: string | null;
  generationProgressMessage: string | null;
  estimatedSecondsRemaining: number | null;
  activeAgentId: 'versa' | 'scout' | null;
  streamingBlocksCount: number;
  isVeilMinimized: boolean;
  setIsVeilMinimized: (minimized: boolean) => void;
  generatingChapterNum: number | null;
}
