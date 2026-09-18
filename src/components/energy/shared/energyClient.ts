/**
 * The Energy client port.
 *
 * A browser reads Energy through this object and nothing else. The default
 * implementation calls the server-backed `/api/energy` route with the host's
 * bearer token; the Workshop's previews and tests may substitute a client
 * that talks to an in-process ledger. Either way the client only returns what
 * the server said — it never holds or edits a balance of its own.
 */
import { createContext, createElement, useContext, type ReactNode } from 'react';
import {
  ENERGY_API_PATH,
  type EnergyAccountSnapshot,
  type EnergyHttpError,
  type EnergyHttpOperation,
} from './energyContracts';

export interface EnergyClient {
  getSnapshot(): Promise<EnergyAccountSnapshot>;
  /** Development only. The server refuses it for production users. */
  grantDevelopment(input: { amount?: number; idempotencyKey: string }): Promise<EnergyAccountSnapshot>;
  /** Development only. The server refuses it for production users. */
  resetDevelopment(): Promise<EnergyAccountSnapshot>;
}

export class EnergyClientError extends Error {
  readonly status: number;
  readonly code: EnergyHttpError['code'] | 'network';
  constructor(status: number, code: EnergyClientError['code'], message: string) {
    super(message);
    this.name = 'EnergyClientError';
    this.status = status;
    this.code = code;
  }
}

export interface HttpEnergyClientOptions {
  /** Returns the current bearer token, or null when no account is signed in. */
  token: () => string | null | Promise<string | null>;
  endpoint?: string;
  fetch?: typeof fetch;
}

export function createHttpEnergyClient(options: HttpEnergyClientOptions): EnergyClient {
  const endpoint = options.endpoint ?? ENERGY_API_PATH;
  const request = async (init: { method: 'GET' } | { method: 'POST'; body: EnergyHttpOperation }): Promise<EnergyAccountSnapshot> => {
    const token = await options.token();
    if (!token) throw new EnergyClientError(401, 'unauthenticated', 'Sign in to see your Energy.');
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
      throw new EnergyClientError(0, 'network', 'Energy could not be reached. Check your connection and try again.');
    }
    const payload = await response.json().catch(() => null) as EnergyAccountSnapshot | EnergyHttpError | null;
    if (!response.ok || !payload || 'error' in payload) {
      const failure = payload && 'error' in payload ? payload : null;
      throw new EnergyClientError(response.status, failure?.code ?? 'unavailable', failure?.error ?? 'Energy is unavailable right now.');
    }
    return payload;
  };
  return {
    getSnapshot: () => request({ method: 'GET' }),
    grantDevelopment: input => request({ method: 'POST', body: { operation: 'development.grant', ...input } }),
    resetDevelopment: () => request({ method: 'POST', body: { operation: 'development.reset' } }),
  };
}

const EnergyClientContext = createContext<EnergyClient | null>(null);

/** Hosts mount this once; `null` means Energy is not connected on this surface. */
export function EnergyClientProvider({ client, children }: { client: EnergyClient | null; children: ReactNode }) {
  return createElement(EnergyClientContext.Provider, { value: client }, children);
}

export const useEnergyClient = (): EnergyClient | null => useContext(EnergyClientContext);
