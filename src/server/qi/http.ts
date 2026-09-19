import type { QiAccountSnapshot } from '@seihouse/library/cultivation';
import type { PrincipalResolver, IdentityRequest } from '../identity/authentication';
import type { QiLedger } from './qiLedger';

/** Read-only authenticated view. There is deliberately no public deposit operation. */
export async function handleQiHttp(request: IdentityRequest & { method?: string }, dependencies: { ledger: QiLedger; resolvePrincipal: PrincipalResolver }) {
  const headers = { 'Cache-Control': 'no-store' };
  if ((request.method ?? 'GET').toUpperCase() !== 'GET') return { status: 405, body: { error: 'Method not allowed.' }, headers: { ...headers, Allow: 'GET' } };
  const principal = await dependencies.resolvePrincipal(request);
  if (!principal) return { status: 401, body: { error: 'Sign in to see your cultivation balance.' }, headers };
  const account = await dependencies.ledger.getAccount(principal.uid);
  const transactions = await dependencies.ledger.listTransactions(principal.uid, 100);
  const body: QiAccountSnapshot = {
    uid: principal.uid, balance: account?.balance ?? 0,
    transactions: transactions.map(({ id, kind, amount, source, description, balanceAfter, createdAt }) => ({ id, kind, amount, source, description, balanceAfter, createdAt })),
  };
  return { status: 200, body, headers };
}
