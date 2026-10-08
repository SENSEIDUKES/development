import { createModelRouter, DEFAULT_IMAGE_MODEL, IMAGE_MODELS, ModelRouterError } from '@seihouse/library/model-router-server';
import { MODEL_PROVIDERS, providerKey, type ModelEnvironment } from '../model-router/catalog';
import { parseAttachedImage } from '../shared/imageAttachments';
import { PROFILE_PICTURE_ASPECT_RATIO, PROFILE_PICTURE_PROMPT } from './prompt';

export interface ProfilePictureHttpRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ProfilePictureHttpResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ProfilePictureHttpDependencies {
  environment: ModelEnvironment;
  /** Tests supply the provider; the server uses the Model Router. */
  generate?: ReturnType<typeof createModelRouter>['generate'];
  onError?: (error: unknown) => void;
  /** One line per portrait: which model made it and how long it took. Never the photo. */
  onAnswer?: (answer: { model: string; durationMs: number }) => void;
}

export { PROFILE_PICTURE_VISITOR_LIMIT } from './limits';

export const PROFILE_PICTURE_TIMEOUT_MS = 120_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const errorResponse = (status: number, error: string): ProfilePictureHttpResponse => ({
  status, body: { error }, headers: { 'Cache-Control': 'no-store' },
});

/**
 * The profile picture route: one portrait from the reader's photo, given to
 * the image model with the server's own prompt (the reader sends only the
 * photo), with the Model Router's image model (Nano Banana 2 Lite when none is
 * chosen). The host asks three times to offer three to choose from. The photo
 * and the portrait are kept by nobody here; the host keeps the one chosen.
 */
export async function handleProfilePictureHttp(
  request: ProfilePictureHttpRequest,
  dependencies: ProfilePictureHttpDependencies,
): Promise<ProfilePictureHttpResponse> {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method !== 'POST') return { ...errorResponse(405, 'Method not allowed.'), headers: { Allow: 'POST', 'Cache-Control': 'no-store' } };
  let parsed: unknown;
  try { parsed = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
  catch { return errorResponse(400, 'Invalid JSON request.'); }
  if (!isRecord(parsed) || parsed.photo === undefined) return errorResponse(400, 'Choose a photo first.');
  const photo = parseAttachedImage(parsed.photo);
  if ('error' in photo) return errorResponse(photo.tooLarge ? 413 : 400, photo.error);
  if (parsed.model !== undefined && typeof parsed.model !== 'string') return errorResponse(400, 'Choose an image model from the Model Router.');

  const model = (parsed.model as string | undefined) || DEFAULT_IMAGE_MODEL;
  const option = IMAGE_MODELS.find(item => item.id === model);
  if (!option || (option.provider !== 'gemini' && option.provider !== 'openrouter')) return errorResponse(400, `Model '${model}' cannot make portraits.`);
  const key = providerKey(dependencies.environment, option.provider);
  if (!key) return errorResponse(503, `${MODEL_PROVIDERS[option.provider].keyVariable} is not configured on the Development server.`);

  const generate = dependencies.generate ?? createModelRouter({ credentials: { [option.provider]: key } }).generate;
  const started = Date.now();
  try {
    const result = await generate({
      capability: 'image', model, prompt: PROFILE_PICTURE_PROMPT, aspectRatio: PROFILE_PICTURE_ASPECT_RATIO,
      referenceImages: [photo.image], timeoutMs: PROFILE_PICTURE_TIMEOUT_MS,
    });
    if (result.capability !== 'image') throw new ModelRouterError('provider-error', 'The configured model returned no image.');
    dependencies.onAnswer?.({ model, durationMs: Date.now() - started });
    return { status: 200, body: { image: result.data, mimeType: result.mimeType, model }, headers: { 'Cache-Control': 'no-store' } };
  } catch (error) {
    dependencies.onError?.(error);
    if (error instanceof ModelRouterError && error.code === 'timeout') {
      return errorResponse(502, `The portrait was still being made after ${Math.ceil(PROFILE_PICTURE_TIMEOUT_MS / 1000)} seconds, so it was stopped. Try again.`);
    }
    return errorResponse(502, 'The portrait could not be made. Try again, or try another photo.');
  }
}
