import { isFateSurvivalOutcome, type FateSurvivalOutcomeResponse, type RelicsHttpError, type RelicsSnapshot } from '@seihouse/library/relics';
import { DaoXpConflictError } from '../dao-xp/daoXpLedger';
import { EnergyConflictError } from '../energy/repository';
import type { IdentityRequest, PrincipalResolver } from '../identity/authentication';
import { RewardPolicyError } from '../rewards/deliverer';
import { RelicValidationError } from './repository';
import type { RelicService } from './service';

export interface RelicsHttpResponse {
  status: number;
  body: RelicsSnapshot | FateSurvivalOutcomeResponse | RelicsHttpError;
  headers?: Record<string, string>;
}

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const failure = (status: number, code: RelicsHttpError['code'], error: string): RelicsHttpResponse =>
  ({ status, body: { error, code }, headers: { ...NO_STORE } });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * The browser-facing Relics boundary.
 *
 * - `GET` → the caller's Fate Survival Relics.
 * - `POST { operation: 'development.fate-survival-outcome', challengeId, outcome, storyId? }`
 *   → the Workshop's stand-in for the Fate Survival judge, refused for every
 *   principal without development access. No browser operation mints a Relic.
 */
export async function handleRelicsHttp(
  request: IdentityRequest & { method?: string; body?: unknown },
  dependencies: { service: RelicService; resolvePrincipal: PrincipalResolver; onError?: (error: unknown) => void },
): Promise<RelicsHttpResponse> {
  const method = (request.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') return { ...failure(405, 'method_not_allowed', 'Method not allowed.'), headers: { ...NO_STORE, Allow: 'GET, POST' } };
  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) return failure(401, 'unauthenticated', 'Sign in to see your Relics.');
  try {
    if (method === 'GET') return { status: 200, body: await dependencies.service.getSnapshot(principal), headers: { ...NO_STORE } };
    const body = typeof request.body === 'string' ? (request.body.trim() ? JSON.parse(request.body) : {}) : request.body ?? {};
    if (!isRecord(body) || body.operation !== 'development.fate-survival-outcome') throw new RelicValidationError(['Unknown Relics operation.']);
    if (!principal.developmentAccess) return failure(403, 'forbidden', 'Simulated Fate Survival outcomes are not available for this account.');
    if (typeof body.challengeId !== 'string' || !isFateSurvivalOutcome(body.outcome) || (body.storyId !== undefined && typeof body.storyId !== 'string')) {
      throw new RelicValidationError(['A simulated outcome needs a challenge id and a known outcome.']);
    }
    return {
      status: 200,
      body: await dependencies.service.recordFateSurvivalOutcome(principal.uid, { challengeId: body.challengeId, outcome: body.outcome, storyId: body.storyId as string | undefined }),
      headers: { ...NO_STORE },
    };
  } catch (error) {
    if (error instanceof SyntaxError) return failure(400, 'invalid_request', 'The Relics request body is not valid JSON.');
    if (error instanceof RelicValidationError) return failure(400, 'invalid_request', error.message);
    if (error instanceof RewardPolicyError || error instanceof DaoXpConflictError || error instanceof EnergyConflictError) {
      dependencies.onError?.(error);
      return failure(503, 'unavailable', 'This Relic cannot be delivered right now. Nothing was credited; please try again later.');
    }
    dependencies.onError?.(error);
    return failure(503, 'unavailable', 'Relics are unavailable right now. Please try again shortly.');
  }
}
