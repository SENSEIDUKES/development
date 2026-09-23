/**
 * One read cache per host/account for a server-owned ledger projection.
 *
 * The cache never holds balance authority: every value it publishes is the
 * server's last answer, and `clear()` drops an in-flight answer that belongs to
 * a previous account. QI and DAO XP both read through this shape.
 */
export interface LedgerProjectionState<Snapshot> {
  status: 'unavailable' | 'loading' | 'ready' | 'error';
  snapshot: Snapshot | null;
  error: string | null;
}

export interface LedgerProjectionStore<Snapshot> {
  getSnapshot(): LedgerProjectionState<Snapshot>;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<void>;
  clear(): void;
}

export function createLedgerProjectionStore<Snapshot>(
  read: () => Promise<Snapshot>,
  unavailableMessage: string,
): LedgerProjectionStore<Snapshot> {
  const unavailable: LedgerProjectionState<Snapshot> = { status: 'unavailable', snapshot: null, error: null };
  let state = unavailable;
  let request = 0;
  const listeners = new Set<() => void>();
  const publish = (next: LedgerProjectionState<Snapshot>) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      const id = ++request;
      publish({ ...state, status: 'loading', error: null });
      try {
        const snapshot = await read();
        if (id === request) publish({ status: 'ready', snapshot, error: null });
      } catch (error) {
        if (id === request) publish({ status: 'error', snapshot: null, error: error instanceof Error ? error.message : unavailableMessage });
      }
    },
    clear() { request += 1; publish(unavailable); },
  };
}

/** Bearer-token GET against a ledger capability, validated before it is trusted. */
export async function readLedgerProjection<Snapshot>(options: {
  endpoint: string;
  token(): string | null | Promise<string | null>;
  fetch?: typeof fetch;
  signedOutMessage: string;
  unavailableMessage: string;
  invalidMessage: string;
  isSnapshot(body: unknown): body is Snapshot;
}): Promise<Snapshot> {
  const token = await options.token();
  if (!token) throw new Error(options.signedOutMessage);
  const response = await (options.fetch ?? globalThis.fetch)(options.endpoint, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error((body as { error?: string } | null)?.error ?? options.unavailableMessage);
  if (!options.isSnapshot(body)) throw new Error(options.invalidMessage);
  return body;
}
