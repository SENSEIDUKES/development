import { handleHarnessGenerationHttp } from './http';
import {
  createPublicGenerationGuard,
  type PublicGenerationGuardResult,
} from '../shared/publicGenerationGuard';

export const maxDuration = 180;

const guardHarnessGeneration = createPublicGenerationGuard({
  key: 'harness-generation',
  limit: 6,
  windowMs: 30 * 60 * 1_000,
});

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

export default async function harnessGenerationHandler(request: RequestLike, response: ResponseLike) {
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === 'POST'
    ? guardHarnessGeneration(request)
    : { allowed: true };
  const result = admission.allowed
    ? await handleHarnessGenerationHttp(
      { method: request.method, body: request.body, headers: request.headers },
      {
        environment: process.env,
        onError: error => console.error('[harness-generation] request failure', error),
      },
    )
    : {
      status: admission.status ?? 403,
      body: { error: admission.error ?? 'This Development action is unavailable.' },
      headers: {
        'Cache-Control': 'no-store',
        ...(admission.retryAfterSeconds ? { 'Retry-After': String(admission.retryAfterSeconds) } : {}),
      },
    };
  for (const [name, value] of Object.entries(result.headers ?? {})) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}
