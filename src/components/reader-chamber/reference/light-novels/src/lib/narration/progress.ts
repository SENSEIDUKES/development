/**
 * Normalized narration progress.
 *
 * Both narration backends — browser Web Speech and prerecorded voice clips —
 * report playback through this one shape, so the cinematic scroll system
 * never needs to know which engine is speaking.
 *
 * Real audio prefers its actual media duration; Web Speech uses the word-rate
 * estimate and corrects on `onend` (browser boundary events are unreliable).
 */

import { anchorKey } from '../cinematicScroll/anchors';
import { estimateChunkDurationMs } from '../voice/webSpeechCast';

export interface NarrationProgress {
  chapterNumber: number;
  /** Canonical anchor key of the block being narrated. */
  blockKey: string;
  nextBlockKey?: string;
  chunkIndex: number;
  chunkCount: number;
  elapsedMs: number;
  estimatedDurationMs: number;
  /** Set once real media duration is known (voice clips). */
  actualDurationMs?: number;
  /** 0..1 monotonic progress through the block's spoken duration. */
  progress: number;
}

export function makeNarrationProgress(args: {
  chapterNumber: number;
  blockIndex: number;
  nextBlockIndex?: number;
  chunkIndex: number;
  chunkCount: number;
  elapsedMs: number;
  estimatedDurationMs: number;
  actualDurationMs?: number;
}): NarrationProgress {
  const duration = args.actualDurationMs ?? args.estimatedDurationMs;
  const progress =
    duration > 0 ? Math.min(Math.max(args.elapsedMs / duration, 0), 1) : 1;
  return {
    chapterNumber: args.chapterNumber,
    blockKey: anchorKey(args.chapterNumber, args.blockIndex),
    nextBlockKey:
      args.nextBlockIndex != null
        ? anchorKey(args.chapterNumber, args.nextBlockIndex)
        : undefined,
    chunkIndex: args.chunkIndex,
    chunkCount: args.chunkCount,
    elapsedMs: args.elapsedMs,
    estimatedDurationMs: args.estimatedDurationMs,
    actualDurationMs: args.actualDurationMs,
    progress,
  };
}

/** Estimated spoken duration of `text` at the given speech rate. */
export function estimateSpokenDurationMs(text: string, speechRate: number): number {
  const rate = speechRate > 0 ? speechRate : 1;
  return estimateChunkDurationMs(text) / rate;
}
