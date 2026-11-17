/**
 * Kokoro voices from SEIHouse's own voice server (SENSEI, 2026-11-17): the free
 * voice for narration and every line without a paid cast voice. The voice
 * server (`services/kokoro-voice`, on Google Cloud Run) makes a line once,
 * keeps it, and serves the saved file to every reader after, so a line is only
 * ever made one time. This module is the app's side: it asks for a line with
 * the shared key and hands the browser the clip's address. Server only.
 */

export interface KokoroVoiceEnvironment {
  /** The voice server's address, from its setup (`services/kokoro-voice/setup.sh`). */
  KOKORO_SERVER_URL?: string;
  /** The key the voice server was set up with. Never sent to the browser. */
  KOKORO_SERVER_TOKEN?: string;
}

/** The longest line the voice server makes. */
export const KOKORO_LINE_LIMIT = 600;
/** Kokoro voice ids: a language and sex code, then a name (`bm_lewis`). */
export const KOKORO_VOICE_ID = /^[a-z]{2}_[a-z]+$/;

export interface KokoroVoiceService {
  /** A line's clip address, made now or already kept. */
  line(request: { text: string; voice: string }): Promise<{ url: string; made: boolean }>;
}

export class KokoroVoiceRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'KokoroVoiceRequestError';
  }
}

const serverAddress = (environment: KokoroVoiceEnvironment) => {
  const url = environment.KOKORO_SERVER_URL?.trim();
  const token = environment.KOKORO_SERVER_TOKEN?.trim();
  if (!url || !token) return undefined;
  return { url: url.replace(/\/+$/, ''), token };
};

/** Whether this server has a Kokoro voice server to ask. */
export const kokoroVoiceAvailable = (environment: KokoroVoiceEnvironment) => Boolean(serverAddress(environment));

export function createKokoroVoiceService(environment: KokoroVoiceEnvironment, fetchImpl: typeof fetch = fetch): KokoroVoiceService {
  const server = serverAddress(environment);
  if (!server) throw new Error('KOKORO_SERVER_URL and KOKORO_SERVER_TOKEN are not set.');
  return {
    async line({ text, voice }) {
      const response = await fetchImpl(`${server.url}/line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${server.token}` },
        body: JSON.stringify({ text, voice }),
        signal: AbortSignal.timeout(90_000),
      });
      const answer = await response.json().catch(() => undefined) as { url?: unknown; made?: unknown; error?: unknown } | undefined;
      if (!response.ok || typeof answer?.url !== 'string' || !answer.url.startsWith('/clip/')) {
        throw new KokoroVoiceRequestError(typeof answer?.error === 'string' ? answer.error : `The voice server answered ${response.status}.`, response.ok ? 502 : response.status);
      }
      // The saved clip is served by the voice server itself, to anyone, so the browser plays it straight from there.
      return { url: `${server.url}${answer.url}`, made: answer.made === true };
    },
  };
}
