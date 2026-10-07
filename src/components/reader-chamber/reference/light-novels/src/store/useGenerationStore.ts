/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/store/useGenerationStore.ts` (Light-Novels main @ 647165a)
 * owns the generation run mutex and crash-recovery snapshots. The Reader only
 * reads `selectIsGenerating`, kept here with production's exact definition.
 */
import type { AppState } from './useAppStore';

export const selectIsGenerating = (state: AppState): boolean =>
  state.activeGenerationRun != null;
