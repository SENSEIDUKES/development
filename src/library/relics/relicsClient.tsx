/**
 * The Relics client port and its shared read cache.
 *
 * A browser only reads Relics. No client operation can mint one: Relics are
 * granted by the server when Fate Survival records a judged outcome. The
 * development-only operation below is the Workshop's stand-in for that judge,
 * and the server refuses it for every production account.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import {
  RELICS_API_PATH,
  type FateSurvivalOutcomeInput,
  type FateSurvivalOutcomeResponse,
  type RelicsHttpError,
  type RelicsHttpOperation,
  type RelicsSnapshot,
} from './contracts';

export interface RelicsClient {
  getSnapshot(): Promise<RelicsSnapshot>;
  /** Development only. The server refuses it for production users. */
  recordFateSurvivalOutcomeDevelopment(input: FateSurvivalOutcomeInput): Promise<FateSurvivalOutcomeResponse>;
}

export class RelicsClientError extends Error {
  readonly status: number;
  readonly code: RelicsHttpError['code'] | 'network';
  constructor(status: number, code: RelicsClientError['code'], message: string) {
    super(message);
    this.name = 'RelicsClientError';
    this.status = status;
    this.code = code;
  }
}

const isSnapshot = (value: unknown): value is RelicsSnapshot => {
  const body = value as Partial<RelicsSnapshot> | null;
  return Boolean(body) && typeof body?.uid === 'string' && Array.isArray(body?.relics);
};

export function createHttpRelicsClient(options: { token: () => string | null | Promise<string | null>; endpoint?: string; fetch?: typeof fetch }): RelicsClient {
  const endpoint = options.endpoint ?? RELICS_API_PATH;
  const request = async <T,>(init: { method: 'GET' } | { method: 'POST'; body: RelicsHttpOperation }, accept: (body: unknown) => body is T): Promise<T> => {
    const token = await options.token();
    if (!token) throw new RelicsClientError(401, 'unauthenticated', 'Sign in to see your Relics.');
    let response: Response;
    try {
      response = await (options.fetch ?? globalThis.fetch)(endpoint, {
        method: init.method,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        ...(init.method === 'POST' ? { body: JSON.stringify(init.body) } : {}),
      });
    } catch {
      throw new RelicsClientError(0, 'network', 'Relics could not be reached. Check your connection and try again.');
    }
    const payload = await response.json().catch(() => null) as T | RelicsHttpError | null;
    if (!response.ok || !payload || (typeof payload === 'object' && 'error' in payload)) {
      const failure = payload && typeof payload === 'object' && 'error' in payload ? payload as RelicsHttpError : null;
      throw new RelicsClientError(response.status, failure?.code ?? 'unavailable', failure?.error ?? 'Relics are unavailable right now.');
    }
    if (!accept(payload)) throw new RelicsClientError(response.status, 'unavailable', 'The Relics service returned an invalid answer.');
    return payload;
  };
  return {
    getSnapshot: () => request({ method: 'GET' }, isSnapshot),
    recordFateSurvivalOutcomeDevelopment: input => request(
      { method: 'POST', body: { operation: 'development.fate-survival-outcome', ...input } },
      (value): value is FateSurvivalOutcomeResponse => Boolean(value) && typeof value === 'object' && isSnapshot((value as FateSurvivalOutcomeResponse).snapshot),
    ),
  };
}

export interface RelicsState {
  status: 'unavailable' | 'loading' | 'ready' | 'error';
  snapshot: RelicsSnapshot | null;
  error: string | null;
}

const UNAVAILABLE: RelicsState = { status: 'unavailable', snapshot: null, error: null };

/** One cache per host/account; every value is the server's last answer. */
export function createRelicsStore(client: RelicsClient) {
  let state = UNAVAILABLE;
  let request = 0;
  const listeners = new Set<() => void>();
  const publish = (next: RelicsState) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      const id = ++request;
      publish({ ...state, status: state.snapshot ? state.status : 'loading', error: null });
      try {
        const snapshot = await client.getSnapshot();
        if (id === request) publish({ status: 'ready', snapshot, error: null });
      } catch (error) {
        if (id === request) publish({ ...state, status: state.snapshot ? 'ready' : 'error', error: error instanceof Error ? error.message : 'Relics are unavailable right now.' });
      }
    },
    /** Development only: replaces the cache with the server's answer to a simulated outcome. */
    async recordFateSurvivalOutcomeDevelopment(input: FateSurvivalOutcomeInput): Promise<FateSurvivalOutcomeResponse> {
      const response = await client.recordFateSurvivalOutcomeDevelopment(input);
      publish({ status: 'ready', snapshot: response.snapshot, error: null });
      return response;
    },
    clear() { request += 1; publish(UNAVAILABLE); },
  };
}

type RelicsStore = ReturnType<typeof createRelicsStore>;
const RelicsContext = createContext<RelicsStore | null>(null);

/** Hosts mount this once; `null` means Relics are not connected on this surface. */
export function RelicsClientProvider({ client, children }: PropsWithChildren<{ client: RelicsClient | null }>) {
  const store = useMemo(() => client ? createRelicsStore(client) : null, [client]);
  useEffect(() => () => store?.clear(), [store]);
  return <RelicsContext.Provider value={store}>{children}</RelicsContext.Provider>;
}

const subscribeUnavailable = () => () => {};
const readUnavailable = () => UNAVAILABLE;

export function useRelics({ enabled = true }: { enabled?: boolean } = {}) {
  const store = useContext(RelicsContext);
  const state = useSyncExternalStore(store?.subscribe ?? subscribeUnavailable, store?.getSnapshot ?? readUnavailable, readUnavailable);
  useEffect(() => { if (enabled) void store?.refresh(); }, [store, enabled]);
  const active = enabled && store ? store : null;
  const refresh = useCallback(async () => { await active?.refresh(); }, [active]);
  return { ...(enabled ? state : UNAVAILABLE), refresh, connected: Boolean(active) };
}

/** Workshop helper: the mounted store, for development-only simulation controls. */
export function useRelicsStore() {
  return useContext(RelicsContext);
}
