/**
 * Closed-Door Cultivation — time-away reward math, lifetime active-day
 * tracking, and the local markers that make a return reward claimable
 * exactly once.
 *
 * Two measurements are kept deliberately separate:
 *  - time away (last session end) determines the Qi reward, and
 *  - total active Library days drives the displayed cultivating-day count
 *    and progression quote.
 */

/** Absolute ceiling for a single return claim — never display or grant more. */
export const MAX_IDLE_QI_REWARD = 350;
/** Minimum time away before any Qi condenses. */
export const IDLE_MIN_AWAY_MS = 60 * 1000; // 1 minute
/** Qi stops condensing after this much time away. */
export const IDLE_MAX_AWAY_MS = 24 * 60 * 60 * 1000; // 24 hours
/** Existing reward curve: 1 Qi per 10 minutes away (max 144 per day away). */
export const IDLE_QI_PER_MS = 1 / (10 * 60 * 1000);

const LAST_SESSION_END_KEY = 'seihouse-last-session-end';
const CLAIM_MARKER_PREFIX = 'seihouse-idle-claim:';
const ACTIVE_DAYS_PREFIX = 'seihouse-library-days:';

/**
 * Qi condensed while the user was away, measured from the session-end
 * baseline. Preserves the existing curve (1 Qi per 10 minutes, earning
 * capped at 24h away) and enforces the absolute 350-Qi ceiling so corrupt
 * or impossible timestamps can never produce more.
 */
export function computeIdleQiReward(
  baselineIso: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (!baselineIso) return 0;
  const baselineMs = Date.parse(baselineIso);
  if (!Number.isFinite(baselineMs)) return 0;
  const diffMs = nowMs - baselineMs;
  if (!Number.isFinite(diffMs) || diffMs <= IDLE_MIN_AWAY_MS) return 0;
  const cappedDiff = Math.min(diffMs, IDLE_MAX_AWAY_MS);
  const qi = Math.floor(cappedDiff * IDLE_QI_PER_MS);
  if (qi <= 0) return 0;
  return Math.min(qi, MAX_IDLE_QI_REWARD);
}

/** The later of two ISO timestamps, tolerating missing/invalid values. */
export function latestIsoTimestamp(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const aMs = a ? Date.parse(a) : NaN;
  const bMs = b ? Date.parse(b) : NaN;
  const aValid = Number.isFinite(aMs);
  const bValid = Number.isFinite(bMs);
  if (aValid && bValid) return aMs >= bMs ? (a as string) : (b as string);
  if (aValid) return a as string;
  if (bValid) return b as string;
  return null;
}

// --- Time-away baseline (this device) ---------------------------------------

export function readLocalSessionEnd(): string | null {
  try {
    return localStorage.getItem(LAST_SESSION_END_KEY);
  } catch {
    return null;
  }
}

export function writeLocalSessionEnd(iso: string): void {
  try {
    localStorage.setItem(LAST_SESSION_END_KEY, iso);
  } catch {
    /* storage unavailable — the server-side lastSessionEnd still covers signed-in users */
  }
}

// --- Claim markers (consumed reward baselines) ------------------------------

/**
 * Records that the reward measured from `baselineIso` has been claimed by
 * this account on this device. The server-side `lastSessionEnd` is the
 * cross-device consumed marker; this local marker makes the consumption
 * visible synchronously to every tab on this device.
 */
export function markIdleBaselineClaimed(uid: string, baselineIso: string): void {
  try {
    localStorage.setItem(`${CLAIM_MARKER_PREFIX}${uid}`, baselineIso);
  } catch {
    /* non-fatal — the server-side marker still prevents duplicate claims */
  }
}

export function readIdleClaimMarker(uid: string): string | null {
  try {
    return localStorage.getItem(`${CLAIM_MARKER_PREFIX}${uid}`);
  } catch {
    return null;
  }
}

/** True when a claim already consumed the reward measured from `baselineIso`. */
export function isIdleBaselineClaimed(uid: string, baselineIso: string): boolean {
  const marker = readIdleClaimMarker(uid);
  if (!marker) return false;
  const markerMs = Date.parse(marker);
  const baselineMs = Date.parse(baselineIso);
  if (!Number.isFinite(markerMs) || !Number.isFinite(baselineMs)) return false;
  return markerMs >= baselineMs;
}

// --- Lifetime active Library days -------------------------------------------

/** Local calendar day key (YYYY-MM-DD), matching lastInteractionDate's format. */
export function localDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readActiveDaySet(uid: string): string[] {
  try {
    const raw = localStorage.getItem(`${ACTIVE_DAYS_PREFIX}${uid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

/**
 * Counts today as an active Library day for this account and returns the
 * lifetime unique-day total. Repeat visits on the same calendar day count
 * once, and the count never resets when days are missed.
 */
export function touchLibraryActiveDay(uid: string, dayKey: string = localDayKey()): number {
  const days = readActiveDaySet(uid);
  if (days.includes(dayKey)) return days.length;
  days.push(dayKey);
  try {
    localStorage.setItem(`${ACTIVE_DAYS_PREFIX}${uid}`, JSON.stringify(days));
  } catch {
    /* non-fatal — the count simply recomputes from what was stored */
  }
  return days.length;
}

/** Lifetime unique active Library days recorded for this account. */
export function getLibraryActiveDayCount(uid: string): number {
  return readActiveDaySet(uid).length;
}
