/**
 * The Library economy served inside the page.
 *
 * `createDevelopmentEconomy` is the same runtime `/api/library-economy` serves
 * from the Vite middleware and the Vercel function: every ledger, service and
 * HTTP handler. Here it runs in the browser tab, and a `fetch` adapter hands
 * each request to its HTTP handler, so the Library's real HTTP clients talk to
 * real server code with nothing stood in for but the network. The Workshop's
 * scenarios and the NovelExpanded app's practice account both use it.
 *
 * It never reaches production data: a host with a server mounts the same
 * clients against its own API.
 */
import { createHttpDaoXpClient, createHttpQiClient, type DaoXpClient, type QiClient } from '@seihouse/library/cultivation';
import { createHttpEnergyClient, type EnergyClient } from '@seihouse/library/energy';
import { createHttpDaoPillarClient, type DaoPillarClient } from '@seihouse/library/dao-pillar';
import { createHttpAchievementsClient, type AchievementsClient } from '@seihouse/library/rewards';
import { createHttpRelicsClient, type RelicsClient } from '@seihouse/library/relics';
import { createHttpFamiliarsClient, type FamiliarsClient } from '@seihouse/library/familiar';
import type { DevelopmentEconomy } from '../../server/economy/developmentRuntime';
import { developmentIdentityToken } from '../../server/identity/authentication';

/** The one route the Library's economy clients call. */
export const LIBRARY_ECONOMY_PATH = '/api/library-economy';

/** A `fetch` that answers `/api/library-economy` from an economy running in this page. */
export function createInProcessEconomyFetch(economy: DevelopmentEconomy): typeof fetch {
  return async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, 'http://library.local');
    if (url.pathname !== LIBRARY_ECONOMY_PATH) {
      return new Response(JSON.stringify({ error: `This economy serves only ${LIBRARY_ECONOMY_PATH}.` }), { status: 404 });
    }
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => { headers[key] = value; });
    const result = await economy.handle(url.searchParams.get('capability'), {
      method: init?.method ?? 'GET',
      headers,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json', ...(result.headers ?? {}) },
    });
  };
}

/** Every Library economy client a page mounts for one account. */
export interface LibraryEconomyClients {
  qi: QiClient;
  daoXp: DaoXpClient;
  energy: EnergyClient;
  daoPillar: DaoPillarClient;
  achievements: AchievementsClient;
  relics: RelicsClient;
  familiars: FamiliarsClient;
}

/**
 * Every Library economy client for one development account (`uid`, or none
 * for a signed-out reader). With no `fetch`, they call the real
 * `/api/library-economy` route; with one, whatever it serves (usually
 * `createInProcessEconomyFetch`).
 */
export function createLibraryEconomyClients(uid: string | null, fetchImpl?: typeof fetch): LibraryEconomyClients {
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
