import { type ArcPlan } from '@seihouse/sen/arc-goals';
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import { type ArcRoadmapExtensionPayload, type BlueprintGenerationPayload } from '@seihouse/sen/story-seed';

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

const postBlueprintRequest = async (
  payload: BlueprintGenerationPayload | ArcRoadmapExtensionPayload,
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
      throw new Error(error);
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

export const requestWorldBlueprint = async (
  payload: BlueprintGenerationPayload,
  accessToken: string,
  signal?: AbortSignal,
): Promise<WorldBlueprint> => await postBlueprintRequest(payload, accessToken, {
  missingToken: 'Enter the Development access token before manifesting the World Blueprint.',
  failed: status => `World Blueprint generation failed with status ${status}.`,
  timedOut: 'World Blueprint generation timed out. No Story Seed data was changed; please retry.',
}, signal) as unknown as WorldBlueprint;

/** Plans only the arcs being added to a reviewed Blueprint; returns the new arcs, numbered in place. */
export const requestArcRoadmapExtension = async (
  payload: ArcRoadmapExtensionPayload,
  accessToken: string,
  signal?: AbortSignal,
): Promise<ArcPlan[]> => {
  const body = await postBlueprintRequest(payload, accessToken, {
    missingToken: 'Enter the Development access token before adding arcs.',
    failed: status => `Adding arcs failed with status ${status}.`,
    timedOut: 'Adding arcs timed out. Nothing was changed; please retry.',
  }, signal);
  if (!Array.isArray(body.addedArcPlans)) throw new Error('The World Blueprint server returned no new arcs.');
  return body.addedArcPlans as ArcPlan[];
};
