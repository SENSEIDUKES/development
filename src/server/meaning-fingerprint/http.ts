/**
 * The Meaning Fingerprint route: text in, meaning fingerprints out.
 *
 * It is the server half of the Meaning Engine. The browser sends a synopsis (or
 * a custom tag, or later a search phrase); the route asks the embedding model
 * once and answers with packed fingerprints the engine can compare against
 * stored ones. It writes nothing and keeps nothing. GET reports whether a model
 * key is configured, so a page can fall back to its rule-based suggestions.
 */
import { encodeFingerprint, packFingerprint } from '@seihouse/sen/meaning-engine';
import { DEFAULT_MEANING_MODEL, missingKeyMessage, providerKey } from '../model-router/catalog';
import { fingerprintWithOpenRouter } from '../model-router/openRouter';

export interface MeaningFingerprintHttpRequest {
  method?: string;
  body?: unknown;
}

export interface MeaningFingerprintHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface MeaningFingerprintHttpDependencies {
  environment: Record<string, string | undefined>;
  fingerprint?: (input: { apiKey: string; model: string; texts: string[] }) => Promise<number[][]>;
  onError?: (error: unknown) => void;
}

/** A synopsis and a handful of custom tags fit in one request. */
export const MEANING_FINGERPRINT_MAX_TEXTS = 16;
export const MEANING_FINGERPRINT_MAX_LENGTH = 4_000;
const TIMEOUT_MS = 20_000;

const noStore = { 'Cache-Control': 'no-store' } as const;
const reply = (status: number, body: unknown, headers: Record<string, string> = {}): MeaningFingerprintHttpResponse =>
  ({ status, body, headers: { ...noStore, ...headers } });

const parseTexts = (body: unknown): string[] => {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body;
  const texts = (parsed as { texts?: unknown } | null)?.texts;
  if (!Array.isArray(texts) || !texts.length) throw new Error('Send the texts to fingerprint.');
  if (texts.length > MEANING_FINGERPRINT_MAX_TEXTS) throw new Error(`Send at most ${MEANING_FINGERPRINT_MAX_TEXTS} texts at once.`);
  return texts.map(text => {
    if (typeof text !== 'string' || !text.trim()) throw new Error('Every text must have words in it.');
    if (text.length > MEANING_FINGERPRINT_MAX_LENGTH) throw new Error(`A text can be at most ${MEANING_FINGERPRINT_MAX_LENGTH} characters.`);
    return text.trim();
  });
};

export const handleMeaningFingerprintHttp = async (
  request: MeaningFingerprintHttpRequest,
  dependencies: MeaningFingerprintHttpDependencies,
): Promise<MeaningFingerprintHttpResponse> => {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET' && method !== 'POST') return reply(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });

  const model = DEFAULT_MEANING_MODEL;
  const apiKey = providerKey(dependencies.environment, 'openrouter');
  if (method === 'GET') return reply(200, { configured: Boolean(apiKey), model });

  let texts: string[];
  try {
    texts = parseTexts(request.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid fingerprint request.';
    return reply(400, { error: /JSON/.test(message) ? 'The fingerprint request body is not valid.' : message });
  }
  if (!apiKey) return reply(503, { error: missingKeyMessage(model) });

  try {
    const vectors = await (dependencies.fingerprint
      ? dependencies.fingerprint({ apiKey, model, texts })
      : fingerprintWithOpenRouter({ apiKey, model, texts, timeoutMs: TIMEOUT_MS }));
    return reply(200, { model, fingerprints: vectors.map(vector => encodeFingerprint(packFingerprint(vector))) });
  } catch (error) {
    dependencies.onError?.(error);
    return reply(502, { error: 'The meaning model did not answer.' });
  }
};
