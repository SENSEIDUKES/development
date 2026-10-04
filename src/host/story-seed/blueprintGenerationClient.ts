import { type BlueprintGenerationPayload, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { readReasoningPreference } from '../generation/modelPreference';

const ENDPOINT = '/api/generate-blueprint';
/** Longer than the server's 180-second route, so the server's own answer, a deadline included, arrives first. */
const REQUEST_TIMEOUT_MS = 190_000;

/**
 * A Blueprint request the server answered with an error. `status` is its HTTP
 * status, so a host can act on it (401: the access token was not accepted)
 * without matching message text.
 */
export class BlueprintRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'BlueprintRequestError';
  }
}

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

const withChapterModel = (payload: BlueprintGenerationPayload, model?: string) => {
  if (!model) return payload;
  const reasoningLevel = typeof window === 'undefined' ? undefined : readReasoningPreference(model);
  return { ...payload, model, ...(reasoningLevel ? { reasoningLevel } : {}) };
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

const postBlueprintRequest = async (
  payload: BlueprintGenerationPayload & { model?: string; reasoningLevel?: string },
  accessToken: string,
  messages: { missingToken: string; failed: (status: number) => string; timedOut: string },
  signal?: AbortSignal,
): Promise<Record<string, unknown>> => {
  const token = accessToken.trim();
  if (!token) throw new Error(messages.missingToken);
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
        : messages.failed(response.status);
      throw new BlueprintRequestError(error, response.status);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('The World Blueprint server returned an invalid response.');
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (request.didTimeOut()) throw new Error(messages.timedOut);
    throw error;
  } finally {
    request.cleanup();
  }
};

/**
 * Generates a World Blueprint. `model` is the chapter model the reader chose
 * (the Model Router): the Blueprint is written by the same model as the
 * chapters, at the reasoning level saved for it. Without one, the server's
 * Blueprint model writes it.
 */
export const requestWorldBlueprint = async (
  payload: BlueprintGenerationPayload,
  accessToken: string,
  signal?: AbortSignal,
  model?: string,
): Promise<WorldBlueprint> => await postBlueprintRequest(withChapterModel(payload, model), accessToken, {
  missingToken: 'Enter the Development access token before manifesting the World Blueprint.',
  failed: status => `World Blueprint generation failed with status ${status}.`,
  timedOut: 'World Blueprint generation timed out. No Story Seed data was changed; please retry.',
}, signal) as unknown as WorldBlueprint;
