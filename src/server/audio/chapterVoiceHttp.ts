/**
 * The chapter voice endpoint: server only.
 *
 * GET says whether paid voices can be made here and with which model, so the
 * page can price a chapter before anything is spent. POST does one of two
 * things: `{ cast: { characters, kept } }` chooses cast voices from Codex
 * cards (no provider call), and `{ line: { text, voiceKey } }` makes one
 * spoken line. The browser never names a provider voice or a model.
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

/** A visitor's spoken lines an hour; the owner's access token lifts it. About two chapters. */
export const CHAPTER_VOICE_VISITOR_LIMIT = { key: 'chapter-voice', limit: 60, windowMs: 60 * 60 * 1_000 } as const;

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
  if (method === 'GET') {
    return { status: 200, headers: NO_STORE, body: service ? { available: true, model: service.model } : { available: false } };
  }
  if (method !== 'POST') return { status: 405, body: { error: 'Use GET or POST.' }, headers: { Allow: 'GET, POST' } };
  if (!service) return failure(503, 'Character voices are not available on this server.');

  let parsed: unknown;
  try {
    parsed = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  } catch {
    return failure(400, 'The voice request must be a JSON object.');
  }
  if (!isRecord(parsed)) return failure(400, 'The voice request must be a JSON object.');

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
