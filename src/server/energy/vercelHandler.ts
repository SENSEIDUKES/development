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
 * The deployed Development ledger. This repository has no database connection
 * of its own, so one in-memory ledger lives for the life of the serverless
 * instance: balances survive between requests on the same instance and start
 * over when Vercel recycles it. Light-Novels swaps in `PostgresEnergyRepository`
 * over its Data Connect Postgres instance and passes `production` here.
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
