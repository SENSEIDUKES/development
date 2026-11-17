import type { ChapterVoiceCharacter } from '@seihouse/library/stories';
import { base64ToBlob } from './imageFiles';

export const CHAPTER_VOICE_ENDPOINT = '/api/chapter-voice';

/** A voice request the server refused or could not answer; `status` is its HTTP status. */
export class ChapterVoiceRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ChapterVoiceRequestError';
  }
}

interface VoiceRequestOptions {
  accessToken?: string;
  fetchImpl?: typeof fetch;
  /** Gives up after this long, so a stalled connection cannot hold a line forever. */
  timeoutMs?: number;
}

async function post(body: Record<string, unknown>, options: VoiceRequestOptions): Promise<Record<string, unknown>> {
  const response = await (options.fetchImpl ?? fetch)(CHAPTER_VOICE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: JSON.stringify(body),
    ...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
  });
  const answer = await response.json().catch(() => undefined) as Record<string, unknown> | undefined;
  if (!response.ok) {
    throw new ChapterVoiceRequestError(typeof answer?.error === 'string' ? answer.error : `The voice server answered ${response.status}.`, response.status);
  }
  return answer ?? {};
}

/** Whether this server can make character voices, and the voice model that prices them. */
export async function readChapterVoiceInfo(fetchImpl: typeof fetch = fetch): Promise<{ available: boolean; model?: string }> {
  try {
    const response = await fetchImpl(CHAPTER_VOICE_ENDPOINT);
    const answer = response.ok ? await response.json() as { available?: unknown; model?: unknown } : undefined;
    return { available: answer?.available === true, ...(typeof answer?.model === 'string' ? { model: answer.model } : {}) };
  } catch {
    return { available: false };
  }
}

/** A cast voice for each character, from what its Codex card says; `kept` voices are never changed. */
export async function requestChapterVoiceCast(
  characters: readonly ChapterVoiceCharacter[],
  kept: Readonly<Record<string, string>>,
  options: VoiceRequestOptions = {},
): Promise<Record<string, string>> {
  const answer = await post({ cast: { characters, kept } }, options);
  const cast = answer.cast && typeof answer.cast === 'object' ? answer.cast as Record<string, { voiceKey?: unknown }> : {};
  return Object.fromEntries(Object.entries(cast).flatMap(([key, choice]) => typeof choice?.voiceKey === 'string' ? [[key, choice.voiceKey]] : []));
}

/** One spoken line in a cast voice, as audio. */
export async function requestChapterVoiceLine(line: { text: string; voiceKey: string }, options: VoiceRequestOptions = {}): Promise<Blob> {
  const answer = await post({ line }, options);
  const audio = answer.audio as { base64?: unknown; mimeType?: unknown } | undefined;
  if (typeof audio?.base64 !== 'string' || typeof audio.mimeType !== 'string' || !audio.mimeType.startsWith('audio/')) {
    throw new ChapterVoiceRequestError('The voice server answered without audio.', 502);
  }
  return base64ToBlob(audio.base64, audio.mimeType);
}

/** A free Kokoro line from SEIHouse's voice server: the saved clip's address, and whether it was made just now. */
export async function requestKokoroLine(line: { text: string; voice: string }, options: VoiceRequestOptions = {}): Promise<{ url: string; made: boolean }> {
  // A little longer than the app's server waits for the voice server (90 s).
  const answer = await post({ kokoro: line }, { timeoutMs: 100_000, ...options });
  if (typeof answer.url !== 'string' || !/^https:\/\//.test(answer.url)) throw new ChapterVoiceRequestError('The voice server answered without a clip.', 502);
  return { url: answer.url, made: answer.made === true };
}

/** The voice server as the device's voices use it. */
export interface ChapterVoiceClient {
  info(): Promise<{ available: boolean; model?: string }>;
  cast(characters: readonly ChapterVoiceCharacter[], kept: Readonly<Record<string, string>>): Promise<Record<string, string>>;
  line(line: { text: string; voiceKey: string }): Promise<Blob>;
}
