import { handleReaderTranslationHttp } from './http';
import {
  createPublicGenerationGuard,
  type PublicGenerationGuardResult,
} from '../shared/publicGenerationGuard';

export const maxDuration = 180;

const guardReaderTranslation = createPublicGenerationGuard({
  key: 'reader-translation',
  limit: 12,
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

export default async function readerTranslationHandler(request: RequestLike, response: ResponseLike) {
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === 'POST'
    ? guardReaderTranslation(request)
    : { allowed: true };
  const result = admission.allowed
    ? await handleReaderTranslationHttp(
      { method: request.method, body: request.body, headers: request.headers },
      {
        environment: process.env,
        onError: error => console.error('[reader-translation] request failure', error),
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
