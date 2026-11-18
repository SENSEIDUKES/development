import { type BlueprintGenerationPayload, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { isLocalDevelopmentModel, readReasoningPreference, readTextRolePreference } from '../generation/modelPreference';
import { recordUsage } from '../usage/usageLog';
import { chosenEnergyGrade } from '../generation/modelPreference';

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

const requestSignalWithTimeout = (callerSignal?: AbortSignal, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
};

const withBlueprintModel = (payload: BlueprintGenerationPayload, model?: string) => {
  const blueprint = readTextRolePreference('blueprint');
  const reasoningLevel = blueprint.reasoningLevel ?? (model && !blueprint.model ? readReasoningPreference(model) : undefined);
  return { ...payload, ...(model ? { model } : {}), ...(reasoningLevel ? { reasoningLevel } : {}) };
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
): Promise<{ blueprint: WorldBlueprint; headers: Headers }> => {
  const token = accessToken.trim();
  if (!token && !isLocalDevelopmentModel(payload.model)) throw new Error(messages.missingToken);
  const request = requestSignalWithTimeout(signal, isLocalDevelopmentModel(payload.model) ? 15 * 60_000 + 20_000 : REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    return { blueprint: body as WorldBlueprint, headers: response.headers };
  } catch (error) {
    if (request.didTimeOut()) throw new Error(messages.timedOut);
    throw error;
  } finally {
    request.cleanup();
  }
};

/**
 * An explicit Blueprint choice uses its own reasoning. Otherwise it follows Chapter.
 */
export const requestWorldBlueprint = async (
  payload: BlueprintGenerationPayload,
  accessToken: string,
  signal?: AbortSignal,
  model?: string,
): Promise<WorldBlueprint> => {
  const grade = readTextRolePreference('blueprint').model ? undefined : chosenEnergyGrade('chapters', model);
  const { blueprint, headers } = await postBlueprintRequest(withBlueprintModel(payload, model), accessToken, {
    missingToken: 'Enter the Development access token before manifesting the World Blueprint.',
    failed: status => `World Blueprint generation failed with status ${status}.`,
    timedOut: 'World Blueprint generation timed out. No Story Seed data was changed; please retry.',
  }, signal);
  const tokens = (name: string) => {
    const raw = headers.get('X-Blueprint-' + name + '-Tokens');
    const count = Number(raw);
    return raw && Number.isSafeInteger(count) && count >= 0 ? count : undefined;
  };
  recordUsage({ kind: 'blueprint', model, grade, inputTokens: tokens('Input'), outputTokens: tokens('Output'), totalTokens: tokens('Total') });
  return blueprint;
};
