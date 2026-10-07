/**
 * Workshop-only: the development economy served in-process.
 *
 * `createDevelopmentEconomy` is the same runtime `/api/library-economy` serves
 * from the Vite middleware and the Vercel function — every ledger, service and
 * HTTP handler. Here it runs inside the browser tab through the host's
 * in-process `fetch` (`src/host/economy`), so the Library's real HTTP clients
 * talk to real server code with nothing mocked but the network. Each preview
 * scenario gets a fresh economy, which makes every scenario reproducible and
 * keeps one scenario's rewards out of another's. The Workshop adds what only a
 * preview needs: simulated latency, a failed or lost Dao Pillar claim, and the
 * simulators below.
 *
 * It never reaches production data and is never transferred: a host mounts
 * the same clients against its own API.
 */
import { addCalendarDays, calendarDateIn } from '../../../server/dao-pillar/calendar';
import { createDevelopmentEconomy, type DevelopmentEconomy } from '../../../server/economy/developmentRuntime';
import { developmentIdentityToken } from '../../../server/identity/authentication';
import {
  LIBRARY_ECONOMY_PATH as ECONOMY_PATH,
  createInProcessEconomyFetch as serveInProcess,
  createLibraryEconomyClients,
  type LibraryEconomyClients,
} from '../../../host/economy/inProcessEconomy';

export interface WorkshopEconomyFaults {
  /** `failed`: the server refuses today's claim. `unresolved`: the claim lands but its answer is lost. */
  daoPillarClaim?: 'failed' | 'unresolved';
}

const isDaoPillarClaim = (capability: string | null, init: RequestInit | undefined) =>
  capability === 'dao-pillar' && (init?.method ?? 'GET').toUpperCase() === 'POST'
    && typeof init?.body === 'string' && /"operation"\s*:\s*"claim"/.test(init.body);

/** A `fetch` that answers `/api/library-economy` from an in-process economy, with the preview's latency and faults. */
export function createInProcessEconomyFetch(economy: DevelopmentEconomy, options: { delayMs?: () => number; faults?: WorkshopEconomyFaults } = {}): typeof fetch {
  const serve = serveInProcess(economy);
  return async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, 'http://workshop.local');
    if (url.pathname !== ECONOMY_PATH) return serve(input, init);
    const delay = options.delayMs?.() ?? 0;
    if (delay > 0) await new Promise(resolve => { setTimeout(resolve, delay); });
    const claimFault = isDaoPillarClaim(url.searchParams.get('capability'), init) ? options.faults?.daoPillarClaim : undefined;
    if (claimFault === 'failed') {
      return new Response(JSON.stringify({ error: 'The Dao Pillar is unavailable right now. Please try again shortly.', code: 'unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    const response = await serve(input, init);
    // The claim landed; the answer is lost on the way back.
    if (claimFault === 'unresolved') throw new TypeError('Failed to fetch');
    return response;
  };
}

export interface WorkshopEconomyOptions {
  /** Which scheduled Dao Pillar day today is; the cycle starts `daoPillarDay - 1` days ago. */
  daoPillarDay?: number;
  /** An open decision: when a scroll's reward lands (default `on-open`). */
  scrollDelivery?: 'on-open' | 'on-earn';
  /** An open decision: the most creation DAO XP per day (default none). */
  creationDailyCap?: number | null;
  now?: () => Date;
}

/** A fresh development economy, configured through the same environment the server reads. */
export function createWorkshopEconomy({ daoPillarDay = 13, scrollDelivery, creationDailyCap, now }: WorkshopEconomyOptions = {}) {
  const today = calendarDateIn('UTC', now?.() ?? new Date());
  return createDevelopmentEconomy({
    LIBRARY_IDENTITY_MODE: 'development',
    DAO_PILLAR_TIME_ZONE: 'UTC',
    DAO_PILLAR_STARTS_ON: addCalendarDays(today, -(daoPillarDay - 1)),
    ...(scrollDelivery ? { ACHIEVEMENTS_SCROLL_DELIVERY: scrollDelivery } : {}),
    ...(creationDailyCap ? { CREATION_DAO_XP_DAILY_CAP: String(creationDailyCap) } : {}),
  }, { now });
}

export type WorkshopEconomyClients = LibraryEconomyClients;

/**
 * Every Library economy client for one Workshop account. With no `fetch`,
 * they call the real `/api/library-economy` route; with one, whatever it
 * serves (usually `createInProcessEconomyFetch`).
 */
export const createWorkshopEconomyClients: (uid: string | null, fetchImpl?: typeof fetch) => WorkshopEconomyClients = createLibraryEconomyClients;

/**
 * The Workshop's simulators, sent through the development-only operations of
 * the real HTTP handlers (a production principal is refused every one of
 * them). They stand in for systems that do not exist yet: trusted activity
 * intake from reading and creation, the Fate Survival judge, and a QI faucet
 * for testing spending.
 */
export function createWorkshopSimulators(uid: string, fetchImpl: typeof fetch) {
  const post = async <T,>(capability: string, body: Record<string, unknown>): Promise<T> => {
    const response = await fetchImpl(`${ECONOMY_PATH}?capability=${capability}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${developmentIdentityToken(uid)}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
    if (!response.ok || !payload) throw new Error(payload?.error ?? 'The development economy refused the simulation.');
    return payload;
  };
  let grants = 0;
  return {
    grantQi: (amount: number) => post('cultivation', { operation: 'development.grant', amount, idempotencyKey: `workshop-grant-${Date.now()}-${grants += 1}` }),
    openingDaoXp: (amount: number) => post('dao-xp', { operation: 'development.opening-balance', amount }),
    grantFamiliar: (familiarId: string) => post('familiars', { operation: 'development.grant-familiar', familiarId }),
  };
}
