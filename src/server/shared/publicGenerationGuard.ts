/**
 * Low-friction guard for the Development-only endpoints that can spend provider
 * credits. It deliberately does not introduce a browser-held secret: requests
 * must originate from the page serving the endpoint, and each Vercel visitor
 * has a small fixed request budget before provider work can begin.
 *
 * This is an abuse-control layer, not an identity or account-permission system.
 * Production must use its authenticated application boundary when these routes
 * are moved out of the Development Workshop.
 *
 * The owner's Development access token (`STORY_SEED_BLUEPRINT_ACCESS_TOKEN`,
 * the one that also unlocks World Blueprints) lifts the limit: see
 * `ownerTokenAdmission`.
 */
import { hasValidBearerToken } from './bearerToken';

export interface RequestWithHeaders {
  headers?: Record<string, string | string[] | undefined>;
}

export interface PublicGenerationLimit {
  key: string;
  limit: number;
  windowMs: number;
}

export interface PublicGenerationGuardResult {
  allowed: boolean;
  status?: 401 | 403 | 429;
  error?: string;
  retryAfterSeconds?: number;
}

const header = (request: RequestWithHeaders, name: string): string | undefined => {
  const entry = Object.entries(request.headers ?? {})
    .find(([headerName]) => headerName.toLowerCase() === name.toLowerCase());
  const value = entry?.[1];
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
};

const visitorKey = (request: RequestWithHeaders): string => {
  const forwarded = header(request, 'x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || header(request, 'x-real-ip') || 'unknown-visitor';
};

const isSameOriginBrowserRequest = (request: RequestWithHeaders): boolean => {
  const origin = header(request, 'origin');
  const host = header(request, 'host');
  if (!origin || !host) return false;
  try {
    const source = new URL(origin);
    return (source.protocol === 'https:' || source.protocol === 'http:')
      && source.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
};

/** The owner's Development access token, when the server has one. */
export const developmentAccessToken = (environment: Record<string, string | undefined>): string | undefined =>
  environment.STORY_SEED_BLUEPRINT_ACCESS_TOKEN?.trim() || undefined;

/**
 * The owner's token lifts the visitor limit. A request carrying it is let
 * through; one carrying another token is refused, so the page can ask again.
 * Without a token, or on a server with none set, the visitor limit applies
 * (`undefined`: ask the guard).
 */
export const ownerTokenAdmission = (
  request: RequestWithHeaders,
  ownerToken: string | undefined,
): PublicGenerationGuardResult | undefined => {
  if (!ownerToken || !header(request, 'authorization')) return undefined;
  return hasValidBearerToken(request, ownerToken)
    ? { allowed: true }
    : { allowed: false, status: 401, error: 'The access token was not accepted.' };
};

interface RateWindow {
  startsAt: number;
  count: number;
}

const MAX_TRACKED_VISITORS = 1_000;

/** One Vercel process can safely share this small, bounded limiter. */
export const createPublicGenerationGuard = (
  limit: PublicGenerationLimit,
  now: () => number = () => Date.now(),
) => {
  const windows = new Map<string, RateWindow>();

  const reapExpired = (current: number) => {
    for (const [key, window] of windows) {
      if (current - window.startsAt >= limit.windowMs) windows.delete(key);
    }
  };

  const evictOldest = () => {
    const oldestKey = windows.keys().next().value;
    if (oldestKey !== undefined) windows.delete(oldestKey);
  };

  return (request: RequestWithHeaders): PublicGenerationGuardResult => {
    if (!isSameOriginBrowserRequest(request)) {
      return {
        allowed: false,
        status: 403,
        error: 'This Development action must be started from the Library page.',
      };
    }

    const current = now();
    const key = `${limit.key}:${visitorKey(request)}`;
    reapExpired(current);
    const existing = windows.get(key);
    const active = !existing
      ? { startsAt: current, count: 0 }
      : existing;

    if (active.count >= limit.limit) {
      const remainingMs = Math.max(0, limit.windowMs - (current - active.startsAt));
      windows.set(key, active);
      return {
        allowed: false,
        status: 429,
        error: 'This Development action has reached its temporary request limit. Please try again shortly.',
        retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1_000)),
      };
    }

    active.count += 1;
    if (!existing) {
      if (windows.size >= MAX_TRACKED_VISITORS) evictOldest();
      active.startsAt = current;
    }
    windows.set(key, active);
    return { allowed: true };
  };
};
