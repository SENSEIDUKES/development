/**
 * A practice account on the Library's real economy, for a host that has no
 * economy server yet (the NovelExpanded app, until its database).
 *
 * Every ledger, service and HTTP handler of `/api/library-economy` runs in the
 * page, fresh on every visit. The account opens with the most QI a tester
 * could want and every Familiar in the catalogue, so each one can be equipped,
 * trained and shown before any of it is earned. What the reader does with it
 * (a Dao Pillar claim, an offering, a purchase) lasts for the visit; a reload
 * starts the account again. Nothing reaches a server.
 */
import { allFamiliarOptions } from '../familiar/catalogue';
import { calendarDateIn } from '../../server/dao-pillar/calendar';
import { createDevelopmentEconomy, type DevelopmentEconomy } from '../../server/economy/developmentRuntime';
import { developmentIdentityToken } from '../../server/identity/authentication';
import { QI_DEVELOPMENT_MAX_GRANT } from '../../server/qi/http';
import { createInProcessEconomyFetch, createLibraryEconomyClients, type LibraryEconomyClients } from './inProcessEconomy';

/** The practice account's opening QI. */
export const PRACTICE_QI = 1_000_000;

export interface PracticeEconomy {
  economy: DevelopmentEconomy;
  clients: LibraryEconomyClients;
  /** Settles once the account holds its QI and Familiars; the clients' requests wait for it. */
  ready: Promise<void>;
}

/** The device's own day, so the Dao Pillar turns at the reader's midnight. */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function createPracticeEconomy({ uid, familiarIds = allFamiliarOptions.map(option => option.id), now }: {
  /** The development account the clients act for. */
  uid: string;
  /** The Familiars the account opens with (default: the whole catalogue). */
  familiarIds?: readonly string[];
  now?: () => Date;
}): PracticeEconomy {
  const timeZone = deviceTimeZone();
  // The Dao Pillar's cycle starts on the visit's own day.
  const economy = createDevelopmentEconomy({
    LIBRARY_IDENTITY_MODE: 'development',
    DAO_PILLAR_TIME_ZONE: timeZone,
    DAO_PILLAR_STARTS_ON: calendarDateIn(timeZone, now?.() ?? new Date()),
  }, { now });
  const serve = createInProcessEconomyFetch(economy);
  // A refusal is reported and the account opens with the rest; requests never wait on a failure.
  const ready = openPracticeAccount(economy, uid, familiarIds).catch(error => {
    console.warn('The practice account could not be opened.', error);
  });
  const waitThenServe: typeof fetch = async (input, init) => {
    await ready;
    return serve(input, init);
  };
  return { economy, clients: createLibraryEconomyClients(uid, waitThenServe), ready };
}

/**
 * Grants the opening QI (in the development grant's largest steps) and every
 * Familiar, through the same development operations the Workshop uses. A
 * grant the economy refuses is reported and skipped, so the account still
 * opens with the rest.
 */
async function openPracticeAccount(economy: DevelopmentEconomy, uid: string, familiarIds: readonly string[]): Promise<void> {
  const headers = { authorization: `Bearer ${developmentIdentityToken(uid)}` };
  const grant = async (capability: string, body: Record<string, unknown>) => {
    const result = await economy.handle(capability, { method: 'POST', headers, body });
    if (result.status >= 400) console.warn(`The practice account could not be opened fully (${capability}).`, result.body);
  };
  for (let step = 0; step * QI_DEVELOPMENT_MAX_GRANT < PRACTICE_QI; step += 1) {
    await grant('cultivation', {
      operation: 'development.grant',
      amount: Math.min(QI_DEVELOPMENT_MAX_GRANT, PRACTICE_QI - step * QI_DEVELOPMENT_MAX_GRANT),
      idempotencyKey: `practice-account-qi-${step}`,
    });
  }
  for (const familiarId of familiarIds) await grant('familiars', { operation: 'development.grant-familiar', familiarId });
}
