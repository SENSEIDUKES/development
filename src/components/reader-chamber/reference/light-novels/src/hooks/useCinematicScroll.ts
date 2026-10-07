import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  createDocumentScrollSurface,
  getFocusLine,
  ScrollSurface,
} from '../lib/cinematicScroll/scrollSurface';
import {
  CinematicScrollContext,
  CinematicScrollEvent,
  CinematicScrollState,
  deriveState,
  initialContext,
  reduce,
} from '../lib/cinematicScroll/stateMachine';
import {
  SpringState,
  DEFAULT_SPRING_CONFIG,
  stepSpring,
  lerp,
} from '../lib/cinematicScroll/springController';
import { NarrationEventDetail } from '../lib/narrativeCues';
import { cinematicEffectGovernor } from '../lib/effects/cinematicEffectGovernor';

/**
 * If a document `scroll` event lands further than this from the position the
 * controller just wrote, someone else (scrollbar drag, find-in-page, browser
 * anchor) moved the page — treat it as user intervention.
 */
const EXTERNAL_SCROLL_TOLERANCE_PX = 12;

const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown', 'Home', 'End'];

/** Cached geometry for the narration segment currently being spoken. */
interface NarrationSegment {
  blockIndex: number;
  /** Document position placing the active block on the focus line. */
  fromPosition: number;
  /** Same for the next block (or end of the active block when last). */
  toPosition: number;
  startedAt: number;
  durationMs: number;
  /** Progress already completed when this segment measurement was emitted. */
  initialProgress: number;
  /** Cached bounds so the frame loop never reads scrollHeight. */
  maxPosition: number;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    tag === 'button' ||
    el.isContentEditable
  );
};

/**
 * useCinematicScroll
 *
 * The single narration-following scroll controller for the SEIHOUSE reader.
 *
 * Architecture:
 *   narration events (seihouse-narration) → state machine → cached segment
 *   geometry → narration-timeline target → critically damped spring →
 *   document.scrollingElement.scrollTop
 *
 * Rules:
 * - The document is the only scroll surface; writes are clamped to bounds.
 * - Movement happens only in the `following` state (Auto Scroll preference
 *   on, narration playing, no reduced motion, user has not intervened).
 * - Any manual scroll input yields permanently; only the explicit `resume()`
 *   action restores automated movement. There is no timed auto-resume.
 * - Automated following is forward-only, but an explicit `resume()` re-locks:
 *   the spring is allowed to glide back (or forward) to the narration target
 *   once, so the reader lands centered on the focus line instead of holding
 *   whatever off-center position they yielded at.
 * - The frame loop reads cached numbers, integrates the spring, and writes
 *   scrollTop — it performs no DOM queries or geometry measurement.
 */
export function useCinematicScroll(
  contentRef: React.RefObject<HTMLElement | null>,
  onStateChange?: (state: CinematicScrollState) => void,
) {
  const [state, setState] = useState<CinematicScrollState>('idle');

  const surfaceRef = useRef<ScrollSurface | null>(null);
  const getSurface = useCallback((): ScrollSurface => {
    if (!surfaceRef.current) surfaceRef.current = createDocumentScrollSurface();
    return surfaceRef.current;
  }, []);

  const ctxRef = useRef<CinematicScrollContext>({ ...initialContext });
  const stateRef = useRef<CinematicScrollState>('idle');
  const segmentRef = useRef<NarrationSegment | null>(null);
  const springRef = useRef<SpringState>({ position: 0, velocity: 0 });
  const rafRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const lastWrittenRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  /**
   * Set by an explicit resume(): the next following session may move backward
   * once to re-center the narrated block on the focus line. Cleared as soon as
   * the spring reaches the timeline target (or the target moves ahead of it),
   * after which the normal forward-only rule applies again.
   */
  const relockRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const immersionMaster = useAppStore((s) => s.immersion.master);
  const immersionAutoScroll = useAppStore((s) => s.immersion.autoScroll);

  const autoScrollEnabled = immersionMaster && immersionAutoScroll;

  // --- Frame loop -----------------------------------------------------------
  const stopLoop = useCallback(() => {
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    lastTimeRef.current = undefined;
    lastWrittenRef.current = null;
  }, []);

  const frame = useCallback(
    function step(time: number) {
      if (stateRef.current !== 'following') {
        rafRef.current = undefined;
        lastTimeRef.current = undefined;
        return;
      }
      const segment = segmentRef.current;
      if (segment && lastTimeRef.current !== undefined) {
        const deltaSeconds = (time - lastTimeRef.current) / 1000;
        const elapsedFraction =
          segment.durationMs > 0
            ? Math.min(Math.max((time - segment.startedAt) / segment.durationMs, 0), 1)
            : 1;
        const progress =
          segment.initialProgress +
          (1 - segment.initialProgress) * elapsedFraction;
        const timelineTarget = lerp(segment.fromPosition, segment.toPosition, progress);

        const spring = springRef.current;
        // Forward-only: never chase a target above the current position.
        // Exception — right after an explicit Resume Reading, glide back to
        // the narration target so the reader re-locks on the focus line
        // instead of holding an off-center position forever.
        let target: number;
        if (relockRef.current) {
          target = Math.min(Math.max(timelineTarget, 0), segment.maxPosition);
          if (target >= spring.position || Math.abs(target - spring.position) <= 1) {
            relockRef.current = false;
          }
        } else {
          target = Math.min(
            Math.max(timelineTarget, spring.position),
            segment.maxPosition,
          );
        }

        const next = stepSpring(spring, target, deltaSeconds, DEFAULT_SPRING_CONFIG);
        // Clamp to cached document bounds — no scrollHeight reads per frame.
        next.position = Math.min(Math.max(next.position, 0), segment.maxPosition);
        springRef.current = next;
        lastWrittenRef.current = next.position;
        getSurface().getElement().scrollTop = next.position;
      }
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(step);
    },
    [getSurface],
  );

  const startLoop = useCallback(() => {
    if (rafRef.current !== undefined) return;
    lastTimeRef.current = undefined;
    rafRef.current = requestAnimationFrame(frame);
  }, [frame]);

  // --- Geometry (only outside the frame loop) -------------------------------
  /**
   * Resolve document positions that put the active block (and the next one)
   * on the focus line. Called at chunk boundaries and layout invalidations,
   * never per frame.
   */
  const measureSegment = useCallback(
    (
      blockIndex: number,
      durationMs: number,
      startedAt: number,
      initialProgress = 0,
    ): NarrationSegment | null => {
      const container = contentRef.current;
      if (!container) return null;
      const active = container.querySelector<HTMLElement>(
        `[data-paragraph-index="${blockIndex}"]`,
      );
      if (!active) return null;

      const surface = getSurface();
      const scrollTop = surface.getPosition();
      const maxPosition = surface.getMaxPosition();
      const focusLine = getFocusLine();

      const activeRect = active.getBoundingClientRect();
      const fromPosition = activeRect.top + scrollTop - focusLine;

      const next = container.querySelector<HTMLElement>(
        `[data-paragraph-index="${blockIndex + 1}"]`,
      );
      const toPosition = next
        ? next.getBoundingClientRect().top + scrollTop - focusLine
        : fromPosition + activeRect.height;

      return {
        blockIndex,
        fromPosition: Math.min(Math.max(fromPosition, 0), maxPosition),
        toPosition: Math.min(Math.max(toPosition, 0), maxPosition),
        startedAt,
        durationMs,
        initialProgress: Math.min(Math.max(initialProgress, 0), 1),
        maxPosition,
      };
    },
    [contentRef, getSurface],
  );

  /** Re-measure the current segment after a layout-invalidating transition. */
  const invalidateGeometry = useCallback(() => {
    const segment = segmentRef.current;
    if (!segment) return;
    const remeasured = measureSegment(
      segment.blockIndex,
      segment.durationMs,
      segment.startedAt,
      segment.initialProgress,
    );
    if (remeasured) segmentRef.current = remeasured;
    // Reset the spring at the live position so a geometry change can't fling.
    springRef.current = { position: getSurface().getPosition(), velocity: 0 };
    lastWrittenRef.current = null;
  }, [measureSegment, getSurface]);

  // --- State machine dispatch ------------------------------------------------
  const dispatch = useCallback(
    (event: CinematicScrollEvent) => {
      const nextCtx = reduce(ctxRef.current, event);
      if (nextCtx === ctxRef.current) return;
      ctxRef.current = nextCtx;
      const nextState = deriveState(nextCtx);
      if (nextState === stateRef.current) return;
      const prevState = stateRef.current;
      stateRef.current = nextState;
      setState(nextState);
      onStateChangeRef.current?.(nextState);

      // Automated cinematic scroll is a cinematic mode of its own: it raises
      // the governor signal that permits one-shot audio cues and camera shake.
      // A future cinematic-scroll mode without TTS activates the same way —
      // by entering `following` — and needs no extra wiring.
      cinematicEffectGovernor.setSignal('cinematic-scroll', nextState === 'following');

      if (nextState === 'following') {
        // (Re)entering following: sync the spring to the live scroll offset
        // and refresh segment geometry — the user may have moved the page.
        springRef.current = { position: getSurface().getPosition(), velocity: 0 };
        if (segmentRef.current) {
          const s = segmentRef.current;
          const remeasured = measureSegment(
            s.blockIndex,
            s.durationMs,
            s.startedAt,
            s.initialProgress,
          );
          if (remeasured) segmentRef.current = remeasured;
        }
        startLoop();
      } else {
        stopLoop();
        relockRef.current = false;
        if (nextState === 'idle') segmentRef.current = null;
        if (prevState === 'following') springRef.current.velocity = 0;
      }
    },
    [getSurface, measureSegment, startLoop, stopLoop],
  );

  const intervene = useCallback(() => dispatch({ type: 'USER_INTERVENED' }), [dispatch]);

  /**
   * Explicit "Resume Reading". Re-measures the narration target and re-locks
   * onto it: the spring is permitted one backward glide so the narrated block
   * returns to the focus line even when the reader scrolled ahead — an
   * explicit resume is a request to go back to where narration is, not to
   * follow from wherever the page happens to sit.
   */
  const resume = useCallback(() => {
    const segment = segmentRef.current;
    if (segment) {
      const remeasured = measureSegment(
        segment.blockIndex,
        segment.durationMs,
        segment.startedAt,
        segment.initialProgress,
      );
      if (remeasured) segmentRef.current = remeasured;
    }
    relockRef.current = true;
    dispatch({ type: 'RESUME_REQUESTED' });
  }, [dispatch, measureSegment]);

  // --- Auto Scroll preference ------------------------------------------------
  useEffect(() => {
    dispatch({ type: autoScrollEnabled ? 'AUTO_SCROLL_ENABLED' : 'AUTO_SCROLL_DISABLED' });
  }, [autoScrollEnabled, dispatch]);

  // --- Reduced motion ----------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    dispatch({ type: mq.matches ? 'REDUCED_MOTION_ENABLED' : 'REDUCED_MOTION_DISABLED' });
    const onChange = (e: MediaQueryListEvent) => {
      dispatch({ type: e.matches ? 'REDUCED_MOTION_ENABLED' : 'REDUCED_MOTION_DISABLED' });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [dispatch]);

  // --- Narration events --------------------------------------------------------
  useEffect(() => {
    const onNarration = (e: Event) => {
      const detail = (e as CustomEvent<NarrationEventDetail>).detail;
      if (!detail) return;
      switch (detail.status) {
        case 'start':
          pausedAtRef.current = null;
          dispatch({ type: 'NARRATION_STARTED' });
          break;
        case 'pause':
          pausedAtRef.current = performance.now();
          dispatch({ type: 'NARRATION_PAUSED' });
          break;
        case 'resume': {
          const pausedAt = pausedAtRef.current;
          if (pausedAt != null && segmentRef.current) {
            // Narration time must not advance while prerecorded audio is
            // paused. Shift the segment clock forward by the pause duration.
            segmentRef.current.startedAt += performance.now() - pausedAt;
          }
          pausedAtRef.current = null;
          dispatch({ type: 'NARRATION_RESUMED' });
          break;
        }
        case 'end':
          pausedAtRef.current = null;
          dispatch({ type: 'NARRATION_ENDED' });
          break;
        case 'block': {
          if (detail.blockIndex == null || detail.blockIndex < 0) break;
          const normalized = detail.progress;
          const totalDuration =
            normalized?.actualDurationMs ??
            normalized?.estimatedDurationMs ??
            detail.durationMs ??
            0;
          const elapsedMs = normalized?.elapsedMs ?? 0;
          const remainingMs = Math.max(totalDuration - elapsedMs, 0);
          const segment = measureSegment(
            detail.blockIndex,
            remainingMs,
            performance.now(),
            normalized?.progress ?? 0,
          );
          if (segment) {
            segmentRef.current = segment;
            if (stateRef.current === 'following') startLoop();
          }
          break;
        }
      }
    };
    window.addEventListener('seihouse-narration', onNarration);
    return () => window.removeEventListener('seihouse-narration', onNarration);
  }, [dispatch, measureSegment, startLoop]);

  // --- User intervention --------------------------------------------------------
  useEffect(() => {
    const onWheel = () => {
      if (stateRef.current === 'following') intervene();
    };
    const onTouchMove = onWheel;
    const onKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current !== 'following') return;
      if (isTypingTarget(e.target)) return;
      if (SCROLL_KEYS.includes(e.key)) intervene();
    };
    // Scroll events that don't match the controller's own writes mean the
    // scrollbar, find-in-page, or a programmatic jump moved the page.
    const onScroll = () => {
      if (stateRef.current !== 'following') return;
      const written = lastWrittenRef.current;
      if (written == null) return;
      const actual = getSurface().getPosition();
      // Browser scroll events lag rAF writes, so at speed the event may carry
      // a position several frames old. Scale the tolerance with the spring's
      // velocity (~6 frames of lag at 60Hz) to avoid false-positive yields.
      const tolerance = Math.max(
        EXTERNAL_SCROLL_TOLERANCE_PX,
        Math.abs(springRef.current.velocity) * 0.1,
      );
      if (Math.abs(actual - written) > tolerance) intervene();
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    const unsubscribe = getSurface().subscribe(onScroll);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      unsubscribe();
    };
  }, [getSurface, intervene]);

  // --- Geometry-invalidating transitions -----------------------------------------
  const isReaderFullscreen = useAppStore((s) => s.isReaderFullscreen);
  useEffect(() => {
    invalidateGeometry();
  }, [isReaderFullscreen, invalidateGeometry]);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const onResize = () => invalidateGeometry();
    vv?.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('resize', onResize);
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) invalidateGeometry();
      });
    }
    return () => {
      cancelled = true;
      vv?.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('resize', onResize);
    };
  }, [invalidateGeometry]);

  // --- Unmount cleanup -------------------------------------------------------------
  useEffect(() => stopLoop, [stopLoop]);
  useEffect(
    () => () => cinematicEffectGovernor.setSignal('cinematic-scroll', false),
    [],
  );

  return useMemo(
    () => ({ state, resume, intervene }),
    [state, resume, intervene],
  );
}
