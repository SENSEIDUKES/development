import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import type { QiAccountSnapshot, QiAccountState, QiClient } from './contracts';

export function createHttpQiClient(options: { endpoint: string; token(): string | null | Promise<string | null>; fetch?: typeof fetch }): QiClient {
  return { async getSnapshot() {
    const token = await options.token();
    if (!token) throw new Error('Sign in to see your cultivation balance.');
    const response = await (options.fetch ?? globalThis.fetch)(options.endpoint, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? 'Cultivation is unavailable.');
    if (!body || typeof body.uid !== 'string' || !Number.isSafeInteger(body.balance) || body.balance < 0 || !Array.isArray(body.transactions)) throw new Error('The cultivation service returned an invalid snapshot.');
    return body as QiAccountSnapshot;
  } };
}

const UNAVAILABLE: QiAccountState = { status: 'unavailable', snapshot: null, error: null };

/** One read cache per host/account. A response is a projection, never balance authority. */
export function createQiAccountStore(client: QiClient) {
  let state: QiAccountState = UNAVAILABLE;
  let request = 0;
  const listeners = new Set<() => void>();
  const publish = (next: QiAccountState) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      const id = ++request;
      publish({ ...state, status: 'loading', error: null });
      try {
        const snapshot = await client.getSnapshot();
        if (id === request) publish({ status: 'ready', snapshot, error: null });
      } catch (error) {
        if (id === request) publish({ status: 'error', snapshot: null, error: error instanceof Error ? error.message : 'Cultivation is unavailable.' });
      }
    },
    clear() { request += 1; publish(UNAVAILABLE); },
  };
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
