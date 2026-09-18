import { createEnergyPrincipalResolver } from './authentication';
import { developmentRepositoryIdentityMode, resolveEnergyConfig } from './config';
import { handleEnergyHttp } from './http';
import { InMemoryEnergyRepository } from './inMemoryEnergyRepository';
import { EnergyService } from './service';

export const maxDuration = 30;

interface RequestLike {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: unknown): void;
}

/**
 * The deployed Development ledger. DEV has no database connection of its own,
 * so it runs the in-memory implementation for previewing: one ledger lives for
 * the life of the serverless instance, and balances reset when Vercel recycles
 * it.
 *
 * A durable deployment swaps in an `EnergyRepository` backed by a real store —
 * `PostgresEnergyRepository` is the current reference implementation — and
 * passes `production` with the host's own token verifier. Which host that is,
 * and which adapter it uses, is decided during production-repository
 * reconstruction; nothing here is wired to a production database.
 */
const identityMode = developmentRepositoryIdentityMode(process.env);
const service = new EnergyService(new InMemoryEnergyRepository(), resolveEnergyConfig(process.env, identityMode));
const resolvePrincipal = identityMode === 'development'
  ? createEnergyPrincipalResolver({ mode: 'development' })
  : null;

export default async function energyHandler(request: RequestLike, response: ResponseLike) {
  const result = resolvePrincipal
    ? await handleEnergyHttp(
        { method: request.method, body: request.body, headers: request.headers },
        { service, resolvePrincipal, onError: error => console.error('[energy]', error) },
      )
    : {
        status: 503,
        body: { error: 'Energy production identity requires a token verifier; none is wired in this Development deployment.', code: 'unavailable' },
        headers: { 'Cache-Control': 'no-store' },
      };
  for (const [name, value] of Object.entries(result.headers ?? {})) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}
