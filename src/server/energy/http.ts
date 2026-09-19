import { ENERGY_PRICE_CATALOG, type EnergyAccountSnapshot, type EnergyHttpError } from '@seihouse/library/energy';
import type { PrincipalResolver } from '../identity/authentication';
import {
  EnergyConflictError,
  EnergyNotFoundError,
  EnergyValidationError,
  InsufficientEnergyError,
} from './repository';
import { EnergyAuthorizationError, type EnergyService } from './service';

export interface EnergyHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface EnergyHttpResponse {
  status: number;
  body: EnergyAccountSnapshot | EnergyHttpError | { prices: typeof ENERGY_PRICE_CATALOG };
  headers?: Record<string, string>;
}

export interface EnergyHttpDependencies {
  service: EnergyService;
  resolvePrincipal: PrincipalResolver;
  onError?: (error: unknown) => void;
}

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const errorResponse = (status: number, code: EnergyHttpError['code'], error: string): EnergyHttpResponse => ({
  status,
  body: { error, code },
  headers: { ...NO_STORE },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseBody = (body: unknown): Record<string, unknown> => {
  const parsed = typeof body === 'string' ? (body.trim() ? JSON.parse(body) : {}) : body ?? {};
  if (!isRecord(parsed)) throw new EnergyValidationError(['The Energy request must be a JSON object.']);
  return parsed;
};

/**
 * The browser-facing Energy boundary.
 *
 * - `GET`  → the caller's account snapshot (balance, prices, recent activity).
 * - `POST` → one of the development-only operations. Reserving, settling and
 *   releasing are deliberately not routes: they belong to server-side
 *   generation code, so a browser can never decide that a charge succeeded.
 */
export async function handleEnergyHttp(
  request: EnergyHttpRequest,
  dependencies: EnergyHttpDependencies,
): Promise<EnergyHttpResponse> {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET' && method !== 'POST') {
    return { ...errorResponse(405, 'method_not_allowed', 'Method not allowed.'), headers: { ...NO_STORE, Allow: 'GET, POST' } };
  }

  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) {
    return errorResponse(401, 'unauthenticated', 'Sign in to see your Energy.');
  }

  try {
    if (method === 'GET') {
      return { status: 200, body: await dependencies.service.getSnapshot(principal), headers: { ...NO_STORE } };
    }
    const body = parseBody(request.body);
    switch (body.operation) {
      case 'development.grant': {
        if (typeof body.idempotencyKey !== 'string') {
          throw new EnergyValidationError(['A development grant needs an idempotency key.']);
        }
        if (body.amount !== undefined && typeof body.amount !== 'number') {
          throw new EnergyValidationError(['The grant amount must be a number.']);
        }
        await dependencies.service.grantDevelopment(principal, {
          amount: body.amount as number | undefined,
          idempotencyKey: body.idempotencyKey,
        });
        break;
      }
      case 'development.reset':
        await dependencies.service.resetDevelopment(principal);
        break;
      default:
        throw new EnergyValidationError(['Unknown Energy operation.']);
    }
    return { status: 200, body: await dependencies.service.getSnapshot(principal), headers: { ...NO_STORE } };
  } catch (error) {
    if (error instanceof EnergyAuthorizationError) return errorResponse(403, 'forbidden', error.message);
    if (error instanceof SyntaxError) return errorResponse(400, 'invalid_request', 'The Energy request body is not valid JSON.');
    if (error instanceof EnergyValidationError) return errorResponse(400, 'invalid_request', error.message);
    if (error instanceof InsufficientEnergyError || error instanceof EnergyConflictError || error instanceof EnergyNotFoundError) {
      return errorResponse(409, 'invalid_request', error.message);
    }
    dependencies.onError?.(error);
    return errorResponse(503, 'unavailable', 'Energy is unavailable right now. Please try again shortly.');
  }
}
