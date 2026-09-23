import type { FamiliarsHttpError, FamiliarTrainingSnapshot, OfferQiResponse, PurchaseFamiliarResponse } from '@seihouse/library/familiar';
import { InsufficientEnergyError, EnergyConflictError } from '../energy/repository';
import type { IdentityRequest, PrincipalResolver } from '../identity/authentication';
import { QiConflictError, QiInsufficientError } from '../qi/qiLedger';
import { FamiliarConflictError, FamiliarValidationError } from './repository';
import type { FamiliarService } from './service';

export interface FamiliarsHttpResponse {
  status: number;
  body: FamiliarTrainingSnapshot | OfferQiResponse | PurchaseFamiliarResponse | FamiliarsHttpError;
  headers?: Record<string, string>;
}

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const failure = (status: number, code: FamiliarsHttpError['code'], error: string): FamiliarsHttpResponse =>
  ({ status, body: { error, code }, headers: { ...NO_STORE } });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';

/**
 * The browser-facing Familiar boundary.
 *
 * - `GET` → ownership, bonds, masteries and selections for every Familiar.
 * - `POST { operation: 'offer-qi', familiarId, amount, idempotencyKey }` → cultivates one Familiar's bond.
 * - `POST { operation: 'select-form', familiarId, formId }` → chooses a companion's form.
 * - `POST { operation: 'select-elemental-effect', selection }` → chooses the Active Elemental Effect.
 * - `POST { operation: 'purchase', familiarId, currency, price, idempotencyKey }`
 *   → buys it in the Celestial Store at today's server-resolved price.
 * - `POST { operation: 'development.grant-familiar', familiarId }` → Workshop
 *   scenario ownership, refused for every principal without development access.
 */
export async function handleFamiliarsHttp(
  request: IdentityRequest & { method?: string; body?: unknown },
  dependencies: { service: FamiliarService; resolvePrincipal: PrincipalResolver; onError?: (error: unknown) => void },
): Promise<FamiliarsHttpResponse> {
  const method = (request.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') return { ...failure(405, 'method_not_allowed', 'Method not allowed.'), headers: { ...NO_STORE, Allow: 'GET, POST' } };
  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) return failure(401, 'unauthenticated', 'Sign in to see your Familiars.');
  try {
    if (method === 'GET') return { status: 200, body: await dependencies.service.getSnapshot(principal), headers: { ...NO_STORE } };
    const body = typeof request.body === 'string' ? (request.body.trim() ? JSON.parse(request.body) : {}) : request.body ?? {};
    if (!isRecord(body)) throw new FamiliarValidationError(['The Familiar request must be a JSON object.']);
    const ok = (result: FamiliarsHttpResponse['body']): FamiliarsHttpResponse => ({ status: 200, body: result, headers: { ...NO_STORE } });
    switch (body.operation) {
      case 'offer-qi':
        if (typeof body.familiarId !== 'string' || typeof body.amount !== 'number' || typeof body.idempotencyKey !== 'string') throw new FamiliarValidationError(['An offering needs a Familiar, an amount and an idempotency key.']);
        return ok(await dependencies.service.offerQi(principal, { familiarId: body.familiarId, amount: body.amount, idempotencyKey: body.idempotencyKey }));
      case 'select-form':
        if (typeof body.familiarId !== 'string' || !nullableString(body.formId)) throw new FamiliarValidationError(['A form choice needs a Familiar and a form (or null).']);
        return ok(await dependencies.service.selectForm(principal, { familiarId: body.familiarId, formId: body.formId as string | null }));
      case 'select-elemental-effect':
        if (!isRecord(body.selection)) throw new FamiliarValidationError(['An elemental effect choice needs a selection.']);
        return ok(await dependencies.service.selectElementalEffect(principal, body.selection as never));
      case 'purchase':
        if (typeof body.familiarId !== 'string' || (body.currency !== 'qi' && body.currency !== 'energy') || typeof body.price !== 'number' || typeof body.idempotencyKey !== 'string') {
          throw new FamiliarValidationError(['A purchase needs a Familiar, a currency, the displayed price and an idempotency key.']);
        }
        return ok(await dependencies.service.purchase(principal, { familiarId: body.familiarId, currency: body.currency, price: body.price, idempotencyKey: body.idempotencyKey }));
      case 'development.grant-familiar':
        if (!principal.developmentAccess) return failure(403, 'forbidden', 'Development Familiar grants are not available for this account.');
        if (typeof body.familiarId !== 'string') throw new FamiliarValidationError(['A grant needs a Familiar.']);
        return ok(await dependencies.service.grantFamiliarDevelopment(principal, body.familiarId));
      default:
        throw new FamiliarValidationError(['Unknown Familiar operation.']);
    }
  } catch (error) {
    if (error instanceof SyntaxError) return failure(400, 'invalid_request', 'The Familiar request body is not valid JSON.');
    if (error instanceof FamiliarValidationError) return failure(400, 'invalid_request', error.message);
    if (error instanceof QiInsufficientError || error instanceof InsufficientEnergyError) return failure(409, 'insufficient', error.message);
    if (error instanceof FamiliarConflictError || error instanceof QiConflictError || error instanceof EnergyConflictError) return failure(409, 'conflict', error.message);
    dependencies.onError?.(error);
    return failure(503, 'unavailable', 'Familiars are unavailable right now. Please try again shortly.');
  }
}
