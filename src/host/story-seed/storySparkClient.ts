import { parseStorySpark, type StorySpark, type StorySparkRequest } from '@seihouse/sen/story-seed';

const ENDPOINT = '/api/story-spark';
const REQUEST_TIMEOUT_MS = 50_000;
/** Sparks are free but limited to twenty a day per visitor (`src/server/story-spark/limits.ts`). */
const DAILY_LIMIT_MESSAGE = 'The Dao has spoken its twenty sparks for today. Seek again tomorrow, or plant one you already have.';

const errorMessage = (body: unknown, fallback: string): string =>
  body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && body.error.trim()
    ? body.error
    : fallback;

/** Whether the server has a model to write sparks with. Any failure reads as no. */
export async function storySparksConfigured(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) return false;
    const body = await response.json() as { configured?: unknown };
    return body.configured === true;
  } catch {
    return false;
  }
}

/** One spark from the server. The owner's token, when saved, lifts the visitor limit. */
export async function requestStorySpark(
  request: StorySparkRequest,
  accessToken?: string,
  signal?: AbortSignal,
): Promise<StorySpark> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const token = accessToken?.trim();
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (response.status === 429) throw new Error(DAILY_LIMIT_MESSAGE);
    if (!response.ok) throw new Error(errorMessage(body, 'The Dao was silent. Seek again.'));
    return parseStorySpark(body, request);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
