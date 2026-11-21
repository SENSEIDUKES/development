const ENDPOINT = '/api/meaning-fingerprint';
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * Meaning fingerprints for a few texts, from the server's embedding model, in
 * the order sent. Throws when the server has no model or does not answer; the
 * caller falls back to suggestions that need no fingerprint.
 */
export async function requestMeaningFingerprints(texts: readonly string[], signal?: AbortSignal): Promise<string[]> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ texts }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const body = await response.json().catch(() => undefined) as { fingerprints?: unknown; error?: unknown } | undefined;
  const fingerprints = body?.fingerprints;
  if (!response.ok || !Array.isArray(fingerprints) || fingerprints.length !== texts.length
    || !fingerprints.every((entry): entry is string => typeof entry === 'string')) {
    throw new Error(typeof body?.error === 'string' ? body.error : 'Meaning fingerprints are unavailable.');
  }
  return fingerprints;
}
