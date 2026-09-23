import {
  isLibraryActivityKind,
  type AchievementsHttpError,
  type AchievementsSnapshot,
  type OpenMysteryScrollResponse,
  type RecordLibraryActivityResponse,
} from '@seihouse/library/rewards';
import { DaoXpConflictError, DaoXpValidationError } from '../dao-xp/daoXpLedger';
import type { IdentityRequest, PrincipalResolver } from '../identity/authentication';
import { QiConflictError } from '../qi/qiLedger';
import { RewardPolicyError } from '../rewards/deliverer';
import { AchievementValidationError, MysteryScrollNotFoundError } from './repository';
import type { AchievementService } from './service';

export interface AchievementsHttpResponse {
  status: number;
  body: AchievementsSnapshot | OpenMysteryScrollResponse | RecordLibraryActivityResponse | AchievementsHttpError;
  headers?: Record<string, string>;
}

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const failure = (status: number, code: AchievementsHttpError['code'], error: string): AchievementsHttpResponse =>
  ({ status, body: { error, code }, headers: { ...NO_STORE } });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * The browser-facing Achievements boundary.
 *
 * - `GET` → the caller's achievements and Mystery Scrolls, redacted.
 * - `POST { operation: 'open-scroll', scrollId }` → opens one of the caller's
 *   scrolls. The body names no reward; the server delivers what the scroll holds.
 * - `POST { operation: 'development.record-activity', kind, subjectId, storyId? }`
 *   → the Workshop's stand-in for trusted activity, refused for every
 *   principal without development access. A production host records activity
 *   from its own servers through `AchievementService.recordActivity`.
 */
export async function handleAchievementsHttp(
  request: IdentityRequest & { method?: string; body?: unknown },
  dependencies: { service: AchievementService; resolvePrincipal: PrincipalResolver; onError?: (error: unknown) => void },
): Promise<AchievementsHttpResponse> {
  const method = (request.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') return { ...failure(405, 'method_not_allowed', 'Method not allowed.'), headers: { ...NO_STORE, Allow: 'GET, POST' } };
  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) return failure(401, 'unauthenticated', 'Sign in to see your achievements.');
  try {
    if (method === 'GET') return { status: 200, body: await dependencies.service.getSnapshot(principal), headers: { ...NO_STORE } };
    const body = typeof request.body === 'string' ? (request.body.trim() ? JSON.parse(request.body) : {}) : request.body ?? {};
    if (!isRecord(body)) throw new AchievementValidationError(['The achievements request must be a JSON object.']);
    if (body.operation === 'open-scroll') {
      if (typeof body.scrollId !== 'string') throw new AchievementValidationError(['A scroll id is required.']);
      return { status: 200, body: await dependencies.service.openScroll(principal, body.scrollId), headers: { ...NO_STORE } };
    }
    if (body.operation === 'development.record-activity') {
      if (!principal.developmentAccess) return failure(403, 'forbidden', 'Simulated activity is not available for this account.');
      if (!isLibraryActivityKind(body.kind) || typeof body.subjectId !== 'string' || (body.storyId !== undefined && typeof body.storyId !== 'string')) {
        throw new AchievementValidationError(['A simulated activity needs a known kind and a subject.']);
      }
      return {
        status: 200,
        body: await dependencies.service.recordActivity(principal.uid, { kind: body.kind, subjectId: body.subjectId, storyId: body.storyId as string | undefined }),
        headers: { ...NO_STORE },
      };
    }
    throw new AchievementValidationError(['Unknown achievements operation.']);
  } catch (error) {
    if (error instanceof SyntaxError) return failure(400, 'invalid_request', 'The achievements request body is not valid JSON.');
    if (error instanceof AchievementValidationError) return failure(400, 'invalid_request', error.message);
    if (error instanceof MysteryScrollNotFoundError) return failure(404, 'not_found', error.message);
    if (error instanceof RewardPolicyError || error instanceof QiConflictError || error instanceof DaoXpConflictError || error instanceof DaoXpValidationError) {
      dependencies.onError?.(error);
      return failure(503, 'unavailable', 'This reward cannot be delivered right now. Nothing was credited; please try again later.');
    }
    dependencies.onError?.(error);
    return failure(503, 'unavailable', 'Achievements are unavailable right now. Please try again shortly.');
  }
}
