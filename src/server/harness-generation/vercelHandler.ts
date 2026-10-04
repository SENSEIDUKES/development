import type { HarnessProviderReceipt } from '@seihouse/sen/harness-generation';
import { handleHarnessGenerationHttp } from './http';
import {
  createPublicGenerationGuard,
  developmentAccessToken,
  ownerTokenAdmission,
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
  // The owner's access token lifts the visitor limit.
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === 'POST'
    ? ownerTokenAdmission(request, developmentAccessToken(process.env)) ?? guardHarnessGeneration(request)
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
  // One line per answer: which model, how long it took and its size. Never the story.
  const receipt = result.status === 200 ? (result.body as { providerReceipt?: HarnessProviderReceipt }).providerReceipt : undefined;
  if (receipt) {
    console.info(`[harness-generation] ${receipt.model} answered in ${receipt.durationMs === undefined ? '?' : Math.round(receipt.durationMs / 1000)}s (${receipt.usage.inputTokens ?? '?'} tokens in, ${receipt.usage.outputTokens ?? '?'} out)`);
  }
  for (const [name, value] of Object.entries(result.headers ?? {})) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}
