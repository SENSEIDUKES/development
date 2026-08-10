import type { WorldBlueprint } from './types';
import type { BlueprintGenerationPayload } from './storySeedSchema';

const ENDPOINT = '/api/generate-blueprint';
const REQUEST_TIMEOUT_MS = 130_000;

const requestSignalWithTimeout = (callerSignal?: AbortSignal) => {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
};

export const requestWorldBlueprint = async (
  payload: BlueprintGenerationPayload,
  accessToken: string,
  signal?: AbortSignal,
): Promise<WorldBlueprint> => {
  const token = accessToken.trim();
  if (!token) {
    throw new Error('Enter the Development access token before manifesting the World Blueprint.');
  }
  const request = requestSignalWithTimeout(signal);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: request.signal,
    });
    const body = await readResponseBody(response);
    if (!response.ok) {
      const error = body && typeof body === 'object' && 'error' in body
        && typeof body.error === 'string'
        ? body.error
        : `World Blueprint generation failed with status ${response.status}.`;
      throw new Error(error);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('The World Blueprint server returned an invalid response.');
    }
    return body as WorldBlueprint;
  } catch (error) {
    if (request.didTimeOut()) {
      throw new Error('World Blueprint generation timed out. No Story Seed data was changed; please retry.');
    }
    throw error;
  } finally {
    request.cleanup();
  }
};
