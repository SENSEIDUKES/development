/**
 * The Familiar's live talk on ElevenLabs Realtime (Eleven Realtime v1 Mini or
 * Max), which speaks OpenAI's Realtime protocol over a WebSocket. This server
 * mints a short-lived client secret locked to the whole session (who the
 * Familiar is, its functions, its voice), so the API key never leaves it and
 * the browser cannot change the session.
 */
import type { FamiliarLiveBrief } from '@seihouse/library/familiar';
import { FAMILIAR_LIVE_SESSION_MS } from './limits';
import { openAiLiveTools } from './openai';
import { familiarLiveInstruction } from './prompt';

const CLIENT_SECRETS_URL = 'https://api.elevenlabs.io/v1/convai/realtime/client_secrets';
/** ElevenLabs' own default voice until each Familiar has its own; `FAMILIAR_LIVE_ELEVENLABS_VOICE` changes it. */
const DEFAULT_VOICE = 'brian';
/** ElevenLabs Realtime hears and speaks 24 kHz, 16-bit mono. */
export const ELEVENLABS_LIVE_RATE = 24_000;
const SECRET_TIMEOUT_MS = 20_000;

/** The whole session: one model hears, thinks, acts through the Familiar's functions and speaks. */
export function elevenLabsLiveSession(brief: FamiliarLiveBrief, options: { model: string; voice: string }) {
  const tools = openAiLiveTools(brief);
  return {
    type: 'realtime' as const,
    model: options.model,
    instructions: familiarLiveInstruction(brief),
    output_modalities: ['audio'],
    audio: {
      input: {
        format: { type: 'audio/pcm', rate: ELEVENLABS_LIVE_RATE },
        turn_detection: { type: 'semantic_vad', eagerness: 'medium' },
      },
      output: { format: { type: 'audio/pcm' }, voice: options.voice },
    },
    ...(tools.length ? { tools, tool_choice: 'auto', parallel_tool_calls: false } : {}),
    max_duration_seconds: FAMILIAR_LIVE_SESSION_MS / 1_000,
  };
}

export interface ElevenLabsLiveResult { ok: true; secret: string; expiresAt?: number }
export interface ElevenLabsLiveFailure { ok: false; status: number; detail: string }

/** Mints the client secret the browser opens the conversation with. */
export async function startElevenLabsLive(
  input: { apiKey: string; brief: FamiliarLiveBrief; environment: Record<string, string | undefined>; model: string },
  request: typeof fetch = fetch,
): Promise<ElevenLabsLiveResult | ElevenLabsLiveFailure> {
  const session = elevenLabsLiveSession(input.brief, {
    model: input.model,
    voice: input.environment.FAMILIAR_LIVE_ELEVENLABS_VOICE?.trim() || DEFAULT_VOICE,
  });
  const response = await request(CLIENT_SECRETS_URL, {
    method: 'POST',
    headers: { 'xi-api-key': input.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, expires_after: { anchor: 'created_at', seconds: FAMILIAR_LIVE_SESSION_MS / 1_000 } }),
    signal: AbortSignal.timeout(SECRET_TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (parsed.detail !== undefined) detail = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
    } catch { /* plain text */ }
    return { ok: false, status: response.status, detail: detail.replaceAll(input.apiKey, '[key]').slice(0, 300) };
  }
  const body = JSON.parse(text) as { value?: unknown; expires_at?: unknown };
  if (typeof body.value !== 'string' || !body.value) return { ok: false, status: 502, detail: 'ElevenLabs returned no client secret.' };
  return { ok: true, secret: body.value, ...(typeof body.expires_at === 'number' ? { expiresAt: body.expires_at } : {}) };
}
