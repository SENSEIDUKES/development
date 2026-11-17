/**
 * The chapter voice endpoint: server only.
 *
 * GET says whether paid voices can be made here and with which model, so the
 * page can price a chapter before anything is spent. POST does one of two
 * things: `{ cast: { characters, kept } }` chooses cast voices from Codex
 * cards (no provider call), and `{ line: { text, voiceKey } }` makes one
 * spoken line. The browser never names a provider voice or a model.
 *
 * `{ kokoro: { text, voice } }` asks SEIHouse's Kokoro voice server for a free
 * line (narration, or a line with no cast voice) and answers its saved clip's
 * address. GET's `kokoro` says whether that server is set up here.
 */

import {
  CHAPTER_VOICE_LINE_LIMIT,
  UnknownChapterVoiceError,
  castChapterVoices,
  createChapterVoiceService,
  parseChapterVoiceCharacters,
  type ChapterVoiceService,
} from './chapterVoice';
import type { CodexVoiceEnvironment } from './codexVoiceQuote';
import {
  KOKORO_LINE_LIMIT,
  KOKORO_VOICE_ID,
  createKokoroVoiceService,
  kokoroVoiceAvailable,
  type KokoroVoiceService,
} from './kokoroVoice';

/** A visitor's spoken lines an hour; the owner's access token lifts it. About two chapters. */
export const CHAPTER_VOICE_VISITOR_LIMIT = { key: 'chapter-voice', limit: 60, windowMs: 60 * 60 * 1_000 } as const;
/** A visitor's free Kokoro lines an hour: a chapter is a few hundred lines, and a kept line is still one request. */
export const KOKORO_VOICE_VISITOR_LIMIT = { key: 'kokoro-voice', limit: 1_500, windowMs: 60 * 60 * 1_000 } as const;

/**
 * Whether a voice request asks for a free Kokoro line, which has its own, larger
 * visitor limit. The same test chooses what the request does below, so a request
 * counted as Kokoro can only ever make a Kokoro line.
 */
export function isKokoroVoiceRequest(body: unknown): boolean {
  try {
    const parsed: unknown = typeof body === 'string' ? JSON.parse(body) : body;
    return isRecord(parsed) && isRecord(parsed.kokoro);
  } catch {
    return false;
  }
}

export interface ChapterVoiceHttpRequest {
  method?: string;
  body?: unknown;
}

export interface ChapterVoiceHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ChapterVoiceHttpDependencies {
  environment: CodexVoiceEnvironment;
  /** Test override for the configured service. */
  service?: ChapterVoiceService;
  /** Test override for the Kokoro voice server. */
  kokoro?: KokoroVoiceService;
  onError?: (error: unknown) => void;
}

const NO_STORE = { 'Cache-Control': 'no-store' };
const failure = (status: number, error: string): ChapterVoiceHttpResponse => ({ status, body: { error }, headers: NO_STORE });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const keptVoices = (value: unknown): Record<string, string> => (isRecord(value)
  ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  : {});

export async function handleChapterVoiceHttp(
  request: ChapterVoiceHttpRequest,
  dependencies: ChapterVoiceHttpDependencies,
): Promise<ChapterVoiceHttpResponse> {
  const method = (request.method ?? 'GET').toUpperCase();
  let service: ChapterVoiceService | undefined;
  try {
    service = dependencies.service ?? createChapterVoiceService(dependencies.environment);
  } catch (error) {
    dependencies.onError?.(error);
  }
  const kokoro = dependencies.kokoro ?? (kokoroVoiceAvailable(dependencies.environment) ? createKokoroVoiceService(dependencies.environment) : undefined);
  if (method === 'GET') {
    return { status: 200, headers: NO_STORE, body: { ...(service ? { available: true, model: service.model } : { available: false }), kokoro: Boolean(kokoro) } };
  }
  if (method !== 'POST') return { status: 405, body: { error: 'Use GET or POST.' }, headers: { Allow: 'GET, POST' } };

  let parsed: unknown;
  try {
    parsed = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  } catch {
    return failure(400, 'The voice request must be a JSON object.');
  }
  if (!isRecord(parsed)) return failure(400, 'The voice request must be a JSON object.');

  if (isRecord(parsed.kokoro)) {
    if (!kokoro) return failure(503, 'Kokoro voices are not set up on this server.');
    const text = typeof parsed.kokoro.text === 'string' ? parsed.kokoro.text.trim() : '';
    const voice = typeof parsed.kokoro.voice === 'string' ? parsed.kokoro.voice : '';
    if (!text || text.length > KOKORO_LINE_LIMIT) return failure(400, `A line is 1 to ${KOKORO_LINE_LIMIT} characters.`);
    if (!KOKORO_VOICE_ID.test(voice)) return failure(400, 'Unknown Kokoro voice.');
    try {
      return { status: 200, headers: NO_STORE, body: await kokoro.line({ text, voice }) };
    } catch (error) {
      dependencies.onError?.(error);
      return failure(502, 'The line could not be voiced right now.');
    }
  }

  if (!service) return failure(503, 'Character voices are not available on this server.');

  if (isRecord(parsed.cast)) {
    try {
      const characters = parseChapterVoiceCharacters(parsed.cast.characters);
      return { status: 200, headers: NO_STORE, body: { cast: castChapterVoices(characters, keptVoices(parsed.cast.kept)), model: service.model } };
    } catch (error) {
      return failure(400, error instanceof Error ? error.message : 'The cast request could not be read.');
    }
  }

  if (!isRecord(parsed.line)) return failure(400, 'Ask for a cast or for one spoken line.');
  const text = typeof parsed.line.text === 'string' ? parsed.line.text.trim() : '';
  const voiceKey = typeof parsed.line.voiceKey === 'string' ? parsed.line.voiceKey.trim() : '';
  if (!text || !voiceKey) return failure(400, 'A spoken line needs its words and its voice.');
  if (text.length > CHAPTER_VOICE_LINE_LIMIT) return failure(400, `A spoken line is at most ${CHAPTER_VOICE_LINE_LIMIT} characters.`);
  try {
    const bytes = await service.speak({ text, voiceKey });
    return {
      status: 200,
      headers: NO_STORE,
      body: { audio: { base64: Buffer.from(bytes).toString('base64'), mimeType: 'audio/mpeg' }, model: service.model, characters: text.length },
    };
  } catch (error) {
    if (error instanceof UnknownChapterVoiceError) return failure(422, error.message);
    dependencies.onError?.(error);
    return failure(502, 'The line could not be voiced right now.');
  }
}
