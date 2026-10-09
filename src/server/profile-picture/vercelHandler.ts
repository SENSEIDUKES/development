import { handleProfilePictureHttp, PROFILE_PICTURE_VISITOR_LIMIT } from './http';
import {
  createPublicGenerationGuard,
  developmentAccessToken,
  ownerTokenAdmission,
  type PublicGenerationGuardResult,
} from '../shared/publicGenerationGuard';

export const maxDuration = 150;

const guardProfilePicture = createPublicGenerationGuard(PROFILE_PICTURE_VISITOR_LIMIT);

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

export default async function profilePictureHandler(request: RequestLike, response: ResponseLike) {
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === 'POST'
    ? ownerTokenAdmission(request, developmentAccessToken(process.env)) ?? guardProfilePicture(request)
    : { allowed: true };
  const result = admission.allowed
    ? await handleProfilePictureHttp(
      { method: request.method, body: request.body, headers: request.headers },
      {
        environment: process.env,
        onError: error => console.error('[profile-picture] request failure', error),
        onAnswer: ({ model, durationMs }) => console.info(`[profile-picture] ${model} answered in ${Math.round(durationMs / 1000)}s`),
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
