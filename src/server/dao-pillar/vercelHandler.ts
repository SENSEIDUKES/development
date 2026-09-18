import { createEnergyPrincipalResolver } from '../energy/authentication';
import { developmentRepositoryIdentityMode } from '../energy/config';
import { resolveDaoPillarConfig } from './config';
import { handleDaoPillarHttp } from './http';
import { InMemoryDaoPillarRepository } from './inMemoryDaoPillarRepository';
import { DaoPillarService } from './service';

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
 * The deployed Development calendar. Like Energy, DEV has no database
 * connection of its own, so claims and Qi deposits live in memory for the
 * life of the serverless instance and reset when Vercel recycles it. A
 * durable deployment swaps in `PostgresDaoPillarRepository` and passes
 * `production` with the host's own token verifier.
 */
const identityMode = developmentRepositoryIdentityMode(process.env);
const service = new DaoPillarService(new InMemoryDaoPillarRepository(), resolveDaoPillarConfig(process.env, identityMode));
const resolvePrincipal = identityMode === 'development'
  ? createEnergyPrincipalResolver({ mode: 'development' })
  : null;

export default async function daoPillarHandler(request: RequestLike, response: ResponseLike) {
  const result = resolvePrincipal
    ? await handleDaoPillarHttp(
        { method: request.method, body: request.body, headers: request.headers },
        { service, resolvePrincipal, onError: error => console.error('[dao-pillar]', error) },
      )
    : {
        status: 503,
        body: { error: 'Dao Pillar production identity requires a token verifier; none is wired in this Development deployment.', code: 'unavailable' },
        headers: { 'Cache-Control': 'no-store' },
      };
  for (const [name, value] of Object.entries(result.headers ?? {})) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}
