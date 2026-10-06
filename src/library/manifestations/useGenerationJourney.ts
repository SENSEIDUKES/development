import { useEffect, useRef, useState } from 'react';

// LibraryScrubber takes 800ms to reach a new position. Let it arrive before fading out.
const ARRIVAL_MS = 1000;
const DEFAULT_DURATION_MS = 45_000;
const PENDING_LIMIT = 0.94;

interface JourneyInput {
  active: boolean;
  completed: boolean;
  operation: string;
  identity: string;
  progress: number | null;
  estimatedSecondsRemaining: number | null;
}

/** Presentation time only. Never counts generated work or changes a generation request. */
export function useGenerationJourney(input: JourneyInput) {
  const latest = useRef(input);
  latest.current = input;
  const durations = useRef(new Map<string, number>());
  const run = useRef<{ startedAt: number; identity: string; operation: string } | null>(null);
  const [journey, setJourney] = useState({ progress: 0, arriving: false });

  useEffect(() => {
    if (!input.active) {
      const finished = run.current;
      run.current = null;
      if (finished?.identity === input.identity && input.completed) {
        durations.current.set(finished.operation, Math.max(1000, performance.now() - finished.startedAt));
        setJourney({ progress: 1, arriving: true });
        const timer = setTimeout(() => setJourney({ progress: 1, arriving: false }), ARRIVAL_MS);
        return () => clearTimeout(timer);
      }
      setJourney(previous => ({ ...previous, arriving: false }));
      return;
    }
    const startedAt = performance.now();
    run.current = { startedAt, identity: input.identity, operation: input.operation };
    const remaining = latest.current.estimatedSecondsRemaining;
    const expectedMs = remaining !== null && Number.isFinite(remaining) && remaining > 0
      ? remaining * 1000
      : durations.current.get(input.operation) ?? DEFAULT_DURATION_MS;
    let furthest = 0;

    const advance = () => {
      const current = latest.current;
      const elapsed = Math.max(0, performance.now() - startedAt);
      const known = current.progress !== null && Number.isFinite(current.progress);
      // Whole-response providers expose no fraction. Move with elapsed time, slowing
      // near the destination, and reserve arrival for a successful result.
      const position = known ? current.progress! / 100
        : 0.02 + (PENDING_LIMIT - 0.02) * (1 - Math.exp(-elapsed / expectedMs));
      furthest = Math.max(furthest, Math.min(PENDING_LIMIT, Math.max(0, position)));
      setJourney({ progress: furthest, arriving: false });
    };
    advance();
    const ticker = setInterval(advance, 250);

    return () => clearInterval(ticker);
  }, [input.active, input.identity, input.operation]);

  // Keep the primary veil in the tree on the very render that ends generation;
  // waiting for the effect would let AnimatePresence start its exit a frame early.
  if (!input.active && input.completed && run.current?.identity === input.identity) {
    return { progress: 1, arriving: true };
  }
  if (input.active && run.current?.identity !== input.identity) {
    const known = input.progress !== null && Number.isFinite(input.progress);
    return { progress: known ? Math.min(PENDING_LIMIT, Math.max(0, input.progress! / 100)) : 0.02, arriving: false };
  }
  return journey;
}
