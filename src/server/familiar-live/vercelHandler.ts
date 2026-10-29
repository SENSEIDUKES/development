import { handleFamiliarLiveHttp } from './http';
import {
  createPublicGenerationGuard,
  developmentAccessToken,
  ownerTokenAdmission,
  type PublicGenerationGuardResult,
} from '../shared/publicGenerationGuard';
import { FAMILIAR_LIVE_VISITOR_LIMIT } from './limits';

export const maxDuration = 30;

const guardFamiliarLive = createPublicGenerationGuard(FAMILIAR_LIVE_VISITOR_LIMIT);

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

export default async function familiarLiveHandler(request: RequestLike, response: ResponseLike) {
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === 'POST'
    ? ownerTokenAdmission(request, developmentAccessToken(process.env)) ?? guardFamiliarLive(request)
    : { allowed: true };
  const result = admission.allowed
    ? await handleFamiliarLiveHttp(
      { method: request.method, body: request.body, headers: request.headers },
      { environment: process.env, onError: error => console.error('[familiar-live] request failure', error) },
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
