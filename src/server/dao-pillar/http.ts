import { type DaoPillarCalendarSnapshot, type DaoPillarClaimResponse, type DaoPillarHttpError } from '@seihouse/library/dao-pillar';
import type { PrincipalResolver } from '../identity/authentication';
import { QiValidationError } from '../qi/qiLedger';
import { DaoPillarNotAvailableError, DaoPillarUnsupportedRewardError, DaoPillarValidationError } from './repository';
import type { DaoPillarService } from './service';

export interface DaoPillarHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface DaoPillarHttpResponse {
  status: number;
  body: DaoPillarCalendarSnapshot | DaoPillarClaimResponse | DaoPillarHttpError;
  headers?: Record<string, string>;
}

export interface DaoPillarHttpDependencies {
  service: DaoPillarService;
  resolvePrincipal: PrincipalResolver;
  onError?: (error: unknown) => void;
}

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const errorResponse = (status: number, code: DaoPillarHttpError['code'], error: string): DaoPillarHttpResponse => ({
  status,
  body: { error, code },
  headers: { ...NO_STORE },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseBody = (body: unknown): Record<string, unknown> => {
  const parsed = typeof body === 'string' ? (body.trim() ? JSON.parse(body) : {}) : body ?? {};
  if (!isRecord(parsed)) throw new DaoPillarValidationError(['The Dao Pillar request must be a JSON object.']);
  return parsed;
};

/**
 * The browser-facing Dao Pillar boundary.
 *
 * - `GET`  → the caller's calendar snapshot.
 * - `POST { operation: 'claim' }` → claims today's scheduled day. The body
 *   names no day, date or amount; the server decides all three.
 */
export async function handleDaoPillarHttp(
  request: DaoPillarHttpRequest,
  dependencies: DaoPillarHttpDependencies,
): Promise<DaoPillarHttpResponse> {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET' && method !== 'POST') {
    return { ...errorResponse(405, 'method_not_allowed', 'Method not allowed.'), headers: { ...NO_STORE, Allow: 'GET, POST' } };
  }
  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) return errorResponse(401, 'unauthenticated', 'Sign in to open your Dao Pillar.');
  try {
    if (method === 'GET') {
      return { status: 200, body: await dependencies.service.getSnapshot(principal), headers: { ...NO_STORE } };
    }
    const body = parseBody(request.body);
    if (body.operation !== 'claim') throw new DaoPillarValidationError(['Unknown Dao Pillar operation.']);
    return { status: 200, body: await dependencies.service.claimToday(principal), headers: { ...NO_STORE } };
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse(400, 'invalid_request', 'The Dao Pillar request body is not valid JSON.');
    if (error instanceof DaoPillarValidationError || error instanceof QiValidationError) return errorResponse(400, 'invalid_request', error.message);
    if (error instanceof DaoPillarNotAvailableError) return errorResponse(409, 'not_available', error.message);
    if (error instanceof DaoPillarUnsupportedRewardError) {
      dependencies.onError?.(error);
      return errorResponse(503, 'unavailable', 'Today’s reward cannot be delivered yet. Please try again later.');
    }
    dependencies.onError?.(error);
    return errorResponse(503, 'unavailable', 'The Dao Pillar is unavailable right now. Please try again shortly.');
  }
}
