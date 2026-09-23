/**
 * The Achievements client port and its shared read cache.
 *
 * A browser reads achievements and opens Mystery Scrolls through this object
 * and nothing else. The default implementation calls the server-backed
 * achievements capability with the host's bearer token; the Workshop may
 * substitute an in-process runtime. Either way the client only returns what
 * the server said — it never decides an achievement, a reward, or a delivery.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import {
  ACHIEVEMENTS_API_PATH,
  type AchievementsHttpError,
  type AchievementsHttpOperation,
  type AchievementsSnapshot,
  type OpenMysteryScrollResponse,
  type RecordLibraryActivityInput,
  type RecordLibraryActivityResponse,
} from './achievements';

export interface AchievementsClient {
  getSnapshot(): Promise<AchievementsSnapshot>;
  /** Opens one sealed scroll. Safe to repeat: the server replays the first opening. */
  openScroll(scrollId: string): Promise<OpenMysteryScrollResponse>;
  /** Development only. The server refuses it for production users. */
  recordActivityDevelopment(input: RecordLibraryActivityInput): Promise<RecordLibraryActivityResponse>;
}

export class AchievementsClientError extends Error {
  readonly status: number;
  readonly code: AchievementsHttpError['code'] | 'network';
  constructor(status: number, code: AchievementsClientError['code'], message: string) {
    super(message);
    this.name = 'AchievementsClientError';
    this.status = status;
    this.code = code;
  }
}

export interface HttpAchievementsClientOptions {
  token: () => string | null | Promise<string | null>;
  endpoint?: string;
  fetch?: typeof fetch;
}

const isSnapshot = (value: unknown): value is AchievementsSnapshot => {
  const body = value as Partial<AchievementsSnapshot> | null;
  return Boolean(body) && typeof body?.uid === 'string' && Array.isArray(body?.achievements) && Array.isArray(body?.scrolls);
};

export function createHttpAchievementsClient(options: HttpAchievementsClientOptions): AchievementsClient {
  const endpoint = options.endpoint ?? ACHIEVEMENTS_API_PATH;
  const request = async <T,>(init: { method: 'GET' } | { method: 'POST'; body: AchievementsHttpOperation }, accept: (body: unknown) => body is T): Promise<T> => {
    const token = await options.token();
    if (!token) throw new AchievementsClientError(401, 'unauthenticated', 'Sign in to see your achievements.');
    let response: Response;
    try {
      response = await (options.fetch ?? globalThis.fetch)(endpoint, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(init.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.method === 'POST' ? { body: JSON.stringify(init.body) } : {}),
      });
    } catch {
      throw new AchievementsClientError(0, 'network', 'Achievements could not be reached. Check your connection and try again.');
    }
    const payload = await response.json().catch(() => null) as T | AchievementsHttpError | null;
    if (!response.ok || !payload || (typeof payload === 'object' && 'error' in payload)) {
      const failure = payload && typeof payload === 'object' && 'error' in payload ? payload as AchievementsHttpError : null;
      throw new AchievementsClientError(response.status, failure?.code ?? 'unavailable', failure?.error ?? 'Achievements are unavailable right now.');
    }
    if (!accept(payload)) throw new AchievementsClientError(response.status, 'unavailable', 'The achievements service returned an invalid answer.');
    return payload;
  };
  const withSnapshot = <T extends { snapshot: AchievementsSnapshot }>(value: unknown): value is T =>
    Boolean(value) && typeof value === 'object' && isSnapshot((value as T).snapshot);
  return {
    getSnapshot: () => request({ method: 'GET' }, isSnapshot),
    openScroll: scrollId => request({ method: 'POST', body: { operation: 'open-scroll', scrollId } }, withSnapshot<OpenMysteryScrollResponse>),
    recordActivityDevelopment: input => request({ method: 'POST', body: { operation: 'development.record-activity', ...input } }, withSnapshot<RecordLibraryActivityResponse>),
  };
}

export interface AchievementsState {
  status: 'unavailable' | 'loading' | 'ready' | 'error';
  snapshot: AchievementsSnapshot | null;
  error: string | null;
  /** The scroll being opened right now, if any. */
  opening: string | null;
}

const UNAVAILABLE: AchievementsState = { status: 'unavailable', snapshot: null, error: null, opening: null };
const describe = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

/**
 * One cache per host/account. Every value is the server's last answer; an
 * answer that arrives after `clear()` belongs to a previous account and is
 * dropped.
 */
export function createAchievementsStore(client: AchievementsClient) {
  let state = UNAVAILABLE;
  let request = 0;
  const listeners = new Set<() => void>();
  const publish = (next: AchievementsState) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      const id = ++request;
      publish({ ...state, status: state.snapshot ? state.status : 'loading', error: null });
      try {
        const snapshot = await client.getSnapshot();
        if (id === request) publish({ ...state, status: 'ready', snapshot, error: null });
      } catch (error) {
        if (id === request) publish({ ...state, status: state.snapshot ? 'ready' : 'error', error: describe(error, 'Achievements are unavailable right now.') });
      }
    },
    /** Opens a scroll and returns the server's answer, or throws after recording the error. */
    async open(scrollId: string): Promise<OpenMysteryScrollResponse> {
      const id = request;
      publish({ ...state, opening: scrollId, error: null });
      try {
        const response = await client.openScroll(scrollId);
        if (id === request) publish({ ...state, status: 'ready', snapshot: response.snapshot, opening: null, error: null });
        return response;
      } catch (error) {
        if (id === request) publish({ ...state, opening: null, error: describe(error, 'The scroll could not be opened. Please try again.') });
        throw error;
      }
    },
    /** Development only: replaces the cache with the server's answer to a simulated activity. */
    async recordActivityDevelopment(input: RecordLibraryActivityInput): Promise<RecordLibraryActivityResponse> {
      const response = await client.recordActivityDevelopment(input);
      publish({ ...state, status: 'ready', snapshot: response.snapshot, error: null });
      return response;
    },
    clear() { request += 1; publish(UNAVAILABLE); },
  };
}

type AchievementsStore = ReturnType<typeof createAchievementsStore>;
const AchievementsContext = createContext<AchievementsStore | null>(null);

/** Hosts mount this once; `null` means achievements are not connected on this surface. */
export function AchievementsClientProvider({ client, children }: PropsWithChildren<{ client: AchievementsClient | null }>) {
  const store = useMemo(() => client ? createAchievementsStore(client) : null, [client]);
  useEffect(() => () => store?.clear(), [store]);
  return <AchievementsContext.Provider value={store}>{children}</AchievementsContext.Provider>;
}

const subscribeUnavailable = () => () => {};
const readUnavailable = () => UNAVAILABLE;

export function useAchievements({ enabled = true }: { enabled?: boolean } = {}) {
  const store = useContext(AchievementsContext);
  const state = useSyncExternalStore(store?.subscribe ?? subscribeUnavailable, store?.getSnapshot ?? readUnavailable, readUnavailable);
  useEffect(() => { if (enabled) void store?.refresh(); }, [store, enabled]);
  const active = enabled && store ? store : null;
  const refresh = useCallback(async () => { await active?.refresh(); }, [active]);
  const open = useCallback(async (scrollId: string) => {
    if (!active) throw new AchievementsClientError(0, 'unavailable', 'Achievements are not connected here.');
    return active.open(scrollId);
  }, [active]);
  return { ...(enabled ? state : UNAVAILABLE), refresh, open, connected: Boolean(active) };
}

/** Workshop helper: the mounted store, for development-only simulation controls. */
export function useAchievementsStore() {
  return useContext(AchievementsContext);
}
