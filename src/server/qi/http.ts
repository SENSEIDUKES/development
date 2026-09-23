import type { QiAccountSnapshot } from '@seihouse/library/cultivation';
import type { PrincipalResolver, IdentityRequest } from '../identity/authentication';
import { assertQiAmount, assertQiIdempotencyKey, QiConflictError, QiValidationError, type QiLedger } from './qiLedger';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
/** The most one development grant may add; a Workshop convenience, never income. */
export const QI_DEVELOPMENT_MAX_GRANT = 50_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

async function snapshotFor(ledger: QiLedger, uid: string): Promise<QiAccountSnapshot> {
  const account = await ledger.getAccount(uid);
  const transactions = await ledger.listTransactions(uid, 100);
  return {
    uid, balance: account?.balance ?? 0,
    transactions: transactions.map(({ id, kind, amount, source, description, balanceAfter, createdAt }) => ({ id, kind, amount, source, description, balanceAfter, createdAt })),
  };
}

/**
 * The authenticated QI view.
 *
 * - `GET` → the caller's balance and recent ledger lines.
 * - `POST { operation: 'development.grant', amount, idempotencyKey }` → a
 *   Workshop test grant, refused for every principal without development
 *   access. There is deliberately no public deposit or spend operation: QI
 *   moves only through server systems (Dao Pillar, Mystery Scrolls, Familiar
 *   training, the Celestial Store).
 */
export async function handleQiHttp(request: IdentityRequest & { method?: string; body?: unknown }, dependencies: { ledger: QiLedger; resolvePrincipal: PrincipalResolver }) {
  const method = (request.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') return { status: 405, body: { error: 'Method not allowed.' }, headers: { ...NO_STORE, Allow: 'GET, POST' } };
  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) return { status: 401, body: { error: 'Sign in to see your cultivation balance.' }, headers: NO_STORE };
  if (method === 'GET') return { status: 200, body: await snapshotFor(dependencies.ledger, principal.uid), headers: NO_STORE };
  try {
    const body = typeof request.body === 'string' ? (request.body.trim() ? JSON.parse(request.body) : {}) : request.body ?? {};
    if (!isRecord(body) || body.operation !== 'development.grant') throw new QiValidationError(['Unknown cultivation operation.']);
    if (!principal.developmentAccess) return { status: 403, body: { error: 'Development QI grants are not available for this account.' }, headers: NO_STORE };
    const amount = body.amount;
    const key = body.idempotencyKey;
    if (typeof amount !== 'number' || typeof key !== 'string') throw new QiValidationError(['A development grant needs an amount and an idempotency key.']);
    assertQiAmount(amount);
    assertQiIdempotencyKey(key);
    if (amount > QI_DEVELOPMENT_MAX_GRANT) throw new QiValidationError([`A development grant cannot exceed ${QI_DEVELOPMENT_MAX_GRANT} QI.`]);
    await dependencies.ledger.deposit({
      uid: principal.uid, amount, idempotencyKey: `development-grant:${key}`,
      source: 'development-grant', description: 'Development test grant', metadata: { source: 'development-grant' },
    });
    return { status: 200, body: await snapshotFor(dependencies.ledger, principal.uid), headers: NO_STORE };
  } catch (error) {
    if (error instanceof SyntaxError) return { status: 400, body: { error: 'The cultivation request body is not valid JSON.' }, headers: NO_STORE };
    if (error instanceof QiValidationError || error instanceof QiConflictError) return { status: 400, body: { error: error.message }, headers: NO_STORE };
    throw error;
  }
}
