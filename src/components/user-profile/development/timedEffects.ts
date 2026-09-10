import { useEffect, useState } from 'react';
import type { ActiveStatusEffect } from '../shared/types';

export const EMPTY_ACTIVE_STATUS_EFFECTS: readonly ActiveStatusEffect[] = [];
const MINUTE_MS = 60_000;

/** Whether an effect is active at a concrete instant, rather than merely stored. */
export function isEffectActive(effect: ActiveStatusEffect, now: number) {
  const startsAt = Date.parse(effect.appliedAt);
  const expiresAt = Date.parse(effect.expiresAt);
  return Number.isFinite(startsAt) && Number.isFinite(expiresAt) && startsAt <= now && expiresAt > now;
}

/**
 * Returns the next moment the Profile needs a fresh clock value, or `null`
 * when the page has no timed effect to render. Active duration labels refresh
 * once per minute; future starts and expirations refresh at their exact edge.
 */
export function nextEffectRefreshDelay(
  effects: readonly ActiveStatusEffect[],
  now: number,
  includeDurationTick = false,
): number | null {
  let nextRefreshAt = Number.POSITIVE_INFINITY;

  for (const effect of effects) {
    for (const timestamp of [Date.parse(effect.appliedAt), Date.parse(effect.expiresAt)]) {
      if (Number.isFinite(timestamp) && timestamp > now) {
        nextRefreshAt = Math.min(nextRefreshAt, timestamp);
      }
    }
  }

  if (includeDurationTick && effects.some(effect => isEffectActive(effect, now))) {
    nextRefreshAt = Math.min(nextRefreshAt, (Math.floor(now / MINUTE_MS) + 1) * MINUTE_MS);
  }

  return Number.isFinite(nextRefreshAt) ? Math.max(1, nextRefreshAt - now) : null;
}

/**
 * A visibility-aware, one-shot clock for the few Profile paths that show
 * effect time. It avoids the former duplicate, every-second shell re-renders.
 */
export function useProfileEffectClock(
  effects: readonly ActiveStatusEffect[],
  includeDurationTick: boolean,
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const initialNow = Date.now();
    if (nextEffectRefreshDelay(effects, initialNow, includeDurationTick) === null) return;

    let timer: number | undefined;
    let isTracking = true;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const stopTracking = () => {
      if (!isTracking) return;
      isTracking = false;
      clearTimer();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

    const schedule = () => {
      clearTimer();
      if (document.visibilityState === 'hidden') return;

      const delay = nextEffectRefreshDelay(effects, Date.now(), includeDurationTick);
      if (delay === null) {
        stopTracking();
        return;
      }

      timer = window.setTimeout(() => {
        timer = undefined;
        setNow(Date.now());
        schedule();
      }, delay);
    };

    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      const refreshedNow = Date.now();
      if (nextEffectRefreshDelay(effects, refreshedNow, includeDurationTick) === null) {
        stopTracking();
        return;
      }
      setNow(refreshedNow);
      schedule();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearTimer();
        return;
      }
      refresh();
    };

    // Navigation into an effect surface must not render a stale duration from
    // the last time that surface was open. Other Profile destinations pass no
    // effects and therefore install neither a timer nor global listeners.
    setNow(initialNow);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    schedule();
    return () => {
      stopTracking();
    };
  }, [effects, includeDurationTick]);

  return now;
}
