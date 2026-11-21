import { handleMeaningFingerprintHttp } from './http';
import {
  createPublicGenerationGuard,
  developmentAccessToken,
  ownerTokenAdmission,
  type PublicGenerationGuardResult,
} from '../shared/publicGenerationGuard';
import { MEANING_FINGERPRINT_VISITOR_LIMIT } from './limits';

export const maxDuration = 30;

const guardMeaningFingerprint = createPublicGenerationGuard(MEANING_FINGERPRINT_VISITOR_LIMIT);

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

export default async function meaningFingerprintHandler(request: RequestLike, response: ResponseLike) {
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === 'POST'
    ? ownerTokenAdmission(request, developmentAccessToken(process.env)) ?? guardMeaningFingerprint(request)
    : { allowed: true };
  const result = admission.allowed
    ? await handleMeaningFingerprintHttp(
      { method: request.method, body: request.body },
      { environment: process.env, onError: error => console.error('[meaning-fingerprint] request failure', error) },
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
