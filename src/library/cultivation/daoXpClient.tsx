import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { DAO_XP_API_PATH, DAO_XP_SOURCES, type DaoXpAccountSnapshot, type DaoXpAccountState, type DaoXpClient } from './contracts';
import { createLedgerProjectionStore, readLedgerProjection } from './accountProjection';

const isDaoXpSnapshot = (body: unknown): body is DaoXpAccountSnapshot => {
  const value = body as Partial<DaoXpAccountSnapshot> | null;
  return Boolean(value) && typeof value?.uid === 'string' && Number.isSafeInteger(value?.balance) && (value?.balance ?? -1) >= 0
    && Array.isArray(value?.transactions)
    && value!.transactions!.every(line => (DAO_XP_SOURCES as readonly string[]).includes(line.source) && Number.isSafeInteger(line.amount) && line.amount > 0);
};

/** Reads the caller's permanent DAO XP. There is no client write: only server systems credit it. */
export function createHttpDaoXpClient(options: { endpoint?: string; token(): string | null | Promise<string | null>; fetch?: typeof fetch }): DaoXpClient {
  return {
    getSnapshot: () => readLedgerProjection({
      endpoint: options.endpoint ?? DAO_XP_API_PATH, token: options.token, fetch: options.fetch,
      signedOutMessage: 'Sign in to see your DAO XP.',
      unavailableMessage: 'DAO XP is unavailable.',
      invalidMessage: 'The DAO XP service returned an invalid snapshot.',
      isSnapshot: isDaoXpSnapshot,
    }),
  };
}

const UNAVAILABLE: DaoXpAccountState = { status: 'unavailable', snapshot: null, error: null };

/** One read cache per host/account. Rank is derived from `snapshot.balance`, never stored beside it. */
export function createDaoXpAccountStore(client: DaoXpClient) {
  return createLedgerProjectionStore(() => client.getSnapshot(), 'DAO XP is unavailable.');
}
type DaoXpStore = ReturnType<typeof createDaoXpAccountStore>;
const DaoXpContext = createContext<DaoXpStore | null>(null);
export function DaoXpClientProvider({ client, children }: PropsWithChildren<{ client: DaoXpClient | null }>) {
  const store = useMemo(() => client ? createDaoXpAccountStore(client) : null, [client]);
  useEffect(() => () => store?.clear(), [store]);
  return <DaoXpContext.Provider value={store}>{children}</DaoXpContext.Provider>;
}
const subscribeUnavailable = () => () => {};
const readUnavailable = () => UNAVAILABLE;
const refreshUnavailable = async () => {};
export function useDaoXpAccount({ enabled = true }: { enabled?: boolean } = {}) {
  const store = useContext(DaoXpContext);
  const state = useSyncExternalStore(store?.subscribe ?? subscribeUnavailable, store?.getSnapshot ?? readUnavailable, readUnavailable);
  useEffect(() => { if (enabled) void store?.refresh(); }, [store, enabled]);
  return { ...(enabled ? state : UNAVAILABLE), refresh: enabled && store ? store.refresh : refreshUnavailable };
}
