/**
 * Workshop-only: the development economy served in-process.
 *
 * `createDevelopmentEconomy` is the same runtime `/api/library-economy` serves
 * from the Vite middleware and the Vercel function — every ledger, service and
 * HTTP handler. Here it runs inside the browser tab, and a `fetch` adapter
 * hands each request to its HTTP handler, so the Library's real HTTP clients
 * talk to real server code with nothing mocked but the network. Each preview
 * scenario gets a fresh economy, which makes every scenario reproducible and
 * keeps one scenario's rewards out of another's.
 *
 * It never reaches production data and is never transferred: a host mounts
 * the same clients against its own API.
 */
import { createHttpDaoXpClient, createHttpQiClient, type DaoXpClient, type QiClient } from '@seihouse/library/cultivation';
import { createHttpEnergyClient, type EnergyClient } from '@seihouse/library/energy';
import { createHttpDaoPillarClient, type DaoPillarClient } from '@seihouse/library/dao-pillar';
import { createHttpAchievementsClient, type AchievementsClient } from '@seihouse/library/rewards';
import { createHttpRelicsClient, type RelicsClient } from '@seihouse/library/relics';
import { createHttpFamiliarsClient, type FamiliarsClient } from '@seihouse/library/familiar';
import { addCalendarDays, calendarDateIn } from '../../../server/dao-pillar/calendar';
import { createDevelopmentEconomy, type DevelopmentEconomy } from '../../../server/economy/developmentRuntime';
import { developmentIdentityToken } from '../../../server/identity/authentication';

const ECONOMY_PATH = '/api/library-economy';

export interface WorkshopEconomyFaults {
  /** `failed`: the server refuses today's claim. `unresolved`: the claim lands but its answer is lost. */
  daoPillarClaim?: 'failed' | 'unresolved';
}

const isDaoPillarClaim = (capability: string | null, init: RequestInit | undefined) =>
  capability === 'dao-pillar' && (init?.method ?? 'GET').toUpperCase() === 'POST'
    && typeof init?.body === 'string' && /"operation"\s*:\s*"claim"/.test(init.body);

/** A `fetch` that answers `/api/library-economy` from an in-process economy. */
export function createInProcessEconomyFetch(economy: DevelopmentEconomy, options: { delayMs?: () => number; faults?: WorkshopEconomyFaults } = {}): typeof fetch {
  return async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, 'http://workshop.local');
    if (url.pathname !== ECONOMY_PATH) {
      return new Response(JSON.stringify({ error: 'The Workshop economy serves only /api/library-economy.' }), { status: 404 });
    }
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => { headers[key] = value; });
    const delay = options.delayMs?.() ?? 0;
    if (delay > 0) await new Promise(resolve => { setTimeout(resolve, delay); });
    const capability = url.searchParams.get('capability');
    const claimFault = isDaoPillarClaim(capability, init) ? options.faults?.daoPillarClaim : undefined;
    if (claimFault === 'failed') {
      return new Response(JSON.stringify({ error: 'The Dao Pillar is unavailable right now. Please try again shortly.', code: 'unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    const result = await economy.handle(capability, {
      method: init?.method ?? 'GET',
      headers,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    // The claim landed; the answer is lost on the way back.
    if (claimFault === 'unresolved') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json', ...(result.headers ?? {}) },
    });
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

export interface WorkshopEconomyClients {
  qi: QiClient;
  daoXp: DaoXpClient;
  energy: EnergyClient;
  daoPillar: DaoPillarClient;
  achievements: AchievementsClient;
  relics: RelicsClient;
  familiars: FamiliarsClient;
}

/**
 * Every Library economy client for one Workshop account. With no `fetch`,
 * they call the real `/api/library-economy` route; with one, whatever it
 * serves (usually `createInProcessEconomyFetch`).
 */
export function createWorkshopEconomyClients(uid: string | null, fetchImpl?: typeof fetch): WorkshopEconomyClients {
  const token = () => (uid ? developmentIdentityToken(uid) : null);
  const transport = fetchImpl ? { fetch: fetchImpl } : {};
  return {
    qi: createHttpQiClient({ token, ...transport }),
    daoXp: createHttpDaoXpClient({ token, ...transport }),
    energy: createHttpEnergyClient({ token, ...transport }),
    daoPillar: createHttpDaoPillarClient({ token, ...transport }),
    achievements: createHttpAchievementsClient({ token, ...transport }),
    relics: createHttpRelicsClient({ token, ...transport }),
    familiars: createHttpFamiliarsClient({ token, ...transport }),
  };
}

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
