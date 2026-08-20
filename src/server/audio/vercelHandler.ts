import { handleCodexVoiceQuoteHttp } from "./codexVoiceQuoteHttp";
import { createConfiguredCodexVoiceQuoteService } from "./codexVoiceQuote";

export const maxDuration = 120;

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
  const result = await handleCodexVoiceQuoteHttp(
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
