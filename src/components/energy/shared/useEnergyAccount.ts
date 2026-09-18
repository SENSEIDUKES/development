import { useCallback, useEffect, useRef, useState } from 'react';
import type { EnergyAccountSnapshot } from './energyContracts';
import { EnergyClientError, useEnergyClient, type EnergyClient } from './energyClient';

export type EnergyAccountStatus = 'unavailable' | 'loading' | 'ready' | 'error';

/**
 * A view of the server's answer plus the request lifecycle around it. The
 * snapshot is a cache of server truth with explicit freshness: every mutation
 * replaces it with the server's response, and `refresh` re-reads it.
 */
export interface EnergyAccountState {
  status: EnergyAccountStatus;
  snapshot: EnergyAccountSnapshot | null;
  error: string | null;
  /** True while a development grant or reset is in flight. */
  pending: boolean;
  refresh: () => Promise<void>;
  grantDevelopment: (amount?: number) => Promise<void>;
  resetDevelopment: () => Promise<void>;
}

const describeError = (error: unknown): string => error instanceof EnergyClientError || error instanceof Error
  ? error.message
  : 'Energy is unavailable right now.';

const clickKey = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Reads the signed-in account's Energy through the injected client. Pass
 * `enabled: false` (for a signed-out or public view) to skip the request.
 * When no client is mounted the state is `unavailable` and nothing is fetched.
 */
export function useEnergyAccount({ enabled = true, client: explicitClient }: { enabled?: boolean; client?: EnergyClient | null } = {}): EnergyAccountState {
  const contextClient = useEnergyClient();
  const client = explicitClient === undefined ? contextClient : explicitClient;
  const active = Boolean(client) && enabled;
  const [snapshot, setSnapshot] = useState<EnergyAccountSnapshot | null>(null);
  const [status, setStatus] = useState<EnergyAccountStatus>(active ? 'loading' : 'unavailable');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const requestId = useRef(0);

  const run = useCallback(async (operation: (client: EnergyClient) => Promise<EnergyAccountSnapshot>, mutation: boolean) => {
    if (!client || !enabled) return;
    const id = ++requestId.current;
    if (mutation) setPending(true);
    else setStatus(current => (current === 'ready' ? current : 'loading'));
    try {
      const next = await operation(client);
      if (id !== requestId.current) return;
      setSnapshot(next);
      setError(null);
      setStatus('ready');
    } catch (failure) {
      if (id !== requestId.current) return;
      setError(describeError(failure));
      setStatus(current => (mutation && current === 'ready' ? current : 'error'));
    } finally {
      if (id === requestId.current && mutation) setPending(false);
    }
  }, [client, enabled]);

  useEffect(() => {
    if (!active) {
      requestId.current += 1;
      setSnapshot(null);
      setError(null);
      setPending(false);
      setStatus('unavailable');
      return;
    }
    void run(current => current.getSnapshot(), false);
  }, [active, run]);

  const refresh = useCallback(() => run(current => current.getSnapshot(), false), [run]);
  const grantDevelopment = useCallback(
    (amount?: number) => run(current => current.grantDevelopment({ amount, idempotencyKey: clickKey() }), true),
    [run],
  );
  const resetDevelopment = useCallback(() => run(current => current.resetDevelopment(), true), [run]);

  return { status, snapshot, error, pending, refresh, grantDevelopment, resetDevelopment };
}
