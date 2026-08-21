import { handleCodexVoiceQuoteHttp } from "./codexVoiceQuoteHttp";
import { createConfiguredCodexVoiceQuoteService } from "./codexVoiceQuote";
import {
  createPublicGenerationGuard,
  type PublicGenerationGuardResult,
} from "../shared/publicGenerationGuard";

export const maxDuration = 120;

// Every tap calls ElevenLabs again — nothing is cached or stored. This guard
// keeps a public Development page from being used to run unlimited synthesis.
const guardCodexVoiceQuote = createPublicGenerationGuard({
  key: "codex-voice-quote",
  limit: 8,
  windowMs: 60 * 60 * 1_000,
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

let service: ReturnType<typeof createConfiguredCodexVoiceQuoteService>;
let serviceReady = false;

/** One process-wide service keeps concurrent taps on one artifact deduplicated. */
const configuredService = () => {
  if (serviceReady) return service;
  serviceReady = true;
  try {
    service = createConfiguredCodexVoiceQuoteService(process.env, {
      onError: error => console.error("[codex-voice] synthesis failure", error),
    });
  } catch (error) {
    console.error("[codex-voice] configuration failure", error);
    service = undefined;
  }
  return service;
};

export default async function codexVoiceQuoteHandler(
  request: RequestLike,
  response: ResponseLike,
) {
  const admission: PublicGenerationGuardResult = request.method?.toUpperCase() === "POST"
    ? guardCodexVoiceQuote(request)
    : { allowed: true };
  const result = !admission.allowed
    ? {
        status: admission.status ?? 403,
        body: { error: admission.error ?? "Character voice is unavailable." },
        headers: {
          "Cache-Control": "no-store",
          ...(admission.retryAfterSeconds ? { "Retry-After": String(admission.retryAfterSeconds) } : {}),
        },
      }
    : await handleCodexVoiceQuoteHttp(
        { method: request.method, body: request.body, headers: request.headers },
        {
          environment: process.env,
          service: configuredService(),
          onError: error => console.error("[codex-voice]", error),
        },
      );
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(name, value);
  }
  response.status(result.status).json(result.body);
}
