import { CHAPTER_VOICE_VISITOR_LIMIT, KOKORO_VOICE_VISITOR_LIMIT, handleChapterVoiceHttp, isKokoroVoiceRequest } from './chapterVoiceHttp';
import {
  createPublicGenerationGuard,
  developmentAccessToken,
  ownerTokenAdmission,
  type PublicGenerationGuardResult,
} from '../shared/publicGenerationGuard';

export const maxDuration = 120;

const guardChapterVoice = createPublicGenerationGuard(CHAPTER_VOICE_VISITOR_LIMIT);
const guardKokoroVoice = createPublicGenerationGuard(KOKORO_VOICE_VISITOR_LIMIT);

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

export default async function chapterVoiceHandler(request: RequestLike, response: ResponseLike) {
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === 'POST'
    ? ownerTokenAdmission(request, developmentAccessToken(process.env)) ?? (isKokoroVoiceRequest(request.body) ? guardKokoroVoice : guardChapterVoice)(request)
    : { allowed: true };
  const result = admission.allowed
    ? await handleChapterVoiceHttp(
      { method: request.method, body: request.body },
      { environment: process.env, onError: error => console.error('[chapter-voice]', error) },
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
