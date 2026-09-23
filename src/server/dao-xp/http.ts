import type { DaoXpAccountSnapshot } from '@seihouse/library/cultivation';
import type { IdentityRequest, PrincipalResolver } from '../identity/authentication';
import { DaoXpConflictError, DaoXpValidationError, type DaoXpLedger } from './daoXpLedger';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The idempotency key of the one-time legacy carry-over for an account. */
export const openingBalanceKey = (uid: string) => `opening-balance:${uid}`;

export async function daoXpSnapshotFor(ledger: DaoXpLedger, uid: string): Promise<DaoXpAccountSnapshot> {
  const account = await ledger.getAccount(uid);
  const transactions = await ledger.listTransactions(uid, 100);
  return {
    uid,
    balance: account?.balance ?? 0,
    transactions: transactions.map(({ id, amount, source, description, balanceAfter, createdAt }) => ({ id, amount, source, description, balanceAfter, createdAt })),
  };
}

/**
 * The authenticated DAO XP view.
 *
 * - `GET` → permanent DAO XP and its credit history. Rank is derived from the
 *   balance by the client's rank ladder; it is never stored beside it.
 * - `POST { operation: 'development.opening-balance', amount }` → the one-time
 *   carry-over of a legacy profile's DAO XP, refused for every principal
 *   without development access. Production hosts run the same carry-over as a
 *   server-side backfill; no browser can ever credit DAO XP.
 */
export async function handleDaoXpHttp(request: IdentityRequest & { method?: string; body?: unknown }, dependencies: { ledger: DaoXpLedger; resolvePrincipal: PrincipalResolver }) {
  const method = (request.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') return { status: 405, body: { error: 'Method not allowed.' }, headers: { ...NO_STORE, Allow: 'GET, POST' } };
  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) return { status: 401, body: { error: 'Sign in to see your DAO XP.' }, headers: NO_STORE };
  if (method === 'GET') return { status: 200, body: await daoXpSnapshotFor(dependencies.ledger, principal.uid), headers: NO_STORE };
  try {
    const body = typeof request.body === 'string' ? (request.body.trim() ? JSON.parse(request.body) : {}) : request.body ?? {};
    if (!isRecord(body) || body.operation !== 'development.opening-balance') throw new DaoXpValidationError(['Unknown DAO XP operation.']);
    if (!principal.developmentAccess) return { status: 403, body: { error: 'Development DAO XP controls are not available for this account.' }, headers: NO_STORE };
    if (typeof body.amount !== 'number') throw new DaoXpValidationError(['An opening balance needs an amount.']);
    if (body.amount > 0) {
      await dependencies.ledger.credit({
        uid: principal.uid, amount: body.amount, source: 'opening-balance',
        idempotencyKey: openingBalanceKey(principal.uid),
        description: 'Opening DAO XP carried over from the profile record',
      });
    }
    return { status: 200, body: await daoXpSnapshotFor(dependencies.ledger, principal.uid), headers: NO_STORE };
  } catch (error) {
    if (error instanceof SyntaxError) return { status: 400, body: { error: 'The DAO XP request body is not valid JSON.' }, headers: NO_STORE };
    if (error instanceof DaoXpValidationError || error instanceof DaoXpConflictError) return { status: 400, body: { error: error.message }, headers: NO_STORE };
    throw error;
  }
}
