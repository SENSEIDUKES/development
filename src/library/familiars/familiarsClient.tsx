/**
 * The Familiar account client port, its shared read cache, and the Celestial
 * Store account adapter built on it.
 *
 * Ownership, bonds, element mastery and cosmetic selections are server state. The client
 * asks; the server decides prices, spends QI or Energy, and answers with the
 * whole account, which replaces the cache.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import type { CelestialStoreAccountState, CelestialStorePurchase, CelestialStorePurchaseResult } from '../../components/celestial-store/shared/storeAccount';
import {
  FAMILIARS_API_PATH,
  type FamiliarsHttpError,
  type FamiliarsHttpOperation,
  type FamiliarTrainingSnapshot,
  type OfferQiInput,
  type OfferQiResponse,
  type PurchaseFamiliarInput,
  type PurchaseFamiliarResponse,
  type ActiveElementalEffectSelection,
  type SelectFamiliarFormInput,
} from './contracts';

export interface FamiliarsClient {
  getSnapshot(): Promise<FamiliarTrainingSnapshot>;
  offerQi(input: OfferQiInput): Promise<OfferQiResponse>;
  selectForm(input: SelectFamiliarFormInput): Promise<FamiliarTrainingSnapshot>;
  selectElementalEffect(selection: ActiveElementalEffectSelection): Promise<FamiliarTrainingSnapshot>;
  purchase(input: PurchaseFamiliarInput): Promise<PurchaseFamiliarResponse>;
  /** Development only. The server refuses it for production users. */
  grantFamiliarDevelopment(familiarId: string): Promise<FamiliarTrainingSnapshot>;
}

export class FamiliarsClientError extends Error {
  readonly status: number;
  readonly code: FamiliarsHttpError['code'] | 'network';
  constructor(status: number, code: FamiliarsClientError['code'], message: string) {
    super(message);
    this.name = 'FamiliarsClientError';
    this.status = status;
    this.code = code;
  }
}

const isSnapshot = (value: unknown): value is FamiliarTrainingSnapshot => {
  const body = value as Partial<FamiliarTrainingSnapshot> | null;
  return Boolean(body) && typeof body?.uid === 'string' && Array.isArray(body?.familiars) && Array.isArray(body?.ownedFamiliarIds)
    && Array.isArray(body?.masteredElements) && typeof body?.activeEffect === 'object';
};
const withSnapshot = <T extends { snapshot: FamiliarTrainingSnapshot }>(value: unknown): value is T =>
  Boolean(value) && typeof value === 'object' && isSnapshot((value as T).snapshot);

export function createHttpFamiliarsClient(options: { token: () => string | null | Promise<string | null>; endpoint?: string; fetch?: typeof fetch }): FamiliarsClient {
  const endpoint = options.endpoint ?? FAMILIARS_API_PATH;
  const request = async <T,>(init: { method: 'GET' } | { method: 'POST'; body: FamiliarsHttpOperation }, accept: (body: unknown) => body is T): Promise<T> => {
    const token = await options.token();
    if (!token) throw new FamiliarsClientError(401, 'unauthenticated', 'Sign in to see your Familiars.');
    let response: Response;
    try {
      response = await (options.fetch ?? globalThis.fetch)(endpoint, {
        method: init.method,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        ...(init.method === 'POST' ? { body: JSON.stringify(init.body) } : {}),
      });
    } catch {
      throw new FamiliarsClientError(0, 'network', 'Familiars could not be reached. Check your connection and try again.');
    }
    const payload = await response.json().catch(() => null) as T | FamiliarsHttpError | null;
    if (!response.ok || !payload || (typeof payload === 'object' && 'error' in payload)) {
      const failure = payload && typeof payload === 'object' && 'error' in payload ? payload as FamiliarsHttpError : null;
      throw new FamiliarsClientError(response.status, failure?.code ?? 'unavailable', failure?.error ?? 'Familiars are unavailable right now.');
    }
    if (!accept(payload)) throw new FamiliarsClientError(response.status, 'unavailable', 'The Familiar service returned an invalid answer.');
    return payload;
  };
  return {
    getSnapshot: () => request({ method: 'GET' }, isSnapshot),
    offerQi: input => request({ method: 'POST', body: { operation: 'offer-qi', ...input } }, withSnapshot<OfferQiResponse>),
    selectForm: input => request({ method: 'POST', body: { operation: 'select-form', ...input } }, isSnapshot),
    selectElementalEffect: selection => request({ method: 'POST', body: { operation: 'select-elemental-effect', selection } }, isSnapshot),
    purchase: input => request({ method: 'POST', body: { operation: 'purchase', ...input } }, withSnapshot<PurchaseFamiliarResponse>),
    grantFamiliarDevelopment: familiarId => request({ method: 'POST', body: { operation: 'development.grant-familiar', familiarId } }, isSnapshot),
  };
}

export interface FamiliarsState {
  status: 'unavailable' | 'loading' | 'ready' | 'error';
  snapshot: FamiliarTrainingSnapshot | null;
  error: string | null;
  /** True while an offering, a selection or a purchase is in flight. */
  pending: boolean;
}

const UNAVAILABLE: FamiliarsState = { status: 'unavailable', snapshot: null, error: null, pending: false };
const describe = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

/** One cache per host/account. Every write answers with the whole account, which replaces the cache. */
export function createFamiliarsStore(client: FamiliarsClient) {
  let state = UNAVAILABLE;
  let request = 0;
  const listeners = new Set<() => void>();
  const publish = (next: FamiliarsState) => { state = next; listeners.forEach(listener => listener()); };
  const mutate = async <T,>(work: () => Promise<T>, snapshotOf: (result: T) => FamiliarTrainingSnapshot, fallback: string): Promise<T> => {
    const id = request;
    publish({ ...state, pending: true, error: null });
    try {
      const result = await work();
      if (id === request) publish({ status: 'ready', snapshot: snapshotOf(result), error: null, pending: false });
      return result;
    } catch (error) {
      if (id === request) publish({ ...state, pending: false, error: describe(error, fallback) });
      throw error;
    }
  };
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
        if (id === request) publish({ ...state, status: state.snapshot ? 'ready' : 'error', error: describe(error, 'Familiars are unavailable right now.') });
      }
    },
    offerQi: (input: OfferQiInput) => mutate(() => client.offerQi(input), result => result.snapshot, 'The offering could not be made. Please try again.'),
    selectForm: (input: SelectFamiliarFormInput) => mutate(() => client.selectForm(input), result => result, 'That form could not be chosen. Please try again.'),
    selectElementalEffect: (selection: ActiveElementalEffectSelection) => mutate(() => client.selectElementalEffect(selection), result => result, 'That effect could not be chosen. Please try again.'),
    purchase: (input: PurchaseFamiliarInput) => mutate(() => client.purchase(input), result => result.snapshot, 'The purchase failed. Nothing was charged.'),
    grantFamiliarDevelopment: (familiarId: string) => mutate(() => client.grantFamiliarDevelopment(familiarId), result => result, 'The Familiar could not be granted.'),
    clear() { request += 1; publish(UNAVAILABLE); },
  };
}

type FamiliarsStore = ReturnType<typeof createFamiliarsStore>;
const FamiliarsContext = createContext<FamiliarsStore | null>(null);

/** Hosts mount this once; `null` means Familiar ownership and training are not connected here. */
export function FamiliarsClientProvider({ client, children }: PropsWithChildren<{ client: FamiliarsClient | null }>) {
  const store = useMemo(() => client ? createFamiliarsStore(client) : null, [client]);
  useEffect(() => () => store?.clear(), [store]);
  return <FamiliarsContext.Provider value={store}>{children}</FamiliarsContext.Provider>;
}

const subscribeUnavailable = () => () => {};
const readUnavailable = () => UNAVAILABLE;
const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const notConnected = (): never => { throw new FamiliarsClientError(0, 'unavailable', 'Familiars are not connected here.'); };

export function useFamiliars({ enabled = true }: { enabled?: boolean } = {}) {
  const store = useContext(FamiliarsContext);
  const state = useSyncExternalStore(store?.subscribe ?? subscribeUnavailable, store?.getSnapshot ?? readUnavailable, readUnavailable);
  useEffect(() => { if (enabled) void store?.refresh(); }, [store, enabled]);
  const active = enabled && store ? store : null;
  const refresh = useCallback(async () => { await active?.refresh(); }, [active]);
  /** Each call is one offering intent with its own idempotency key. */
  const offerQi = useCallback((familiarId: string, amount: number) => active ? active.offerQi({ familiarId, amount, idempotencyKey: newKey() }) : notConnected(), [active]);
  const selectForm = useCallback((input: SelectFamiliarFormInput) => active ? active.selectForm(input) : notConnected(), [active]);
  const selectElementalEffect = useCallback((selection: ActiveElementalEffectSelection) => active ? active.selectElementalEffect(selection) : notConnected(), [active]);
  return { ...(enabled ? state : UNAVAILABLE), refresh, offerQi, selectForm, selectElementalEffect, connected: Boolean(active) };
}

/** Workshop helper: the mounted store, for development-only scenario controls. */
export function useFamiliarsStore() {
  return useContext(FamiliarsContext);
}

/**
 * The Celestial Store account backed by the Familiar account: ownership comes
 * from the server and a purchase debits QI or Energy there. Mount beneath a
 * `FamiliarsClientProvider`; without one, purchases report that they are not
 * connected and nothing is charged.
 */
export function useFamiliarStoreAccount(): CelestialStoreAccountState {
  const store = useContext(FamiliarsContext);
  const state = useSyncExternalStore(store?.subscribe ?? subscribeUnavailable, store?.getSnapshot ?? readUnavailable, readUnavailable);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  useEffect(() => { if (store && state.status === 'unavailable') void store.refresh(); }, [store, state.status]);
  const purchase = useCallback(async (attempt: CelestialStorePurchase): Promise<CelestialStorePurchaseResult> => {
    if (!store) return { outcome: 'failed', message: 'Purchases are not connected here.' };
    if (lock.current) return { outcome: 'failed', message: 'A purchase is already in progress.' };
    lock.current = true;
    setPending(true);
    try {
      const response = await store.purchase({ familiarId: attempt.familiarId, currency: attempt.currency, price: attempt.price, idempotencyKey: newKey() });
      return { outcome: response.outcome === 'already-owned' ? 'already-owned' : 'purchased', message: response.message };
    } catch (error) {
      const insufficient = error instanceof FamiliarsClientError && error.code === 'insufficient';
      return { outcome: insufficient ? 'insufficient' : 'failed', message: error instanceof Error ? error.message : 'The purchase failed. Nothing was charged.' };
    } finally {
      lock.current = false;
      setPending(false);
    }
  }, [store]);
  return { ownedFamiliarIds: state.snapshot?.ownedFamiliarIds ?? [], pending, purchase };
}
