/**
 * The Dao Pillar client port.
 *
 * A browser reads the calendar and claims through this object and nothing
 * else. The default implementation calls the server-backed `/api/dao-pillar`
 * route with the host's bearer token; the Workshop's previews and tests may
 * substitute a client that talks to an in-process service. Either way the
 * client only returns what the server said — it never decides a day, a date,
 * an amount or a deposit of its own.
 */
import { createContext, createElement, useContext, type ReactNode } from 'react';
import {
  DAO_PILLAR_API_PATH,
  type DaoPillarCalendarSnapshot,
  type DaoPillarClaimResponse,
  type DaoPillarHttpError,
  type DaoPillarHttpOperation,
} from './daoPillarContracts';

export interface DaoPillarClient {
  getCalendar(): Promise<DaoPillarCalendarSnapshot>;
  /** Claims today's scheduled day. Safe to repeat: the server replays the first claim. */
  claimToday(): Promise<DaoPillarClaimResponse>;
}

export class DaoPillarClientError extends Error {
  readonly status: number;
  readonly code: DaoPillarHttpError['code'] | 'network';
  constructor(status: number, code: DaoPillarClientError['code'], message: string) {
    super(message);
    this.name = 'DaoPillarClientError';
    this.status = status;
    this.code = code;
  }
}

export interface HttpDaoPillarClientOptions {
  /** Returns the current bearer token, or null when no account is signed in. */
  token: () => string | null | Promise<string | null>;
  endpoint?: string;
  fetch?: typeof fetch;
}

export function createHttpDaoPillarClient(options: HttpDaoPillarClientOptions): DaoPillarClient {
  const endpoint = options.endpoint ?? DAO_PILLAR_API_PATH;
  const request = async <T extends DaoPillarCalendarSnapshot | DaoPillarClaimResponse>(
    init: { method: 'GET' } | { method: 'POST'; body: DaoPillarHttpOperation },
  ): Promise<T> => {
    const token = await options.token();
    if (!token) throw new DaoPillarClientError(401, 'unauthenticated', 'Sign in to open your Dao Pillar.');
    const doFetch = options.fetch ?? globalThis.fetch;
    let response: Response;
    try {
      response = await doFetch(endpoint, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(init.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.method === 'POST' ? { body: JSON.stringify(init.body) } : {}),
      });
    } catch {
      throw new DaoPillarClientError(0, 'network', 'The Dao Pillar could not be reached. Check your connection and try again.');
    }
    const payload = await response.json().catch(() => null) as T | DaoPillarHttpError | null;
    if (!response.ok || !payload || 'error' in payload) {
      const failure = payload && 'error' in payload ? payload : null;
      throw new DaoPillarClientError(response.status, failure?.code ?? 'unavailable', failure?.error ?? 'The Dao Pillar is unavailable right now.');
    }
    return payload;
  };
  return {
    getCalendar: () => request<DaoPillarCalendarSnapshot>({ method: 'GET' }),
    claimToday: () => request<DaoPillarClaimResponse>({ method: 'POST', body: { operation: 'claim' } }),
  };
}

const DaoPillarClientContext = createContext<DaoPillarClient | null>(null);

/** Hosts mount this once; `null` means the Dao Pillar is not connected on this surface. */
export function DaoPillarClientProvider({ client, children }: { client: DaoPillarClient | null; children: ReactNode }) {
  return createElement(DaoPillarClientContext.Provider, { value: client }, children);
}

export const useDaoPillarClient = (): DaoPillarClient | null => useContext(DaoPillarClientContext);
