/**
 * Cinematic scroll state machine.
 *
 * Pure reducer — no timers, no DOM. The single source of truth for whether
 * automated narration-following movement is permitted.
 *
 * States:
 * - idle:       narration is stopped.
 * - following:  narration is active and automated movement is permitted.
 * - yielded:    narration continues, but the user has taken manual control.
 *               Only an explicit RESUME_REQUESTED returns to following —
 *               there is deliberately no timer-based auto-resume.
 * - paused:     narration is paused.
 * - suppressed: narration may be active, but movement is disabled by
 *               preference (Auto Scroll off / immersion master off) or by
 *               prefers-reduced-motion.
 */

export type CinematicScrollState =
  | 'idle'
  | 'following'
  | 'yielded'
  | 'paused'
  | 'suppressed';

export type CinematicScrollEvent =
  | { type: 'NARRATION_STARTED' }
  | { type: 'NARRATION_PAUSED' }
  | { type: 'NARRATION_RESUMED' }
  | { type: 'NARRATION_ENDED' }
  | { type: 'USER_INTERVENED' }
  | { type: 'RESUME_REQUESTED' }
  | { type: 'AUTO_SCROLL_ENABLED' }
  | { type: 'AUTO_SCROLL_DISABLED' }
  | { type: 'REDUCED_MOTION_ENABLED' }
  | { type: 'REDUCED_MOTION_DISABLED' };

export interface CinematicScrollContext {
  /** immersion.master && immersion.autoScroll */
  autoScrollEnabled: boolean;
  prefersReducedMotion: boolean;
  /** Narration is playing (not paused, not stopped). */
  narrationActive: boolean;
  narrationPaused: boolean;
  /** The user manually took control while narration was active. */
  userYielded: boolean;
}

export const initialContext: CinematicScrollContext = {
  autoScrollEnabled: true,
  prefersReducedMotion: false,
  narrationActive: false,
  narrationPaused: false,
  userYielded: false,
};

/** Movement is permitted only in `following`. */
export function deriveState(ctx: CinematicScrollContext): CinematicScrollState {
  if (!ctx.narrationActive) return 'idle';
  if (ctx.narrationPaused) return 'paused';
  if (!ctx.autoScrollEnabled || ctx.prefersReducedMotion) return 'suppressed';
  if (ctx.userYielded) return 'yielded';
  return 'following';
}

export function reduce(
  ctx: CinematicScrollContext,
  event: CinematicScrollEvent,
): CinematicScrollContext {
  switch (event.type) {
    case 'NARRATION_STARTED':
      // A fresh start clears any prior yield — the user pressed play.
      return { ...ctx, narrationActive: true, narrationPaused: false, userYielded: false };
    case 'NARRATION_PAUSED':
      return ctx.narrationActive ? { ...ctx, narrationPaused: true } : ctx;
    case 'NARRATION_RESUMED':
      // Resuming paused narration does NOT clear a user yield; only an
      // explicit RESUME_REQUESTED restores automated movement.
      return ctx.narrationActive ? { ...ctx, narrationPaused: false } : ctx;
    case 'NARRATION_ENDED':
      return { ...ctx, narrationActive: false, narrationPaused: false, userYielded: false };
    case 'USER_INTERVENED':
      // Yield is permanent until the user explicitly resumes.
      return ctx.narrationActive ? { ...ctx, userYielded: true } : ctx;
    case 'RESUME_REQUESTED':
      return { ...ctx, userYielded: false };
    case 'AUTO_SCROLL_ENABLED':
      return { ...ctx, autoScrollEnabled: true };
    case 'AUTO_SCROLL_DISABLED':
      return { ...ctx, autoScrollEnabled: false };
    case 'REDUCED_MOTION_ENABLED':
      return { ...ctx, prefersReducedMotion: true };
    case 'REDUCED_MOTION_DISABLED':
      return { ...ctx, prefersReducedMotion: false };
    default:
      return ctx;
  }
}
