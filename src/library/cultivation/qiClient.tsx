import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { QI_API_PATH, type QiAccountSnapshot, type QiAccountState, type QiClient } from './contracts';
import { createLedgerProjectionStore, readLedgerProjection } from './accountProjection';

const isQiSnapshot = (body: unknown): body is QiAccountSnapshot => {
  const value = body as Partial<QiAccountSnapshot> | null;
  return Boolean(value) && typeof value?.uid === 'string' && Number.isSafeInteger(value?.balance) && (value?.balance ?? -1) >= 0 && Array.isArray(value?.transactions);
};

export function createHttpQiClient(options: { endpoint?: string; token(): string | null | Promise<string | null>; fetch?: typeof fetch }): QiClient {
  return {
    getSnapshot: () => readLedgerProjection({
      endpoint: options.endpoint ?? QI_API_PATH, token: options.token, fetch: options.fetch,
      signedOutMessage: 'Sign in to see your cultivation balance.',
      unavailableMessage: 'Cultivation is unavailable.',
      invalidMessage: 'The cultivation service returned an invalid snapshot.',
      isSnapshot: isQiSnapshot,
    }),
  };
}

const UNAVAILABLE: QiAccountState = { status: 'unavailable', snapshot: null, error: null };

/** One read cache per host/account. A response is a projection, never balance authority. */
export function createQiAccountStore(client: QiClient) {
  return createLedgerProjectionStore(() => client.getSnapshot(), 'Cultivation is unavailable.');
}
type QiStore = ReturnType<typeof createQiAccountStore>;
const QiContext = createContext<QiStore | null>(null);
export function QiClientProvider({ client, children }: PropsWithChildren<{ client: QiClient | null }>) {
  const store = useMemo(() => client ? createQiAccountStore(client) : null, [client]);
  useEffect(() => () => store?.clear(), [store]);
  return <QiContext.Provider value={store}>{children}</QiContext.Provider>;
}
const subscribeUnavailable = () => () => {};
const readUnavailable = () => UNAVAILABLE;
const refreshUnavailable = async () => {};
export function useQiAccount({ enabled = true }: { enabled?: boolean } = {}) {
  const store = useContext(QiContext);
  const state = useSyncExternalStore(store?.subscribe ?? subscribeUnavailable, store?.getSnapshot ?? readUnavailable, readUnavailable);
  useEffect(() => { if (enabled) void store?.refresh(); }, [store, enabled]);
  return { ...(enabled ? state : UNAVAILABLE), refresh: enabled && store ? store.refresh : refreshUnavailable };
}
