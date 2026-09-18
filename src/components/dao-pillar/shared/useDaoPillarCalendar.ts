import { useCallback, useEffect, useRef, useState } from 'react';
import type { DaoPillarCalendarSnapshot, DaoPillarClaimResponse, DeliveredReward } from './daoPillarContracts';
import { DaoPillarClientError, useDaoPillarClient, type DaoPillarClient } from './daoPillarClient';

export type DaoPillarCalendarStatus = 'unavailable' | 'loading' | 'ready' | 'error';

/**
 * A view of the server's calendar plus the request lifecycle around it. The
 * snapshot is a cache of server truth with explicit freshness: a claim
 * replaces it with the snapshot the server returned, and `refresh` re-reads.
 */
export interface DaoPillarCalendarState {
  status: DaoPillarCalendarStatus;
  snapshot: DaoPillarCalendarSnapshot | null;
  /** Why the calendar could not be read. */
  error: string | null;
  /** True while a claim is in flight; a second tap during it is ignored. */
  claiming: boolean;
  /** Why the last claim attempt failed, cleared by the next attempt or refresh. */
  claimError: string | null;
  /** The server's answer to the last claim on this surface. */
  lastClaim: DaoPillarClaimResponse | null;
  refresh: () => Promise<void>;
  claim: () => Promise<DaoPillarClaimResponse | null>;
}

export interface UseDaoPillarCalendarOptions {
  enabled?: boolean;
  client?: DaoPillarClient | null;
  /**
   * Called once per newly delivered claim with what the server deposited, so
   * the host can mirror the Qi onto the profile it holds. Replays never fire it.
   */
  onRewardDelivered?: (delivered: DeliveredReward[], response: DaoPillarClaimResponse) => void;
}

const describeError = (error: unknown): string => error instanceof DaoPillarClientError || error instanceof Error
  ? error.message
  : 'The Dao Pillar is unavailable right now.';

export function useDaoPillarCalendar({ enabled = true, client: explicitClient, onRewardDelivered }: UseDaoPillarCalendarOptions = {}): DaoPillarCalendarState {
  const contextClient = useDaoPillarClient();
  const client = explicitClient === undefined ? contextClient : explicitClient;
  const active = Boolean(client) && enabled;
  const [snapshot, setSnapshot] = useState<DaoPillarCalendarSnapshot | null>(null);
  const [status, setStatus] = useState<DaoPillarCalendarStatus>(active ? 'loading' : 'unavailable');
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [lastClaim, setLastClaim] = useState<DaoPillarClaimResponse | null>(null);
  const requestId = useRef(0);
  const claimLock = useRef(false);
  const deliveredCallback = useRef(onRewardDelivered);
  deliveredCallback.current = onRewardDelivered;

  const refresh = useCallback(async () => {
    if (!client || !enabled) return;
    const id = ++requestId.current;
    setStatus(current => (current === 'ready' ? current : 'loading'));
    try {
      const next = await client.getCalendar();
      if (id !== requestId.current) return;
      setSnapshot(next);
      setError(null);
      setStatus('ready');
    } catch (failure) {
      if (id !== requestId.current) return;
      setError(describeError(failure));
      setStatus('error');
    }
  }, [client, enabled]);

  // A new client (a different account, a different host) starts from nothing:
  // the previous account's calendar must never show while the next one loads.
  useEffect(() => {
    requestId.current += 1;
    claimLock.current = false;
    setSnapshot(null);
    setError(null);
    setClaiming(false);
    setClaimError(null);
    setLastClaim(null);
    setStatus(active ? 'loading' : 'unavailable');
    if (active) void refresh();
  }, [active, refresh]);

  const claim = useCallback(async (): Promise<DaoPillarClaimResponse | null> => {
    if (!client || !enabled || claimLock.current) return null;
    claimLock.current = true;
    const id = ++requestId.current;
    setClaiming(true);
    setClaimError(null);
    try {
      const response = await client.claimToday();
      if (id !== requestId.current) return response;
      setSnapshot(response.snapshot);
      setError(null);
      setStatus('ready');
      setLastClaim(response);
      if (response.outcome === 'claimed') deliveredCallback.current?.(response.claim.delivered, response);
      return response;
    } catch (failure) {
      if (id === requestId.current) setClaimError(describeError(failure));
      // The request may have landed before the answer was lost: re-read the
      // calendar so the tile reflects the server rather than the failure.
      claimLock.current = false;
      await refresh();
      return null;
    } finally {
      claimLock.current = false;
      if (id === requestId.current) setClaiming(false);
      else setClaiming(false);
    }
  }, [client, enabled, refresh]);

  return { status, snapshot, error, claiming, claimError, lastClaim, refresh, claim };
}
