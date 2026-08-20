/**
 * Reader Codex signature-quote voice endpoint — server only.
 *
 * The browser posts a Character identity and nothing else. It cannot choose
 * the spoken text, a provider voice, a storage key, or a playback URL: the
 * request is rejected outright when it carries any such field.
 */

import {
  CodexVoiceQuoteService,
  createConfiguredCodexVoiceQuoteService,
  type CodexVoiceEnvironment,
} from './codexVoiceQuote';
import { hasValidBearerToken } from '../shared/bearerToken';
import type { LivingStoryRecord } from '../../components/chapter-generation/shared/packets/livingStoryEntityIdentity';

export interface CodexVoiceQuoteHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface CodexVoiceQuoteHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface CodexVoiceQuoteHttpDependencies {
  environment: CodexVoiceEnvironment;
  /** Test/integration override for the configured server service. */
  service?: CodexVoiceQuoteService;
  onError?: (error: unknown) => void;
}

/**
 * Fields a client may never supply. Any of them means the caller is trying to
 * pick the audio instead of letting the server resolve it.
 */
const FORBIDDEN_REQUEST_FIELDS = [
  'text',
  'quote',
  'voiceid',
  'voice_id',
  'providervoiceid',
  'objectkey',
  'key',
  'url',
  'publicurl',
  'voicecliurl',
  'voiceclipurl',
  'model',
  'modelid',
  'apikey',
];

/** Character fields the endpoint reads. Everything else is ignored. */
const CHARACTER_FIELDS = [
  'id',
  'persistenceId',
  'name',
  'signatureQuote',
  'voiceKey',
  'portraitKind',
  'isBeast',
  'isIntelligent',
  'intelligent',
  'intelligence',
  'creatureProfile',
  'speciesId',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizedField = (field: string) => field.toLowerCase().replace(/[^a-z0-9]/gu, '');

const findForbiddenField = (value: Record<string, unknown>): string | undefined => (
  Object.keys(value).find(field => FORBIDDEN_REQUEST_FIELDS.includes(normalizedField(field)))
);

const pickCharacter = (value: Record<string, unknown>): LivingStoryRecord => {
  const character: LivingStoryRecord = {};
  for (const field of CHARACTER_FIELDS) {
    if (value[field] !== undefined) character[field] = value[field];
  }
  return character;
};

const failure = (status: number, error: string): CodexVoiceQuoteHttpResponse => ({
  status,
  body: { error },
});

export async function handleCodexVoiceQuoteHttp(
  request: CodexVoiceQuoteHttpRequest,
  dependencies: CodexVoiceQuoteHttpDependencies,
): Promise<CodexVoiceQuoteHttpResponse> {
  if ((request.method ?? 'GET').toUpperCase() !== 'POST') {
    return { status: 405, body: { error: 'Use POST.' }, headers: { Allow: 'POST' } };
  }

  const accessToken = dependencies.environment.CHAPTER_GENERATION_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return failure(503, 'Character voice is not available on this server.');
  }
  if (!hasValidBearerToken(request, accessToken)) {
    return failure(401, 'A valid Development access token is required.');
  }

  let parsed: unknown;
  try {
    parsed = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  } catch {
    return failure(400, 'The Character voice request must be a JSON object.');
  }
  if (!isRecord(parsed) || !isRecord(parsed.character)) {
    return failure(400, 'The Character voice request must carry one Character identity.');
  }
  const forbidden = findForbiddenField(parsed) ?? findForbiddenField(parsed.character);
  if (forbidden) {
    return failure(400, `The Character voice request may not choose ${forbidden}.`);
  }

  let service: CodexVoiceQuoteService | undefined;
  try {
    service = dependencies.service
      ?? createConfiguredCodexVoiceQuoteService(dependencies.environment, {
        onError: dependencies.onError,
      });
  } catch (error) {
    dependencies.onError?.(error);
    return failure(503, 'Character voice is not available on this server.');
  }
  if (!service) return failure(503, 'Character voice is not available on this server.');

  const result = await service.resolve({ character: pickCharacter(parsed.character) });
  if (!result.ok) {
    const status = result.reason === 'synthesis-failed'
      ? 502
      : result.reason === 'no-available-voice'
        ? 503
        : 422;
    return failure(status, result.message);
  }

  return {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
    body: {
      voice: {
        characterId: result.characterId,
        voiceKey: result.voiceKey,
        artifact: result.artifact,
      },
    },
  };
}
