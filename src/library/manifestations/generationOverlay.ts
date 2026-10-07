/**
 * Generation overlay signals supplied by the host. Existing minimize prop
 * names remain compatible with published callers. Historical reference code
 * stays outside the package; this contract has no reference imports.
 */
export interface GenerationOverlaySignals {
  isGenerating: boolean;
  /** Successful result received and saved; false for failure or cancellation. */
  completed?: boolean;
  generationPhase: string | null;
  generationProgressMessage: string | null;
  estimatedSecondsRemaining: number | null;
  activeAgentId: 'versa' | 'scout' | null;
  streamingBlocksCount: number;
  isVeilMinimized: boolean;
  setIsVeilMinimized: (minimized: boolean) => void;
  generatingChapterNum: number | null;
}
